import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect, notFound } from "next/navigation";
import { getProductionById } from "@/lib/queries/productions";
import { getCompanyProducts } from "@/lib/queries/products";
import { getProductionDemandsAnalysis } from "@/lib/queries/demands";
import ProductionDetailView from "@/components/productions/ProductionDetailView";

interface ProductionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyProductionDetailPage(props: ProductionDetailPageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/productions/${params.id}`);
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
