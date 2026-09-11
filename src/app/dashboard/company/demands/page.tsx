import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAggregatedMarketDemands } from "@/lib/queries/demands";
import { getCatalogProducts } from "@/lib/queries/products";
import MarketDemandsAnalysisView from "@/components/demands/MarketDemandsAnalysisView";

export default async function CompanyDemandsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/demands");
  }

  // 1. Récupération de l'entreprise connectée
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("created_by", user.id)
    .maybeSingle();

  if (!company) {
    redirect("/dashboard/company");
  }

  // 2. Chargement des agrégats territoriaux et des données de filtrage
  const [aggregates, catalogProducts, provincesRes] = await Promise.all([
    getAggregatedMarketDemands(),
    getCatalogProducts(),
    supabase.from("provinces").select("id, country_id, code, name").order("name"),
  ]);

  const provinces = provincesRes.data || [];

  return (
    <MarketDemandsAnalysisView
      initialAggregates={aggregates}
      catalogProducts={catalogProducts}
      provinces={provinces}
      companyName={company.name}
    />
  );
}
