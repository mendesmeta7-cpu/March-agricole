import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResellerProfileView from "@/components/reseller/ResellerProfileView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Mon profil — Radiza" };

export default async function ResellerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller/profile");
  }

  // Requêtes parallèles authentiques (0 Mock Data)
  const [profileRes, resellerRes, provincesRes, ordersCountRes, demandsCountRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, role, avatar_url, created_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("resellers")
        .select(
          "id, business_name, province_id, reseller_type, city, delivery_address, created_at, provinces(id, name, code), countries(name, code)"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("provinces")
        .select("id, country_id, code, name")
        .order("name"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("reseller_id", user.id),
      supabase
        .from("demands")
        .select("id", { count: "exact", head: true })
        .eq("reseller_id", user.id),
    ]);

  return (
    <ResellerProfileView
      user={{ id: user.id, email: user.email }}
      profile={profileRes.data}
      reseller={resellerRes.data}
      provinces={provincesRes.data || []}
      // Lot 7 : compteur indisponible (null) si la lecture échoue, jamais un faux 0 ; requêtes inchangées
      ordersCount={ordersCountRes.error ? null : (ordersCountRes.count ?? 0)}
      demandsCount={demandsCountRes.error ? null : (demandsCountRes.count ?? 0)}
    />
  );
}
