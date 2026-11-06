"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ProductionStatus, hasEngagingCampaign, productionHasUnitCommitments } from "@/lib/queries/productions";
import {
  getProductionChangeBlocker,
  PRODUCTION_LOCK_MESSAGES,
  ProductionStructuralFields,
} from "@/lib/utils/productionRules";

// ─── Validation serveur des images (FUN-20 / SEC-31) ─────────────────────────
// Seuls JPEG, PNG et WebP sont acceptés (SVG exclu), 5 Mo maximum. Le type déclaré
// par le navigateur est confronté à la signature binaire du fichier, et l'extension
// stockée est dérivée du type validé, jamais du nom de fichier fourni par le client.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function validateImageUpload(
  file: File,
  sizeErrorMessage: string
): Promise<{ ok: true; ext: string; contentType: string } | { ok: false; error: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: sizeErrorMessage };
  }
  const declared = (file.type || "").toLowerCase();
  if (!IMAGE_MIME_EXTENSIONS[declared]) {
    return { ok: false, error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
  }
  let detected: string | null = null;
  try {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    detected = detectImageMime(header);
  } catch {
    detected = null;
  }
  if (!detected || detected !== declared) {
    return {
      ok: false,
      error: "Le fichier transmis n'est pas une image JPG, PNG ou WebP valide.",
    };
  }
  return { ok: true, ext: IMAGE_MIME_EXTENSIONS[detected], contentType: detected };
}

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
  productionId?: string;
}

/**
 * FUN-14 — Traduit une erreur PostgreSQL / PostgREST en message utilisateur français.
 * Les exceptions métier (RAISE EXCEPTION, code P0001) sont déjà rédigées en français
 * et sont restituées telles quelles ; les violations de contraintes connues reçoivent
 * un message explicite ; sinon le message de repli est utilisé.
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
    case "23503":
      return "Cette production est liée à d'autres enregistrements (campagnes, commandes ou propositions) : l'opération est impossible.";
    case "23502":
      return "Un champ obligatoire est manquant.";
    case "23514":
      return "Une valeur saisie ne respecte pas les contraintes de la plateforme (statut, quantité ou unité).";
    case "42501":
      return "Action non autorisée sur cette production.";
    default:
      return fallback;
  }
}

const NO_ROW_UPDATED_MESSAGE =
  "Production introuvable ou vous n'avez pas l'autorisation de la modifier.";

const ALLOWED_STATUSES: ProductionStatus[] = ["draft", "planned", "growing", "harvested", "cancelled"];

const ENGAGEMENT_CHECK_FAILED_MESSAGE =
  "Impossible de vérifier les campagnes rattachées à cette production. Aucune modification n'a été enregistrée. Veuillez réessayer.";

interface ProductionForChange extends ProductionStructuralFields {
  id: string;
  main_image_url: string | null;
}

/**
 * A4 / D1 / D3 — lecture serveur des valeurs structurantes actuelles et de
 * l'engagement de la production (campagne 'active' ou 'paused' effectivement
 * ouverte). Pré-contrôle uniquement : le trigger guard_production_commitments
 * (migration 32) reste l'autorité.
 */
async function loadProductionForChange(
  supabase: any,
  productionId: string,
  companyId: string
): Promise<
  | { ok: true; production: ProductionForChange; engaged: boolean; unitCommitted: boolean }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("productions")
    .select(`
      id,
      main_image_url,
      status,
      product_id,
      company_product_id,
      unit,
      is_public,
      campaigns:campaigns (
        id,
        status,
        title,
        end_date,
        orders:orders (
          status
        ),
        campaign_destinations (
          order_deadline_date
        )
      ),
      orders:orders (
        status
      ),
      demand_responses:demand_responses (
        status
      )
    `)
    .eq("id", productionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("Erreur lecture production avant modification:", error);
    return { ok: false, error: ENGAGEMENT_CHECK_FAILED_MESSAGE };
  }
  if (!data) {
    return { ok: false, error: NO_ROW_UPDATED_MESSAGE };
  }

  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  return {
    ok: true,
    production: {
      id: data.id,
      main_image_url: data.main_image_url,
      status: data.status,
      product_id: data.product_id,
      company_product_id: data.company_product_id,
      unit: data.unit,
      is_public: data.is_public,
    },
    engaged: hasEngagingCampaign(campaigns),
    // C-4 : l'unité est figée dès qu'un engagement s'exprime dans cette unité
    unitCommitted: productionHasUnitCommitments(data, campaigns),
  };
}

/** Message de verrouillage si la modification touche un champ figé, sinon null. */
function productionLockMessage(
  engaged: boolean,
  unitCommitted: boolean,
  before: ProductionStructuralFields,
  after: ProductionStructuralFields
): string | null {
  const blocker = getProductionChangeBlocker(engaged, before, after, unitCommitted);
  return blocker ? PRODUCTION_LOCK_MESSAGES[blocker] : null;
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
 * Crée une nouvelle déclaration de production agricole
 */
export async function createProductionAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour déclarer une production." };
  }

  // 1. Récupération de l'entreprise rattachée
  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable pour votre compte." };
  }

  // 2. Extraction et validation des données du formulaire
  const companyProductId = (formData.get("companyProductId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const rawQuantity = formData.get("expectedQuantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  // Saisons agricoles : mois cycliques (1-12), sans année calendaire
  const rawPlantingStart = formData.get("plantingStartMonth") as string;
  const rawPlantingEnd = formData.get("plantingEndMonth") as string;
  const rawHarvestStart = formData.get("harvestStartMonth") as string;
  const rawHarvestEnd = formData.get("harvestEndMonth") as string;
  const locationName = (formData.get("locationName") as string)?.trim();
  const rawStatus = (formData.get("status") as string)?.trim() || "planned";
  const isPublic = formData.get("isPublic") === "true" || formData.get("isPublic") === "on";
  const imageFile = formData.get("image") as File | null;

  if (!companyProductId) {
    return { error: "Veuillez sélectionner un produit cultivé par votre exploitation." };
  }

  if (!title || title.length < 3) {
    return { error: "Le titre de la production doit comporter au moins 3 caractères." };
  }

  const expectedQuantity = Number(rawQuantity);
  if (isNaN(expectedQuantity) || expectedQuantity <= 0) {
    return { error: "La quantité planifiée doit être un nombre strictement positif." };
  }

  // Validation des mois saisonniers (optionnels, mais doivent être valides si fournis)
  const parseMonth = (raw: string): number | null => {
    if (!raw || raw.trim() === "") return null;
    const n = parseInt(raw, 10);
    return (isNaN(n) || n < 1 || n > 12) ? null : n;
  };

  const plantingStartMonth = parseMonth(rawPlantingStart);
  const plantingEndMonth = parseMonth(rawPlantingEnd);
  const harvestStartMonth = parseMonth(rawHarvestStart);
  const harvestEndMonth = parseMonth(rawHarvestEnd);

  if (!locationName || locationName.length < 2) {
    return { error: "Veuillez renseigner la localisation ou le site de l'exploitation." };
  }

  const status = (ALLOWED_STATUSES.includes(rawStatus as ProductionStatus)
    ? rawStatus
    : "planned") as ProductionStatus;

  // 3. Vérification du produit associé à l'entreprise
  const { data: companyProduct } = await supabase
    .from("company_products")
    .select("id, product_id, is_active, image_url, products:product_id (id, name, image_url)")
    .eq("id", companyProductId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!companyProduct) {
    return { error: "Le produit sélectionné n'est pas associé à votre exploitation." };
  }

  if (!companyProduct.is_active) {
    return { error: "Ce produit est actuellement désactivé dans votre catalogue d'exploitation." };
  }

  // 4. Gestion de l'image (Upload Storage ou fallback image produit)
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const imageCheck = await validateImageUpload(imageFile, "La photo de la production ne doit pas dépasser 5 Mo.");
    if (!imageCheck.ok) {
      return { error: imageCheck.error };
    }

    const ext = imageCheck.ext;
    const filePath = `productions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        contentType: imageCheck.contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: "Le téléchargement de la photo a échoué. Vérifiez le format (JPG, PNG, WebP) et la taille du fichier (max. 5 Mo)." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);

    imageUrl = publicUrlData.publicUrl;
  } else {
    // Si aucune nouvelle image téléversée, utiliser l'image du produit catalogue si disponible
    const productInfo = Array.isArray(companyProduct.products)
      ? companyProduct.products[0]
      : companyProduct.products;
    imageUrl = companyProduct.image_url || (productInfo as any)?.image_url || null;
  }

  // La base exige main_image_url NOT NULL
  if (!imageUrl) {
    return {
      error: "Veuillez fournir une photographie principale pour votre cycle de production (culture en champ ou parcelle).",
    };
  }

  // 5. Insertion réelle dans la table productions
  const { data: inserted, error: insertError } = await supabase
    .from("productions")
    .insert({
      company_id: companyId,
      product_id: companyProduct.product_id,
      company_product_id: companyProduct.id,
      title,
      description,
      main_image_url: imageUrl,
      location_name: locationName,
      expected_quantity: expectedQuantity,
      unit,
      planting_start_month: plantingStartMonth,
      planting_end_month: plantingEndMonth,
      harvest_start_month: harvestStartMonth,
      harvest_end_month: harvestEndMonth,
      // period_start requis NOT NULL en base : on stocke une date fictive d'ancrage au 1er janvier
      // pour les nouvelles productions (valeur vide de sens, usage historique uniquement)
      period_start: new Date().toISOString().split("T")[0],
      status,
      is_public: isPublic,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Erreur insertion production:", insertError);
    return {
      error: toUserFacingDbError(
        insertError,
        "L'enregistrement de la production a échoué. Veuillez vérifier les informations saisies et réessayer."
      ),
    };
  }

  revalidatePath("/dashboard/company/productions");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/admin/productions");

  return {
    success: true,
    message: "Production planifiée enregistrée avec succès.",
    productionId: inserted.id,
  };
}

/**
 * Met à jour une production existante
 */
export async function updateProductionAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour modifier cette production." };
  }

  // 1. Récupération de l'entreprise
  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  const productionId = formData.get("productionId") as string;
  if (!productionId) {
    return { error: "Identifiant de production manquant." };
  }

  // 2. Vérification de propriété + valeurs structurantes et engagement (A4 / D1 / D3)
  const loaded = await loadProductionForChange(supabase, productionId, companyId);
  if (!loaded.ok) {
    return { error: loaded.error };
  }
  const existing = loaded.production;

  // 3. Extraction des champs modifiables
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const rawQuantity = formData.get("expectedQuantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  // Saisons agricoles : mois cycliques (1-12), sans année calendaire
  const rawPlantingStart = formData.get("plantingStartMonth") as string;
  const rawPlantingEnd = formData.get("plantingEndMonth") as string;
  const rawHarvestStart = formData.get("harvestStartMonth") as string;
  const rawHarvestEnd = formData.get("harvestEndMonth") as string;
  const locationName = (formData.get("locationName") as string)?.trim();
  const rawStatus = (formData.get("status") as string)?.trim();
  const isPublic = formData.get("isPublic") === "true" || formData.get("isPublic") === "on";
  const imageFile = formData.get("image") as File | null;

  if (!title || title.length < 3) {
    return { error: "Le titre de la production doit comporter au moins 3 caractères." };
  }

  const expectedQuantity = Number(rawQuantity);
  if (isNaN(expectedQuantity) || expectedQuantity <= 0) {
    return { error: "La quantité planifiée doit être un nombre strictement positif." };
  }

  // Validation des mois saisonniers (optionnels, mais doivent être valides si fournis)
  const parseMonth = (raw: string): number | null => {
    if (!raw || raw.trim() === "") return null;
    const n = parseInt(raw, 10);
    return (isNaN(n) || n < 1 || n > 12) ? null : n;
  };

  const plantingStartMonth = parseMonth(rawPlantingStart);
  const plantingEndMonth = parseMonth(rawPlantingEnd);
  const harvestStartMonth = parseMonth(rawHarvestStart);
  const harvestEndMonth = parseMonth(rawHarvestEnd);

  if (!locationName || locationName.length < 2) {
    return { error: "Veuillez renseigner la localisation." };
  }

  const status = rawStatus && ALLOWED_STATUSES.includes(rawStatus as ProductionStatus)
    ? (rawStatus as ProductionStatus)
    : undefined;

  // A4 / D1 / D3 — pré-contrôle avant tout téléversement (le trigger reste l'autorité).
  // Le produit n'est jamais modifié par ce formulaire ; les champs descriptifs restent libres.
  const lockMessage = productionLockMessage(loaded.engaged, loaded.unitCommitted, existing, {
    status,
    unit,
    is_public: isPublic,
  });
  if (lockMessage) {
    return { error: lockMessage };
  }

  let newImageUrl = existing.main_image_url;

  // Téléversement d'une nouvelle photo si fournie
  if (imageFile && imageFile.size > 0) {
    const imageCheck = await validateImageUpload(imageFile, "La photo ne doit pas dépasser 5 Mo.");
    if (!imageCheck.ok) {
      return { error: imageCheck.error };
    }

    const ext = imageCheck.ext;
    const filePath = `productions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        contentType: imageCheck.contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: "Le téléchargement de la photo a échoué. Vérifiez le format (JPG, PNG, WebP) et la taille du fichier (max. 5 Mo)." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);

    newImageUrl = publicUrlData.publicUrl;
  }

  // Mise à jour de la production
  const updatePayload: Record<string, any> = {
    title,
    description,
    main_image_url: newImageUrl,
    location_name: locationName,
    expected_quantity: expectedQuantity,
    unit,
    planting_start_month: plantingStartMonth,
    planting_end_month: plantingEndMonth,
    harvest_start_month: harvestStartMonth,
    harvest_end_month: harvestEndMonth,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  };

  if (status) {
    updatePayload.status = status;
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("productions")
    .update(updatePayload)
    .eq("id", productionId)
    .eq("company_id", companyId)
    .select("id");

  if (updateError) {
    console.error("Erreur mise à jour production:", updateError);
    return {
      error: toUserFacingDbError(updateError, "La mise à jour de la production a échoué. Veuillez réessayer."),
    };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: NO_ROW_UPDATED_MESSAGE };
  }

  revalidatePath("/dashboard/company/productions");
  revalidatePath(`/dashboard/company/productions/${productionId}`);
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/admin/productions");

  return { success: true, message: "Production mise à jour avec succès." };
}

/**
 * Changement rapide de statut d'une production
 */
export async function updateProductionStatusAction(
  productionId: string,
  newStatus: ProductionStatus
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour modifier ce statut." };
  }

  if (!ALLOWED_STATUSES.includes(newStatus)) {
    return { error: "Statut de production invalide." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  // A4 — pré-contrôle (le trigger guard_production_commitments reste l'autorité)
  const loaded = await loadProductionForChange(supabase, productionId, companyId);
  if (!loaded.ok) {
    return { error: loaded.error };
  }
  const lockMessage = productionLockMessage(loaded.engaged, loaded.unitCommitted, loaded.production, { status: newStatus });
  if (lockMessage) {
    return { error: lockMessage };
  }

  const { data: updatedRows, error } = await supabase
    .from("productions")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionId)
    .eq("company_id", companyId)
    .select("id");

  if (error) {
    console.error("Erreur modification statut production:", error);
    return { error: toUserFacingDbError(error, "La modification du statut a échoué. Veuillez réessayer.") };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: NO_ROW_UPDATED_MESSAGE };
  }

  revalidatePath("/dashboard/company/productions");
  revalidatePath(`/dashboard/company/productions/${productionId}`);
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/admin/productions");

  return { success: true, message: `Statut passé à « ${newStatus} » avec succès.` };
}

/**
 * Basculement de la visibilité publique
 */
export async function toggleProductionVisibilityAction(
  productionId: string,
  isPublic: boolean
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  // D3 — public → non public interdit si la production est engagée (l'inverse reste permis)
  const loaded = await loadProductionForChange(supabase, productionId, companyId);
  if (!loaded.ok) {
    return { error: loaded.error };
  }
  const lockMessage = productionLockMessage(loaded.engaged, loaded.unitCommitted, loaded.production, { is_public: isPublic });
  if (lockMessage) {
    return { error: lockMessage };
  }

  const { data: updatedRows, error } = await supabase
    .from("productions")
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionId)
    .eq("company_id", companyId)
    .select("id");

  if (error) {
    console.error("Erreur modification visibilité production:", error);
    return { error: toUserFacingDbError(error, "La modification de la visibilité a échoué. Veuillez réessayer.") };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: NO_ROW_UPDATED_MESSAGE };
  }

  revalidatePath("/dashboard/company/productions");
  revalidatePath(`/dashboard/company/productions/${productionId}`);

  return {
    success: true,
    message: isPublic
      ? "Production rendue visible publiquement (feed revendeurs)."
      : "Production passée en mode privé (invisible publiquement).",
  };
}

/**
 * Suppression sécurisée d'une production avec vérification des dépendances commerciales
 */
export async function deleteProductionAction(
  productionId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour supprimer une production." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  // 1. Vérification de l'existence et de l'appartenance
  const { data: prod } = await supabase
    .from("productions")
    .select("id, title")
    .eq("id", productionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!prod) {
    return { error: "Production introuvable ou accès refusé." };
  }

  // 2. Vérification des campagnes commerciales rattachées
  const { count: campaignsCount } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("production_id", productionId);

  if (campaignsCount && campaignsCount > 0) {
    return {
      error: `Impossible de supprimer cette production : ${campaignsCount} offre(s) commerciale(s) y sont rattachées. Pour préserver l'historique commercial, veuillez la désactiver (rendre privée) ou passer son statut à « annulée ».`,
    };
  }

  // 3. Vérification des commandes directes rattachées
  const { count: ordersCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("production_id", productionId);

  if (ordersCount && ordersCount > 0) {
    return {
      error: `Impossible de supprimer cette production : ${ordersCount} commande(s) ferme(s) y sont associées. Pour préserver l'historique, désactivez la production.`,
    };
  }

  // 4. Vérification des demandes formulées sur cette production
  const { count: demandsCount } = await supabase
    .from("demands")
    .select("id", { count: "exact", head: true })
    .eq("production_id", productionId);

  if (demandsCount && demandsCount > 0) {
    return {
      error: `Impossible de supprimer cette production : ${demandsCount} demande(s) de revendeurs y sont rattachées. Veuillez désactiver sa visibilité ou passer son statut à « annulée ».`,
    };
  }

  // 5. Vérification des propositions commerciales / réponses
  const { count: responsesCount } = await supabase
    .from("demand_responses")
    .select("id", { count: "exact", head: true })
    .eq("production_id", productionId);

  if (responsesCount && responsesCount > 0) {
    return {
      error: `Impossible de supprimer cette production : des propositions commerciales y sont associées.`,
    };
  }

  // 6. Vérification des réservations de stock
  const { count: reservationsCount } = await supabase
    .from("stock_reservations")
    .select("id", { count: "exact", head: true })
    .eq("production_id", productionId);

  if (reservationsCount && reservationsCount > 0) {
    return {
      error: `Impossible de supprimer cette production : des réservations de stock y sont actives.`,
    };
  }

  // 7. Suppression physique autorisée si aucune dépendance
  const { error: deleteErr } = await supabase
    .from("productions")
    .delete()
    .eq("id", productionId)
    .eq("company_id", companyId);

  if (deleteErr) {
    console.error("Erreur suppression production:", deleteErr);
    return {
      error: toUserFacingDbError(deleteErr, "La suppression a échoué. Veuillez réessayer ou contacter le support."),
    };
  }

  revalidatePath("/dashboard/company/productions");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/admin/productions");

  return { success: true, message: "Production supprimée avec succès." };
}

/**
 * Désactivation / Archivage propre d'une production (conserve l'historique commercial intact)
 */
export async function archiveProductionAction(
  productionId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  // A4 / D3 — l'archivage (statut 'cancelled' + non public) est refusé si la production est engagée
  const loaded = await loadProductionForChange(supabase, productionId, companyId);
  if (!loaded.ok) {
    return { error: loaded.error };
  }
  const lockMessage = productionLockMessage(loaded.engaged, loaded.unitCommitted, loaded.production, {
    status: "cancelled",
    is_public: false,
  });
  if (lockMessage) {
    return { error: lockMessage };
  }

  const { data: updatedRows, error } = await supabase
    .from("productions")
    .update({
      is_public: false,
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionId)
    .eq("company_id", companyId)
    .select("id");

  if (error) {
    console.error("Erreur archivage production:", error);
    return { error: toUserFacingDbError(error, "L'archivage de la production a échoué. Veuillez réessayer.") };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: NO_ROW_UPDATED_MESSAGE };
  }

  revalidatePath("/dashboard/company/productions");
  revalidatePath(`/dashboard/company/productions/${productionId}`);
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/reseller");

  return {
    success: true,
    message: "Production archivée et retirée du flux public avec succès. L'historique des commandes reste intact.",
  };
}
