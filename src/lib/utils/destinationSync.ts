/**
 * C-6 — Ordre de synchronisation des destinations d'une campagne modifiée.
 * Miroir de public.guard_campaign_destination_reopening (migration 32), seule
 * autorité : un AJOUT ou une SUPPRESSION ne rouvre jamais une campagne fermée par
 * ses destinations ; seul le REPORT d'une destination existante le peut (C3).
 *
 * Le trigger s'évalue ligne par ligne : l'ordre des écritures évite donc les
 * fermetures transitoires qui feraient refuser un ajout légitime.
 *   1. suppressions anticipées (ville reprise par une destination renommée) ;
 *   2. mises à jour qui laissent la destination ouverte (dont les reports) ;
 *   3. ajouts, destinations ouvertes d'abord ;
 *   4. mises à jour qui ferment la destination ;
 *   5. suppressions.
 * Le plan est exécuté dans une seule transaction par
 * public.update_campaign_with_destinations (migration 32) : en cas d'erreur, rien
 * n'est enregistré.
 * Dates au format AAAA-MM-JJ comparées en UTC (todayUtc).
 */

export interface ExistingDestination {
  id: string;
  city_name: string;
  order_deadline_date?: string | null;
}

export interface SubmittedDestination {
  id?: string;
  city_name?: string;
  order_deadline_date?: string | null;
}

export function isDeadlineOpen(deadline: string | null | undefined, today: string): boolean {
  return !deadline || deadline >= today;
}

/** Destinations ouvertes en premier ; ordre relatif conservé sinon. */
export function sortOpenDestinationsFirst<T extends SubmittedDestination>(destinations: T[], today: string): T[] {
  return [
    ...destinations.filter((d) => isDeadlineOpen(d.order_deadline_date, today)),
    ...destinations.filter((d) => !isDeadlineOpen(d.order_deadline_date, today)),
  ];
}

export interface DestinationSyncPlan<T extends SubmittedDestination> {
  /** Destinations soumises avec leur identifiant effectif (ajouts repris compris). */
  resolved: T[];
  /** Ajouts convertis en mise à jour d'une destination retirée de même ville. */
  reusedIds: string[];
  earlyDeletes: string[];
  updatesKeepingOpen: T[];
  inserts: T[];
  updatesClosing: T[];
  deletes: string[];
  /**
   * La synchronisation rouvrirait une campagne fermée par ses destinations sans
   * reporter une destination existante (refusé par la base, C3 / R-4).
   */
  reopensWithoutPostponement: boolean;
}

export function planDestinationSync<T extends SubmittedDestination>(
  existing: ExistingDestination[],
  submitted: T[],
  today: string
): DestinationSyncPlan<T> {
  const city = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const existingIds = new Set(existing.map((d) => d.id));
  const submittedIds = new Set(submitted.map((d) => d.id).filter(Boolean) as string[]);
  const removed = existing.filter((d) => !submittedIds.has(d.id));

  // Un ajout portant la ville d'une destination retirée reprend cette destination
  // (contrainte uq_campaign_destinations_city : l'ajout précède désormais la suppression).
  const reusedIds: string[] = [];
  const resolved = submitted.map((d) => {
    if (d.id && existingIds.has(d.id)) return d;
    const match = removed.find((r) => city(r.city_name) === city(d.city_name) && !reusedIds.includes(r.id));
    if (!match) return d;
    reusedIds.push(match.id);
    return { ...d, id: match.id };
  });

  const kept = resolved.filter((d) => d.id && existingIds.has(d.id));
  const inserts = sortOpenDestinationsFirst(resolved.filter((d) => !d.id || !existingIds.has(d.id)), today);
  const toDelete = removed.filter((r) => !reusedIds.includes(r.id));

  // Une destination conservée renommée vers la ville d'une destination retirée :
  // la destination retirée doit disparaître avant le renommage.
  const keptCities = new Set(kept.map((d) => city(d.city_name)));
  const earlyDeletes = toDelete.filter((r) => keptCities.has(city(r.city_name))).map((r) => r.id);
  const deletes = toDelete.filter((r) => !earlyDeletes.includes(r.id)).map((r) => r.id);

  const openBefore =
    existing.length === 0 || existing.some((d) => isDeadlineOpen(d.order_deadline_date, today));
  const openAfter =
    resolved.length === 0 || resolved.some((d) => isDeadlineOpen(d.order_deadline_date, today));
  const keptOpenAfter = kept.some((d) => isDeadlineOpen(d.order_deadline_date, today));

  return {
    resolved,
    reusedIds,
    earlyDeletes,
    updatesKeepingOpen: kept.filter((d) => isDeadlineOpen(d.order_deadline_date, today)),
    inserts,
    updatesClosing: kept.filter((d) => !isDeadlineOpen(d.order_deadline_date, today)),
    deletes,
    reopensWithoutPostponement: !openBefore && openAfter && !keptOpenAfter,
  };
}
