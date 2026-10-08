"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
} from "@/lib/cloudinary";

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Vérifie que l'utilisateur connecté est administrateur
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
 * Crée une nouvelle catégorie dans feed_categories avec image Cloudinary optionnelle
 */
export async function createAdminFeedCategoryAction(
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
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();
  const isActive = formData.get("isActive") === "true" || formData.get("isActive") === "on";
  const imageFile = formData.get("image") as File | null;

  if (!name || name.length < 2) {
    return { error: "Le nom de la catégorie doit comporter au moins 2 caractères." };
  }

  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

  let imageUrl: string | null = null;
  let cloudinaryPublicId: string | null = null;

  // 1. Upload Cloudinary de l'image de catégorie si fournie
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "L'image ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format non supporté (utilisez JPG, PNG ou WebP)." };
    }

    try {
      const uploadRes = await uploadImageToCloudinary(imageFile, "categories");
      imageUrl = uploadRes.secure_url;
      cloudinaryPublicId = uploadRes.public_id;
    } catch (err: any) {
      return { error: `Erreur d'upload Cloudinary : ${err.message}` };
    }
  }

  // 2. Enregistrement en base de données Supabase
  const { error: insertError } = await supabase
    .from("feed_categories")
    .insert({
      name,
      sort_order: isNaN(sortOrder) ? 0 : sortOrder,
      is_active: isActive,
      image_url: imageUrl,
      cloudinary_public_id: cloudinaryPublicId,
    });

  if (insertError) {
    // Si l'insertion échoue et qu'une image a été uploadée, on supprime l'image orpheline
    if (cloudinaryPublicId) {
      await deleteImageFromCloudinary(cloudinaryPublicId);
    }
    if (insertError.code === "23505") {
      return { error: "Une catégorie portant ce nom existe déjà." };
    }
    return { error: "La création de la catégorie a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/admin/categories");
  revalidatePath("/dashboard/reseller");
  return { success: true, message: `Catégorie « ${name} » créée avec succès.` };
}

/**
 * Met à jour une catégorie existante (nom, image, ordre, activation)
 */
export async function updateAdminFeedCategoryAction(
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

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();
  const isActive = formData.get("isActive") === "true" || formData.get("isActive") === "on";
  const removeImage = formData.get("removeImage") === "true";
  const imageFile = formData.get("image") as File | null;

  if (!id) {
    return { error: "Identifiant de catégorie manquant." };
  }

  if (!name || name.length < 2) {
    return { error: "Le nom de la catégorie doit comporter au moins 2 caractères." };
  }

  // 1. Récupérer l'état actuel pour conserver ou remplacer les images
  const { data: currentCategory, error: fetchErr } = await supabase
    .from("feed_categories")
    .select("id, name, image_url, cloudinary_public_id")
    .eq("id", id)
    .single();

  if (fetchErr || !currentCategory) {
    return { error: "Catégorie introuvable." };
  }

  let newImageUrl = currentCategory.image_url;
  let newPublicId = currentCategory.cloudinary_public_id;
  const oldPublicIdToDelete: string | null = (removeImage || (imageFile && imageFile.size > 0)) 
    ? currentCategory.cloudinary_public_id 
    : null;

  // 2. Traitement du téléversement d'une nouvelle image
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "L'image ne doit pas dépasser 5 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format non supporté (utilisez JPG, PNG ou WebP)." };
    }

    try {
      const uploadRes = await uploadImageToCloudinary(imageFile, "categories");
      newImageUrl = uploadRes.secure_url;
      newPublicId = uploadRes.public_id;
    } catch (err: any) {
      return { error: `Erreur d'upload Cloudinary : ${err.message}` };
    }
  } else if (removeImage) {
    newImageUrl = null;
    newPublicId = null;
  }

  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

  // 3. Mise à jour de la catégorie dans Supabase
  const { error: updateErr } = await supabase
    .from("feed_categories")
    .update({
      name,
      sort_order: isNaN(sortOrder) ? 0 : sortOrder,
      is_active: isActive,
      image_url: newImageUrl,
      cloudinary_public_id: newPublicId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) {
    // Si l'update échoue et qu'on venait d'uploader une nouvelle image, supprimer la nouvelle
    if (imageFile && imageFile.size > 0 && newPublicId) {
      await deleteImageFromCloudinary(newPublicId);
    }
    return { error: `Erreur lors de la mise à jour : ${updateErr.message}` };
  }

  // 4. Si la nouvelle image a bien été enregistrée (ou si suppression demandée), supprimer l'ancienne ressource Cloudinary
  if (oldPublicIdToDelete && oldPublicIdToDelete !== newPublicId) {
    await deleteImageFromCloudinary(oldPublicIdToDelete);
  }

  revalidatePath("/dashboard/admin/categories");
  revalidatePath("/dashboard/reseller");
  return { success: true, message: `Catégorie « ${name} » mise à jour avec succès.` };
}

/**
 * Supprime une catégorie (avec suppression de son image Cloudinary)
 * Vérifie d'abord si des produits utilisent ce nom.
 */
export async function deleteAdminFeedCategoryAction(
  categoryId: string
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

  // 1. Récupération de la catégorie
  const { data: category, error: fetchErr } = await supabase
    .from("feed_categories")
    .select("id, name, cloudinary_public_id")
    .eq("id", categoryId)
    .single();

  if (fetchErr || !category) {
    return { error: "Catégorie introuvable." };
  }

  // 2. Vérification d'intégrité : y a-t-il des produits rattachés à cette catégorie ?
  const { count, error: countErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", category.name);

  if (countErr) {
    return { error: "Erreur lors de la vérification des dépendances." };
  }

  if (count && count > 0) {
    return {
      error: `Impossible de supprimer cette catégorie car ${count} produit(s) du catalogue y sont associés. Désactivez-la plutôt ou réassignez ces produits.`,
    };
  }

  // 3. Suppression réelle de l'image Cloudinary si elle existe
  if (category.cloudinary_public_id) {
    await deleteImageFromCloudinary(category.cloudinary_public_id);
  }

  // 4. Suppression de la ligne en base
  const { error: deleteErr } = await supabase
    .from("feed_categories")
    .delete()
    .eq("id", categoryId);

  if (deleteErr) {
    return { error: `Erreur lors de la suppression : ${deleteErr.message}` };
  }

  revalidatePath("/dashboard/admin/categories");
  revalidatePath("/dashboard/reseller");
  return { success: true, message: "Catégorie supprimée avec succès." };
}
