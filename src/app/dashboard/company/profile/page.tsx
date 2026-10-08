import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompanyProfileView from "@/components/company/profile/CompanyProfileView";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default async function CompanyProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Profil du fondateur / gérant
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Recherche de l'exploitation agricole (par created_by ou company_members)
  const { data: member } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  let companyQuery = supabase
    .from("companies")
    .select(
      "id, name, slug, description, address, city, phone, email, verification_status, logo_url, created_at, provinces(id, name, code), countries(id, name, code)"
    );

  if (member?.company_id) {
    companyQuery = companyQuery.eq("id", member.company_id);
  } else {
    companyQuery = companyQuery.eq("created_by", user.id);
  }

  const { data: company } = await companyQuery.maybeSingle();

  // Si aucune entreprise n'est trouvée (compte incomplet)
  if (!company) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard/company"
            className="hover:text-forest-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-forest-50 text-forest-700 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Aucune exploitation agricole rattachée
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Votre compte utilisateur est bien actif, mais aucune entreprise agricole n&apos;est encore enregistrée sous votre profil.
          </p>
          <div className="pt-2">
            <Link href="/onboarding">
              <Button variant="primary">Créer mon exploitation agricole</Button>
            </Link>
          </div>
        </div>
      </div>
    );
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
