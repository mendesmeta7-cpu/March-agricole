import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { getCompanyOrders } from "@/lib/queries/orders";
import CompanyOrdersView from "@/components/orders/CompanyOrdersView";

export default async function CompanyOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/orders");
  }

  // 1. Entreprise rattachée (membre ou créateur) — résolution mutualisée et mise en cache (FUN-18)
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  // 2. Chargement des commandes reçues
  const orders = await getCompanyOrders(companyId);

  return <CompanyOrdersView initialOrders={orders} />;
}
