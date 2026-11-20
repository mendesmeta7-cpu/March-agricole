import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import { readRows } from "@/lib/utils/readErrors";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import { getAggregatedMarketDemands, getCompanyGeneralDemands } from "@/lib/queries/demands";
import { getCatalogProducts } from "@/lib/queries/products";
import MarketDemandsAnalysisView from "@/components/demands/MarketDemandsAnalysisView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Demandes du marché — Radiza" };

export default async function CompanyDemandsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/demands");
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
    .single();

  // 2. Chargement des demandes générales, agrégats, produits catalogue, provinces et productions de l'entreprise
  // Lot 2C : provinces et productions sont des lectures secondaires, leur panne est signalée
  const [generalDemands, aggregatesRead, catalogRead, provincesRead, productionsRead] = await Promise.all([
    getCompanyGeneralDemands(companyId),
    settleRead(getAggregatedMarketDemands(), []),
    settleRead(getCatalogProducts(), []),
    settleRead(
      readRows(supabase.from("provinces").select("id, country_id, code, name").order("name"), "provinces"),
      []
    ),
    settleRead(
      readRows(
        supabase
          .from("productions")
          .select("id, title, expected_quantity, unit, status, product_id")
          .eq("company_id", companyId)
          .in("status", ["growing", "harvested"])
          .order("created_at", { ascending: false }),
        "productions de la société"
      ),
      []
    ),
  ]);

  const provinces = provincesRead.data;
  const companyProductions = productionsRead.data;

  return (
    <>
      {(aggregatesRead.failed || catalogRead.failed) && (
        <DataUnavailableNotice className="mb-4" title="Analyse du marché incomplète">
          Les demandes sont affichées, mais les données agrégées ou le catalogue n&apos;ont pas pu
          être chargés. Ne vous fiez pas à l&apos;analyse du marché pour le moment.
        </DataUnavailableNotice>
      )}
      {productionsRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Vos productions sont indisponibles">
          Les demandes sont affichées, mais vos productions n&apos;ont pas pu être chargées.
          Réessayez avant de faire une proposition.
        </DataUnavailableNotice>
      )}
      {provincesRead.failed && (
        <DataUnavailableNotice className="mb-4" title="Liste des provinces indisponible">
          Les demandes sont affichées, mais le filtre par province est incomplet. Réessayez dans
          un instant.
        </DataUnavailableNotice>
      )}
      <MarketDemandsAnalysisView
        initialGeneralDemands={generalDemands}
        initialAggregates={aggregatesRead.data}
        catalogProducts={catalogRead.data}
        provinces={provinces}
        companyProductions={companyProductions}
        productionsUnavailable={productionsRead.failed}
        companyName={company?.name || "Société"}
      />
    </>
  );
}
