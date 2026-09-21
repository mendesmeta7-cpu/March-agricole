"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Vérifie que l'utilisateur connecté est bien administrateur
 */
async function checkAdminRole(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role === "admin";
}

/**
 * Crée un nouveau produit officiel dans le catalogue global (Admin)
 */
export async function createAdminCatalogProductAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const isAdmin = await checkAdminRole(supabase, user.id);
  if (!isAdmin) {
    return { error: "Action non autorisée. Réservé aux administrateurs." };
  }

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const defaultUnit = (formData.get("defaultUnit") as string)?.trim() || "tonne";
  const description = (formData.get("description") as string)?.trim() || null;
  const imageFile = formData.get("image") as File | null;

  if (!name || name.length < 2) {
    return { error: "Le nom du produit doit comporter au moins 2 caractères." };
  }

  if (!category) {
    return { error: "Veuillez sélectionner ou renseigner une catégorie." };
  }

  // Upload optionnel de la photo officielle du catalogue
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "La photo du catalogue ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `catalog/${crypto.randomUUID()}.${ext}`;

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
    imageUrl = publicUrlData.publicUrl;
  }

  // Insertion dans products avec is_global = TRUE
  const { error: insertErr } = await supabase.from("products").insert({
    name,
    category,
    default_unit: defaultUnit,
    description,
    image_url: imageUrl,
    is_global: true,
    is_active: true,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { error: `Un produit portant le nom "${name}" existe déjà dans le catalogue global.` };
    }
    return { error: insertErr.message };
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/company/products");
  return { success: true, message: `Produit "${name}" ajouté avec succès au catalogue officiel.` };
}

/**
 * Modifie un produit existant du catalogue global (Admin)
 */
export async function updateAdminCatalogProductAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const isAdmin = await checkAdminRole(supabase, user.id);
  if (!isAdmin) {
    return { error: "Action non autorisée. Réservé aux administrateurs." };
  }

  const productId = (formData.get("productId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const defaultUnit = (formData.get("defaultUnit") as string)?.trim() || "tonne";
  const description = (formData.get("description") as string)?.trim() || null;
  const imageFile = formData.get("image") as File | null;
  const keepExistingImage = formData.get("keepExistingImage") === "true";

  if (!productId) {
    return { error: "Identifiant produit manquant." };
  }

  if (!name || name.length < 2) {
    return { error: "Le nom du produit doit comporter au moins 2 caractères." };
  }

  if (!category) {
    return { error: "Veuillez renseigner une catégorie." };
  }

  // Préparation de l'objet de mise à jour
  const updatePayload: Record<string, any> = {
    name,
    category,
    default_unit: defaultUnit,
    description,
    updated_at: new Date().toISOString(),
  };

  // Upload nouvelle photo si fournie
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "La photo du catalogue ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format d'image non supporté (JPG, PNG ou WebP)." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `catalog/${crypto.randomUUID()}.${ext}`;

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
  } else if (!keepExistingImage && formData.get("removeImage") === "true") {
    updatePayload.image_url = null;
  }

  const { error: updateErr } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", productId)
    .eq("is_global", true);

  if (updateErr) {
    if (updateErr.code === "23505") {
      return { error: `Un autre produit nommé "${name}" existe déjà dans le catalogue global.` };
    }
    return { error: updateErr.message };
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/company/products");
  return { success: true, message: `Référence "${name}" mise à jour avec succès.` };
}

/**
 * Active ou désactive une référence du catalogue global (Admin)
 */
export async function toggleAdminCatalogProductStatusAction(
  productId: string,
  currentStatus: boolean
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée." };
  }

  const isAdmin = await checkAdminRole(supabase, user.id);
  if (!isAdmin) {
    return { error: "Action non autorisée. Réservé aux administrateurs." };
  }

  const newStatus = !currentStatus;

  const { error } = await supabase
    .from("products")
    .update({
      is_active: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("is_global", true);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/company/products");

  return {
    success: true,
    message: newStatus ? "Produit activé dans le catalogue." : "Produit désactivé (archivé).",
  };
}
