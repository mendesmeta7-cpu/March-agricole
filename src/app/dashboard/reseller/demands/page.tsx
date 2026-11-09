import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import { getResellerDemands } from "@/lib/queries/demands";
import { getCatalogProducts } from "@/lib/queries/products";
import ResellerDemandsView from "@/components/demands/ResellerDemandsView";

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
  const [demands, catalogRead, countriesRes, provincesRes, companiesRes] = await Promise.all([
    getResellerDemands(user.id),
    settleRead(getCatalogProducts(), []),
    supabase.from("countries").select("id, code, name, currency_code").eq("is_active", true).order("name"),
    supabase.from("provinces").select("id, country_id, code, name").order("name"),
    supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
  ]);

  const countries = countriesRes.data || [];
  const provinces = provincesRes.data || [];
  const companies = companiesRes.data || [];

  return (
    <>
      {catalogRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Catalogue de produits indisponible">
          Vos demandes sont affichées, mais le catalogue n&apos;a pas pu être chargé. Réessayez
          avant de publier une nouvelle demande.
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
