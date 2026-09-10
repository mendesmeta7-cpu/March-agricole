import { createClient } from "@/lib/supabase/server";

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_unit: string;
  image_url: string | null;
  is_active: boolean;
}

export interface CompanyProductItem {
  id: string;
  company_id: string;
  product_id: string;
  custom_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product: CatalogProduct;
}

/**
 * Récupère l'intégralité du catalogue général des produits actifs
 */
export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, description, default_unit, image_url, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erreur récupération catalogue produits:", error);
    return [];
  }

  return data || [];
}

/**
 * Récupère tous les produits associés à une entreprise agricole donnée
 */
export async function getCompanyProducts(companyId: string): Promise<CompanyProductItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_products")
    .select(`
      id,
      company_id,
      product_id,
      custom_name,
      description,
      is_active,
      created_at,
      updated_at,
      product:products (
        id,
        name,
        category,
        description,
        default_unit,
        image_url,
        is_active
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération produits entreprise:", error);
    return [];
  }

  // Normalisation du type retourné par Supabase
  return (data || []).map((item: any) => ({
    ...item,
    product: Array.isArray(item.product) ? item.product[0] : item.product,
  })) as CompanyProductItem[];
}
