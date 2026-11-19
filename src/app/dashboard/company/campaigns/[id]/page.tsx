import { redirect } from "next/navigation";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Campagnes — Radiza" };

interface CompanyCampaignRedirectPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Lot UX/UI 5B (ADR-058) : l'espace privé de la société présente le détail d'une campagne dans le
 * tiroir de la liste. Cette adresse redirige donc vers la liste, tiroir de la campagne ouvert. Les
 * droits restent ceux de la liste (préfixe /dashboard/company réservé au rôle Société, campagnes
 * lues pour la société courante seulement). La page de consultation publique est /campaigns/[id].
 */
export default async function CompanyCampaignRedirectPage(props: CompanyCampaignRedirectPageProps) {
  const { id } = await props.params;
  redirect(`/dashboard/company/campaigns?campagne=${encodeURIComponent(id)}`);
}
