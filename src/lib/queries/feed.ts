import { createClient } from "@/lib/supabase/server";
import { ProductionStatus } from "@/lib/queries/productions";

export interface FeedProduct {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  image_url: string | null;
}

export interface FeedCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  country_id: string;
  province_id: string;
  provinces?: { name: string } | null;
  countries?: { name: string } | null;
}

export interface FeedCampaignSummary {
  id: string;
  title: string;
  marketable_quantity: number;
  unit_price: number;
  currency: string;
  min_order_quantity: number;
  status: string;
}

export interface FeedProductionItem {
  id: string;
  company_id: string;
  product_id: string;
  title: string;
  description: string | null;
  main_image_url: string;
  location_name: string;
  expected_quantity: number;
  unit: string;
  period_start: string;
  period_end: string | null;
  status: ProductionStatus;
  created_at: string;
  product: FeedProduct;
  company: FeedCompany;
  active_campaign?: FeedCampaignSummary | null;
}

export interface FeedFilterParams {
  search?: string;
  category?: string;
  countryId?: string;
  provinceId?: string;
  page?: number;
  pageSize?: number;
}

export interface FeedResult {
  items: FeedProductionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Récupère le flux public des productions agricoles réelles pour les revendeurs
 * RLS garantit que seules les productions publiques actives (planned, growing, harvested) sont retournées.
 */
export async function getPublicFeedProductions(
  filters: FeedFilterParams = {}
): Promise<FeedResult> {
  const supabase = createClient();
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize || 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("productions")
    .select(`
      id,
      company_id,
      product_id,
      title,
      description,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      period_start,
      period_end,
      status,
      created_at,
      product:products!inner (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        country_id,
        province_id,
        provinces (name),
        countries (name)
      ),
      campaigns (
        id,
        title,
        marketable_quantity,
        unit_price,
        currency,
        min_order_quantity,
        status
      )
    `, { count: "exact" })
    .eq("is_public", true)
    .in("status", ["planned", "growing", "harvested"])
    .order("created_at", { ascending: false });

  // Filtre par catégorie de produit
  if (filters.category && filters.category !== "all") {
    query = query.eq("product.category", filters.category);
  }

  // Filtre géographique par pays
  if (filters.countryId && filters.countryId !== "all") {
    query = query.eq("company.country_id", filters.countryId);
  }

  // Filtre géographique par province
  if (filters.provinceId && filters.provinceId !== "all") {
    query = query.eq("company.province_id", filters.provinceId);
  }

  // Filtre par recherche textuelle (titre ou nom de produit)
  if (filters.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},product.name.ilike.${term},company.name.ilike.${term}`);
  }

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Erreur récupération feed productions:", error);
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const items: FeedProductionItem[] = (data || []).map((item: any) => {
    const rawCompany = Array.isArray(item.company) ? item.company[0] : item.company;
    const company = {
      ...rawCompany,
      provinces: Array.isArray(rawCompany?.provinces) ? rawCompany.provinces[0] : rawCompany?.provinces,
      countries: Array.isArray(rawCompany?.countries) ? rawCompany.countries[0] : rawCompany?.countries,
    };

    const rawCampaigns = Array.isArray(item.campaigns) ? item.campaigns : (item.campaigns ? [item.campaigns] : []);
    const activeCampaign = rawCampaigns.find((c: any) => c.status === "active") || null;

    return {
      ...item,
      expected_quantity: Number(item.expected_quantity),
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      company,
      active_campaign: activeCampaign ? {
        id: activeCampaign.id,
        title: activeCampaign.title,
        marketable_quantity: Number(activeCampaign.marketable_quantity),
        unit_price: Number(activeCampaign.unit_price),
        currency: activeCampaign.currency || "USD",
        min_order_quantity: Number(activeCampaign.min_order_quantity || 1),
        status: activeCampaign.status,
      } : null,
    } as unknown as FeedProductionItem;
  });

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Récupère le détail public d'une production pour un revendeur
 */
export async function getPublicProductionDetail(
  productionId: string
): Promise<FeedProductionItem | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("productions")
    .select(`
      id,
      company_id,
      product_id,
      title,
      description,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      period_start,
      period_end,
      status,
      created_at,
      product:products!inner (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        country_id,
        province_id,
        provinces (name),
        countries (name)
      ),
      campaigns (
        id,
        title,
        marketable_quantity,
        unit_price,
        currency,
        min_order_quantity,
        status
      )
    `)
    .eq("id", productionId)
    .eq("is_public", true)
    .in("status", ["planned", "growing", "harvested"])
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération détail public production:", error);
    return null;
  }

  const rawItem = data as any;
  const rawCompany = Array.isArray(rawItem.company) ? rawItem.company[0] : rawItem.company;
  const company = {
    ...rawCompany,
    provinces: Array.isArray(rawCompany?.provinces) ? rawCompany.provinces[0] : rawCompany?.provinces,
    countries: Array.isArray(rawCompany?.countries) ? rawCompany.countries[0] : rawCompany?.countries,
  };

  const rawCampaigns = Array.isArray(rawItem.campaigns) ? rawItem.campaigns : (rawItem.campaigns ? [rawItem.campaigns] : []);
  const activeCampaign = rawCampaigns.find((c: any) => c.status === "active") || null;

  return {
    ...rawItem,
    expected_quantity: Number(rawItem.expected_quantity),
    product: Array.isArray(rawItem.product) ? rawItem.product[0] : rawItem.product,
    company,
    active_campaign: activeCampaign ? {
      id: activeCampaign.id,
      title: activeCampaign.title,
      marketable_quantity: Number(activeCampaign.marketable_quantity),
      unit_price: Number(activeCampaign.unit_price),
      currency: activeCampaign.currency || "USD",
      min_order_quantity: Number(activeCampaign.min_order_quantity || 1),
      status: activeCampaign.status,
    } : null,
  } as unknown as FeedProductionItem;
}
