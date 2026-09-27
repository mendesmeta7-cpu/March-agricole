/**
 * Service centralisé d'éligibilité des campagnes commerciales
 * Source unique de vérité pour déterminer l'éligibilité territoriale
 * et la possibilité de commander d'un revendeur pour une campagne.
 */

export type CampaignEligibilityReason =
  | "ORDER_ALLOWED"
  | "REGION_NOT_ELIGIBLE"
  | "COUNTRY_NOT_ELIGIBLE"
  | "PROVINCE_NOT_SERVED"
  | "CAMPAIGN_NOT_OPEN"
  | "OUT_OF_STOCK"
  | "UNAUTHENTICATED"
  | "PROFILE_INCOMPLETE";

export interface ResellerLocationContext {
  id?: string;
  country_id?: string | null;
  countryId?: string | null;
  province_id?: string | null;
  provinceId?: string | null;
  city?: string | null;
  delivery_address?: string | null;
  address?: string | null;
  provinces?: { id?: string; name?: string; code?: string } | { id?: string; name?: string; code?: string }[] | null;
  countries?: { id?: string; name?: string; code?: string } | { id?: string; name?: string; code?: string }[] | null;
  [key: string]: any;
}

export interface CampaignDeliveryZoneContext {
  id?: string;
  country_id?: string | null;
  province_id?: string | null;
  provinces?: { id?: string; name?: string; code?: string } | null;
  countries?: { id?: string; name?: string; code?: string } | null;
}

export interface CampaignDestinationContext {
  id?: string;
  province_id?: string | null;
  city_name?: string | null;
  expected_arrival_date?: string | null;
  previous_arrival_date?: string | null;
  provinces?: { id?: string; name?: string; code?: string } | null;
  depots?: any[];
}

export interface CampaignEligibilityContext {
  id?: string;
  title?: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  marketable_quantity?: number | null;
  reserved_quantity?: number | null;
  available_quantity?: number | null;
  delivery_zones?: CampaignDeliveryZoneContext[] | null;
  campaign_delivery_zones?: CampaignDeliveryZoneContext[] | null;
  destinations?: CampaignDestinationContext[] | null;
  campaign_destinations?: CampaignDestinationContext[] | null;
}

export interface CampaignEligibilityResult {
  /** Vrai si le territoire géographique du revendeur est couvert par l'offre */
  eligible: boolean;
  /** Vrai si toutes les conditions sont réunies pour commander (territoire + ouvert + stock disponible + authentifié) */
  canOrder: boolean;
  /** Motif précis du statut */
  reason: CampaignEligibilityReason;
  /** Message d'information clair pour l'utilisateur */
  message: string;
  /** Destination spécifique correspondant au territoire du revendeur (si configurée) */
  matchingDestination?: CampaignDestinationContext | null;
}

/**
 * Fonction de référence unique déterminant l'éligibilité d'un revendeur pour une campagne.
 * 
 * Règles :
 * 1. Si aucun revendeur ou profil incomplet -> UNAUTHENTICATED / PROFILE_INCOMPLETE
 * 2. Si le pays du revendeur ne fait pas partie des pays desservis -> COUNTRY_NOT_ELIGIBLE
 * 3. Si la province du revendeur n'est couverte ni par les destinations ni par les zones de livraison -> REGION_NOT_ELIGIBLE
 * 4. Si la région est éligible mais que la campagne n'est pas ouverte (statut != 'active' ou dates hors période) -> CAMPAIGN_NOT_OPEN
 * 5. Si la région est éligible mais que le stock est épuisé -> OUT_OF_STOCK
 * 6. Si toutes les conditions sont réunies -> ORDER_ALLOWED
 */
export function isResellerEligibleForCampaign(params: {
  reseller?: ResellerLocationContext | null;
  campaign?: CampaignEligibilityContext | null;
}): CampaignEligibilityResult {
  const { reseller, campaign } = params;

  if (!campaign) {
    return {
      eligible: false,
      canOrder: false,
      reason: "CAMPAIGN_NOT_OPEN",
      message: "Aucune offre commerciale active n'est associée à cette production.",
      matchingDestination: null,
    };
  }

  // 1. Vérification du cycle de vie de la campagne
  const todayStr = new Date().toISOString().split("T")[0];
  const isStatusActive = campaign.status === "active";
  const isStarted = !campaign.start_date || campaign.start_date <= todayStr;
  const isNotExpired = !campaign.end_date || campaign.end_date >= todayStr;
  const isOpen = isStatusActive && isStarted && isNotExpired;

  // Calcul du stock disponible
  const marketable = Number(campaign.marketable_quantity || 0);
  const reserved = Number(campaign.reserved_quantity || 0);
  const available =
    campaign.available_quantity !== undefined && campaign.available_quantity !== null
      ? Number(campaign.available_quantity)
      : Math.max(0, marketable - reserved);
  const hasStock = available > 0;

  // Extraction et normalisation des zones et destinations
  const zones: CampaignDeliveryZoneContext[] =
    campaign.delivery_zones || campaign.campaign_delivery_zones || [];
  const destinations: CampaignDestinationContext[] =
    campaign.destinations || campaign.campaign_destinations || [];

  // 2. Vérification de l'authentification
  if (!reseller) {
    return {
      eligible: false,
      canOrder: false,
      reason: "UNAUTHENTICATED",
      message: "Vous devez être connecté avec un compte revendeur pour commander.",
      matchingDestination: null,
    };
  }

  const resellerProvinceId = reseller.province_id || reseller.provinceId;
  const resellerCountryId = reseller.country_id || reseller.countryId;

  // Profil sans province de rattachement
  if (!resellerProvinceId) {
    return {
      eligible: false,
      canOrder: false,
      reason: "PROFILE_INCOMPLETE",
      message: "Votre localisation n'est pas encore configurée. Veuillez renseigner votre province dans votre profil.",
      matchingDestination: null,
    };
  }

  // 3. Contrôle au niveau du Pays (si les zones de livraison spécifient un country_id)
  const zoneCountryIds = Array.from(
    new Set(zones.map((z) => z.country_id).filter(Boolean))
  ) as string[];

  const rawCountries = reseller.countries;
  const countryObj = Array.isArray(rawCountries) ? rawCountries[0] : rawCountries;
  const resellerCountryName = countryObj?.name || "votre pays";

  if (resellerCountryId && zoneCountryIds.length > 0) {
    const isCountryServed = zoneCountryIds.includes(resellerCountryId);
    if (!isCountryServed) {
      return {
        eligible: false,
        canOrder: false,
        reason: "COUNTRY_NOT_ELIGIBLE",
        message: `Cette offre commerciale n'est pas disponible dans ${resellerCountryName}.`,
        matchingDestination: null,
      };
    }
  }

  // 4. Contrôle au niveau de la Province / Région
  const matchingDestination = destinations.find(
    (d) => d.province_id === resellerProvinceId
  ) || null;

  const isProvinceServed = Boolean(
    matchingDestination ||
    zones.some((z) => z.province_id === resellerProvinceId)
  );

  const rawProvinces = reseller.provinces;
  const provObj = Array.isArray(rawProvinces) ? rawProvinces[0] : rawProvinces;
  const matchProv = Array.isArray(matchingDestination?.provinces)
    ? matchingDestination.provinces[0]
    : matchingDestination?.provinces;

  const provinceName =
    provObj?.name ||
    matchProv?.name ||
    "votre province";

  if (!isProvinceServed) {
    return {
      eligible: false,
      canOrder: false,
      reason: "REGION_NOT_ELIGIBLE",
      message: `Non disponible dans votre région (${provinceName}). Cette offre commerciale dessert d'autres destinations. Vous pouvez toutefois formuler une demande spécifique ci-dessous.`,
      matchingDestination: null,
    };
  }

  // Le territoire est éligible !
  // 5. Vérification de l'ouverture de la campagne
  if (!isOpen) {
    return {
      eligible: true,
      canOrder: false,
      reason: "CAMPAIGN_NOT_OPEN",
      message: "Cette offre commerciale n'est plus ou pas encore ouverte aux commandes.",
      matchingDestination,
    };
  }

  // 6. Vérification du stock disponible
  if (!hasStock) {
    return {
      eligible: true,
      canOrder: false,
      reason: "OUT_OF_STOCK",
      message: "Stock disponible épuisé sur cette offre.",
      matchingDestination,
    };
  }

  // 7. Toutes les conditions sont remplies !
  return {
    eligible: true,
    canOrder: true,
    reason: "ORDER_ALLOWED",
    message: "Offre disponible à la commande.",
    matchingDestination,
  };
}
