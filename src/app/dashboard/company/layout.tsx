import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

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

  // Récupérer l'entreprise liée
  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url, provinces(name), countries(name)")
    .eq("created_by", user.id)
    .maybeSingle();

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
    >
      {children}
    </DashboardLayout>
  );
}
