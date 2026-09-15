import { createClient } from "@/lib/supabase/server";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "cancelled";

export interface CampaignDeliveryZone {
  id: string;
  campaign_id: string;
  country_id: string;
  province_id: string;
  provinces?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface CompanyCampaignItem {
  id: string;
  company_id: string;
  production_id: string;
  product_id: string;
  title: string;
  description: string | null;
  marketable_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit: string;
  unit_price: number;
  currency: string;
  min_order_quantity: number;
  start_date: string;
  end_date: string | null;
  availability_period: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    category: string;
    default_unit: string;
    image_url: string | null;
  };
  production: {
    id: string;
    title: string;
    main_image_url: string | null;
    expected_quantity: number;
    unit: string;
    period_start: string;
    period_end: string | null;
    status: string;
  };
  delivery_zones: CampaignDeliveryZone[];
}

export interface ResellerCampaignItem extends CompanyCampaignItem {
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    city: string | null;
    verification_status: string;
    provinces?: { name: string } | null;
    countries?: { name: string } | null;
  };
  is_eligible: boolean; // Vrai si la province du revendeur est dans les zones desservies
}

export interface EligibleProductionOption {
  id: string;
  title: string;
  product_id: string;
  product_name: string;
  product_category: string;
  expected_quantity: number;
  unit: string;
  period_start: string;
  period_end: string | null;
  status: string;
  main_image_url: string | null;
}

export interface CampaignFilterParams {
  search?: string;
  category?: string;
  provinceId?: string;
  status?: string;
  eligibleOnly?: boolean;
}

/**
 * Récupère l'ensemble des campagnes d'une entreprise agricole avec stock réservé réel
 */
export async function getCompanyCampaigns(
  companyId: string
): Promise<CompanyCampaignItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      company_id,
      production_id,
      product_id,
      title,
      description,
      marketable_quantity,
      unit,
      unit_price,
      currency,
      min_order_quantity,
      start_date,
      end_date,
      availability_period,
      status,
      created_at,
      updated_at,
      product:products!inner (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      production:productions!inner (
        id,
        title,
        main_image_url,
        expected_quantity,
        unit,
        period_start,
        period_end,
        status
      ),
      delivery_zones:campaign_delivery_zones (
        id,
        campaign_id,
        country_id,
        province_id,
        provinces (
          id,
          name,
          code
        )
      ),
      stock_reservations (
        id,
        quantity,
        status
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération campagnes entreprise:", error);
    return [];
  }

  return (data || []).map((item: any) => {
    const marketableQty = Number(item.marketable_quantity);
    const reservedQty = (item.stock_reservations || [])
      .filter((sr: any) => sr.status === "active")
      .reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
    const availableQty = Math.max(0, marketableQty - reservedQty);

    return {
      ...item,
      marketable_quantity: marketableQty,
      reserved_quantity: reservedQty,
      available_quantity: availableQty,
      unit_price: Number(item.unit_price),
      min_order_quantity: Number(item.min_order_quantity || 1),
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      production: {
        ...(Array.isArray(item.production) ? item.production[0] : item.production),
        expected_quantity: Number(item.production?.expected_quantity || 0),
      },
      delivery_zones: (item.delivery_zones || []).map((zone: any) => ({
        ...zone,
        provinces: Array.isArray(zone.provinces) ? zone.provinces[0] : zone.provinces,
      })),
    };
  });
}

/**
 * Récupère les productions actives de l'entreprise éligibles pour l'adossement
 */
export async function getCompanyEligibleProductions(
  companyId: string
): Promise<EligibleProductionOption[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("productions")
    .select(`
      id,
      title,
      product_id,
      expected_quantity,
      unit,
      period_start,
      period_end,
      status,
      main_image_url,
      product:products (
        name,
        category
      )
    `)
    .eq("company_id", companyId)
    .in("status", ["planned", "growing", "harvested"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération productions éligibles:", error);
    return [];
  }

  return (data || []).map((item: any) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    return {
      id: item.id,
      title: item.title,
      product_id: item.product_id,
      product_name: product?.name || "Produit",
      product_category: product?.category || "Non catégorisé",
      expected_quantity: Number(item.expected_quantity),
      unit: item.unit,
      period_start: item.period_start,
      period_end: item.period_end,
      status: item.status,
      main_image_url: item.main_image_url,
    };
  });
}

/**
 * Récupère le détail d'une campagne de l'entreprise avec stock réel
 */
export async function getCompanyCampaignById(
  campaignId: string,
  companyId: string
): Promise<CompanyCampaignItem | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      company_id,
      production_id,
      product_id,
      title,
      description,
      marketable_quantity,
      unit,
      unit_price,
      currency,
      min_order_quantity,
      start_date,
      end_date,
      availability_period,
      status,
      created_at,
      updated_at,
      product:products!inner (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      production:productions!inner (
        id,
        title,
        main_image_url,
        expected_quantity,
        unit,
        period_start,
        period_end,
        status
      ),
      delivery_zones:campaign_delivery_zones (
        id,
        campaign_id,
        country_id,
        province_id,
        provinces (
          id,
          name,
          code
        )
      ),
      stock_reservations (
        id,
        quantity,
        status
      )
    `)
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération détail campagne entreprise:", error);
    return null;
  }

  const rawItem = data as any;
  const marketableQty = Number(rawItem.marketable_quantity);
  const reservedQty = (rawItem.stock_reservations || [])
    .filter((sr: any) => sr.status === "active")
    .reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
  const availableQty = Math.max(0, marketableQty - reservedQty);

  return {
    ...rawItem,
    marketable_quantity: marketableQty,
    reserved_quantity: reservedQty,
    available_quantity: availableQty,
    unit_price: Number(rawItem.unit_price),
    min_order_quantity: Number(rawItem.min_order_quantity || 1),
    product: Array.isArray(rawItem.product) ? rawItem.product[0] : rawItem.product,
    production: {
      ...(Array.isArray(rawItem.production) ? rawItem.production[0] : rawItem.production),
      expected_quantity: Number(rawItem.production?.expected_quantity || 0),
    },
    delivery_zones: (rawItem.delivery_zones || []).map((zone: any) => ({
      ...zone,
      provinces: Array.isArray(zone.provinces) ? zone.provinces[0] : zone.provinces,
    })),
  } as CompanyCampaignItem;
}

/**
 * Récupère les campagnes ouvertes pour les revendeurs (status = 'active')
 * Calcule l'éligibilité géographique et le stock restant réel
 */
export async function getResellerCampaigns(
  resellerProvinceId?: string,
  filters: CampaignFilterParams = {}
): Promise<ResellerCampaignItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("campaigns")
    .select(`
      id,
      company_id,
      production_id,
      product_id,
      title,
      description,
      marketable_quantity,
      unit,
      unit_price,
      currency,
      min_order_quantity,
      start_date,
      end_date,
      availability_period,
      status,
      created_at,
      updated_at,
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        verification_status,
        provinces (name),
        countries (name)
      ),
      product:products!inner (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      production:productions!inner (
        id,
        title,
        main_image_url,
        expected_quantity,
        unit,
        period_start,
        period_end,
        status
      ),
      delivery_zones:campaign_delivery_zones (
        id,
        campaign_id,
        country_id,
        province_id,
        provinces (
          id,
          name,
          code
        )
      ),
      stock_reservations (
        id,
        quantity,
        status
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (filters.category && filters.category !== "all") {
    query = query.eq("product.category", filters.category);
  }

  if (filters.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},product.name.ilike.${term},company.name.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur récupération campagnes revendeur:", error);
    return [];
  }

  const campaigns: ResellerCampaignItem[] = (data || []).map((item: any) => {
    const rawCompany = Array.isArray(item.company) ? item.company[0] : item.company;
    const company = {
      ...rawCompany,
      provinces: Array.isArray(rawCompany?.provinces) ? rawCompany.provinces[0] : rawCompany?.provinces,
      countries: Array.isArray(rawCompany?.countries) ? rawCompany.countries[0] : rawCompany?.countries,
    };

    const deliveryZones = (item.delivery_zones || []).map((zone: any) => ({
      ...zone,
      provinces: Array.isArray(zone.provinces) ? zone.provinces[0] : zone.provinces,
    }));

    // Évaluation d'éligibilité territoriale
    const isEligible = resellerProvinceId
      ? deliveryZones.some((z: any) => z.province_id === resellerProvinceId)
      : false;

    const marketableQty = Number(item.marketable_quantity);
    const reservedQty = (item.stock_reservations || [])
      .filter((sr: any) => sr.status === "active")
      .reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
    const availableQty = Math.max(0, marketableQty - reservedQty);

    return {
      ...item,
      marketable_quantity: marketableQty,
      reserved_quantity: reservedQty,
      available_quantity: availableQty,
      unit_price: Number(item.unit_price),
      min_order_quantity: Number(item.min_order_quantity || 1),
      company,
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      production: {
        ...(Array.isArray(item.production) ? item.production[0] : item.production),
        expected_quantity: Number(item.production?.expected_quantity || 0),
      },
      delivery_zones: deliveryZones,
      is_eligible: isEligible,
    };
  });

  // Filtre optionnel : afficher uniquement les offres éligibles
  if (filters.eligibleOnly && resellerProvinceId) {
    return campaigns.filter((c) => c.is_eligible);
  }

  return campaigns;
}
