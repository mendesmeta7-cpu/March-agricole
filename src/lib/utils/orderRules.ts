/**
 * Règles de cycle de vie des commandes — décisions A5 et A13 (ADR-045).
 * Miroir des contrôles serveur (update_order_status, confirm_order_delivery,
 * cancel_order_and_release_reservation) : l'interface n'expose que les actions
 * que la base acceptera.
 */

export type OrderLifecycleStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

const FORWARD_ORDER: OrderLifecycleStatus[] = ["pending", "confirmed", "preparing", "ready"];

/** A13 — Statuts suivants proposables par l'entreprise (vers l'avant uniquement). */
export function getNextCompanyStatuses(current: string): OrderLifecycleStatus[] {
  const index = FORWARD_ORDER.indexOf(current as OrderLifecycleStatus);
  if (index < 0) return [];
  return FORWARD_ORDER.slice(index + 1).filter((status) => status !== "pending");
}

/** A5 — Seule une commande « prête » peut être livrée. */
export function canConfirmDelivery(status: string): boolean {
  return status === "ready";
}

/** A5 — L'entreprise vendeuse annule une commande en attente ou confirmée. */
export function canCompanyCancel(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

/** A5 — Le revendeur n'annule qu'une commande en attente de confirmation. */
export function canResellerCancel(status: string): boolean {
  return status === "pending";
}
