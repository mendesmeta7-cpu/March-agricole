import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import {
  getCompanyCampaigns,
  getCompanyEligibleProductions,
} from "@/lib/queries/campaigns";
import { getAggregatedMarketDemands } from "@/lib/queries/demands";
import CompanyCampaignsView from "@/components/campaigns/CompanyCampaignsView";

interface NewCampaignPageProps {
  searchParams?: Promise<{
    production_id?: string;
  }>;
}

export default async function NewCompanyCampaignPage(props: NewCampaignPageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/campaigns/new");
  }

  // 1. Entreprise rattachée (membre ou créateur) — résolution mutualisée et mise en cache (FUN-18)
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  // Récupération du pays de l'entreprise
  const { data: companyRecord, error: companyError } = await supabase
    .from("companies")
    .select("country_id")
    .eq("id", companyId)
    .single();

  const countryId = companyRecord?.country_id;

  // 2. Chargement simultané des données
  const [campaigns, eligibleProductions, provincesResult, marketDemandsRead] =
    await Promise.all([
      getCompanyCampaigns(companyId),
      getCompanyEligibleProductions(companyId),
      countryId
        ? supabase
            .from("provinces")
            .select("id, country_id, code, name")
            .eq("country_id", countryId)
            .order("name")
        : Promise.resolve({ data: [], error: null }),
      settleRead(getAggregatedMarketDemands(), []),
    ]);

  // Sans provinces, le formulaire ouvert serait inutilisable : pas de faux vide.
  if (companyError || provincesResult.error) {
    throw new Error("Lecture des provinces impossible");
  }

  const provinces = provincesResult.data || [];

  return (
    <>
      {marketDemandsRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Demande du marché indisponible">
          L&apos;indication de la demande du marché n&apos;a pas pu être chargée.
        </DataUnavailableNotice>
      )}
      <CompanyCampaignsView
        initialCampaigns={campaigns}
        eligibleProductions={eligibleProductions}
        provinces={provinces}
        marketDemands={marketDemandsRead.data}
        initialModalOpen={true}
        defaultProductionId={searchParams?.production_id}
      />
    </>
  );
}
