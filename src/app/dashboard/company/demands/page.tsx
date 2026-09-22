import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAggregatedMarketDemands, getCompanyGeneralDemands } from "@/lib/queries/demands";
import { getCatalogProducts } from "@/lib/queries/products";
import MarketDemandsAnalysisView from "@/components/demands/MarketDemandsAnalysisView";

export default async function CompanyDemandsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/demands");
  }

  // 1. Récupération de l'entreprise connectée
  const { data: memberData } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let companyId = memberData?.company_id;

  if (!companyId) {
    const { data: comp } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", user.id)
      .maybeSingle();
    companyId = comp?.id;
  }

  if (!companyId) {
    redirect("/dashboard/company");
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
