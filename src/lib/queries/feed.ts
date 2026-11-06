import { createClient } from "@/lib/supabase/server";
import { ProductionStatus } from "@/lib/queries/productions";
import {
  isResellerEligibleForCampaign,
  ResellerLocationContext,
  CampaignEligibilityResult,
} from "@/lib/services/campaignEligibility";
import { isCampaignActive } from "@/lib/utils/campaignStatus";
import {
  fetchCampaignsAvailability,
  applyAvailabilityToEligibility,
} from "@/lib/queries/campaigns";
import {
  CampaignAvailabilityLookup,
  resolveCampaignAvailability,
} from "@/lib/actions/campaignAvailability";

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
  /**
   * Disponible agrégé (public.get_campaigns_available_quantity, migration 32).
   * null = disponibilité momentanément illisible : la commande est désactivée.
   */
  available_quantity: number | null;
  /** Vrai si la disponibilité n'a pas pu être lue. */
  availability_unavailable?: boolean;
  unit_price: number;
  currency: string;
  min_order_quantity: number;
  status: string;
  is_eligible: boolean;
  can_order?: boolean;
  eligibility_reason?: string;
  eligibility_message?: string;
  /** Date limite de commande de la destination du revendeur (null = pas de limite). Phase 28. */
  destination_deadline_date?: string | null;
  /** Nom de la ville de la destination du revendeur. Phase 28. */
  destination_city_name?: string | null;
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
  // Saisons agricoles récurrentes (mois cycliques, sans année)
  planting_start_month: number | null;
  planting_end_month: number | null;
  harvest_start_month: number | null;
  harvest_end_month: number | null;
  // Colonnes historiques conservées
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
  /** Statut de cycle de culture (planned | growing | harvested) */
  status?: string;
  countryId?: string;
  provinceId?: string;
  resellerProvinceId?: string;
  resellerCountryId?: string;
  reseller?: ResellerLocationContext | null;
  page?: number;
  pageSize?: number;
}

export interface FeedResult {
  items: FeedProductionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Vrai si la requête a échoué (à distinguer d'un flux réellement vide) */
  error?: boolean;
}

/** Statuts de production visibles dans le flux public */
export const FEED_VISIBLE_STATUSES = ["planned", "growing", "harvested"] as const;

/** Taille de page par défaut du flux revendeur */
export const FEED_DEFAULT_PAGE_SIZE = 12;

/**
 * Nettoie un terme de recherche avant de l'insérer dans un filtre PostgREST
 * (`or=(...)`) : les caractères de syntaxe (virgule, parenthèses, guillemets,
 * jokers, antislash) sont neutralisés pour éviter toute injection de filtre.
 */
export function sanitizeFeedSearchTerm(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'\-.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Récupère le flux public des productions agricoles réelles pour les revendeurs
 * RLS garantit que seules les productions publiques actives (planned, growing, harvested) sont retournées.
 *
 * FUN-06 : recherche, catégorie, statut et province sont filtrés côté serveur,
 * avec pagination (`range`) et comptage exact, afin que toutes les productions
 * soient atteignables (et non seulement les 12 premières).
 */
export async function getPublicFeedProductions(
  filters: FeedFilterParams = {}
): Promise<FeedResult> {
  const supabase = await createClient();
  const page = Math.max(1, Math.floor(filters.page || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(filters.pageSize || FEED_DEFAULT_PAGE_SIZE)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const emptyResult: FeedResult = { items: [], totalCount: 0, page, pageSize, totalPages: 0 };

  // Recherche textuelle : PostgREST ne permet pas un OU entre colonnes de la table
  // principale et colonnes de tables jointes. On résout donc d'abord les produits
  // et entreprises dont le nom correspond, puis on combine avec titre / localisation.
  const searchTerm = sanitizeFeedSearchTerm(filters.search);
  let searchOrFilter: string | null = null;
  if (searchTerm !== "") {
    const like = `%${searchTerm}%`;
    const [productsRes, companiesRes] = await Promise.all([
      supabase.from("products").select("id").ilike("name", like).limit(200),
      supabase.from("companies").select("id").ilike("name", like).limit(200),
    ]);
    if (productsRes.error) console.error("Erreur recherche produits (feed):", productsRes.error);
    if (companiesRes.error) console.error("Erreur recherche entreprises (feed):", companiesRes.error);

    const productIds = (productsRes.data || []).map((p: { id: string }) => p.id);
    const companyIds = (companiesRes.data || []).map((c: { id: string }) => c.id);

    const clauses = [`title.ilike.${like}`, `location_name.ilike.${like}`];
    if (productIds.length > 0) clauses.push(`product_id.in.(${productIds.join(",")})`);
    if (companyIds.length > 0) clauses.push(`company_id.in.(${companyIds.join(",")})`);
    searchOrFilter = clauses.join(",");
  }

  const requestedStatus =
    filters.status && (FEED_VISIBLE_STATUSES as readonly string[]).includes(filters.status)
      ? filters.status
      : null;

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
      planting_start_month,
      planting_end_month,
      harvest_start_month,
      harvest_end_month,
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
        start_date,
        end_date,
        status,
        campaign_destinations (id, province_id, city_name, order_deadline_date),
        campaign_delivery_zones (id, country_id, province_id)
      )
    `, { count: "exact" })
    .eq("is_public", true)
    .in("status", [...FEED_VISIBLE_STATUSES])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  // Filtre par statut de cycle de culture
  if (requestedStatus) {
    query = query.eq("status", requestedStatus);
  }

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

  // Filtre par recherche textuelle (titre, localisation, nom du produit, nom de l'entreprise)
  if (searchOrFilter) {
    query = query.or(searchOrFilter);
  }

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Erreur récupération feed productions:", error);
    return { ...emptyResult, error: true };
  }

  const resellerContext: ResellerLocationContext | null =
    filters.reseller ||
    (filters.resellerProvinceId
      ? {
          province_id: filters.resellerProvinceId,
          country_id: filters.resellerCountryId,
        }
      : null);

  const rows = (data || []) as any[];
  const activeCampaigns = rows.map((item) => findActiveCampaign(item.campaigns));

  // Stock revendeur : un seul appel groupé pour toutes les campagnes de la page
  const availabilityLookup = await fetchCampaignsAvailability(
    supabase,
    activeCampaigns.filter(Boolean).map((c: any) => c.id as string)
  );

  const items: FeedProductionItem[] = rows.map((item: any, index: number) => {
    const rawCompany = Array.isArray(item.company) ? item.company[0] : item.company;
    const company = {
      ...rawCompany,
      provinces: Array.isArray(rawCompany?.provinces) ? rawCompany.provinces[0] : rawCompany?.provinces,
      countries: Array.isArray(rawCompany?.countries) ? rawCompany.countries[0] : rawCompany?.countries,
    };

    return {
      ...item,
      expected_quantity: Number(item.expected_quantity),
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      company,
      active_campaign: buildActiveCampaignSummary(activeCampaigns[index], resellerContext, availabilityLookup),
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
  productionId: string,
  resellerOrProvinceId?: ResellerLocationContext | string | null
): Promise<FeedProductionItem | null> {
  const supabase = await createClient();

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
      planting_start_month,
      planting_end_month,
      harvest_start_month,
      harvest_end_month,
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
        start_date,
        end_date,
        status,
        campaign_destinations (id, province_id, city_name, order_deadline_date),
        campaign_delivery_zones (id, country_id, province_id)
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

  const activeCampaign = findActiveCampaign(rawItem.campaigns);

  const resellerContext: ResellerLocationContext | null =
    typeof resellerOrProvinceId === "object" && resellerOrProvinceId !== null
      ? resellerOrProvinceId
      : typeof resellerOrProvinceId === "string" && resellerOrProvinceId.trim() !== ""
      ? { province_id: resellerOrProvinceId }
      : null;

  const availabilityLookup = await fetchCampaignsAvailability(
    supabase,
    activeCampaign ? [activeCampaign.id as string] : []
  );

  return {
    ...rawItem,
    expected_quantity: Number(rawItem.expected_quantity),
    product: Array.isArray(rawItem.product) ? rawItem.product[0] : rawItem.product,
    company,
    active_campaign: buildActiveCampaignSummary(activeCampaign, resellerContext, availabilityLookup),
  } as unknown as FeedProductionItem;
}

/** Campagne active (statut + dates + destinations) parmi les campagnes embarquées. */
function findActiveCampaign(rawCampaigns: unknown): any | null {
  const list = Array.isArray(rawCampaigns) ? rawCampaigns : rawCampaigns ? [rawCampaigns] : [];
  return list.find((c: any) => isCampaignActive(c)) || null;
}

/**
 * Résumé de la campagne active pour le flux revendeur. Le disponible provient
 * exclusivement de public.get_campaigns_available_quantity : absente = 0 (non
 * commandable), erreur = disponibilité inconnue (null) et commande désactivée.
 */
function buildActiveCampaignSummary(
  activeCampaign: any | null,
  resellerContext: ResellerLocationContext | null,
  availabilityLookup: CampaignAvailabilityLookup
): FeedCampaignSummary | null {
  if (!activeCampaign) return null;

  const availability = resolveCampaignAvailability(availabilityLookup, activeCampaign.id);
  const baseEligibility: CampaignEligibilityResult = isResellerEligibleForCampaign({
    reseller: resellerContext,
    campaign: {
      ...activeCampaign,
      available_quantity: availability.available_quantity ?? 0,
    },
  });
  const eligibility = applyAvailabilityToEligibility(baseEligibility, availability.availability_unavailable);

  return {
    id: activeCampaign.id,
    title: activeCampaign.title,
    marketable_quantity: Number(activeCampaign.marketable_quantity),
    available_quantity: availability.available_quantity,
    availability_unavailable: availability.availability_unavailable,
    unit_price: Number(activeCampaign.unit_price),
    currency: activeCampaign.currency || "USD",
    min_order_quantity: Number(activeCampaign.min_order_quantity || 1),
    status: activeCampaign.status,
    is_eligible: baseEligibility.eligible,
    can_order: eligibility.canOrder,
    eligibility_reason: eligibility.reason,
    eligibility_message: eligibility.message,
    // Phase 28 : deadline de la destination du revendeur
    destination_deadline_date: baseEligibility.matchingDestination?.order_deadline_date || null,
    destination_city_name: baseEligibility.matchingDestination?.city_name || null,
  };
}
