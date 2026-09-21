import { createClient } from "@/lib/supabase/server";

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_unit: string;
  image_url: string | null;
  is_active: boolean;
  is_global: boolean;
  created_by_company_id?: string | null;
}

export interface CompanyProductItem {
  id: string;
  company_id: string;
  product_id: string;
  custom_name: string | null;
  description: string | null;
  image_url: string | null;
  unit: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product: CatalogProduct;
}

/**
 * Récupère l'intégralité du catalogue officiel des produits actifs (is_global = true)
 */
export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, description, default_unit, image_url, is_active, is_global, created_by_company_id")
    .eq("is_global", true)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erreur récupération catalogue produits:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    is_global: item.is_global ?? true,
  })) as CatalogProduct[];
}

/**
 * Récupère l'ensemble du catalogue officiel pour la supervision Administrateur (actifs et inactifs)
 */
export async function getAdminCatalogProducts(): Promise<CatalogProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, description, default_unit, image_url, is_active, is_global, created_by_company_id")
    .eq("is_global", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Erreur récupération catalogue admin:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    is_global: item.is_global ?? true,
  })) as CatalogProduct[];
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
      image_url,
      unit,
      notes,
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
        is_active,
        is_global,
        created_by_company_id
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération produits entreprise:", error);
    return [];
  }

  // Normalisation du type retourné par Supabase
  return (data || []).map((item: any) => {
    const rawProd = Array.isArray(item.product) ? item.product[0] : item.product;
    return {
      ...item,
      product: {
        ...rawProd,
        is_global: rawProd?.is_global ?? true,
      },
    };
  }) as CompanyProductItem[];
}
