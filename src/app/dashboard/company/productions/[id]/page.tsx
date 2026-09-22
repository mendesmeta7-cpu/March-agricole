import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getProductionById } from "@/lib/queries/productions";
import { getCompanyProducts } from "@/lib/queries/products";
import { getProductionDemandsAnalysis } from "@/lib/queries/demands";
import ProductionDetailView from "@/components/productions/ProductionDetailView";

interface ProductionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CompanyProductionDetailPage({
  params,
}: ProductionDetailPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/productions/${params.id}`);
  }

  // 1. Récupération de l'entreprise rattachée à l'utilisateur (via membership ou créateur)
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

  // 2. Récupération conjointe : production, produits de l'entreprise et analyse des demandes
  const [production, companyProducts, demandsAnalysis] = await Promise.all([
    getProductionById(params.id, companyId),
    getCompanyProducts(companyId),
    getProductionDemandsAnalysis(params.id),
  ]);

  if (!production) {
    notFound();
  }

  return (
    <ProductionDetailView
      production={production}
      companyProducts={companyProducts}
      companyName={company?.name || "Exploitation agricole"}
      demandsAnalysis={demandsAnalysis}
    />
  );
}
