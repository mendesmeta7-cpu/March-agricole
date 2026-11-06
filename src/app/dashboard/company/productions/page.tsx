import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { getCompanyProductions } from "@/lib/queries/productions";
import { getCompanyProducts } from "@/lib/queries/products";
import CompanyProductionsView from "@/components/productions/CompanyProductionsView";

export default async function CompanyProductionsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/productions");
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

  // 2. Récupération simultanée des données réelles (productions + produits configurés)
  const [productions, companyProducts] = await Promise.all([
    getCompanyProductions(company.id),
    getCompanyProducts(company.id),
  ]);

  return (
    <CompanyProductionsView
      initialProductions={productions}
      companyProducts={companyProducts}
      companyName={company.name}
    />
  );
}
