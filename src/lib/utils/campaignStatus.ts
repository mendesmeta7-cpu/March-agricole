/**
 * Utilitaires purs (sans I/O) pour le calcul du statut des campagnes.
 * Ce fichier ne dépend d'aucun module serveur (server-only, next/headers, etc.)
 * et peut être importé dans les Client Components.
 *
 * VOLET B — S6 Correction bug expiration automatique
 */

import type { CampaignStatus } from "@/lib/queries/campaigns";

/**
 * Calcule le statut effectif d'affichage d'une campagne côté Société.
 *
 * RÈGLE MÉTIER :
 * - Si le statut DB est déjà 'completed', 'cancelled', 'paused' ou 'draft' → utiliser tel quel.
 * - Si le statut DB est 'active' et que la campagne a un `end_date` global dépassé → 'completed'.
 * - Si la campagne possède des destinations et que TOUTES ont un `order_deadline_date` dépassé
 *   (et aucune sans deadline) → retourner 'completed'.
 * - Si au moins une destination est encore ouverte (ou sans deadline) → 'active'.
 *
 * Cette fonction NE modifie PAS la base de données.
 * Elle assure la cohérence visuelle entre le côté Revendeur (via campaignEligibility.ts)
 * et le côté Société.
 */
export function getEffectiveCampaignStatus(campaign: {
  status: CampaignStatus;
  end_date?: string | null;
  destinations?: Array<{ order_deadline_date?: string | null }> | null;
}): CampaignStatus {
  const { status, end_date, destinations } = campaign;

  // Si non actif, le statut DB fait foi
  if (status !== "active") {
    return status;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Vérification de la date globale de fin
  if (end_date && end_date < todayStr) {
    return "completed";
  }

  // Si la campagne a des destinations configurées, vérifier leurs deadlines
  if (destinations && destinations.length > 0) {
    // Destinations sans deadline = toujours ouvertes
    const noDeadlineCount = destinations.filter((d) => !d.order_deadline_date).length;

    // Si au moins une destination n'a pas de deadline, la campagne est toujours active
    if (noDeadlineCount > 0) {
      return "active";
    }

    // Toutes les destinations ont une deadline
    const expiredCount = destinations.filter(
      (d) => d.order_deadline_date && d.order_deadline_date < todayStr
    ).length;

    // Toutes les destinations sont expirées → campagne terminée
    if (expiredCount === destinations.length) {
      return "completed";
    }
  }

  return "active";
}

/**
 * Retourne un résumé de l'état des destinations pour l'affichage détaillé côté Société.
 */
export function getCampaignDestinationsSummary(
  destinations:
    | Array<{ order_deadline_date?: string | null; city_name?: string }>
    | null
    | undefined
): {
  total: number;
  active: number;
  expired: number;
  noDeadline: number;
} {
  if (!destinations || destinations.length === 0) {
    return { total: 0, active: 0, expired: 0, noDeadline: 0 };
  }

  const todayStr = new Date().toISOString().split("T")[0];

  let active = 0;
  let expired = 0;
  let noDeadline = 0;

  for (const d of destinations) {
    if (!d.order_deadline_date) {
      noDeadline++;
      active++;
    } else if (d.order_deadline_date < todayStr) {
      expired++;
    } else {
      active++;
    }
  }

  return { total: destinations.length, active, expired, noDeadline };
}
