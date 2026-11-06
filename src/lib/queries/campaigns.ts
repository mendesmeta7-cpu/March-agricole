import { createClient } from "@/lib/supabase/server";
import {
  isResellerEligibleForCampaign,
  ResellerLocationContext,
} from "@/lib/services/campaignEligibility";
import {
  getEffectiveCampaignStatus,
  isCampaignActive,
  getCampaignDestinationsSummary,
} from "@/lib/utils/campaignStatus";
import { isConsumingReservation } from "@/lib/utils/stockRules";
import {
  AVAILABILITY_UNAVAILABLE_MESSAGE,
  CampaignAvailabilityLookup,
  chunkIds,
  resolveCampaignAvailability,
  toCampaignAvailabilityLookup,
  toProductionAvailability,
} from "@/lib/actions/campaignAvailability";

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

export interface CampaignDepot {
  id: string;
  campaign_destination_id: string;
  campaign_id: string;
  name: string;
  commune: string;
  quartier: string | null;
  address: string;
  complement: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignDestination {
  id: string;
  campaign_id: string;
  province_id: string;
  city_name: string;
  expected_arrival_date: string;
  previous_arrival_date: string | null;
  /** Date limite de commande pour cette destination (NULL = pas de limite). Phase 28. */
  order_deadline_date: string | null;
  created_at?: string;
  updated_at?: string;
  provinces?: {
    id: string;
    name: string;
    code: string;
  } | null;
  depots?: CampaignDepot[];
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
  /** Statut affiché : statut persisté, ou 'completed' si une campagne 'active' est expirée. */
  status: CampaignStatus;
  /** Statut réellement enregistré en base (espace société). */
  stored_status?: CampaignStatus;
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
    planting_start_month: number | null;
    planting_end_month: number | null;
    harvest_start_month: number | null;
    harvest_end_month: number | null;
    period_start: string;
    period_end: string | null;
    status: string;
  };
  delivery_zones: CampaignDeliveryZone[];
  destinations?: CampaignDestination[];
}

export interface ResellerCampaignItem
  extends Omit<CompanyCampaignItem, "available_quantity" | "reserved_quantity"> {
  /**
   * Disponible agrégé lu par public.get_campaigns_available_quantity (migration 32).
   * null = disponibilité momentanément illisible (jamais de repli sur le volume commercialisable).
   */
  available_quantity: number | null;
  /** Volume déjà consommé, agrégé (commercialisable - disponible) ; null si inconnu. */
  reserved_quantity: number | null;
  /** Vrai si la disponibilité n'a pas pu être lue : la commande est alors désactivée. */
  availability_unavailable?: boolean;
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
  is_eligible: boolean; // Vrai si le territoire du revendeur est dans les zones desservies
  can_order?: boolean;
  eligibility_reason?: string;
  eligibility_message?: string;
  /** Date limite de commande pour la destination du revendeur (null = aucune limite). Phase 28. */
  destination_deadline_date?: string | null;
  /** Nom de la ville de destination du revendeur. Phase 28. */
  destination_city_name?: string | null;
}

export interface EligibleProductionOption {
  id: string;
  title: string;
  product_id: string;
  product_name: string;
  product_category: string;
  expected_quantity: number;
  unit: string;
  planting_start_month: number | null;
  planting_end_month: number | null;
  harvest_start_month: number | null;
  harvest_end_month: number | null;
  period_start: string;
  period_end: string | null;
  status: string;
  main_image_url: string | null;
  /** D4 — volume déjà engagé sur la production (null si la lecture a échoué). */
  committed_quantity: number | null;
  /** D4 — volume encore disponible pour une nouvelle campagne (null si la lecture a échoué). */
  available_quantity: number | null;
  /** Vrai si la disponibilité n'a pas pu être lue (aucune valeur de repli). */
  availability_error: boolean;
}

export interface CampaignFilterParams {
  search?: string;
  category?: string;
  provinceId?: string;
  status?: string;
  eligibleOnly?: boolean;
}

/**
 * Stock revendeur (migration 32) — disponible agrégé des campagnes, lu en un seul
 * appel par lot de 200 identifiants (un seul appel dans le cas courant).
 * Les réservations embarquées ne sont PAS utilisées côté revendeur : la RLS ne
 * renvoie que les réservations du revendeur, ce qui surestimerait le disponible.
 * Toute erreur rend la disponibilité inconnue (aucun repli).
 */
export async function fetchCampaignsAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignIds: string[]
): Promise<CampaignAvailabilityLookup> {
  const chunks = chunkIds(campaignIds);
  if (chunks.length === 0) return toCampaignAvailabilityLookup([], false);

  const rows: Array<{ campaign_id: string; available_quantity: number | string | null }> = [];
  for (const ids of chunks) {
    const { data, error } = await supabase.rpc("get_campaigns_available_quantity", {
      p_campaign_ids: ids,
    });
    if (error) {
      console.error("Erreur lecture disponibilité des campagnes (get_campaigns_available_quantity):", error);
      return toCampaignAvailabilityLookup(null, true);
    }
    rows.push(...((data as typeof rows | null) ?? []));
  }
  return toCampaignAvailabilityLookup(rows, false);
}

/**
 * Applique la disponibilité agrégée au résultat d'éligibilité : sans disponibilité
 * lisible, la commande est désactivée avec un message explicite.
 */
export function applyAvailabilityToEligibility(
  eligibility: { canOrder: boolean; reason: string; message: string },
  availabilityUnavailable: boolean
): { canOrder: boolean; reason: string; message: string } {
  if (!availabilityUnavailable) return eligibility;
  const stockRelated = eligibility.reason === "ORDER_ALLOWED" || eligibility.reason === "OUT_OF_STOCK";
  return {
    canOrder: false,
    reason: stockRelated ? "AVAILABILITY_UNAVAILABLE" : eligibility.reason,
    message: stockRelated
      ? `${AVAILABILITY_UNAVAILABLE_MESSAGE}. La commande est temporairement désactivée, veuillez réessayer plus tard.`
      : eligibility.message,
  };
}

/**
 * Récupère l'ensemble des campagnes d'une entreprise agricole avec stock réservé réel
 */
export async function getCompanyCampaigns(
  companyId: string
): Promise<CompanyCampaignItem[]> {
  const supabase = await createClient();

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
        planting_start_month,
        planting_end_month,
        harvest_start_month,
        harvest_end_month,
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
      destinations:campaign_destinations (
        id,
        campaign_id,
        province_id,
        city_name,
        expected_arrival_date,
        order_deadline_date,
        previous_arrival_date,
        created_at,
        provinces (
          id,
          name,
          code
        ),
        depots:campaign_depots (
          id,
          campaign_destination_id,
          campaign_id,
          name,
          commune,
          quartier,
          address,
          complement,
          created_at
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
      .filter((sr: any) => isConsumingReservation(sr.status))
      .reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
    const availableQty = Math.max(0, marketableQty - reservedQty);
    const effectiveStatus = getEffectiveCampaignStatus(item);

    return {
      ...item,
      status: effectiveStatus,
      stored_status: item.status,
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
      destinations: (item.destinations || []).map((dest: any) => ({
        ...dest,
        provinces: Array.isArray(dest.provinces) ? dest.provinces[0] : dest.provinces,
        depots: dest.depots || [],
      })),
    };
  });
}

/**
 * Récupère les productions de l'entreprise éligibles à une campagne.
 * D2 : seules les productions récoltées ('harvested') sont proposées.
 * D4 : chaque production est enrichie du volume engagé / disponible lu en UN appel
 * groupé à public.get_productions_campaign_availability. En cas d'erreur, la
 * disponibilité est signalée comme illisible (availability_error) — jamais
 * remplacée par le volume déclaré.
 */
export async function getCompanyEligibleProductions(
  companyId: string
): Promise<EligibleProductionOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productions")
    .select(`
      id,
      title,
      product_id,
      expected_quantity,
      unit,
      planting_start_month,
      planting_end_month,
      harvest_start_month,
      harvest_end_month,
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
    .eq("status", "harvested")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération productions éligibles:", error);
    return [];
  }

  const productionIds = (data || []).map((item: any) => item.id as string);
  const availabilityById = new Map<string, ReturnType<typeof toProductionAvailability>>();
  let availabilityFailed = false;

  for (const ids of chunkIds(productionIds)) {
    const { data: rows, error: rpcError } = await supabase.rpc("get_productions_campaign_availability", {
      p_production_ids: ids,
    });
    if (rpcError) {
      console.error("Erreur lecture disponibilité des productions (get_productions_campaign_availability):", rpcError);
      availabilityFailed = true;
      break;
    }
    for (const row of (rows as any[] | null) ?? []) {
      const parsed = toProductionAvailability(row);
      availabilityById.set(parsed.production_id, parsed);
    }
  }

  return (data || []).map((item: any) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const availability = availabilityFailed ? undefined : availabilityById.get(item.id);
    return {
      id: item.id,
      title: item.title,
      product_id: item.product_id,
      product_name: product?.name || "Produit",
      product_category: product?.category || "Non catégorisé",
      expected_quantity: Number(item.expected_quantity),
      unit: item.unit,
      planting_start_month: item.planting_start_month ?? null,
      planting_end_month: item.planting_end_month ?? null,
      harvest_start_month: item.harvest_start_month ?? null,
      harvest_end_month: item.harvest_end_month ?? null,
      period_start: item.period_start,
      period_end: item.period_end,
      status: item.status,
      main_image_url: item.main_image_url,
      committed_quantity: availability ? availability.committed_quantity : null,
      available_quantity: availability ? availability.available_quantity : null,
      // Production absente du résultat (non autorisée côté base) : disponibilité illisible
      availability_error: !availability,
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
  const supabase = await createClient();

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
      destinations:campaign_destinations (
        id,
        campaign_id,
        province_id,
        city_name,
        expected_arrival_date,
        order_deadline_date,
        previous_arrival_date,
        created_at,
        provinces (
          id,
          name,
          code
        ),
        depots:campaign_depots (
          id,
          campaign_destination_id,
          campaign_id,
          name,
          commune,
          quartier,
          address,
          complement,
          created_at
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
    .filter((sr: any) => isConsumingReservation(sr.status))
    .reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
  const availableQty = Math.max(0, marketableQty - reservedQty);
  const effectiveStatus = getEffectiveCampaignStatus(rawItem);

  return {
    ...rawItem,
    status: effectiveStatus,
    stored_status: rawItem.status,
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
    destinations: (rawItem.destinations || []).map((dest: any) => ({
      ...dest,
      provinces: Array.isArray(dest.provinces) ? dest.provinces[0] : dest.provinces,
      depots: dest.depots || [],
    })),
  } as CompanyCampaignItem;
}

/**
 * Récupère les campagnes ouvertes pour les revendeurs (status = 'active')
 * Calcule l'éligibilité géographique et le stock restant réel
 */
export async function getResellerCampaigns(
  resellerOrProvinceId?: ResellerLocationContext | string | null,
  filters: CampaignFilterParams = {}
): Promise<ResellerCampaignItem[]> {
  const supabase = await createClient();

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
      destinations:campaign_destinations (
        id,
        campaign_id,
        province_id,
        city_name,
        expected_arrival_date,
        order_deadline_date,
        previous_arrival_date,
        created_at,
        provinces (
          id,
          name,
          code
        ),
        depots:campaign_depots (
          id,
          campaign_destination_id,
          campaign_id,
          name,
          commune,
          quartier,
          address,
          complement,
          created_at
        )
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

  // Règle 6 & Phase 28 : Fin automatique des campagnes ayant atteint end_date ou dont toutes les destinations sont expirées
  const activeData = (data || []).filter((item: any) => {
    return isCampaignActive(item);
  });

  // Stock revendeur : disponible agrégé, un seul appel groupé pour toute la liste
  const availabilityLookup = await fetchCampaignsAvailability(
    supabase,
    activeData.map((item: any) => item.id as string)
  );

  const campaigns: ResellerCampaignItem[] = activeData.map((item: any) => {
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

    const destinations = (item.destinations || []).map((dest: any) => ({
      ...dest,
      provinces: Array.isArray(dest.provinces) ? dest.provinces[0] : dest.provinces,
      depots: dest.depots || [],
    }));

    const resellerContext: ResellerLocationContext | null =
      typeof resellerOrProvinceId === "object" && resellerOrProvinceId !== null
        ? resellerOrProvinceId
        : typeof resellerOrProvinceId === "string" && resellerOrProvinceId.trim() !== ""
        ? { province_id: resellerOrProvinceId }
        : null;

    const marketableQty = Number(item.marketable_quantity);
    const availability = resolveCampaignAvailability(availabilityLookup, item.id);

    // Évaluation d'éligibilité via la source unique de vérité (disponible inconnu = 0 : non commandable)
    const baseEligibility = isResellerEligibleForCampaign({
      reseller: resellerContext,
      campaign: {
        ...item,
        available_quantity: availability.available_quantity ?? 0,
        delivery_zones: deliveryZones,
        destinations: destinations,
      },
    });
    const eligibility = {
      ...baseEligibility,
      ...applyAvailabilityToEligibility(baseEligibility, availability.availability_unavailable),
    };

    return {
      ...item,
      marketable_quantity: marketableQty,
      reserved_quantity:
        availability.available_quantity === null
          ? null
          : Math.max(0, marketableQty - availability.available_quantity),
      available_quantity: availability.available_quantity,
      availability_unavailable: availability.availability_unavailable,
      unit_price: Number(item.unit_price),
      min_order_quantity: Number(item.min_order_quantity || 1),
      company,
      product: Array.isArray(item.product) ? item.product[0] : item.product,
      production: {
        ...(Array.isArray(item.production) ? item.production[0] : item.production),
        expected_quantity: Number(item.production?.expected_quantity || 0),
      },
      delivery_zones: deliveryZones,
      destinations: destinations,
      is_eligible: eligibility.eligible,
      can_order: eligibility.canOrder,
      eligibility_reason: eligibility.reason,
      eligibility_message: eligibility.message,
      destination_deadline_date: eligibility.matchingDestination?.order_deadline_date || null,
      destination_city_name: eligibility.matchingDestination?.city_name || null,
    };
  });

  // Filtre optionnel : afficher uniquement les offres éligibles
  if (filters.eligibleOnly && resellerOrProvinceId) {
    return campaigns.filter((c) => c.is_eligible);
  }

  return campaigns;
}

/**
 * Récupère la campagne active associée à une production (vue revendeur)
 */
export async function getActiveCampaignByProductionId(
  productionId: string,
  resellerOrProvinceId?: ResellerLocationContext | string | null
): Promise<ResellerCampaignItem | null> {
  const supabase = await createClient();

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
      destinations:campaign_destinations (
        id,
        campaign_id,
        province_id,
        city_name,
        expected_arrival_date,
        order_deadline_date,
        previous_arrival_date,
        created_at,
        provinces (
          id,
          name,
          code
        ),
        depots:campaign_depots (
          id,
          campaign_destination_id,
          campaign_id,
          name,
          commune,
          quartier,
          address,
          complement,
          created_at
        )
      )
    `)
    .eq("production_id", productionId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération campagne active par production:", error);
    return null;
  }

  const rawItem = data as any;

  // Règle 6 / C2 : date de fin dépassée ou toutes les destinations expirées → plus active
  if (!isCampaignActive(rawItem)) {
    return null;
  }

  const rawCompany = Array.isArray(rawItem.company) ? rawItem.company[0] : rawItem.company;
  const company = {
    ...rawCompany,
    provinces: Array.isArray(rawCompany?.provinces) ? rawCompany.provinces[0] : rawCompany?.provinces,
    countries: Array.isArray(rawCompany?.countries) ? rawCompany.countries[0] : rawCompany?.countries,
  };

  const deliveryZones = (rawItem.delivery_zones || []).map((zone: any) => ({
    ...zone,
    provinces: Array.isArray(zone.provinces) ? zone.provinces[0] : zone.provinces,
  }));

  const destinations = (rawItem.destinations || []).map((dest: any) => ({
    ...dest,
    provinces: Array.isArray(dest.provinces) ? dest.provinces[0] : dest.provinces,
    depots: dest.depots || [],
  }));

  const resellerContext: ResellerLocationContext | null =
    typeof resellerOrProvinceId === "object" && resellerOrProvinceId !== null
      ? resellerOrProvinceId
      : typeof resellerOrProvinceId === "string" && resellerOrProvinceId.trim() !== ""
      ? { province_id: resellerOrProvinceId }
      : null;

  const marketableQty = Number(rawItem.marketable_quantity);
  const availabilityLookup = await fetchCampaignsAvailability(supabase, [rawItem.id]);
  const availability = resolveCampaignAvailability(availabilityLookup, rawItem.id);

  const baseEligibility = isResellerEligibleForCampaign({
    reseller: resellerContext,
    campaign: {
      ...rawItem,
      available_quantity: availability.available_quantity ?? 0,
      delivery_zones: deliveryZones,
      destinations: destinations,
    },
  });
  const eligibility = {
    ...baseEligibility,
    ...applyAvailabilityToEligibility(baseEligibility, availability.availability_unavailable),
  };

  return {
    ...rawItem,
    marketable_quantity: marketableQty,
    reserved_quantity:
      availability.available_quantity === null
        ? null
        : Math.max(0, marketableQty - availability.available_quantity),
    available_quantity: availability.available_quantity,
    availability_unavailable: availability.availability_unavailable,
    unit_price: Number(rawItem.unit_price),
    min_order_quantity: Number(rawItem.min_order_quantity || 1),
    company,
    product: Array.isArray(rawItem.product) ? rawItem.product[0] : rawItem.product,
    production: {
      ...(Array.isArray(rawItem.production) ? rawItem.production[0] : rawItem.production),
      expected_quantity: Number(rawItem.production?.expected_quantity || 0),
    },
    delivery_zones: deliveryZones,
    destinations: destinations,
    is_eligible: eligibility.eligible,
    can_order: eligibility.canOrder,
    eligibility_reason: eligibility.reason,
    eligibility_message: eligibility.message,
    destination_deadline_date: eligibility.matchingDestination?.order_deadline_date || null,
    destination_city_name: eligibility.matchingDestination?.city_name || null,
  };
}

export {
  getEffectiveCampaignStatus,
  isCampaignActive,
  getCampaignDestinationsSummary,
} from "@/lib/utils/campaignStatus";
