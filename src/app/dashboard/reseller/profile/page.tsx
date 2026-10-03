import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResellerProfileView from "@/components/reseller/ResellerProfileView";

export default async function ResellerProfilePage() {
  const supabase = createClient();
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
      ordersCount={ordersCountRes.count || 0}
      demandsCount={demandsCountRes.count || 0}
    />
  );
}
