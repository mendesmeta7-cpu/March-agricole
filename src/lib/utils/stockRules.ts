/**
 * Règles de calcul du stock d'une campagne — décision A11 (2026-11-02, ADR-045).
 *
 * Le volume consommé d'une campagne comprend les réservations des commandes en
 * cours ('active') ET des commandes livrées ('confirmed') : une livraison ne remet
 * jamais du volume en vente. Seule une annulation ('released') le libère.
 * Miroir exact de public.get_campaign_consumed_quantity (migration 031).
 */

export const CONSUMING_RESERVATION_STATUSES = ["active", "confirmed"] as const;

export function isConsumingReservation(status: string | null | undefined): boolean {
  return status === "active" || status === "confirmed";
}

/** Somme des quantités réservées ou livrées d'une liste de réservations. */
export function sumConsumedQuantity(
  reservations: ReadonlyArray<{ status?: string | null; quantity?: number | string | null }> | null | undefined
): number {
  return (reservations ?? [])
    .filter((reservation) => isConsumingReservation(reservation.status))
    .reduce((total, reservation) => total + (Number(reservation.quantity) || 0), 0);
}
