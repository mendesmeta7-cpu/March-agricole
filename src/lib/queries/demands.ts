import { createClient } from "@/lib/supabase/server";

export type DemandStatus = "active" | "converted" | "cancelled" | "expired";

export interface DemandProduct {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  image_url: string | null;
}

export interface DemandProvince {
  id: string;
  name: string;
  code: string;
}

export interface DemandCountry {
  id: string;
  name: string;
  code: string;
}

export interface DemandTargetCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface DemandItem {
  id: string;
  reseller_id: string;
  product_id: string;
  target_company_id: string | null;
  quantity: number;
  unit: string;
  country_id: string;
  province_id: string;
  city: string | null;
  target_period_start: string | null;
  target_period_end: string | null;
  notes: string | null;
  status: DemandStatus;
  created_at: string;
  updated_at: string;
  product: DemandProduct;
  province: DemandProvince;
  country: DemandCountry;
  target_company?: DemandTargetCompany | null;
}

export interface AggregatedDemandItem {
  product_id: string;
  product_name: string;
  product_category: string;
  country_id: string;
  country_name: string;
  province_id: string;
  province_name: string;
  unit: string;
  total_demands_count: number;
  total_demanded_quantity: number;
}

/**
 * Récupère toutes les demandes d'approvisionnement créées par un revendeur donné
 */
export async function getResellerDemands(resellerId: string): Promise<DemandItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("demands")
    .select(`
      id,
      reseller_id,
      product_id,
      target_company_id,
      quantity,
      unit,
      country_id,
      province_id,
      city,
      target_period_start,
      target_period_end,
      notes,
      status,
      created_at,
      updated_at,
      product:products (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      province:provinces (
        id,
        name,
        code
      ),
      country:countries (
        id,
        name,
        code
      ),
      target_company:companies (
        id,
        name,
        logo_url
      )
    `)
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération demandes revendeur:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    quantity: Number(item.quantity),
    product: Array.isArray(item.product) ? item.product[0] : item.product,
    province: Array.isArray(item.province) ? item.province[0] : item.province,
    country: Array.isArray(item.country) ? item.country[0] : item.country,
    target_company: Array.isArray(item.target_company) ? item.target_company[0] : item.target_company,
  })) as DemandItem[];
}

/**
 * Récupère le détail d'une demande spécifique
 */
export async function getDemandById(
  demandId: string,
  resellerId?: string
): Promise<DemandItem | null> {
  const supabase = createClient();
  let query = supabase
    .from("demands")
    .select(`
      id,
      reseller_id,
      product_id,
      target_company_id,
      quantity,
      unit,
      country_id,
      province_id,
      city,
      target_period_start,
      target_period_end,
      notes,
      status,
      created_at,
      updated_at,
      product:products (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      province:provinces (
        id,
        name,
        code
      ),
      country:countries (
        id,
        name,
        code
      ),
      target_company:companies (
        id,
        name,
        logo_url
      )
    `)
    .eq("id", demandId);

  if (resellerId) {
    query = query.eq("reseller_id", resellerId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération demande par ID:", error);
    return null;
  }

  return {
    ...data,
    quantity: Number(data.quantity),
    product: Array.isArray(data.product) ? data.product[0] : data.product,
    province: Array.isArray(data.province) ? data.province[0] : data.province,
    country: Array.isArray(data.country) ? data.country[0] : data.country,
    target_company: Array.isArray(data.target_company) ? data.target_company[0] : data.target_company,
  } as DemandItem;
}

/**
 * Récupère les agrégats de demandes du marché via la vue SQL sécurisée v_market_demands_aggregated
 */
export async function getAggregatedMarketDemands(filters?: {
  productId?: string;
  provinceId?: string;
  countryId?: string;
}): Promise<AggregatedDemandItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("v_market_demands_aggregated")
    .select("*")
    .order("total_demanded_quantity", { ascending: false });

  if (filters?.productId && filters.productId !== "all") {
    query = query.eq("product_id", filters.productId);
  }

  if (filters?.provinceId && filters.provinceId !== "all") {
    query = query.eq("province_id", filters.provinceId);
  }

  if (filters?.countryId && filters.countryId !== "all") {
    query = query.eq("country_id", filters.countryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur récupération agrégats du marché:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    total_demands_count: Number(row.total_demands_count),
    total_demanded_quantity: Number(row.total_demanded_quantity),
  })) as AggregatedDemandItem[];
}
