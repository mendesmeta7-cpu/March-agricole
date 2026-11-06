import type { OrderStatus } from "@/lib/queries/orders";
import { canCompanyCancel, getNextCompanyStatuses } from "@/lib/utils/orderRules";

/**
 * Transitions de statut proposées à l'entreprise vendeuse (FUN-01).
 *
 * Miroir de la RPC serveur `update_order_status` (seule source de vérité) :
 *  - progression uniquement vers l'avant : pending → confirmed → preparing → ready
 *    (sauter une étape vers l'avant est autorisé, revenir en arrière ne l'est pas) ;
 *  - « delivered » passe exclusivement par la confirmation de livraison (QR / numéro) ;
 *  - « cancelled » passe exclusivement par l'action d'annulation dédiée,
 *    autorisée seulement en « pending » ou « confirmed » (règle base de données).
 */

export const COMPANY_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente de confirmation",
  confirmed: "Confirmée par l'exploitation",
  preparing: "En cours de préparation",
  ready: "Prête pour retrait / expédition",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Statuts strictement postérieurs au statut courant (parmi confirmed / preparing / ready). */
export function getNextCompanyOrderStatusOptions(
  current: OrderStatus
): { value: OrderStatus; label: string }[] {
  // Règles partagées et testées (src/lib/utils/orderRules.ts — décisions A5/A13)
  return getNextCompanyStatuses(current).map((status) => ({
    value: status,
    label: COMPANY_ORDER_STATUS_LABELS[status],
  }));
}

/** Le sélecteur de statut n'a de sens que s'il reste au moins une étape possible. */
export function canChangeCompanyOrderStatus(current: OrderStatus): boolean {
  return getNextCompanyOrderStatusOptions(current).length > 0;
}

/** Annulation possible uniquement en « pending » ou « confirmed ». */
export function canCompanyCancelOrder(current: OrderStatus): boolean {
  return canCompanyCancel(current);
}
