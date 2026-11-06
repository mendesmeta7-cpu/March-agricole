import { createClient } from "@/lib/supabase/server";
import { getPublicFeedProductions } from "@/lib/queries/feed";
import { getActiveFeedCategories } from "@/lib/queries/feedCategories";
import { getActiveFeedBanners } from "@/lib/queries/feedBanners";
import FeedView from "@/components/feed/FeedView";
import { isCampaignActive } from "@/lib/utils/campaignStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResellerDashboardPage() {
  const supabase = await createClient();
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
  const [feedResult, feedCategories, banners, provincesData, activeCampaignsRes] = await Promise.all([
    getPublicFeedProductions({
      reseller,
      resellerProvinceId: reseller?.province_id,
      resellerCountryId: reseller?.country_id,
    }),
    getActiveFeedCategories(),
    getActiveFeedBanners(),
    supabase.from("provinces").select("id, name").order("name", { ascending: true }),
    // FUN-21 : le statut brut 'active' inclut des campagnes expirées (end_date ou
    // échéances de toutes les destinations dépassées) ; le statut effectif est
    // calculé avec la source unique de vérité (campaignStatus.ts).
    supabase
      .from("campaigns")
      .select("id, status, start_date, end_date, campaign_destinations (order_deadline_date)")
      .eq("status", "active"),
  ]);

  const provinces = (provincesData.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  if (activeCampaignsRes.error) {
    console.error("Erreur comptage des campagnes actives (flux revendeur):", activeCampaignsRes.error);
  }
  const campaignsCount = (activeCampaignsRes.data || []).filter((c: any) => isCampaignActive(c)).length;

  return (
    <div className="w-full">
      {/* Vue principale du Flux des Productions Mobile-First */}
      <FeedView
        initialItems={feedResult.items}
        totalCount={feedResult.totalCount}
        initialError={feedResult.error}
        categories={feedCategories}
        banners={banners}
        provinces={provinces}
        campaignsCount={campaignsCount}
      />
    </div>
  );
}
