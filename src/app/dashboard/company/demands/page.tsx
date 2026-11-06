import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { getAggregatedMarketDemands, getCompanyGeneralDemands } from "@/lib/queries/demands";
import { getCatalogProducts } from "@/lib/queries/products";
import MarketDemandsAnalysisView from "@/components/demands/MarketDemandsAnalysisView";

export default async function CompanyDemandsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/demands");
  }

  // 1. Entreprise rattachée (membre ou créateur) — résolution mutualisée et mise en cache (FUN-18)
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();

  // 2. Chargement des demandes générales, agrégats, produits catalogue, provinces et productions de l'entreprise
  const [generalDemands, aggregates, catalogProducts, provincesRes, productionsRes] = await Promise.all([
    getCompanyGeneralDemands(companyId),
    getAggregatedMarketDemands(),
    getCatalogProducts(),
    supabase.from("provinces").select("id, country_id, code, name").order("name"),
    supabase
      .from("productions")
      .select("id, title, expected_quantity, unit, status, product_id")
      .eq("company_id", companyId)
      .in("status", ["growing", "harvested"])
      .order("created_at", { ascending: false }),
  ]);

  const provinces = provincesRes.data || [];
  const companyProductions = productionsRes.data || [];

  return (
    <MarketDemandsAnalysisView
      initialGeneralDemands={generalDemands}
      initialAggregates={aggregates}
      catalogProducts={catalogProducts}
      provinces={provinces}
      companyProductions={companyProductions}
      companyName={company?.name || "Exploitation agricole"}
    />
  );
}
