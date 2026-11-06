"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

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
 * Associe un produit existant du catalogue général à l'entreprise agricole
 * Enregistre les spécificités de l'exploitation (dénomination, unité, notes, photo propre)
 * sans JAMAIS altérer la référence du catalogue officiel.
 */
export async function associateCatalogProductAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour effectuer cette action." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable pour cet utilisateur." };
  }

  const productId = formData.get("productId") as string;
  const customName = (formData.get("customName") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const imageFile = formData.get("customImage") as File | null;

  if (!productId) {
    return { error: "Veuillez sélectionner un produit dans le catalogue." };
  }

  // Upload optionnel de la photo personnalisée de la société
  let customImageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const imageCheck = await validateImageUpload(imageFile, "La photo personnalisée ne doit pas dépasser 5 Mo.");
    if (!imageCheck.ok) {
      return { error: imageCheck.error };
    }

    const ext = imageCheck.ext;
    const filePath = `company-products/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        contentType: imageCheck.contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: "Le téléchargement de la photo a échoué. Vérifiez le format (JPG, PNG, WebP) et la taille du fichier." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);
    customImageUrl = publicUrlData.publicUrl;
  }

  // Vérifier si une association existe déjà
  const { data: existing } = await supabase
    .from("company_products")
    .select("id, is_active, image_url")
    .eq("company_id", companyId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) {
      return { error: "Ce produit est déjà actif dans votre exploitation." };
    } else {
      // Réactiver le produit désactivé
      const { error: updateErr } = await supabase
        .from("company_products")
        .update({
          is_active: true,
          custom_name: customName,
          description: description,
          unit: unit,
          notes: notes,
          image_url: customImageUrl || existing.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) {
        return { error: "La réactivation du produit a échoué. Veuillez réessayer." };
      }

      revalidatePath("/dashboard/company/products");
      revalidatePath("/dashboard/company");
      revalidatePath("/dashboard/admin/products");
      return { success: true, message: "Produit réactivé avec succès dans votre exploitation." };
    }
  }

  // Création de la nouvelle association dans company_products
  const { error: insertErr } = await supabase.from("company_products").insert({
    company_id: companyId,
    product_id: productId,
    custom_name: customName,
    description: description,
    unit: unit,
    notes: notes,
    image_url: customImageUrl,
    is_active: true,
  });

  if (insertErr) {
    return { error: "L'ajout de ce produit à votre exploitation a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/company/products");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/admin/products");
  return { success: true, message: "Produit configuré et associé avec succès à votre exploitation." };
}

/**
 * Ajoute un produit personnalisé privé (absent du catalogue global) et l'associe à l'entreprise.
 * Ce produit est STRICTEMENT PRIVÉ à l'exploitation et n'apparaît pas dans le catalogue officiel.
 */
export async function createAndAssociateProductAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour effectuer cette action." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise agricole introuvable pour cet utilisateur." };
  }

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const defaultUnit = (formData.get("defaultUnit") as string)?.trim() || "tonne";
  const productDescription = (formData.get("productDescription") as string)?.trim() || null;
  const customName = (formData.get("customName") as string)?.trim() || null;
  const companyDescription = (formData.get("companyDescription") as string)?.trim() || null;
  const imageFile = formData.get("image") as File | null;

  if (!name || name.length < 2) {
    return { error: "Le nom du produit doit comporter au moins 2 caractères." };
  }

  if (!category) {
    return { error: "Veuillez spécifier la catégorie agronomique du produit." };
  }

  // Upload optionnel de photo propre à l'exploitation
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const imageCheck = await validateImageUpload(imageFile, "L'image du produit ne doit pas dépasser 5 Mo.");
    if (!imageCheck.ok) {
      return { error: imageCheck.error };
    }

    const ext = imageCheck.ext;
    const filePath = `company-products/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        contentType: imageCheck.contentType,
        cacheControl: "3600",
        upsert: false,
      });

    // FUN-20 : un échec de téléversement n'est plus masqué par un faux succès.
    if (uploadError) {
      console.error("Erreur upload image produit:", uploadError.message);
      return {
        error: "Le téléchargement de l'image du produit a échoué. Le produit n'a pas été enregistré. Vérifiez le format (JPG, PNG, WebP) et la taille du fichier (max. 5 Mo), puis réessayez.",
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);
    imageUrl = publicUrlData.publicUrl;
  }

  // Appel de la procédure atomique révisée (is_global = FALSE, strictly private)
  const { data, error } = await supabase.rpc("create_custom_product_and_associate", {
    p_company_id: companyId,
    p_name: name,
    p_category: category,
    p_default_unit: defaultUnit,
    p_product_description: productDescription,
    p_image_url: imageUrl,
    p_custom_name: customName,
    p_company_description: companyDescription,
  });

  if (error) {
    return { error: "L'enregistrement du produit personnalisé a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/company/products");
  revalidatePath("/dashboard/company");

  return {
    success: true,
    message: `Produit personnalisé "${name}" enregistré pour votre exploitation (non partagé dans le catalogue global).`,
  };
}

/**
 * Modifie les données propres à l'entreprise pour un produit associé
 * (y compris dénomination ferme, notes d'exploitation, unité et photo personnalisée)
 */
export async function updateCompanyProductAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const companyProductId = formData.get("companyProductId") as string;
  const customName = (formData.get("customName") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const imageFile = formData.get("customImage") as File | null;
  const removeCustomImage = formData.get("removeCustomImage") === "true";

  if (!companyProductId) {
    return { error: "Identifiant du produit manquant." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise introuvable." };
  }

  const updatePayload: Record<string, any> = {
    custom_name: customName,
    description: description,
    unit: unit,
    notes: notes,
    updated_at: new Date().toISOString(),
  };

  // Upload d'une nouvelle photo personnalisée si fournie
  if (imageFile && imageFile.size > 0) {
    const imageCheck = await validateImageUpload(imageFile, "La photo personnalisée ne doit pas dépasser 5 Mo.");
    if (!imageCheck.ok) {
      return { error: imageCheck.error };
    }

    const ext = imageCheck.ext;
    const filePath = `company-products/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        contentType: imageCheck.contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: "Le téléchargement de la photo a échoué. Vérifiez le format (JPG, PNG, WebP) et la taille du fichier." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);
    updatePayload.image_url = publicUrlData.publicUrl;
  } else if (removeCustomImage) {
    updatePayload.image_url = null;
  }

  const { error: updateErr } = await supabase
    .from("company_products")
    .update(updatePayload)
    .eq("id", companyProductId)
    .eq("company_id", companyId);

  if (updateErr) {
    return { error: "La mise à jour du produit a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/company/products");
  revalidatePath("/dashboard/company");
  return { success: true, message: "Configuration du produit mise à jour avec succès." };
}

/**
 * Active ou désactive un produit de l'entreprise (archivage doux)
 */
export async function toggleCompanyProductStatusAction(
  companyProductId: string,
  currentStatus: boolean
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { error: "Entreprise introuvable." };
  }

  const newStatus = !currentStatus;

  const { error } = await supabase
    .from("company_products")
    .update({
      is_active: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyProductId)
    .eq("company_id", companyId);

  if (error) {
    return { error: "La modification du statut du produit a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/company/products");
  revalidatePath("/dashboard/company");

  return {
    success: true,
    message: newStatus ? "Produit réactivé dans votre exploitation." : "Produit archivé (désactivé).",
  };
}

/**
 * Supprime une configuration de produit de l'entreprise (uniquement si aucune production n'y est rattachée)
 * RÈGLE D'OR : Ne supprime JAMAIS le produit global du catalogue public.
 */
export async function deleteCompanyProductAction(
  companyProductId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { error: "Entreprise introuvable." };
  }

  // 1. Vérification de l'existence et appartenance
  const { data: item } = await supabase
    .from("company_products")
    .select("id, custom_name, product_id")
    .eq("id", companyProductId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!item) {
    return { error: "Produit d'exploitation introuvable ou accès refusé." };
  }

  // 2. Vérification des productions historiques rattachées
  const { count: prodCount } = await supabase
    .from("productions")
    .select("id", { count: "exact", head: true })
    .eq("company_product_id", companyProductId);

  if (prodCount && prodCount > 0) {
    return {
      error: `Impossible de supprimer ce produit : ${prodCount} production(s) historique(s) y sont rattachées dans votre exploitation. Pour préserver votre historique agronomique, vous pouvez désactiver ce produit au lieu de le supprimer.`,
    };
  }

  // 3. Suppression STRICTE de la configuration d'exploitation uniquement
  const { error: delErr } = await supabase
    .from("company_products")
    .delete()
    .eq("id", companyProductId)
    .eq("company_id", companyId);

  if (delErr) {
    return { error: "La suppression du produit a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/company/products");
  revalidatePath("/dashboard/company");

  return {
    success: true,
    message: "Produit retiré de votre exploitation avec succès.",
  };
}
