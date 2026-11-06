/**
 * Protection des productions engagées — décisions A4, D1, D3 (ADR-046).
 * Miroir de public.guard_production_commitments (migration 32), seule autorité :
 * l'interface s'en sert pour désactiver les champs et expliquer pourquoi.
 *
 * Une production est « engagée » si une campagne 'active' ou 'paused',
 * effectivement ouverte, en dépend.
 */

export interface ProductionStructuralFields {
  status?: string | null;
  product_id?: string | null;
  company_product_id?: string | null;
  unit?: string | null;
  is_public?: boolean | null;
}

export const PRODUCTION_LOCK_MESSAGES = {
  status:
    "Impossible de modifier le statut d'une production récoltée tant qu'une campagne active ou suspendue y est rattachée. Terminez ou annulez d'abord la campagne.",
  product:
    "Impossible de changer le produit d'une production tant qu'une campagne active ou suspendue y est rattachée.",
  unit: "Impossible de changer l'unité de mesure d'une production tant qu'une campagne non annulée, une réservation en cours ou une proposition ouverte y est rattachée.",
  visibility:
    "Impossible de rendre non publique une production tant qu'une campagne active ou suspendue y est rattachée.",
} as const;

export type ProductionLockReason = keyof typeof PRODUCTION_LOCK_MESSAGES;

/**
 * Raison du refus d'une modification sur une production engagée, ou null si la
 * modification est autorisée (champs descriptifs, ou valeurs structurantes
 * renvoyées inchangées).
 */
export function getProductionChangeBlocker(
  isEngaged: boolean,
  before: ProductionStructuralFields,
  after: ProductionStructuralFields,
  /** C-4 : engagements exprimés dans l'unité de la production (voir hasUnitCommitments). */
  unitCommitted: boolean = isEngaged
): ProductionLockReason | null {
  // C-4 — l'unité est protégée par ses propres engagements, même hors campagne ouverte
  if (unitCommitted && after.unit !== undefined && after.unit !== before.unit) return "unit";
  if (!isEngaged) return null;
  if (after.status !== undefined && after.status !== before.status) return "status";
  if (
    (after.product_id !== undefined && after.product_id !== before.product_id) ||
    (after.company_product_id !== undefined && after.company_product_id !== before.company_product_id)
  ) {
    return "product";
  }
  if (before.is_public === true && after.is_public !== undefined && after.is_public !== true) return "visibility";
  return null;
}

/**
 * C-4 — Miroir de la règle SQL (guard_production_commitments, migration 32) :
 * l'unité d'une production est figée dès qu'une campagne non annulée (brouillon
 * compris), une commande en cours ou une proposition ouverte s'y rapporte. Les
 * campagnes annulées et les commandes livrées ou annulées ne bloquent pas.
 * (Côté interface, les commandes en cours servent d'indicateur des réservations
 * actives ; la base reste l'autorité.)
 */
export function hasUnitCommitments(input: {
  campaigns?: ReadonlyArray<{ status?: string | null }> | null;
  orders?: ReadonlyArray<{ status?: string | null }> | null;
  demandResponses?: ReadonlyArray<{ status?: string | null }> | null;
}): boolean {
  const activeOrderStatuses = ["pending", "confirmed", "preparing", "ready"];
  return (
    (input.campaigns ?? []).some((c) => c.status !== "cancelled") ||
    (input.orders ?? []).some((o) => activeOrderStatuses.includes(o.status ?? "")) ||
    (input.demandResponses ?? []).some((r) => r.status === "proposed" || r.status === "accepted")
  );
}
