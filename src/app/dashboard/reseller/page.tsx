import { createClient } from "@/lib/supabase/server";
import { getPublicFeedProductions } from "@/lib/queries/feed";
import { getActiveFeedCategories } from "@/lib/queries/feedCategories";
import { getActiveFeedBanners } from "@/lib/queries/feedBanners";
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

  // 2. Chargement conjoint : feed des productions, catégories visuelles et bannières dynamiques
  const [feedResult, feedCategories, banners, provincesData, campaignsCountRes] = await Promise.all([
    getPublicFeedProductions({
      reseller,
      resellerProvinceId: reseller?.province_id,
      resellerCountryId: reseller?.country_id,
    }),
    getActiveFeedCategories(),
    getActiveFeedBanners(),
    supabase.from("provinces").select("id, name").order("name", { ascending: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const provinces = (provincesData.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  const campaignsCount = campaignsCountRes.count || 0;

  return (
    <div className="w-full">
      {/* Vue principale du Flux des Productions Mobile-First */}
      <FeedView
        initialItems={feedResult.items}
        totalCount={feedResult.totalCount}
        categories={feedCategories}
        banners={banners}
        provinces={provinces}
        campaignsCount={campaignsCount}
      />
    </div>
  );
}
