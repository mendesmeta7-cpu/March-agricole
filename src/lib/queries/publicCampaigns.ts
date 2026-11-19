import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMalformedIdError } from "@/lib/utils/readErrors";
import { isCampaignActive } from "@/lib/utils/campaignStatus";
import {
  PUBLIC_CAMPAIGN_SELECT,
  PUBLIC_PRODUCTION_STATUSES,
  toPublicCampaign,
  type PublicCampaign,
} from "@/lib/utils/publicCampaign";

/**
 * Lecture d'une campagne pour la page de consultation publique `/campaigns/[id]` (Lot UX/UI 5B,
 * ADR-058). Renvoie null pour toute campagne qui n'est pas consultable publiquement : statut autre
 * que `active`, campagne close par date (règle 6), société inactive, produit hors catalogue public,
 * production privée ou hors cycle actif, identifiant mal formé. Les filtres sont explicites et
 * indépendants de l'utilisateur connecté : la société propriétaire, l'administration ou un
 * revendeur qui y a commandé ne voient pas plus sur cette page qu'un visiteur non connecté.
 * Les dépôts ne sont jamais lus. Une panne de lecture lève une erreur (jamais « indisponible »).
 *
 * `cache` : la page et ses métadonnées partagent la même lecture au cours d'une requête.
 */
export const getPublicCampaign = cache(async (campaignId: string): Promise<PublicCampaign | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(PUBLIC_CAMPAIGN_SELECT)
    .eq("id", campaignId)
    .eq("status", "active")
    .eq("company.is_active", true)
    .eq("product.is_global", true)
    .eq("product.is_active", true)
    .eq("production.is_public", true)
    .in("production.status", [...PUBLIC_PRODUCTION_STATUSES])
    .maybeSingle();

  if (error && !isMalformedIdError(error)) {
    console.error("Erreur lecture campagne publique:", error);
    throw new Error("Lecture de la campagne impossible");
  }
  if (!data) return null;

  const raw = data as unknown as Record<string, unknown> & {
    status: string;
    end_date?: string | null;
    destinations?: Array<{ order_deadline_date?: string | null }> | null;
  };

  // Règle 6 / C2 : date de fin dépassée ou toutes les destinations closes → plus active
  if (!isCampaignActive(raw)) return null;

  return toPublicCampaign(raw);
});
