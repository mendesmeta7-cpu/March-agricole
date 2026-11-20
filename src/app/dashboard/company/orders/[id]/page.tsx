import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect, notFound } from "next/navigation";
import { getCompanyOrderById } from "@/lib/queries/orders";
import CompanyOrderDetailView from "@/components/orders/CompanyOrderDetailView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Détail de la commande — Radiza" };

interface CompanyOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyOrderDetailPage(props: CompanyOrderDetailPageProps) {
  const params = await props.params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/orders/${params.id}`);
  }

  // 1. Entreprise rattachée (membre ou créateur) — résolution mutualisée et mise en cache (FUN-18)
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  const order = await getCompanyOrderById(params.id, companyId);

  if (!order) {
    notFound();
  }

  return <CompanyOrderDetailView order={order} />;
}
