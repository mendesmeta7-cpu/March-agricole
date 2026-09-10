import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getProductionById } from "@/lib/queries/productions";
import { getCompanyProducts } from "@/lib/queries/products";
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

  // 1. Récupération de l'entreprise rattachée à l'utilisateur
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("created_by", user.id)
    .maybeSingle();

  if (!company) {
    redirect("/dashboard/company");
  }

  // 2. Récupération de la production et des produits de l'entreprise
  const [production, companyProducts] = await Promise.all([
    getProductionById(params.id, company.id),
    getCompanyProducts(company.id),
  ]);

  if (!production) {
    notFound();
  }

  return (
    <ProductionDetailView
      production={production}
      companyProducts={companyProducts}
      companyName={company.name}
    />
  );
}
