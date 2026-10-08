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
 * Crée une nouvelle bannière dans feed_banners avec image Cloudinary obligatoire
 */
export async function createAdminFeedBannerAction(
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

  const title = (formData.get("title") as string)?.trim();
  const subtitle = (formData.get("subtitle") as string)?.trim() || null;
  const buttonLabel = (formData.get("buttonLabel") as string)?.trim() || null;
  const buttonUrl = (formData.get("buttonUrl") as string)?.trim() || "/dashboard/reseller/campaigns";
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();
  const isActive = formData.get("isActive") === "true" || formData.get("isActive") === "on";
  const imageFile = formData.get("image") as File | null;

  if (!title || title.length < 2) {
    return { error: "Le titre de la bannière doit comporter au moins 2 caractères." };
  }

  if (!imageFile || imageFile.size === 0) {
    return { error: "Une image pour la bannière est obligatoire." };
  }

  if (imageFile.size > 8 * 1024 * 1024) {
    return { error: "L'image de la bannière ne doit pas dépasser 8 Mo." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(imageFile.type)) {
    return { error: "Format d'image non supporté (utilisez JPG, PNG ou WebP)." };
  }

  let imageUrl: string;
  let cloudinaryPublicId: string;

  try {
    const uploadRes = await uploadImageToCloudinary(imageFile, "banners", {
      transformation: [
        { quality: "auto" },
        { fetch_format: "auto" },
        { width: 1400, crop: "limit" },
      ],
    });
    imageUrl = uploadRes.secure_url;
    cloudinaryPublicId = uploadRes.public_id;
  } catch (err: any) {
    return { error: `Erreur d'upload Cloudinary : ${err.message}` };
  }

  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

  const { error: insertError } = await supabase
    .from("feed_banners")
    .insert({
      title,
      subtitle,
      button_label: buttonLabel,
      button_url: buttonUrl,
      image_url: imageUrl,
      cloudinary_public_id: cloudinaryPublicId,
      sort_order: isNaN(sortOrder) ? 0 : sortOrder,
      is_active: isActive,
    });

  if (insertError) {
    await deleteImageFromCloudinary(cloudinaryPublicId);
    return { error: "L'enregistrement de la bannière a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/admin/banners");
  revalidatePath("/dashboard/reseller");
  return { success: true, message: `Bannière « ${title} » ajoutée avec succès.` };
}

/**
 * Met à jour une bannière (titre, sous-titre, bouton, image, ordre, activation)
 */
export async function updateAdminFeedBannerAction(
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
  const title = (formData.get("title") as string)?.trim();
  const subtitle = (formData.get("subtitle") as string)?.trim() || null;
  const buttonLabel = (formData.get("buttonLabel") as string)?.trim() || null;
  const buttonUrl = (formData.get("buttonUrl") as string)?.trim() || "/dashboard/reseller/campaigns";
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();
  const isActive = formData.get("isActive") === "true" || formData.get("isActive") === "on";
  const imageFile = formData.get("image") as File | null;

  if (!id) {
    return { error: "Identifiant de bannière manquant." };
  }

  if (!title || title.length < 2) {
    return { error: "Le titre de la bannière doit comporter au moins 2 caractères." };
  }

  // 1. Récupérer l'état actuel de la bannière
  const { data: currentBanner, error: fetchErr } = await supabase
    .from("feed_banners")
    .select("id, title, image_url, cloudinary_public_id")
    .eq("id", id)
    .single();

  if (fetchErr || !currentBanner) {
    return { error: "Bannière introuvable." };
  }

  let newImageUrl = currentBanner.image_url;
  let newPublicId = currentBanner.cloudinary_public_id;
  const oldPublicIdToDelete: string | null = (imageFile && imageFile.size > 0)
    ? currentBanner.cloudinary_public_id
    : null;

  // 2. Upload de la nouvelle image si spécifiée
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 8 * 1024 * 1024) {
      return { error: "L'image ne doit pas dépasser 8 Mo." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format non supporté (utilisez JPG, PNG ou WebP)." };
    }

    try {
      const uploadRes = await uploadImageToCloudinary(imageFile, "banners", {
        transformation: [
          { quality: "auto" },
          { fetch_format: "auto" },
          { width: 1400, crop: "limit" },
        ],
      });
      newImageUrl = uploadRes.secure_url;
      newPublicId = uploadRes.public_id;
    } catch (err: any) {
      return { error: `Erreur d'upload Cloudinary : ${err.message}` };
    }
  }

  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

  // 3. Mise à jour de la table Supabase
  const { error: updateErr } = await supabase
    .from("feed_banners")
    .update({
      title,
      subtitle,
      button_label: buttonLabel,
      button_url: buttonUrl,
      image_url: newImageUrl,
      cloudinary_public_id: newPublicId,
      sort_order: isNaN(sortOrder) ? 0 : sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) {
    if (imageFile && imageFile.size > 0 && newPublicId) {
      await deleteImageFromCloudinary(newPublicId);
    }
    return { error: `Erreur lors de la mise à jour : ${updateErr.message}` };
  }

  // 4. Suppression de l'ancienne image Cloudinary remplacée
  if (oldPublicIdToDelete && oldPublicIdToDelete !== newPublicId) {
    await deleteImageFromCloudinary(oldPublicIdToDelete);
  }

  revalidatePath("/dashboard/admin/banners");
  revalidatePath("/dashboard/reseller");
  return { success: true, message: `Bannière « ${title} » mise à jour avec succès.` };
}

/**
 * Supprime une bannière du flux et son image Cloudinary réelle
 */
export async function deleteAdminFeedBannerAction(
  bannerId: string
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

  const { data: banner, error: fetchErr } = await supabase
    .from("feed_banners")
    .select("id, title, cloudinary_public_id")
    .eq("id", bannerId)
    .single();

  if (fetchErr || !banner) {
    return { error: "Bannière introuvable." };
  }

  // 1. Suppression de l'image Cloudinary
  if (banner.cloudinary_public_id) {
    await deleteImageFromCloudinary(banner.cloudinary_public_id);
  }

  // 2. Suppression de la ligne en base
  const { error: deleteErr } = await supabase
    .from("feed_banners")
    .delete()
    .eq("id", bannerId);

  if (deleteErr) {
    return { error: `Erreur lors de la suppression : ${deleteErr.message}` };
  }

  revalidatePath("/dashboard/admin/banners");
  revalidatePath("/dashboard/reseller");
  return { success: true, message: "Bannière supprimée avec succès." };
}
