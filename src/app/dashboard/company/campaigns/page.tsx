import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import {
  getCompanyCampaigns,
  getCompanyEligibleProductions,
} from "@/lib/queries/campaigns";
import { getAggregatedMarketDemands } from "@/lib/queries/demands";
import CompanyCampaignsView from "@/components/campaigns/CompanyCampaignsView";

interface CompanyCampaignsPageProps {
  searchParams?: Promise<{
    production_id?: string;
    new?: string;
  }>;
}

export default async function CompanyCampaignsPage(props: CompanyCampaignsPageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/campaigns");
  }

  // 1. Entreprise rattachée (membre ou créateur) — résolution mutualisée et mise en cache (FUN-18)
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  // Récupération du pays de l'entreprise
  const { data: companyRecord } = await supabase
    .from("companies")
    .select("country_id")
    .eq("id", companyId)
    .single();

  const countryId = companyRecord?.country_id;

  // 2. Chargement simultané des données
  const [campaigns, eligibleProductions, provincesResult, marketDemands] =
    await Promise.all([
      getCompanyCampaigns(companyId),
      getCompanyEligibleProductions(companyId),
      countryId
        ? supabase
            .from("provinces")
            .select("id, country_id, code, name")
            .eq("country_id", countryId)
            .order("name")
        : Promise.resolve({ data: [] }),
      getAggregatedMarketDemands(),
    ]);

  const provinces = provincesResult.data || [];

  return (
    <CompanyCampaignsView
      initialCampaigns={campaigns}
      eligibleProductions={eligibleProductions}
      provinces={provinces}
      marketDemands={marketDemands}
      initialModalOpen={!!searchParams?.production_id || searchParams?.new === "true"}
      defaultProductionId={searchParams?.production_id}
    />
  );
}
