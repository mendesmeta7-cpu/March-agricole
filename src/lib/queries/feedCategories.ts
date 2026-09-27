import { createClient } from "@/lib/supabase/server";

export interface FeedCategoryItem {
  id: string;
  name: string;
  image_url: string | null;
  cloudinary_public_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

/**
 * Récupère les catégories actives pour le Flux Revendeur ordonnées par sort_order
 */
export async function getActiveFeedCategories(): Promise<FeedCategoryItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("feed_categories")
    .select("id, name, image_url, cloudinary_public_id, is_active, sort_order, created_at, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Erreur lors de la récupération des catégories du flux :", error.message);
    return [];
  }

  return (data || []) as FeedCategoryItem[];
}

/**
 * Récupère toutes les catégories pour l'administration (avec comptage de produits associés)
 */
export async function getAllFeedCategoriesAdmin(): Promise<FeedCategoryItem[]> {
  const supabase = createClient();

  const { data: categories, error } = await supabase
    .from("feed_categories")
    .select("id, name, image_url, cloudinary_public_id, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !categories) {
    console.error("Erreur getAllFeedCategoriesAdmin :", error?.message);
    return [];
  }

  // Comptage des produits rattachés à chaque catégorie
  const { data: productCategories } = await supabase
    .from("products")
    .select("category");

  const countMap: Record<string, number> = {};
  (productCategories || []).forEach((p: any) => {
    if (p.category) {
      countMap[p.category] = (countMap[p.category] || 0) + 1;
    }
  });

  return categories.map((cat: any) => ({
    ...cat,
    products_count: countMap[cat.name] || 0,
  }));
}
