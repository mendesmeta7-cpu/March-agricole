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

  // 1. Récupération de l'entreprise rattachée à l'utilisateur (membership ou créateur)
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
