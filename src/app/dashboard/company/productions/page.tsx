import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
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

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    throw new Error("Lecture de la société impossible");
  }

  if (!company) {
    return <CompanyAccountMissing />;
  }

  // 2. Récupération simultanée des données réelles (productions + produits configurés)
  const [productions, productsRead] = await Promise.all([
    getCompanyProductions(company.id),
    settleRead(getCompanyProducts(company.id), []),
  ]);

  // Sans production à montrer, l'invitation à configurer le catalogue serait un faux vide.
  if (productsRead.failed && productions.length === 0) {
    throw new Error("Lecture des produits de la société impossible");
  }

  return (
    <>
      {productsRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Liste de produits indisponible">
          Vos productions sont affichées, mais vos produits n&apos;ont pas pu être chargés.
          Réessayez avant de créer ou de modifier une production.
        </DataUnavailableNotice>
      )}
      <CompanyProductionsView
        initialProductions={productions}
        companyProducts={productsRead.data}
        companyName={company.name}
      />
    </>
  );
}
