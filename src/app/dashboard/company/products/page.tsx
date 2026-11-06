import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { getCatalogProducts, getCompanyProducts } from "@/lib/queries/products";
import CompanyProductsView from "@/components/products/CompanyProductsView";

export default async function CompanyProductsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/products");
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
    .maybeSingle();

  if (!company) {
    return <CompanyAccountMissing />;
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
