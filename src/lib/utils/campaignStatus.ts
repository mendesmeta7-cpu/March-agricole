/**
 * Source unique de vérité pour le calcul du statut réel et effectif des campagnes commerciales.
 * Utilisé conjointement par l'espace Société, l'espace Revendeur, le Feed et l'Administration.
 * 
 * Ce fichier est pur (sans I/O, sans dépendance serveur) et peut être importé
 * indifféremment côté serveur (Server Components, Server Actions) et côté client.
 *
 * ÉTAPE 4 — Correctif Définitif du Statut des Campagnes
 */

import type { CampaignStatus } from "@/lib/queries/campaigns";

export type { CampaignStatus };

/**
 * Calcule le statut effectif et réel d'une campagne commerciale.
 * 
 * RÈGLES MÉTIER OFFICIELLES :
 * 1. Si le statut DB n'est pas 'active' ('draft', 'paused', 'completed', 'cancelled') :
 *    Le statut persisté fait foi et est retourné tel quel.
 * 2. Si le statut DB est 'active' :
 *    a) Si la campagne a une date de fin globale `end_date` dépassée (< aujourd'hui) :
 *       -> La campagne est TERMINÉE ('completed').
 *    b) Si la campagne possède des destinations (`destinations` ou `campaign_destinations`) :
 *       - Une destination est active si elle n'a pas de `order_deadline_date` (NULL)
 *         OU si son `order_deadline_date >= aujourd'hui`.
 *       - Une destination est terminée si `order_deadline_date < aujourd'hui`.
 *       - Si TOUTES les destinations de la campagne sont terminées (aucune active) :
 *         -> La campagne globale est TERMINÉE ('completed').
 *       - Si au moins UNE destination reste active :
 *         -> La campagne globale reste ACTIVE ('active').
 *    c) Dans tous les autres cas :
 *       -> La campagne est ACTIVE ('active').
 *
 * Cette fonction garantit l'alignement strict entre la vue Société et la vue Revendeur.
 */
export function getEffectiveCampaignStatus(campaign: {
  status: CampaignStatus | string;
  start_date?: string | null;
  end_date?: string | null;
  destinations?: Array<{ order_deadline_date?: string | null; [key: string]: any }> | null;
  campaign_destinations?: Array<{ order_deadline_date?: string | null; [key: string]: any }> | null;
}): CampaignStatus {
  const { status, end_date } = campaign;
  const destinations = campaign.destinations || campaign.campaign_destinations || null;

  // Si non actif en DB, le statut fait foi
  if (status !== "active") {
    return (status as CampaignStatus) || "draft";
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Vérification de la date globale de fin
  if (end_date && end_date < todayStr) {
    return "completed";
  }

  // 2. Vérification des destinations si configurées
  if (destinations && destinations.length > 0) {
    const hasActiveDestination = destinations.some((d) => {
      // Sans date limite propre, la destination reste active tant que la campagne ne l'est pas
      if (!d.order_deadline_date) {
        return true;
      }
      return d.order_deadline_date >= todayStr;
    });

    // Si toutes les destinations sont expirées → campagne terminée
    if (!hasActiveDestination) {
      return "completed";
    }
  }

  return "active";
}

/**
 * Prédicat déterminant si une campagne est active et ouverte aux commandes.
 */
export function isCampaignActive(campaign: {
  status: CampaignStatus | string;
  start_date?: string | null;
  end_date?: string | null;
  destinations?: Array<{ order_deadline_date?: string | null; [key: string]: any }> | null;
  campaign_destinations?: Array<{ order_deadline_date?: string | null; [key: string]: any }> | null;
}): boolean {
  return getEffectiveCampaignStatus(campaign) === "active";
}

/**
 * Retourne un résumé de l'état des destinations pour l'affichage détaillé.
 */
export function getCampaignDestinationsSummary(
  destinations:
    | Array<{ order_deadline_date?: string | null; city_name?: string; [key: string]: any }>
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
