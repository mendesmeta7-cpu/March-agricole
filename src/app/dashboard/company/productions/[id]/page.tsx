import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect, notFound } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import { getProductionById } from "@/lib/queries/productions";
import { getProductionDemandsAnalysis } from "@/lib/queries/demands";
import ProductionDetailView from "@/components/productions/ProductionDetailView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Détail de la production — Radiza" };

interface ProductionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyProductionDetailPage(props: ProductionDetailPageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/productions/${params.id}`);
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

  // 2. Récupération conjointe : production et analyse des demandes (Lot 2C : l'analyse est une
  // lecture secondaire, sa panne est signalée dans sa section). Lot UX/UI 5B : la modification a sa
  // page dédiée, qui lit elle-même les produits ; le détail n'en a plus besoin.
  const [production, analysisRead] = await Promise.all([
    getProductionById(params.id, companyId),
    settleRead<Awaited<ReturnType<typeof getProductionDemandsAnalysis>> | null>(
      getProductionDemandsAnalysis(params.id),
      null
    ),
  ]);

  if (!production) {
    notFound();
  }

  return (
    <ProductionDetailView
      production={production}
      companyName={company?.name || "Société"}
      demandsAnalysis={analysisRead.data ?? undefined}
      demandsAnalysisUnavailable={analysisRead.failed}
    />
  );
}
