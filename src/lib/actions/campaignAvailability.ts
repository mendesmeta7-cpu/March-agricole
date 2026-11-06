/**
 * Interprétation des résultats des RPC de disponibilité (migration 32) — pur,
 * sans I/O, importable côté serveur comme côté client (et par les tests).
 *
 * - public.get_campaigns_available_quantity : disponible agrégé des campagnes
 *   'active' effectivement ouvertes. Une campagne absente du résultat n'est pas
 *   commandable (disponible = 0). En cas d'erreur, la disponibilité est INCONNUE :
 *   jamais de repli sur le volume commercialisable (aucun faux disponible).
 * - public.get_productions_campaign_availability : volume encore engageable d'une
 *   production pour une campagne (D4).
 */

/** Taille maximale d'un lot accepté par les RPC de disponibilité. */
export const AVAILABILITY_RPC_MAX_IDS = 200;

export const AVAILABILITY_UNAVAILABLE_MESSAGE = "Disponibilité momentanément indisponible";

export type CampaignAvailabilityLookup =
  | { ok: true; byId: Map<string, number> }
  | { ok: false };

export interface ResolvedCampaignAvailability {
  /** null = disponibilité inconnue (erreur de lecture) */
  available_quantity: number | null;
  /** Vrai si la disponibilité n'a pas pu être lue */
  availability_unavailable: boolean;
  /** Commandable du point de vue du stock (disponible connu et > 0) */
  orderable: boolean;
}

/** Construit la table de disponibilité à partir des lignes (ou de l'erreur) renvoyées. */
export function toCampaignAvailabilityLookup(
  rows: ReadonlyArray<{ campaign_id: string; available_quantity: number | string | null }> | null | undefined,
  failed: boolean
): CampaignAvailabilityLookup {
  if (failed) return { ok: false };
  const byId = new Map<string, number>();
  for (const row of rows ?? []) {
    const value = Number(row.available_quantity);
    byId.set(row.campaign_id, Number.isFinite(value) ? Math.max(0, value) : 0);
  }
  return { ok: true, byId };
}

/** Disponibilité d'une campagne : absente = 0 (non commandable), erreur = inconnue. */
export function resolveCampaignAvailability(
  lookup: CampaignAvailabilityLookup,
  campaignId: string
): ResolvedCampaignAvailability {
  if (!lookup.ok) {
    return { available_quantity: null, availability_unavailable: true, orderable: false };
  }
  const available = lookup.byId.get(campaignId) ?? 0;
  return { available_quantity: available, availability_unavailable: false, orderable: available > 0 };
}

/** Découpe une liste d'identifiants (dédoublonnés) en lots acceptés par les RPC. */
export function chunkIds(ids: ReadonlyArray<string>, size: number = AVAILABILITY_RPC_MAX_IDS): string[][] {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += size) {
    chunks.push(unique.slice(i, i + size));
  }
  return chunks;
}

export interface ProductionCampaignAvailability {
  production_id: string;
  production_status: string;
  unit: string;
  expected_quantity: number;
  committed_quantity: number;
  available_quantity: number;
}

/** Normalise une ligne de get_productions_campaign_availability (numeric → number). */
export function toProductionAvailability(row: {
  production_id: string;
  production_status: string;
  unit: string;
  expected_quantity: number | string;
  committed_quantity: number | string;
  available_quantity: number | string;
}): ProductionCampaignAvailability {
  return {
    production_id: row.production_id,
    production_status: row.production_status,
    unit: row.unit,
    expected_quantity: Number(row.expected_quantity) || 0,
    committed_quantity: Number(row.committed_quantity) || 0,
    available_quantity: Math.max(0, Number(row.available_quantity) || 0),
  };
}
