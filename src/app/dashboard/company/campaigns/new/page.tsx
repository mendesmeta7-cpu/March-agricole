import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import { getCompanyEligibleProductions } from "@/lib/queries/campaigns";
import { getAggregatedMarketDemands } from "@/lib/queries/demands";
import CampaignForm from "@/components/campaigns/CampaignForm";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Nouvelle campagne — Radiza" };

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
  const [eligibleProductions, provincesResult, marketDemandsRead] =
    await Promise.all([
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
      {/* Lot UX/UI 5B : création sur page dédiée, assistant en cinq étapes */}
      <CampaignForm
        mode="assistant"
        eligibleProductions={eligibleProductions}
        provinces={provinces}
        marketDemands={marketDemandsRead.data}
        defaultProductionId={searchParams?.production_id}
      />
    </>
  );
}
