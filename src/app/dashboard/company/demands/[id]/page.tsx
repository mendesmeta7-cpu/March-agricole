import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { getDemandById } from "@/lib/queries/demands";
import { notFound, redirect } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import { readOptionalRow, readRows } from "@/lib/utils/readErrors";
import CompanyDemandDetailView from "@/components/demands/CompanyDemandDetailView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Détail de la demande — Radiza" };

interface CompanyDemandDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyDemandDetailPage(props: CompanyDemandDetailPageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/demands/${params.id}`);
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

  // 2. Chargement de la demande exacte
  const demand = await getDemandById(params.id);

  if (!demand) {
    notFound();
  }

  // 3. Chargement conjoint des productions de l'entreprise, de la proposition existante et du revendeur
  // Lot 2C : productions et proposition sont des lectures isolées. Une proposition illisible
  // n'est jamais présentée comme absente : le formulaire de nouvelle proposition est bloqué.
  const productionsQuery = supabase
    .from("productions")
    .select("id, title, expected_quantity, unit, status, product_id")
    .eq("company_id", companyId)
    .in("status", ["growing", "harvested"])
    .order("created_at", { ascending: false });

  const proposalQuery = supabase
    .from("demand_responses")
    .select(`
      id,
      demand_id,
      company_id,
      production_id,
      status,
      proposed_quantity,
      unit,
      unit_price,
      currency,
      message,
      created_at,
      updated_at,
      production:productions (
        id,
        title,
        status,
        expected_quantity,
        unit
      )
    `)
    .eq("demand_id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();

  const [productionsRead, proposalRead, resellerRes] = await Promise.all([
    settleRead(readRows(productionsQuery, "productions de la société"), []),
    settleRead(readOptionalRow(proposalQuery, "proposition existante"), null),
    supabase
      .from("resellers")
      .select("business_name, reseller_type, city")
      .eq("id", demand.reseller_id)
      .maybeSingle(),
  ]);

  const companyProductions = productionsRead.data;
  const proposalRow = proposalRead.data;
  const myProposal = proposalRow
    ? {
        ...proposalRow,
        proposed_quantity: Number(proposalRow.proposed_quantity || 0),
        unit_price: Number(proposalRow.unit_price || 0),
        production: Array.isArray(proposalRow.production)
          ? proposalRow.production[0]
          : proposalRow.production,
      }
    : null;

  // Après « Réessayer », l'état local de la vue repart des données relues
  // dès que l'une des deux lectures isolées change d'état.
  return (
    <CompanyDemandDetailView
      key={`${proposalRead.failed ? "proposition-illisible" : "proposition-lue"}-${productionsRead.failed ? "productions-illisibles" : "productions-lues"}`}
      demand={demand}
      companyProductions={companyProductions}
      myProposal={myProposal as any}
      proposalUnavailable={proposalRead.failed}
      productionsUnavailable={productionsRead.failed}
      companyName={company?.name || "Société"}
      resellerInfo={resellerRes.data}
    />
  );
}
