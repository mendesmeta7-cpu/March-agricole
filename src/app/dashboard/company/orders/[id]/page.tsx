import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect, notFound } from "next/navigation";
import { getCompanyOrderById } from "@/lib/queries/orders";
import CompanyOrderDetailView from "@/components/orders/CompanyOrderDetailView";

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
