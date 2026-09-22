import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getCompanyCampaigns,
  getCompanyEligibleProductions,
} from "@/lib/queries/campaigns";
import { getAggregatedMarketDemands } from "@/lib/queries/demands";
import CompanyCampaignsView from "@/components/campaigns/CompanyCampaignsView";

interface NewCampaignPageProps {
  searchParams?: {
    production_id?: string;
  };
}

export default async function NewCompanyCampaignPage({
  searchParams,
}: NewCampaignPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/campaigns/new");
  }

  // 1. Récupération de l'entreprise rattachée
  const { data: memberData } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let companyId = memberData?.company_id;

  if (!companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", user.id)
      .maybeSingle();
    companyId = company?.id;
  }

  if (!companyId) {
    redirect("/dashboard/company");
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
      initialModalOpen={true}
      defaultProductionId={searchParams?.production_id}
    />
  );
}
