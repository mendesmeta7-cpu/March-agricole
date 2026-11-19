import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect, notFound } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import { getCompanyCampaignById, getCompanyEligibleProductions } from "@/lib/queries/campaigns";
import { getAggregatedMarketDemands } from "@/lib/queries/demands";
import CampaignForm from "@/components/campaigns/CampaignForm";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Modifier la campagne — Radiza" };

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Modification d'une campagne sur page dédiée à sections (Lot UX/UI 5B, ADR-058). Même formulaire,
 * mêmes contrôles et même action serveur (updateCampaignAction) que l'ancienne modale. La campagne
 * n'est lue que pour la société courante : une campagne d'une autre société donne une page introuvable.
 */
export default async function EditCompanyCampaignPage(props: EditCampaignPageProps) {
  const { id } = await props.params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/campaigns/${encodeURIComponent(id)}/edit`);
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  const { data: companyRecord, error: companyError } = await supabase
    .from("companies")
    .select("country_id")
    .eq("id", companyId)
    .single();
  const countryId = companyRecord?.country_id;

  const [campaign, eligibleProductions, provincesResult, marketDemandsRead] = await Promise.all([
    getCompanyCampaignById(id, companyId),
    getCompanyEligibleProductions(companyId),
    countryId
      ? supabase.from("provinces").select("id, country_id, code, name").eq("country_id", countryId).order("name")
      : Promise.resolve({ data: [], error: null }),
    settleRead(getAggregatedMarketDemands(), []),
  ]);

  if (!campaign) {
    notFound();
  }

  // Sans provinces, les destinations seraient inutilisables : pas de faux vide.
  if (companyError || provincesResult.error) {
    throw new Error("Lecture des provinces impossible");
  }

  return (
    <>
      {marketDemandsRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Demande du marché indisponible">
          L&apos;indication de la demande du marché n&apos;a pas pu être chargée.
        </DataUnavailableNotice>
      )}
      <CampaignForm
        mode="sections"
        campaignToEdit={campaign}
        eligibleProductions={eligibleProductions}
        provinces={provincesResult.data || []}
        marketDemands={marketDemandsRead.data}
      />
    </>
  );
}
