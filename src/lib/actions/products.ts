"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
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
  const supabase = createClient();
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
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "La photo personnalisée ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `company-products/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Erreur de téléversement : ${uploadError.message}` };
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
        return { error: `Erreur de réactivation : ${updateErr.message}` };
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
    return { error: `Erreur d'association : ${insertErr.message}` };
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
  const supabase = createClient();
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
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "L'image du produit ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `company-products/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Avertissement upload image produit:", uploadError.message);
    } else {
      const { data: publicUrlData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
    }
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
    return { error: error.message };
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
  const supabase = createClient();
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
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "La photo personnalisée ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `company-products/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Erreur d'upload : ${uploadError.message}` };
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
    return { error: `Erreur de mise à jour : ${updateErr.message}` };
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
  const supabase = createClient();
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
    return { error: error.message };
  }

  revalidatePath("/dashboard/company/products");
  revalidatePath("/dashboard/company");

  return {
    success: true,
    message: newStatus ? "Produit réactivé dans votre exploitation." : "Produit archivé (désactivé).",
  };
}
