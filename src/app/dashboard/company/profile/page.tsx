import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompanyProfileView from "@/components/company/profile/CompanyProfileView";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Profil du fondateur / gérant
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Exploitation agricole rattachée (membre ou créateur) — helper mutualisé (FUN-18)
  const companyId = await getCurrentCompanyId();

  const { data: company } = companyId
    ? await supabase
        .from("companies")
        .select(
          "id, name, slug, description, address, city, phone, email, verification_status, logo_url, created_at, provinces(id, name, code), countries(id, name, code)"
        )
        .eq("id", companyId)
        .maybeSingle()
    : { data: null };

  // Aucune entreprise trouvée : message explicite, sans redirection (évite les boucles).
  if (!company) {
    return <CompanyAccountMissing />;
  }

  // 3. Chiffres d'activité réels (Données 100% authentiques Supabase)
  const [productionsRes, campaignsRes, ordersRes] = await Promise.all([
    supabase
      .from("productions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
  ]);

  const productionsCount = productionsRes.count || 0;
  const campaignsCount = campaignsRes.count || 0;
  const ordersCount = ordersRes.count || 0;

  return (
    <CompanyProfileView
      user={{ id: user.id, email: user.email }}
      profile={profile}
      company={company as any}
      productionsCount={productionsCount}
      campaignsCount={campaignsCount}
      ordersCount={ordersCount}
    />
  );
}
