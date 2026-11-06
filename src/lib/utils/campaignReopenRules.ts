/**
 * Ouverture effective et réouverture des campagnes — décisions C2, C3, A12,
 * A12-bis, D5, D6 (ADR-046). Miroir de public.is_campaign_effectively_open et
 * public.guard_campaign_business_rules (migration 32), seules autorités.
 * Dates au format AAAA-MM-JJ, comparées en UTC comme le reste de l'application.
 */

export function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

interface DestinationDeadline {
  order_deadline_date?: string | null;
}

/** C2 — statut ouvert, date générale non dépassée, et une destination ouverte (ou aucune). */
export function isCampaignEffectivelyOpen(
  campaign: {
    status: string;
    end_date?: string | null;
    destinations?: DestinationDeadline[] | null;
    campaign_destinations?: DestinationDeadline[] | null;
  },
  today: string = todayUtc()
): boolean {
  if (!["draft", "active", "paused"].includes(campaign.status)) return false;
  if (campaign.end_date && campaign.end_date < today) return false;
  const destinations = campaign.destinations ?? campaign.campaign_destinations ?? [];
  if (destinations.length === 0) return true;
  return destinations.some((d) => !d.order_deadline_date || d.order_deadline_date >= today);
}

/** La campagne peut-elle être proposée à la réouverture ? (jamais si annulée ou déjà ouverte) */
export function canOfferReopen(
  campaign: Parameters<typeof isCampaignEffectivelyOpen>[0],
  today: string = todayUtc()
): boolean {
  if (campaign.status === "cancelled") return false;
  return !isCampaignEffectivelyOpen(campaign, today);
}

/** C3 — la date générale doit-elle être prolongée ? Seulement si elle est dépassée. */
export function isEndDateExtensionRequired(oldEndDate: string | null | undefined, today: string = todayUtc()): boolean {
  return !!oldEndDate && oldEndDate < today;
}

/**
 * D5 — validation d'une nouvelle date générale (null = inchangée).
 * Renvoie un message d'erreur, ou null si la date est acceptable.
 */
export function validateReopenEndDate(
  oldEndDate: string | null | undefined,
  newEndDate: string | null | undefined,
  today: string = todayUtc()
): string | null {
  const required = isEndDateExtensionRequired(oldEndDate, today);
  if (!newEndDate) {
    return required
      ? "Réouverture : la nouvelle date de fin est obligatoire et doit être au moins égale à aujourd'hui."
      : null;
  }
  if (newEndDate < today) {
    return "Réouverture : la nouvelle date de fin est obligatoire et doit être au moins égale à aujourd'hui.";
  }
  if (oldEndDate && newEndDate <= oldEndDate) {
    return "Réouverture : la nouvelle date de fin doit être strictement postérieure à l'ancienne.";
  }
  return null;
}

/**
 * A12-bis / C3 — après report des dates limites proposées, reste-t-il au moins
 * une destination ouverte (ou aucune destination) ?
 */
export function destinationsOpenAfterReopen(
  destinations: Array<{ id: string; order_deadline_date?: string | null }>,
  newDeadlines: Record<string, string | null | undefined>,
  today: string = todayUtc()
): boolean {
  if (destinations.length === 0) return true;
  return destinations.some((d) => {
    const deadline = newDeadlines[d.id] ?? d.order_deadline_date;
    return !deadline || deadline >= today;
  });
}
