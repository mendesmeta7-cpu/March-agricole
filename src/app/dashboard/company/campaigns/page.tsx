import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { getCompanyCampaigns } from "@/lib/queries/campaigns";
import CompanyCampaignsView from "@/components/campaigns/CompanyCampaignsView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Campagnes — Radiza" };

interface CompanyCampaignsPageProps {
  searchParams?: Promise<{
    production_id?: string;
    new?: string;
    /** Campagne dont le tiroir de détail s'ouvre à l'arrivée (ancienne route /campaigns/[id]) */
    campagne?: string;
  }>;
}

export default async function CompanyCampaignsPage(props: CompanyCampaignsPageProps) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/campaigns");
  }

  // Lot UX/UI 5B : la création se fait sur la page dédiée. Les anciens liens qui ouvraient la
  // modale (?production_id=, ?new=true) y mènent désormais, production pré-remplie conservée.
  if (searchParams?.production_id || searchParams?.new === "true") {
    const query = searchParams.production_id
      ? `?production_id=${encodeURIComponent(searchParams.production_id)}`
      : "";
    redirect(`/dashboard/company/campaigns/new${query}`);
  }

  // 1. Entreprise rattachée (membre ou créateur) — résolution mutualisée et mise en cache (FUN-18)
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  // 2. Campagnes de la société (le formulaire et ses données sont chargés par les pages dédiées)
  const campaigns = await getCompanyCampaigns(companyId);

  return (
    <CompanyCampaignsView
      initialCampaigns={campaigns}
      initialDetailCampaignId={searchParams?.campagne}
    />
  );
}
