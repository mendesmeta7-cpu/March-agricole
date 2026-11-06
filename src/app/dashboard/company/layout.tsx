import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentCompanyId, getCurrentProfile, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyDashboardLayout from "@/components/company/CompanyDashboardLayout";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { getCompanyPendingOrdersCount } from "@/lib/queries/orders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company");
  }

  // Profil et entreprise résolus en parallèle via les helpers mis en cache (PERF-02 / FUN-18).
  const [profile, companyId] = await Promise.all([
    getCurrentProfile(),
    getCurrentCompanyId(),
  ]);

  // Isolation stricte : seul le rôle "company" est admis dans cet espace.
  // Un admin ne doit JAMAIS hériter de l'espace société, même via navigation arrière.
  if (profile?.role !== "company") {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const [companyRes, unreadCount, pendingOrdersCount] = await Promise.all([
    companyId
      ? supabase
          .from("companies")
          .select("name, logo_url, provinces(name), countries(name)")
          .eq("id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getUnreadNotificationCount(user.id),
    companyId ? getCompanyPendingOrdersCount(companyId) : Promise.resolve(0),
  ]);

  const company = companyRes.data;
  const locationInfo = company
    ? `${(company as any).provinces?.name || "Province"}, ${(company as any).countries?.name || "RDC"}`
    : undefined;

  return (
    <CompanyDashboardLayout
      entityName={company?.name}
      userName={profile?.full_name ?? undefined}
      userEmail={user.email}
      locationInfo={locationInfo}
      logoUrl={company?.logo_url}
      unreadNotificationsCount={unreadCount}
      pendingOrdersCount={pendingOrdersCount}
    >
      {children}
    </CompanyDashboardLayout>
  );
}
