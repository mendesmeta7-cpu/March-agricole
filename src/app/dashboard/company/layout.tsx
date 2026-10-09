import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company");
  }

  // Vérifier rôle profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // Isolation stricte : seul le rôle "company" est admis dans cet espace.
  // Un admin ne doit JAMAIS hériter de l'espace société, même via navigation arrière.
  if (profile?.role !== "company") {
    redirect("/unauthorized");
  }

  // Récupérer l'entreprise liée (via membership ou créateur direct)
  const { data: memberData } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let companyId = memberData?.company_id;
  if (!companyId) {
    const { data: comp } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", user.id)
      .maybeSingle();
    companyId = comp?.id;
  }

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
      userName={profile?.full_name}
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
