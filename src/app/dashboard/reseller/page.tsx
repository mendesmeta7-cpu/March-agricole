import { createClient } from "@/lib/supabase/server";
import { getPublicFeedProductions } from "@/lib/queries/feed";
import FeedView from "@/components/feed/FeedView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResellerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Récupération du profil et du revendeur
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, business_name, country_id, province_id, reseller_type, city, delivery_address, provinces(id, name, code), countries(id, name, code)")
    .eq("id", user!.id)
    .maybeSingle();

  // 2. Récupération des productions publiques réelles pour le feed avec le contexte revendeur
  const feedResult = await getPublicFeedProductions({
    reseller,
    resellerProvinceId: reseller?.province_id,
    resellerCountryId: reseller?.country_id,
  });

  // 3. Catégories distinctes depuis products (actifs)
  const { data: categoriesData } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true);

  const categories = Array.from(
    new Set((categoriesData || []).map((p: any) => p.category).filter(Boolean))
  ).sort() as string[];

  // 4. Provinces actives
  const { data: provincesData } = await supabase
    .from("provinces")
    .select("id, name")
    .order("name", { ascending: true });

  const provinces = (provincesData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  // 5. Comptage des campagnes actives pour la mise en avant
  const { count: campaignsCount } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <div className="w-full">
      {/* Vue principale du Flux des Productions Mobile-First */}
      <FeedView
        initialItems={feedResult.items}
        totalCount={feedResult.totalCount}
        categories={categories}
        provinces={provinces}
        campaignsCount={campaignsCount || 0}
      />
    </div>
  );
}
