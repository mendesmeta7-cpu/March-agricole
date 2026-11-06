"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CampaignStatus } from "@/lib/queries/campaigns";
import {
  canOfferReopen,
  destinationsOpenAfterReopen,
  isCampaignEffectivelyOpen,
  todayUtc,
  validateReopenEndDate,
} from "@/lib/utils/campaignReopenRules";
import {
  ExistingDestination,
  DestinationSyncPlan,
  planDestinationSync,
  sortOpenDestinationsFirst,
} from "@/lib/utils/destinationSync";
import {
  ProductionCampaignAvailability,
  toProductionAvailability,
} from "@/lib/actions/campaignAvailability";

export interface CampaignActionResult {
  success: boolean;
  message?: string;
  error?: string;
  campaignId?: string;
}

export interface ProductionAvailabilityActionResult {
  success: boolean;
  error?: string;
  availability?: ProductionCampaignAvailability;
}

export interface ReopenDestinationDeadline {
  destinationId: string;
  orderDeadlineDate: string;
}

const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  draft: "brouillon",
  planned: "planifiée",
  growing: "en culture",
  harvested: "récoltée",
  cancelled: "annulée",
};

const AVAILABILITY_CHECK_FAILED_MESSAGE =
  "Impossible de vérifier le volume encore disponible sur la production. Aucune modification n'a été enregistrée. Veuillez réessayer.";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function formatQty(value: number): string {
  return value.toLocaleString("fr-FR");
}

/**
 * D4 — volume encore engageable d'une production pour une campagne, lu par
 * public.get_productions_campaign_availability (seule autorité, avec le trigger
 * de campagne). Aucune valeur de repli en cas d'erreur.
 */
async function readProductionAvailability(
  supabase: any,
  productionId: string,
  excludeCampaignId: string | null
): Promise<{ ok: true; availability: ProductionCampaignAvailability | null } | { ok: false }> {
  const { data, error } = await supabase.rpc("get_productions_campaign_availability", {
    p_production_ids: [productionId],
    p_exclude_campaign_id: excludeCampaignId,
  });
  if (error) {
    console.error("Erreur RPC get_productions_campaign_availability:", error);
    return { ok: false };
  }
  const row = ((data as any[] | null) ?? []).find((r) => r.production_id === productionId);
  return { ok: true, availability: row ? toProductionAvailability(row) : null };
}

/** Message A3 aligné sur celui du trigger guard_campaign_business_rules. */
function insufficientVolumeMessage(availability: ProductionCampaignAvailability): string {
  return `Volume insuffisant sur la production : ${formatQty(availability.committed_quantity)} ${availability.unit} déjà engagé(s) sur ${formatQty(availability.expected_quantity)} ${availability.unit} ; disponible pour cette campagne : ${formatQty(availability.available_quantity)} ${availability.unit}.`;
}

/**
 * D4 — disponibilité d'une production pour une campagne, à l'ouverture du
 * formulaire en modification : la campagne modifiée est exclue du volume engagé.
 */
export async function getProductionAvailabilityAction(
  productionId: string,
  excludeCampaignId?: string | null
): Promise<ProductionAvailabilityActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié." };
  }
  if (!productionId) {
    return { success: false, error: "Production de référence manquante." };
  }

  const result = await readProductionAvailability(supabase, productionId, excludeCampaignId || null);
  if (!result.ok) {
    return { success: false, error: "La disponibilité de la production est momentanément illisible. Veuillez réessayer." };
  }
  if (!result.availability) {
    return { success: false, error: "Production introuvable ou non autorisée." };
  }
  return { success: true, availability: result.availability };
}

/**
 * Récupère l'ID d'entreprise associée à un utilisateur (via membership ou créateur)
 */
async function getCompanyIdForUser(supabase: any, userId: string): Promise<string | null> {
  const { data: memberData } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (memberData?.company_id) {
    return memberData.company_id;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("created_by", userId)
    .maybeSingle();

  return company?.id || null;
}

/**
 * FUN-14 — Traduit une erreur PostgreSQL / PostgREST en message utilisateur français.
 * - Les exceptions métier levées par nos fonctions et triggers (RAISE EXCEPTION, code P0001)
 *   sont déjà rédigées en français : elles sont restituées telles quelles.
 * - Les violations de contraintes connues reçoivent un message explicite.
 * - Sinon, le message de repli fourni est utilisé (aucun détail technique exposé).
 */
function toUserFacingDbError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string
): string {
  if (!error) return fallback;
  const msg = (error.message || "").trim();
  switch (error.code) {
    case "P0001":
      return msg || fallback;
    case "23505":
      if (msg.includes("uq_campaign_destinations_city")) {
        return "Une même ville ne peut figurer qu'une seule fois parmi les destinations d'une campagne.";
      }
      return "Cet enregistrement existe déjà.";
    case "23503":
      return "Une référence est invalide (province, production, destination ou dépôt introuvable).";
    case "23502":
      return "Un champ obligatoire est manquant.";
    case "23514":
      if (msg.includes("currency")) {
        return "Devise non prise en charge : seules les devises CDF et USD sont acceptées.";
      }
      return "Une valeur saisie ne respecte pas les contraintes de la plateforme.";
    case "42501":
      return "Action non autorisée sur cette campagne.";
    default:
      return fallback;
  }
}

interface ParsedDepot {
  id?: string;
  name?: string;
  commune?: string;
  quartier?: string;
  address?: string;
  complement?: string;
}

interface ParsedDestination {
  id?: string;
  province_id?: string;
  city_name?: string;
  expected_arrival_date?: string;
  order_deadline_date?: string | null;
  depots?: ParsedDepot[];
}

/**
 * Lecture du JSON des destinations. Un JSON illisible est une erreur explicite
 * (il n'est plus ignoré silencieusement).
 */
function parseDestinationsJson(
  raw: FormDataEntryValue | null
): { ok: true; data: ParsedDestination[] } | { ok: false; error: string } {
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    return { ok: true, data: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Le format des destinations transmises est invalide." };
    }
    return { ok: true, data: parsed as ParsedDestination[] };
  } catch {
    return { ok: false, error: "Le format des destinations transmises est invalide." };
  }
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * FUN-07 — Validation serveur des champs obligatoires des destinations et dépôts.
 * Aucune valeur par défaut n'est inventée : un champ manquant renvoie une erreur claire.
 */
function validateDestinations(destinations: ParsedDestination[]): string | null {
  const seenCities = new Set<string>();
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    const city = clean(dest.city_name);
    const label = city || `n°${i + 1}`;
    if (!city) {
      return `Veuillez renseigner la ville de la destination n°${i + 1}.`;
    }
    if (!clean(dest.province_id)) {
      return `Veuillez sélectionner la province de la destination ${label}.`;
    }
    if (!clean(dest.expected_arrival_date)) {
      return `Veuillez renseigner la date prévue d'arrivée pour la destination ${label}.`;
    }
    // Miroir de la contrainte uq_campaign_destinations_city (campaign_id, city_name)
    if (seenCities.has(city)) {
      return `La ville ${city} figure plusieurs fois parmi les destinations.`;
    }
    seenCities.add(city);

    const depots = Array.isArray(dest.depots) ? dest.depots : [];
    for (let j = 0; j < depots.length; j++) {
      const depot = depots[j];
      if (!clean(depot.name)) {
        return `Veuillez renseigner le nom du dépôt n°${j + 1} à ${city}.`;
      }
      if (!clean(depot.commune)) {
        return `Veuillez renseigner la commune du dépôt n°${j + 1} à ${city}.`;
      }
      if (!clean(depot.address)) {
        return `Veuillez renseigner l'adresse (rue, avenue ou marché) du dépôt n°${j + 1} à ${city}.`;
      }
    }
  }
  return null;
}

function buildDepotRow(depot: ParsedDepot) {
  return {
    name: clean(depot.name),
    commune: clean(depot.commune),
    quartier: clean(depot.quartier) || null,
    address: clean(depot.address),
    complement: clean(depot.complement) || null,
  };
}

function incompleteCampaignMessage(action: "créée" | "mise à jour", detail: string): string {
  return `La campagne a été ${action}, mais elle est incomplète : ${detail} Ouvrez-la en modification pour compléter ses destinations et dépôts.`;
}

/**
 * Crée une nouvelle campagne commerciale adossée à une production existante
 * RÈGLE STRICTE V1 : Campagnes autorisées UNIQUEMENT sur productions récoltées ('harvested')
 */
export async function createCampaignAction(
  formData: FormData
): Promise<CampaignActionResult> {
  const supabase = await createClient();

  // 1. Vérification de l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié pour créer une campagne." };
  }

  // 2. Récupération de l'entreprise rattachée à l'utilisateur
  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { success: false, error: "Aucune entreprise agricole associée à votre compte." };
  }

  // 3. Extraction et assainissement des données du formulaire
  const productionId = formData.get("production_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const marketableQuantityStr = formData.get("marketable_quantity") as string;
  const unitPriceStr = formData.get("unit_price") as string;
  const currency = (formData.get("currency") as string)?.trim() || "USD";
  const minOrderQuantityStr = (formData.get("min_order_quantity") as string) || "1";
  const startDate = formData.get("start_date") as string;
  const endDate = (formData.get("end_date") as string) || null;
  const availabilityPeriod = (formData.get("availability_period") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "draft";
  const provincesRaw = formData.getAll("province_ids") as string[];

  const parsedResult = parseDestinationsJson(formData.get("destinations_json"));
  if (!parsedResult.ok) {
    return { success: false, error: parsedResult.error };
  }
  const parsedDestinations = parsedResult.data;

  // Si des destinations par ville sont fournies, déduire automatiquement les provinces
  const provinceIds = Array.from(new Set(provincesRaw)).filter(Boolean);
  for (const d of parsedDestinations) {
    const provId = clean(d.province_id);
    if (provId && !provinceIds.includes(provId)) {
      provinceIds.push(provId);
    }
  }

  // 4. Validations métier
  if (!productionId) {
    return { success: false, error: "L'adossement à une production existante est obligatoire." };
  }

  if (!title || title.length < 3) {
    return { success: false, error: "Le titre de la campagne doit comporter au moins 3 caractères." };
  }

  const marketableQuantity = parseFloat(marketableQuantityStr);
  if (isNaN(marketableQuantity) || marketableQuantity <= 0) {
    return { success: false, error: "La quantité commercialisée doit être un nombre strictement positif." };
  }

  const unitPrice = parseFloat(unitPriceStr);
  if (isNaN(unitPrice) || unitPrice <= 0) {
    return { success: false, error: "Le prix unitaire doit être un montant strictement positif." };
  }

  const minOrderQuantity = parseFloat(minOrderQuantityStr) || 1;
  if (minOrderQuantity <= 0) {
    return { success: false, error: "La quantité minimale de commande doit être strictement positive." };
  }

  const todayStr = new Date().toISOString().split("T")[0];

  if (!startDate) {
    return { success: false, error: "La date de début de commercialisation est obligatoire." };
  }

  if (startDate < todayStr) {
    return { success: false, error: "La date d'ouverture de vente ne peut pas être dans le passé." };
  }

  if (endDate && endDate < todayStr) {
    return { success: false, error: "La date de clôture ne peut pas être dans le passé." };
  }

  if (endDate && new Date(endDate) < new Date(startDate)) {
    return { success: false, error: "La date de fin ne peut être antérieure à la date de début." };
  }

  const destinationsError = validateDestinations(parsedDestinations);
  if (destinationsError) {
    return { success: false, error: destinationsError };
  }

  for (const d of parsedDestinations) {
    if (d.expected_arrival_date && d.expected_arrival_date < todayStr) {
      return { success: false, error: `La date prévue d'arrivée pour la destination ${clean(d.city_name)} ne peut pas être dans le passé.` };
    }
    if (d.order_deadline_date && d.order_deadline_date < todayStr) {
      return { success: false, error: `La date limite de commande pour la destination ${clean(d.city_name)} ne peut pas être dans le passé.` };
    }
  }

  if (provinceIds.length === 0 && parsedDestinations.length === 0) {
    return { success: false, error: "Veuillez configurer au moins une destination ou province desservie par cette offre." };
  }

  // 5. Contrôle strict de la production parente (appartenance + volume max autorisé + statut 'harvested')
  const { data: production, error: prodErr } = await supabase
    .from("productions")
    .select("id, company_id, product_id, expected_quantity, unit, status")
    .eq("id", productionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (prodErr || !production) {
    return {
      success: false,
      error: "La production sélectionnée est introuvable ou n'appartient pas à votre exploitation.",
    };
  }

  // D2 : campagne créée (même en brouillon) uniquement sur une production récoltée
  if (production.status !== "harvested") {
    return {
      success: false,
      error: `Une campagne ne peut être créée ou ouverte que sur une production récoltée (statut actuel de la production : ${PRODUCTION_STATUS_LABELS[production.status] || production.status}).`,
    };
  }

  // A3 / D4 : la quantité ne peut excéder le volume ENCORE DISPONIBLE de la production
  // (volume déclaré moins le volume déjà engagé). Le trigger reste l'autorité.
  const availabilityResult = await readProductionAvailability(supabase, production.id, null);
  if (!availabilityResult.ok) {
    return { success: false, error: AVAILABILITY_CHECK_FAILED_MESSAGE };
  }
  if (!availabilityResult.availability) {
    return {
      success: false,
      error: "La production sélectionnée est introuvable ou n'appartient pas à votre exploitation.",
    };
  }
  if (marketableQuantity > availabilityResult.availability.available_quantity) {
    return { success: false, error: insufficientVolumeMessage(availabilityResult.availability) };
  }

  // 6. Récupération du country_id depuis l'entreprise
  const { data: company } = await supabase
    .from("companies")
    .select("country_id")
    .eq("id", companyId)
    .single();

  const countryId = company?.country_id;
  if (!countryId) {
    return { success: false, error: "Pays de rattachement introuvable pour votre exploitation." };
  }

  // 7. Insertion de la campagne dans PostgreSQL
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .insert({
      company_id: companyId,
      production_id: production.id,
      product_id: production.product_id,
      title,
      description,
      marketable_quantity: marketableQuantity,
      unit: production.unit,
      unit_price: unitPrice,
      currency,
      min_order_quantity: minOrderQuantity,
      start_date: startDate,
      end_date: endDate,
      availability_period: availabilityPeriod,
      status: status as CampaignStatus,
    })
    .select("id")
    .single();

  if (campErr || !campaign) {
    console.error("Erreur insertion campagne:", campErr);
    return {
      success: false,
      error: toUserFacingDbError(campErr, "L'enregistrement de la campagne a échoué. Veuillez réessayer."),
    };
  }

  // À partir d'ici la campagne existe : toute erreur est signalée explicitement
  // (la campagne n'est pas supprimée, l'utilisateur doit la compléter).
  const revalidateCampaignPaths = () => {
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/company/campaigns");
    revalidatePath("/dashboard/reseller/campaigns");
  };
  const failIncomplete = (detail: string, err: unknown): CampaignActionResult => {
    console.error("Campagne créée mais incomplète:", detail, err);
    revalidateCampaignPaths();
    return {
      success: false,
      campaignId: campaign.id,
      error: incompleteCampaignMessage("créée", detail),
    };
  };

  // 8. Insertion des zones de livraison dans campaign_delivery_zones (insertion groupée)
  const zonesToInsert = provinceIds.map((provId) => ({
    campaign_id: campaign.id,
    country_id: countryId,
    province_id: provId,
  }));

  if (zonesToInsert.length > 0) {
    const { error: zonesErr } = await supabase
      .from("campaign_delivery_zones")
      .insert(zonesToInsert);

    if (zonesErr) {
      return failIncomplete(
        `les provinces de livraison n'ont pas pu être enregistrées (${toUserFacingDbError(zonesErr, "erreur base de données")}).`,
        zonesErr
      );
    }
  }

  // 8.b. Insertion groupée des destinations par ville, puis de tous leurs dépôts
  if (parsedDestinations.length > 0) {
    // C-6 : destinations ouvertes d'abord (le trigger évalue chaque ligne dans l'ordre)
    const { data: createdDests, error: destErr } = await supabase
      .from("campaign_destinations")
      .insert(
        sortOpenDestinationsFirst(parsedDestinations, todayStr).map((dest) => ({
          campaign_id: campaign.id,
          province_id: clean(dest.province_id),
          city_name: clean(dest.city_name),
          expected_arrival_date: dest.expected_arrival_date,
          order_deadline_date: dest.order_deadline_date || null,
        }))
      )
      .select("id, city_name");

    if (destErr || !createdDests || createdDests.length !== parsedDestinations.length) {
      return failIncomplete(
        `les destinations n'ont pas pu être enregistrées (${toUserFacingDbError(destErr, "enregistrement partiel")}).`,
        destErr
      );
    }

    // La ville est unique par campagne (contrainte uq_campaign_destinations_city)
    const destIdByCity = new Map<string, string>(
      createdDests.map((d: { id: string; city_name: string }) => [d.city_name, d.id])
    );

    const depotsToInsert = parsedDestinations.flatMap((dest) => {
      const destinationId = destIdByCity.get(clean(dest.city_name));
      if (!destinationId) return [];
      return (dest.depots || []).map((depot) => ({
        ...buildDepotRow(depot),
        campaign_destination_id: destinationId,
        campaign_id: campaign.id,
      }));
    });

    if (depotsToInsert.length > 0) {
      const { error: depotsErr } = await supabase
        .from("campaign_depots")
        .insert(depotsToInsert);

      if (depotsErr) {
        return failIncomplete(
          `les points de dépôt n'ont pas pu être enregistrés (${toUserFacingDbError(depotsErr, "erreur base de données")}).`,
          depotsErr
        );
      }
    }
  }

  // 9. Si la campagne est immédiatement active, notifier les revendeurs
  if (status === "active") {
    try {
      await supabase.rpc("notify_resellers_on_campaign_opened", {
        p_campaign_id: campaign.id,
      });
    } catch (notifErr) {
      console.warn("Erreur notification revendeurs ouverture campagne:", notifErr);
    }
  }

  // 10. Rafraîchissement du cache Next.js
  revalidateCampaignPaths();

  return {
    success: true,
    message: status === "active" ? "Campagne commerciale ouverte avec succès !" : "Campagne enregistrée comme brouillon.",
    campaignId: campaign.id,
  };
}

/**
 * Met à jour une campagne commerciale existante et ses zones de livraison
 */
export async function updateCampaignAction(
  campaignId: string,
  formData: FormData
): Promise<CampaignActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { success: false, error: "Exploitation introuvable." };
  }

  // Vérification préalable de la campagne
  const { data: currentCampaign, error: currentCampaignErr } = await supabase
    .from("campaigns")
    .select("id, company_id, production_id, status, end_date, marketable_quantity, campaign_destinations(order_deadline_date)")
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (currentCampaignErr) {
    console.error("Erreur lecture campagne avant modification:", currentCampaignErr);
    return {
      success: false,
      error: "Impossible de lire la campagne. Aucune modification n'a été enregistrée. Veuillez réessayer.",
    };
  }

  if (!currentCampaign) {
    return { success: false, error: "Campagne introuvable ou non autorisée." };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const marketableQuantityStr = formData.get("marketable_quantity") as string;
  const unitPriceStr = formData.get("unit_price") as string;
  const currency = (formData.get("currency") as string)?.trim() || "USD";
  const minOrderQuantityStr = (formData.get("min_order_quantity") as string) || "1";
  const startDate = formData.get("start_date") as string;
  const endDate = (formData.get("end_date") as string) || null;
  const availabilityPeriod = (formData.get("availability_period") as string)?.trim() || null;
  const provincesRaw = formData.getAll("province_ids") as string[];

  const parsedResult = parseDestinationsJson(formData.get("destinations_json"));
  if (!parsedResult.ok) {
    return { success: false, error: parsedResult.error };
  }
  const parsedDestinations = parsedResult.data;

  const provinceIds = Array.from(new Set(provincesRaw)).filter(Boolean);
  for (const d of parsedDestinations) {
    const provId = clean(d.province_id);
    if (provId && !provinceIds.includes(provId)) {
      provinceIds.push(provId);
    }
  }

  if (!title || title.length < 3) {
    return { success: false, error: "Le titre doit comporter au moins 3 caractères." };
  }

  const marketableQuantity = parseFloat(marketableQuantityStr);
  if (isNaN(marketableQuantity) || marketableQuantity <= 0) {
    return { success: false, error: "La quantité commercialisée doit être positive." };
  }

  const unitPrice = parseFloat(unitPriceStr);
  if (isNaN(unitPrice) || unitPrice <= 0) {
    return { success: false, error: "Le prix unitaire doit être positif." };
  }

  const minOrderQuantity = parseFloat(minOrderQuantityStr) || 1;

  const todayStr = new Date().toISOString().split("T")[0];

  if (endDate && endDate < todayStr) {
    return { success: false, error: "La date de clôture ne peut pas être dans le passé." };
  }

  if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
    return { success: false, error: "La date de fin ne peut être antérieure à la date de début." };
  }

  const destinationsError = validateDestinations(parsedDestinations);
  if (destinationsError) {
    return { success: false, error: destinationsError };
  }

  for (const d of parsedDestinations) {
    if (d.expected_arrival_date && d.expected_arrival_date < todayStr) {
      return { success: false, error: `La date prévue d'arrivée pour la destination ${clean(d.city_name)} ne peut pas être dans le passé.` };
    }
    if (d.order_deadline_date && d.order_deadline_date < todayStr) {
      return { success: false, error: `La date limite de commande pour la destination ${clean(d.city_name)} ne peut pas être dans le passé.` };
    }
  }

  // A3 / D4 : volume disponible de la production, HORS cette campagne. Comme le
  // trigger, le contrôle ne s'applique qu'à un engagement nouveau ou accru
  // (quantité augmentée, ou campagne qui n'était pas effectivement ouverte).
  const previousQuantity = Number(currentCampaign.marketable_quantity) || 0;
  const wasOpen = isCampaignEffectivelyOpen(currentCampaign as any);
  const willBeOpen = isCampaignEffectivelyOpen({
    status: currentCampaign.status,
    end_date: endDate,
    destinations:
      parsedDestinations.length > 0
        ? parsedDestinations.map((d) => ({ order_deadline_date: d.order_deadline_date || null }))
        : (currentCampaign as any).campaign_destinations,
  });
  if (willBeOpen && (marketableQuantity > previousQuantity || !wasOpen)) {
    const availabilityResult = await readProductionAvailability(
      supabase,
      currentCampaign.production_id,
      campaignId
    );
    if (!availabilityResult.ok) {
      return { success: false, error: AVAILABILITY_CHECK_FAILED_MESSAGE };
    }
    if (
      availabilityResult.availability &&
      marketableQuantity > availabilityResult.availability.available_quantity
    ) {
      return { success: false, error: insufficientVolumeMessage(availabilityResult.availability) };
    }
  }

  if (provinceIds.length === 0 && parsedDestinations.length === 0) {
    return { success: false, error: "Au moins une province ou destination de livraison doit être sélectionnée." };
  }

  // 0. Préparation de la synchronisation des destinations et dépôts, AVANT toute écriture,
  //    afin de refuser proprement une suppression interdite (FUN-11).
  let existingDestIds: string[] = [];
  let existingDepots: { id: string; campaign_destination_id: string }[] = [];
  let destsToDelete: string[] = [];
  let depotsToDelete: string[] = [];
  let syncPlan: DestinationSyncPlan<ParsedDestination> | null = null;

  if (parsedDestinations.length > 0) {
    const [destRes, depotRes] = await Promise.all([
      supabase.from("campaign_destinations").select("id, city_name, order_deadline_date").eq("campaign_id", campaignId),
      supabase.from("campaign_depots").select("id, campaign_destination_id").eq("campaign_id", campaignId),
    ]);

    if (destRes.error || depotRes.error) {
      console.error("Erreur lecture destinations/dépôts existants:", destRes.error || depotRes.error);
      return {
        success: false,
        error: "Impossible de lire les destinations actuelles de la campagne. Aucune modification n'a été enregistrée. Veuillez réessayer.",
      };
    }

    const existingDests = (destRes.data || []) as ExistingDestination[];
    existingDestIds = existingDests.map((d) => d.id);
    existingDepots = (depotRes.data || []) as { id: string; campaign_destination_id: string }[];

    // C-6 : ordre des écritures et reprise des villes retirées puis rajoutées
    syncPlan = planDestinationSync(existingDests, parsedDestinations, todayStr);
    destsToDelete = [...syncPlan.earlyDeletes, ...syncPlan.deletes];

    // C3 / R-4 : seul le report d'une destination existante peut rouvrir la campagne
    if (currentCampaign.status !== "cancelled" && syncPlan.reopensWithoutPostponement) {
      return {
        success: false,
        error: "Toutes les destinations de cette campagne sont expirées : l'ajout ou la suppression de destinations ne permet pas de la rouvrir. Reportez la date limite d'une destination existante (« Rouvrir la campagne »).",
      };
    }

    // Dépôts retirés d'une destination conservée (uniquement si des dépôts sont transmis pour elle) ;
    // une destination reprise perd tous les dépôts qui ne lui sont pas transmis.
    for (const dest of syncPlan.resolved) {
      if (!dest.id || !existingDestIds.includes(dest.id)) continue;
      const reused = syncPlan.reusedIds.includes(dest.id);
      if (!reused && (!dest.depots || dest.depots.length === 0)) continue;
      const submittedDepotIds = (dest.depots || []).map((dp) => dp.id).filter(Boolean) as string[];
      existingDepots
        .filter((dp) => dp.campaign_destination_id === dest.id && !submittedDepotIds.includes(dp.id))
        .forEach((dp) => depotsToDelete.push(dp.id));
    }

    // Les dépôts d'une destination supprimée disparaissent avec elle (ON DELETE CASCADE)
    const cascadedDepotIds = existingDepots
      .filter((dp) => destsToDelete.includes(dp.campaign_destination_id))
      .map((dp) => dp.id);
    const allRemovedDepotIds = [...depotsToDelete, ...cascadedDepotIds];

    // Une destination ou un dépôt référencé par des commandes ne doit pas être supprimé :
    // la suppression mettrait à NULL orders.destination_id / orders.depot_id (historique dégradé).
    const [ordersOnDest, ordersOnDepot] = await Promise.all([
      destsToDelete.length > 0
        ? supabase.from("orders").select("id").in("destination_id", destsToDelete).limit(1)
        : Promise.resolve({ data: [] as { id: string }[], error: null }),
      allRemovedDepotIds.length > 0
        ? supabase.from("orders").select("id").in("depot_id", allRemovedDepotIds).limit(1)
        : Promise.resolve({ data: [] as { id: string }[], error: null }),
    ]);

    if (ordersOnDest.error || ordersOnDepot.error) {
      console.error("Erreur vérification commandes liées:", ordersOnDest.error || ordersOnDepot.error);
      return {
        success: false,
        error: "Impossible de vérifier les commandes liées aux destinations. Aucune modification n'a été enregistrée. Veuillez réessayer.",
      };
    }

    if ((ordersOnDest.data || []).length > 0) {
      return {
        success: false,
        error: "Une destination que vous avez retirée est liée à des commandes existantes. Conservez-la dans la campagne (vous pouvez avancer sa date limite de commande) puis réessayez.",
      };
    }

    if ((ordersOnDepot.data || []).length > 0) {
      return {
        success: false,
        error: "Un point de dépôt que vous avez retiré est lié à des commandes existantes. Conservez-le dans la campagne puis réessayez.",
      };
    }
  }

  // 1. Écriture atomique (C-6) : champs de la campagne, zones de livraison,
  //    destinations et dépôts dans une seule transaction
  //    (public.update_campaign_with_destinations, migration 32). Le plan calculé par
  //    planDestinationSync fixe l'ordre des écritures (les triggers de destination
  //    s'évaluent ligne par ligne) ; en cas d'erreur, rien n'est enregistré.
  const destinationRow = (dest: ParsedDestination) => ({
    id: dest.id ?? null,
    province_id: clean(dest.province_id),
    city_name: clean(dest.city_name),
    expected_arrival_date: dest.expected_arrival_date,
    order_deadline_date: dest.order_deadline_date || null,
  });
  const existingDepotIds = existingDepots.map((dp) => dp.id);

  const destinationPlan = syncPlan
    ? {
        early_deletes: syncPlan.earlyDeletes,
        updates_open: syncPlan.updatesKeepingOpen.map(destinationRow),
        inserts: syncPlan.inserts.map(destinationRow),
        updates_closing: syncPlan.updatesClosing.map(destinationRow),
        depot_deletes: depotsToDelete,
        deletes: syncPlan.deletes,
        depots: syncPlan.resolved.flatMap((dest) =>
          (dest.depots || []).map((depot) => ({
            city_name: clean(dest.city_name),
            id: depot.id && existingDepotIds.includes(depot.id) ? depot.id : null,
            ...buildDepotRow(depot),
          }))
        ),
      }
    : null;

  const { error: updateErr } = await supabase.rpc("update_campaign_with_destinations", {
    p_campaign_id: campaignId,
    p_fields: {
      title,
      description,
      marketable_quantity: marketableQuantity,
      unit_price: unitPrice,
      currency,
      min_order_quantity: minOrderQuantity,
      start_date: startDate,
      end_date: endDate,
      availability_period: availabilityPeriod,
    },
    p_province_ids: provinceIds,
    p_destination_plan: destinationPlan,
  });

  if (updateErr) {
    console.error("Erreur RPC update_campaign_with_destinations:", updateErr);
    return {
      success: false,
      error: toUserFacingDbError(
        updateErr,
        "La mise à jour de la campagne a échoué. Aucune modification n'a été enregistrée. Veuillez réessayer."
      ),
    };
  }

  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/campaigns");
  revalidatePath("/dashboard/reseller/campaigns");

  return { success: true, message: "Campagne commerciale mise à jour avec succès !" };
}

/**
 * Modifie le statut opérationnel d'une campagne
 */
export async function updateCampaignStatusAction(
  campaignId: string,
  newStatus: CampaignStatus
): Promise<CampaignActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { success: false, error: "Exploitation introuvable." };
  }

  // D2 — activation / réactivation ('active' ou 'paused') uniquement sur une production
  // récoltée. Pré-contrôle : le trigger guard_campaign_business_rules reste l'autorité.
  if (newStatus === "active" || newStatus === "paused") {
    const { data: campaignWithProduction, error: readErr } = await supabase
      .from("campaigns")
      .select("id, status, production:productions(status)")
      .eq("id", campaignId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (readErr) {
      console.error("Erreur lecture campagne avant changement de statut:", readErr);
      return {
        success: false,
        error: "Impossible de vérifier la production de la campagne. Le statut n'a pas été modifié. Veuillez réessayer.",
      };
    }
    if (!campaignWithProduction) {
      return {
        success: false,
        error: "Le statut n'a pas pu être modifié : campagne introuvable ou accès non autorisé.",
      };
    }

    const production = Array.isArray(campaignWithProduction.production)
      ? campaignWithProduction.production[0]
      : campaignWithProduction.production;
    const productionStatus = (production as { status?: string } | null)?.status ?? null;

    if (campaignWithProduction.status !== newStatus && productionStatus !== "harvested") {
      return {
        success: false,
        error: `Une campagne ne peut être créée ou ouverte que sur une production récoltée (statut actuel de la production : ${
          productionStatus ? PRODUCTION_STATUS_LABELS[productionStatus] || productionStatus : "inconnu"
        }).`,
      };
    }
  }

  // Si tentative d'ouverture (active), vérifier territoires et dates de validité
  if (newStatus === "active") {
    const { count } = await supabase
      .from("campaign_delivery_zones")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if (!count || count === 0) {
      return {
        success: false,
        error: "Impossible d'ouvrir une campagne commerciale sans aucune province de livraison définie.",
      };
    }

    const { data: campData } = await supabase
      .from("campaigns")
      .select(`
        id,
        end_date,
        campaign_destinations (
          id,
          order_deadline_date
        )
      `)
      .eq("id", campaignId)
      .eq("company_id", companyId)
      .single();

    if (campData) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (campData.end_date && campData.end_date < todayStr) {
        return {
          success: false,
          error: "Impossible d'ouvrir une campagne commerciale dont la date de fin est déjà passée.",
        };
      }

      if (campData.campaign_destinations && campData.campaign_destinations.length > 0) {
        const hasActiveDest = campData.campaign_destinations.some(
          (d: any) => !d.order_deadline_date || d.order_deadline_date >= todayStr
        );
        if (!hasActiveDest) {
          return {
            success: false,
            error: "Impossible d'ouvrir une campagne dont toutes les destinations sont déjà expirées.",
          };
        }
      }
    }
  }

  // FUN-11 : 0 ligne modifiée (campagne d'une autre entreprise, inexistante ou masquée
  // par la RLS) = refus explicite, jamais de faux succès.
  const { data: updatedRows, error } = await supabase
    .from("campaigns")
    .update({ status: newStatus })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .select("id");

  if (error) {
    console.error("Erreur modification statut campagne:", error);
    return {
      success: false,
      error: toUserFacingDbError(
        error,
        "La modification du statut de la campagne a échoué. Veuillez réessayer."
      ),
    };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: "Le statut n'a pas pu être modifié : campagne introuvable ou accès non autorisé.",
    };
  }

  // Si passage à 'active', notifier les revendeurs
  if (newStatus === "active") {
    try {
      await supabase.rpc("notify_resellers_on_campaign_opened", {
        p_campaign_id: campaignId,
      });
    } catch (notifErr) {
      console.warn("Erreur notification revendeurs ouverture campagne:", notifErr);
    }
  }

  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/campaigns");
  revalidatePath("/dashboard/reseller/campaigns");

  const statusLabels: Record<CampaignStatus, string> = {
    draft: "remise en brouillon",
    active: "ouverte aux revendeurs",
    paused: "suspendue",
    completed: "clôturée",
    cancelled: "annulée",
  };

  return {
    success: true,
    message: `Campagne commerciale ${statusLabels[newStatus] || newStatus} avec succès.`,
  };
}

/**
 * D7 / A12 / A12-bis / C3 / D5 — Réouverture d'une campagne clôturée ou expirée.
 * Validation équivalente à celle de l'interface (campaignReopenRules), puis appel
 * atomique à public.reopen_campaign (migration 32) dont les triggers sont l'autorité.
 * Une campagne annulée n'est jamais rouverte.
 */
export async function reopenCampaignAction(
  campaignId: string,
  newEndDate: string | null,
  destinationDeadlines: ReopenDestinationDeadline[]
): Promise<CampaignActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié pour rouvrir une campagne." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { success: false, error: "Exploitation introuvable." };
  }

  if (!campaignId) {
    return { success: false, error: "Identifiant de campagne manquant." };
  }

  const { data: campaign, error: readErr } = await supabase
    .from("campaigns")
    .select("id, status, end_date, campaign_destinations(id, city_name, order_deadline_date)")
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (readErr) {
    console.error("Erreur lecture campagne avant réouverture:", readErr);
    return {
      success: false,
      error: "Impossible de lire la campagne. Aucune modification n'a été enregistrée. Veuillez réessayer.",
    };
  }
  if (!campaign) {
    return { success: false, error: "Action non autorisée sur cette campagne." };
  }

  if (campaign.status === "cancelled") {
    return { success: false, error: "Une campagne annulée ne peut pas être réactivée." };
  }

  const today = todayUtc();
  const destinations = ((campaign as any).campaign_destinations || []) as Array<{
    id: string;
    city_name: string;
    order_deadline_date: string | null;
  }>;

  if (!canOfferReopen({ status: campaign.status, end_date: campaign.end_date, destinations }, today)) {
    return { success: false, error: "Cette campagne est déjà ouverte." };
  }

  // D5 — date générale
  const cleanedEndDate = newEndDate && newEndDate.trim() !== "" ? newEndDate.trim() : null;
  if (cleanedEndDate && !isValidIsoDate(cleanedEndDate)) {
    return { success: false, error: "La nouvelle date de fin est invalide." };
  }
  const endDateError = validateReopenEndDate(campaign.end_date, cleanedEndDate, today);
  if (endDateError) {
    return { success: false, error: endDateError };
  }

  // C3 — dates limites reportées
  const items = Array.isArray(destinationDeadlines) ? destinationDeadlines : [];
  if (items.length > 200) {
    return { success: false, error: "Trop de destinations transmises." };
  }
  const knownDestinationIds = new Set(destinations.map((d) => d.id));
  const newDeadlines: Record<string, string> = {};
  for (const item of items) {
    if (!item || !item.destinationId || !knownDestinationIds.has(item.destinationId)) {
      return { success: false, error: "Une destination transmise n'appartient pas à cette campagne." };
    }
    if (!isValidIsoDate(item.orderDeadlineDate)) {
      return { success: false, error: "Destination ou date limite invalide." };
    }
    if (item.orderDeadlineDate < today) {
      return { success: false, error: "Chaque date limite reportée doit être au moins égale à aujourd'hui." };
    }
    newDeadlines[item.destinationId] = item.orderDeadlineDate;
  }

  // A12-bis — la réouverture doit aboutir à au moins une destination ouverte
  if (!destinationsOpenAfterReopen(destinations, newDeadlines, today)) {
    return {
      success: false,
      error: "Réouverture impossible : toutes les destinations sont expirées. Reportez au moins une date limite de destination.",
    };
  }

  const { data: resultingStatus, error: rpcError } = await supabase.rpc("reopen_campaign", {
    p_campaign_id: campaignId,
    p_new_end_date: cleanedEndDate,
    p_destination_deadlines: Object.entries(newDeadlines).map(([destination_id, order_deadline_date]) => ({
      destination_id,
      order_deadline_date,
    })),
  });

  if (rpcError) {
    console.error("Erreur RPC reopen_campaign:", rpcError);
    return {
      success: false,
      error: toUserFacingDbError(rpcError, "La réouverture de la campagne a échoué. Veuillez réessayer."),
    };
  }

  const newStatus = typeof resultingStatus === "string" ? resultingStatus : null;

  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/campaigns");
  revalidatePath("/dashboard/reseller");
  revalidatePath("/dashboard/reseller/campaigns");

  // Notification des revendeurs (idempotente) si la campagne est de nouveau ouverte aux commandes
  if (newStatus === "active") {
    try {
      const { error: notifErr } = await supabase.rpc("notify_resellers_on_campaign_opened", {
        p_campaign_id: campaignId,
      });
      if (notifErr) {
        console.warn("Erreur notification revendeurs réouverture campagne:", notifErr);
      }
    } catch (notifErr) {
      console.warn("Erreur notification revendeurs réouverture campagne:", notifErr);
    }
  }

  const message =
    newStatus === "active"
      ? "Campagne rouverte : elle est de nouveau ouverte aux commandes des revendeurs."
      : newStatus === "paused"
      ? "Campagne rouverte. Elle reste suspendue : réactivez-la pour accepter de nouvelles commandes."
      : newStatus === "draft"
      ? "Campagne rouverte. Elle reste en brouillon : ouvrez-la pour la rendre visible aux revendeurs."
      : "Campagne rouverte avec succès.";

  return { success: true, message, campaignId };
}

/**
 * Modifie la date d'arrivée prévue d'une ville sans altérer la campagne ni la commande,
 * et notifie automatiquement tous les revendeurs ayant une commande sur cette destination.
 * Accepte optionnellement une nouvelle date limite de commande (Phase 28).
 */
export async function updateDestinationArrivalDateAction(
  destinationId: string,
  newArrivalDate: string,
  newOrderDeadline?: string | null
): Promise<CampaignActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié pour modifier une date d'arrivée." };
  }

  if (!destinationId || !newArrivalDate) {
    return { success: false, error: "Paramètres de modification de date manquants." };
  }

  try {
    const { data, error } = await supabase.rpc("update_destination_arrival_date", {
      p_destination_id: destinationId,
      p_new_arrival_date: newArrivalDate,
      p_new_order_deadline: newOrderDeadline || null,
    });

    if (error) {
      console.error("Erreur RPC update_destination_arrival_date:", error);
      return {
        success: false,
        error: toUserFacingDbError(error, "La modification de la date d'arrivée a échoué. Veuillez réessayer."),
      };
    }

    revalidatePath("/dashboard/company/campaigns");
    revalidatePath("/dashboard/reseller/campaigns");
    revalidatePath("/dashboard/company/orders");
    revalidatePath("/dashboard/reseller/orders");
    revalidatePath("/dashboard/reseller/notifications");
    revalidatePath("/dashboard/company/notifications");

    const result = data && data.length > 0 ? data[0] : null;
    return {
      success: true,
      message: result?.message || "Date d'arrivée mise à jour et revendeurs notifiés avec succès.",
    };
  } catch (err: any) {
    console.error("Exception updateDestinationArrivalDateAction:", err);
    return { success: false, error: "Une erreur inattendue est survenue. Veuillez réessayer." };
  }
}

/**
 * Phase 28 — Fermeture régionale des campagnes
 * Modifie la date limite de commande d'une destination spécifique.
 * Si la nouvelle date est dans le passé, la destination est immédiatement fermée
 * et les revendeurs ayant des commandes actives sont notifiés (DESTINATION_FERMEE).
 * Null = suppression de toute limite de commande (réouverture de la destination).
 */
export async function updateDestinationOrderDeadlineAction(
  destinationId: string,
  newDeadlineDate: string | null
): Promise<CampaignActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié pour modifier une date limite de commande." };
  }

  if (!destinationId) {
    return { success: false, error: "Identifiant de destination manquant." };
  }

  // Validation de la date si fournie
  if (newDeadlineDate) {
    const parsed = new Date(newDeadlineDate);
    if (isNaN(parsed.getTime())) {
      return { success: false, error: "La date limite fournie est invalide." };
    }
  }

  try {
    const { data, error } = await supabase.rpc("update_destination_order_deadline", {
      p_destination_id: destinationId,
      p_new_deadline_date: newDeadlineDate,
    });

    if (error) {
      console.error("Erreur RPC update_destination_order_deadline:", error);
      return {
        success: false,
        error: toUserFacingDbError(error, "La mise à jour de la date limite a échoué. Veuillez réessayer."),
      };
    }

    revalidatePath("/dashboard/company/campaigns");
    revalidatePath("/dashboard/reseller/campaigns");
    revalidatePath("/dashboard/reseller/feed");
    revalidatePath("/dashboard/reseller/notifications");

    const result = data && data.length > 0 ? data[0] : null;
    return {
      success: true,
      message: result?.message || "Date limite de commande mise à jour avec succès.",
    };
  } catch (err: any) {
    console.error("Exception updateDestinationOrderDeadlineAction:", err);
    return { success: false, error: "Une erreur inattendue est survenue. Veuillez réessayer." };
  }
}
