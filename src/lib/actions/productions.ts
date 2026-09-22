"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ProductionStatus } from "@/lib/queries/productions";

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
  productionId?: string;
}

const ALLOWED_STATUSES: ProductionStatus[] = ["draft", "planned", "growing", "harvested", "cancelled"];

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
  const supabase = createClient();
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
  const periodStart = (formData.get("periodStart") as string)?.trim();
  const periodEnd = (formData.get("periodEnd") as string)?.trim() || null;
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

  if (!periodStart) {
    return { error: "Veuillez renseigner la date ou période de début de cycle." };
  }

  if (periodEnd && periodEnd < periodStart) {
    return { error: "La date de récolte prévue ne peut pas être antérieure au début du cycle." };
  }

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
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "La photo de la production ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `productions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Erreur de téléversement de la photo : ${uploadError.message}` };
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
      period_start: periodStart,
      period_end: periodEnd,
      status,
      is_public: isPublic,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Erreur lors de l'enregistrement de la production : ${insertError.message}` };
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
  const supabase = createClient();
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

  // 2. Vérification de propriété
  const { data: existing } = await supabase
    .from("productions")
    .select("id, main_image_url, company_id")
    .eq("id", productionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existing) {
    return { error: "Production introuvable ou vous n'avez pas l'autorisation de la modifier." };
  }

  // 3. Extraction des champs modifiables
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const rawQuantity = formData.get("expectedQuantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  const periodStart = (formData.get("periodStart") as string)?.trim();
  const periodEnd = (formData.get("periodEnd") as string)?.trim() || null;
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

  if (!periodStart) {
    return { error: "Veuillez renseigner la date de début de cycle." };
  }

  if (periodEnd && periodEnd < periodStart) {
    return { error: "La date de fin ne peut pas être antérieure au début du cycle." };
  }

  if (!locationName || locationName.length < 2) {
    return { error: "Veuillez renseigner la localisation." };
  }

  let newImageUrl = existing.main_image_url;

  // Téléversement d'une nouvelle photo si fournie
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "La photo ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format non supporté (JPG, PNG, WebP uniquement)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `productions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Erreur d'upload photo : ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);

    newImageUrl = publicUrlData.publicUrl;
  }

  const status = rawStatus && ALLOWED_STATUSES.includes(rawStatus as ProductionStatus)
    ? (rawStatus as ProductionStatus)
    : undefined;

  // Mise à jour de la production
  const updatePayload: Record<string, any> = {
    title,
    description,
    main_image_url: newImageUrl,
    location_name: locationName,
    expected_quantity: expectedQuantity,
    unit,
    period_start: periodStart,
    period_end: periodEnd,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  };

  if (status) {
    updatePayload.status = status;
  }

  const { error: updateError } = await supabase
    .from("productions")
    .update(updatePayload)
    .eq("id", productionId)
    .eq("company_id", companyId);

  if (updateError) {
    return { error: `Erreur de mise à jour : ${updateError.message}` };
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
  const supabase = createClient();
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

  const { error } = await supabase
    .from("productions")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionId)
    .eq("company_id", companyId);

  if (error) {
    return { error: `Erreur de modification du statut : ${error.message}` };
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  const { error } = await supabase
    .from("productions")
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionId)
    .eq("company_id", companyId);

  if (error) {
    return { error: `Erreur visibilité : ${error.message}` };
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
  const supabase = createClient();
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
    return { error: `Erreur lors de la suppression : ${deleteErr.message}` };
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { error: "Entreprise agricole introuvable." };
  }

  const { error } = await supabase
    .from("productions")
    .update({
      is_public: false,
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionId)
    .eq("company_id", companyId);

  if (error) {
    return { error: `Erreur d'archivage : ${error.message}` };
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
