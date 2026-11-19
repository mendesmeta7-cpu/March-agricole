import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import { readRows } from "@/lib/utils/readErrors";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import { getResellerDemands } from "@/lib/queries/demands";
import { getCatalogProducts } from "@/lib/queries/products";
import ResellerDemandsView from "@/components/demands/ResellerDemandsView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Mes demandes — Radiza" };

export default async function ResellerDemandsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller/demands");
  }

  // 1. Récupération des données du revendeur
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, business_name, province_id, country_id")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Chargement simultané des données réelles
  // (Lot 2C : pays, provinces et exploitations sont des lectures secondaires, leur panne est signalée)
  const [demands, catalogRead, countriesRead, provincesRead, companiesRead] = await Promise.all([
    getResellerDemands(user.id),
    settleRead(getCatalogProducts(), []),
    settleRead(
      readRows(
        supabase.from("countries").select("id, code, name, currency_code").eq("is_active", true).order("name"),
        "pays"
      ),
      []
    ),
    settleRead(
      readRows(supabase.from("provinces").select("id, country_id, code, name").order("name"), "provinces"),
      []
    ),
    settleRead(
      readRows(supabase.from("companies").select("id, name").eq("is_active", true).order("name"), "exploitations"),
      []
    ),
  ]);

  const countries = countriesRead.data;
  const provinces = provincesRead.data;
  const companies = companiesRead.data;
  const formListsFailed = countriesRead.failed || provincesRead.failed || companiesRead.failed;

  return (
    <>
      {catalogRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Catalogue de produits indisponible">
          Vos demandes sont affichées, mais le catalogue n&apos;a pas pu être chargé. Réessayez
          avant de publier une nouvelle demande.
        </DataUnavailableNotice>
      )}
      {formListsFailed && (
        <DataUnavailableNotice className="mb-4" title="Formulaire de demande incomplet">
          Vos demandes sont affichées, mais les listes de pays, de provinces ou de sociétés
          n&apos;ont pas pu être chargées. Réessayez avant de publier une demande ou de commander à
          partir d&apos;une proposition.
        </DataUnavailableNotice>
      )}
      <ResellerDemandsView
        initialDemands={demands}
        catalogProducts={catalogRead.data}
        provinces={provinces}
        countries={countries}
        companies={companies}
        resellerProvinceId={reseller?.province_id}
        resellerCountryId={reseller?.country_id}
        businessName={reseller?.business_name}
      />
    </>
  );
}
