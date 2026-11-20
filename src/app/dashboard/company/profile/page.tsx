import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompanyProfileView from "@/components/company/profile/CompanyProfileView";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Profil de la société — Radiza" };

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

  const { data: company, error: companyError } = companyId
    ? await supabase
        .from("companies")
        .select(
          "id, name, slug, description, address, city, phone, email, verification_status, logo_url, created_at, provinces(id, name, code), countries(id, name, code)"
        )
        .eq("id", companyId)
        .maybeSingle()
    : { data: null, error: null };

  // Lot 7 : une panne de lecture ne doit pas s'afficher comme un compte sans société.
  // Même traitement que le tableau de bord : écran d'erreur de l'espace avec « Réessayer ».
  if (companyError) {
    console.error("Erreur chargement société (profil):", companyError);
    throw new Error("Lecture de la société impossible");
  }

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

  // Lot 7 : un compteur dont la lecture échoue est transmis comme indisponible (null), jamais
  // comme 0 ; 0 n'est affiché que si une lecture réussie le confirme. Requêtes inchangées.
  const productionsCount = productionsRes.error ? null : (productionsRes.count ?? 0);
  const campaignsCount = campaignsRes.error ? null : (campaignsRes.count ?? 0);
  const ordersCount = ordersRes.error ? null : (ordersRes.count ?? 0);

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
