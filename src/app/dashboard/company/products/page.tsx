import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
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

  // 2. Récupération simultanée des données réelles
  const [catalogRead, companyProducts] = await Promise.all([
    settleRead(getCatalogProducts(), []),
    getCompanyProducts(company.id),
  ]);

  return (
    <>
      {catalogRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Catalogue général indisponible">
          Vos produits sont affichés, mais le catalogue général n&apos;a pas pu être chargé.
          Réessayez avant d&apos;ajouter un produit.
        </DataUnavailableNotice>
      )}
      <CompanyProductsView
        initialItems={companyProducts}
        catalogProducts={catalogRead.data}
        companyName={company.name}
      />
    </>
  );
}
