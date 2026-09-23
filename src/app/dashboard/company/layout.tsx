import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";

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

  if (profile?.role !== "company" && profile?.role !== "admin") {
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

  const [companyRes, unreadCount] = await Promise.all([
    companyId
      ? supabase
          .from("companies")
          .select("name, logo_url, provinces(name), countries(name)")
          .eq("id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getUnreadNotificationCount(user.id),
  ]);

  const company = companyRes.data;
  const locationInfo = company
    ? `${(company as any).provinces?.name || "Province"}, ${(company as any).countries?.name || "RDC"}`
    : undefined;

  return (
    <DashboardLayout
      role="company"
      entityName={company?.name}
      userName={profile?.full_name}
      userEmail={user.email}
      locationInfo={locationInfo}
      logoUrl={company?.logo_url}
      unreadNotificationsCount={unreadCount}
    >
      {children}
    </DashboardLayout>
  );
}
