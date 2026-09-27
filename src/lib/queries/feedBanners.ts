import { createClient } from "@/lib/supabase/server";

export interface FeedBannerItem {
  id: string;
  title: string;
  subtitle: string | null;
  button_label: string | null;
  button_url: string | null;
  image_url: string;
  cloudinary_public_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère les bannières actives pour le carrousel du Flux Revendeur
 */
export async function getActiveFeedBanners(): Promise<FeedBannerItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("feed_banners")
    .select("id, title, subtitle, button_label, button_url, image_url, cloudinary_public_id, is_active, sort_order, created_at, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération des bannières du flux :", error.message);
    return [];
  }

  return (data || []) as FeedBannerItem[];
}

/**
 * Récupère toutes les bannières pour l'espace d'administration
 */
export async function getAllFeedBannersAdmin(): Promise<FeedBannerItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("feed_banners")
    .select("id, title, subtitle, button_label, button_url, image_url, cloudinary_public_id, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur getAllFeedBannersAdmin :", error.message);
    return [];
  }

  return (data || []) as FeedBannerItem[];
}
