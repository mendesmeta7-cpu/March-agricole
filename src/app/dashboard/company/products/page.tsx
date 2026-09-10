import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCatalogProducts, getCompanyProducts } from "@/lib/queries/products";
import CompanyProductsView from "@/components/products/CompanyProductsView";

export default async function CompanyProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/products");
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

  // 2. Récupération simultanée des données réelles
  const [catalogProducts, companyProducts] = await Promise.all([
    getCatalogProducts(),
    getCompanyProducts(company.id),
  ]);

  return (
    <CompanyProductsView
      initialItems={companyProducts}
      catalogProducts={catalogProducts}
      companyName={company.name}
    />
  );
}
