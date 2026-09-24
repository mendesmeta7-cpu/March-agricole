import { createClient } from "@/lib/supabase/server";

export type DemandStatus = "active" | "converted" | "cancelled" | "expired";
export type DemandType = "general" | "production";
export type DemandResponseStatus = "proposed" | "refused" | "accepted" | "ordered" | "cancelled";

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

export interface DemandProduction {
  id: string;
  title: string;
  main_image_url: string;
  status: string;
  expected_quantity: number;
  unit: string;
  location_name: string;
}

export interface DemandResponseItem {
  id: string;
  demand_id: string;
  company_id: string;
  production_id: string | null;
  status: DemandResponseStatus;
  proposed_quantity: number;
  unit: string;
  unit_price: number;
  currency: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    province_id: string;
  };
  production?: {
    id: string;
    title: string;
    main_image_url: string;
    status: string;
    expected_quantity: number;
    unit: string;
  } | null;
}

export interface DemandItem {
  id: string;
  reseller_id: string;
  demand_type: DemandType;
  product_id: string;
  production_id: string | null;
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
  production?: DemandProduction | null;
  responses?: DemandResponseItem[];
  my_response?: DemandResponseItem | null;
}

export interface ProductionDemandRegionAnalysis {
  province_id: string;
  province_name: string;
  demands_count: number;
  total_quantity: number;
  unit: string;
  percentage: number;
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
 * (Demandes Générales et Demandes sur Production avec leurs réponses)
 */
export async function getResellerDemands(resellerId: string): Promise<DemandItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("demands")
    .select(`
      id,
      reseller_id,
      demand_type,
      product_id,
      production_id,
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
      ),
      production:productions (
        id,
        title,
        main_image_url,
        status,
        expected_quantity,
        unit,
        location_name
      ),
      responses:demand_responses (
        id,
        demand_id,
        company_id,
        production_id,
        status,
        proposed_quantity,
        unit,
        unit_price,
        currency,
        message,
        created_at,
        updated_at,
        company:companies (
          id,
          name,
          logo_url,
          city,
          province_id
        ),
        production:productions (
          id,
          title,
          main_image_url,
          status,
          expected_quantity,
          unit
        )
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
    demand_type: (item.demand_type || "general") as DemandType,
    product: Array.isArray(item.product) ? item.product[0] : item.product,
    province: Array.isArray(item.province) ? item.province[0] : item.province,
    country: Array.isArray(item.country) ? item.country[0] : item.country,
    target_company: Array.isArray(item.target_company) ? item.target_company[0] : item.target_company,
    production: Array.isArray(item.production) ? item.production[0] : item.production,
    responses: (item.responses || []).map((r: any) => ({
      ...r,
      proposed_quantity: Number(r.proposed_quantity || 0),
      unit_price: Number(r.unit_price || 0),
      company: Array.isArray(r.company) ? r.company[0] : r.company,
      production: Array.isArray(r.production) ? r.production[0] : r.production,
    })),
  })) as DemandItem[];
}

/**
 * Récupère les demandes générales du marché pour une entreprise agricole
 * avec l'état de réponse de l'entreprise (en attente, refusée, proposée)
 */
export async function getCompanyGeneralDemands(companyId: string): Promise<DemandItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("demands")
    .select(`
      id,
      reseller_id,
      demand_type,
      product_id,
      production_id,
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
      responses:demand_responses (
        id,
        demand_id,
        company_id,
        production_id,
        status,
        proposed_quantity,
        unit,
        unit_price,
        currency,
        message,
        created_at,
        updated_at,
        production:productions (
          id,
          title,
          main_image_url,
          status,
          expected_quantity,
          unit
        )
      )
    `)
    .or(`demand_type.eq.general,target_company_id.eq.${companyId}`)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération demandes générales entreprise:", error);
    return [];
  }

  return (data || []).map((item: any) => {
    const responses = item.responses || [];
    const myResponseRaw = responses.find((r: any) => r.company_id === companyId) || null;
    const myResponse = myResponseRaw
      ? {
          ...myResponseRaw,
          proposed_quantity: Number(myResponseRaw.proposed_quantity || 0),
          unit_price: Number(myResponseRaw.unit_price || 0),
          production: Array.isArray(myResponseRaw.production)
            ? myResponseRaw.production[0]
            : myResponseRaw.production,
        }
      : null;

    return {
      ...item,
      quantity: Number(item.quantity),
      demand_type: (item.demand_type || "general") as DemandType,
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      province: Array.isArray(item.province) ? item.province[0] : item.province,
      country: Array.isArray(item.country) ? item.country[0] : item.country,
      my_response: myResponse,
    };
  }) as DemandItem[];
}

/**
 * Analyse territoriale des demandes exprimées spécifiquement sur une production
 */
export async function getProductionDemandsAnalysis(
  productionId: string
): Promise<{
  totalDemandsCount: number;
  totalQuantityDemanded: number;
  unit: string;
  regions: ProductionDemandRegionAnalysis[];
  demandsList: DemandItem[];
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("demands")
    .select(`
      id,
      reseller_id,
      demand_type,
      product_id,
      production_id,
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
      province:provinces (
        id,
        name,
        code
      )
    `)
    .eq("production_id", productionId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("Erreur analyse demandes production:", error);
    return {
      totalDemandsCount: 0,
      totalQuantityDemanded: 0,
      unit: "tonne",
      regions: [],
      demandsList: [],
    };
  }

  const demandsList = data.map((d: any) => ({
    ...d,
    quantity: Number(d.quantity),
    province: Array.isArray(d.province) ? d.province[0] : d.province,
  })) as unknown as DemandItem[];

  const totalDemandsCount = demandsList.length;
  const totalQuantityDemanded = demandsList.reduce((acc, curr) => acc + curr.quantity, 0);
  const unit = demandsList[0]?.unit || "tonne";

  // Agrégation par province
  const provinceMap = new Map<
    string,
    { province_name: string; demands_count: number; total_quantity: number }
  >();

  demandsList.forEach((d) => {
    const provId = d.province_id;
    const provName = d.province?.name || "Province non définie";
    const existing = provinceMap.get(provId) || {
      province_name: provName,
      demands_count: 0,
      total_quantity: 0,
    };
    existing.demands_count += 1;
    existing.total_quantity += d.quantity;
    provinceMap.set(provId, existing);
  });

  const regions: ProductionDemandRegionAnalysis[] = Array.from(provinceMap.entries())
    .map(([province_id, val]) => ({
      province_id,
      province_name: val.province_name,
      demands_count: val.demands_count,
      total_quantity: val.total_quantity,
      unit,
      percentage: totalQuantityDemanded > 0 ? Math.round((val.total_quantity / totalQuantityDemanded) * 100) : 0,
    }))
    .sort((a, b) => b.total_quantity - a.total_quantity);

  return {
    totalDemandsCount,
    totalQuantityDemanded,
    unit,
    regions,
    demandsList,
  };
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
      demand_type,
      product_id,
      production_id,
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
      ),
      production:productions (
        id,
        title,
        main_image_url,
        status,
        expected_quantity,
        unit,
        location_name
      ),
      responses:demand_responses (
        id,
        demand_id,
        company_id,
        production_id,
        status,
        proposed_quantity,
        unit,
        unit_price,
        currency,
        message,
        created_at,
        updated_at,
        company:companies (
          id,
          name,
          logo_url,
          city,
          province_id
        ),
        production:productions (
          id,
          title,
          main_image_url,
          status,
          expected_quantity,
          unit
        )
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
    demand_type: (data.demand_type || "general") as DemandType,
    product: Array.isArray(data.product) ? data.product[0] : data.product,
    province: Array.isArray(data.province) ? data.province[0] : data.province,
    country: Array.isArray(data.country) ? data.country[0] : data.country,
    target_company: Array.isArray(data.target_company) ? data.target_company[0] : data.target_company,
    production: Array.isArray(data.production) ? data.production[0] : data.production,
    responses: (data.responses || []).map((r: any) => ({
      ...r,
      proposed_quantity: Number(r.proposed_quantity || 0),
      unit_price: Number(r.unit_price || 0),
      company: Array.isArray(r.company) ? r.company[0] : r.company,
      production: Array.isArray(r.production) ? r.production[0] : r.production,
    })),
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
