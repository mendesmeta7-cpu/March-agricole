import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCompanyProductions } from "@/lib/queries/productions";
import { getCompanyProducts } from "@/lib/queries/products";
import CompanyProductionsView from "@/components/productions/CompanyProductionsView";

export default async function CompanyProductionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/productions");
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
