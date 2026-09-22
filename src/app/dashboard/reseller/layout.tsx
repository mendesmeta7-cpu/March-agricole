import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";

export default async function ResellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller");
  }

  // Vérifier rôle profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reseller" && profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  // Récupérer le revendeur lié et le nombre de notifications non lues
  const [resellerRes, unreadCount] = await Promise.all([
    supabase
      .from("resellers")
      .select("business_name, provinces(name), countries(name)")
      .eq("id", user.id)
      .maybeSingle(),
    getUnreadNotificationCount(user.id),
  ]);

  const reseller = resellerRes.data;
  const locationInfo = reseller
    ? `${(reseller as any).provinces?.name || "Province"}, ${(reseller as any).countries?.name || "RDC"}`
    : undefined;

  return (
    <DashboardLayout
      role="reseller"
      entityName={reseller?.business_name}
      userName={profile?.full_name}
      userEmail={user.email}
      locationInfo={locationInfo}
      unreadNotificationsCount={unreadCount}
    >
      {children}
    </DashboardLayout>
  );
}
