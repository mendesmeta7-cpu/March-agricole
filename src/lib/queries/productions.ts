import { createClient } from "@/lib/supabase/server";

export type ProductionStatus = "draft" | "planned" | "growing" | "harvested" | "cancelled";

export interface ProductionProduct {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  image_url: string | null;
}

export interface ProductionCompanyProduct {
  id: string;
  custom_name: string | null;
  is_active: boolean;
}

export interface ProductionCampaignInfo {
  id: string;
  status: string;
  title: string;
}

export interface ProductionItem {
  id: string;
  company_id: string;
  product_id: string;
  company_product_id: string | null;
  title: string;
  description: string | null;
  main_image_url: string;
  location_name: string;
  expected_quantity: number;
  unit: string;
  // Saisons agricoles récurrentes (mois cycliques, 1=janvier à 12=décembre)
  // Ces champs remplacent period_start/period_end pour les nouvelles productions
  planting_start_month: number | null; // Mois de début de plantation
  planting_end_month: number | null;   // Mois de fin de plantation
  harvest_start_month: number | null;  // Mois de début de récolte
  harvest_end_month: number | null;    // Mois de fin de récolte
  // Colonnes historiques — conservées pour compatibilité, ne plus utiliser pour nouvelles saisies
  period_start: string;  // [HISTORIQUE] Date calendaire de début
  period_end: string | null; // [HISTORIQUE] Date calendaire de fin
  status: ProductionStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  product: ProductionProduct;
  company_product?: ProductionCompanyProduct | null;
  // Données commerciales réelles rattachées
  campaigns?: ProductionCampaignInfo[];
  has_active_campaign?: boolean;
  active_campaign_id?: string | null;
  campaigns_count?: number;
  demands_count?: number;
}

/**
 * Récupère toutes les productions déclarées par une entreprise agricole
 */
export async function getCompanyProductions(companyId: string): Promise<ProductionItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("productions")
    .select(`
      id,
      company_id,
      product_id,
      company_product_id,
      title,
      description,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      planting_start_month,
      planting_end_month,
      harvest_start_month,
      harvest_end_month,
      period_start,
      period_end,
      status,
      is_public,
      created_at,
      updated_at,
      product:products (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      company_product:company_products (
        id,
        custom_name,
        is_active
      ),
      campaigns:campaigns (
        id,
        status,
        title
      ),
      demands:demands (
        id
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération productions de l'entreprise:", error);
    return [];
  }

  return (data || []).map((item: any) => {
    const campaignsList = Array.isArray(item.campaigns) ? item.campaigns : [];
    const activeCamp = campaignsList.find((c: any) => c.status === "active");
    const demandsList = Array.isArray(item.demands) ? item.demands : [];

    return {
      ...item,
      expected_quantity: Number(item.expected_quantity),
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      company_product: Array.isArray(item.company_product) ? item.company_product[0] : item.company_product,
      campaigns: campaignsList,
      has_active_campaign: Boolean(activeCamp),
      active_campaign_id: activeCamp?.id || null,
      campaigns_count: campaignsList.length,
      demands_count: demandsList.length,
    };
  }) as ProductionItem[];
}

/**
 * Récupère une production spécifique par son identifiant
 */
export async function getProductionById(
  productionId: string,
  companyId?: string
): Promise<ProductionItem | null> {
  const supabase = createClient();
  let query = supabase
    .from("productions")
    .select(`
      id,
      company_id,
      product_id,
      company_product_id,
      title,
      description,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      planting_start_month,
      planting_end_month,
      harvest_start_month,
      harvest_end_month,
      period_start,
      period_end,
      status,
      is_public,
      created_at,
      updated_at,
      product:products (
        id,
        name,
        category,
        default_unit,
        image_url
      ),
      company_product:company_products (
        id,
        custom_name,
        is_active
      ),
      campaigns:campaigns (
        id,
        status,
        title
      ),
      demands:demands (
        id
      )
    `)
    .eq("id", productionId);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération détail production:", error);
    return null;
  }

  const campaignsList = Array.isArray(data.campaigns) ? data.campaigns : [];
  const activeCamp = campaignsList.find((c: any) => c.status === "active");
  const demandsList = Array.isArray(data.demands) ? data.demands : [];

  return {
    ...data,
    expected_quantity: Number(data.expected_quantity),
    product: Array.isArray(data.product) ? data.product[0] : data.product,
    company_product: Array.isArray(data.company_product) ? data.company_product[0] : data.company_product,
    campaigns: campaignsList,
    has_active_campaign: Boolean(activeCamp),
    active_campaign_id: activeCamp?.id || null,
    campaigns_count: campaignsList.length,
    demands_count: demandsList.length,
  } as ProductionItem;
}
