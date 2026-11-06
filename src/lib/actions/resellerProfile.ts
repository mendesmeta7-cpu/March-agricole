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
  avatarUrl?: string | null;
}

/**
 * Met à jour la photo de profil / avatar de l'utilisateur authentifié (revendeur)
 */
export async function updateResellerAvatarAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier image." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "L'image ne doit pas dépasser 5 Mo." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Format non supporté (utilisez JPG, PNG ou WebP)." };
  }

  // 1. Récupérer l'ancien public_id pour suppression propre après succès
  const { data: currentProfile, error: fetchErr } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_cloudinary_public_id")
    .eq("id", user.id)
    .single();

  if (fetchErr) {
    return { error: "Profil introuvable." };
  }

  const oldPublicId = currentProfile?.avatar_cloudinary_public_id;

  // 2. Upload de la nouvelle photo vers Cloudinary dans synapta/profiles
  let newUrl: string;
  let newPublicId: string;

  try {
    // Nom imposé côté serveur et rattaché à l'utilisateur : seule une image dont
    // l'identifiant commence par synapta/profiles/<user.id>- pourra être supprimée (SEC-09).
    const uploadRes = await uploadImageToCloudinary(file, "profiles", {
      customFilename: `${user.id}-${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });
    newUrl = uploadRes.secure_url;
    newPublicId = uploadRes.public_id;
  } catch (err: any) {
    console.error("Erreur upload avatar:", err);
    return { error: "L'envoi de la photo a échoué. Veuillez réessayer." };
  }

  // 3. Mise à jour atomique du profil de l'utilisateur authentifié
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      avatar_url: newUrl,
      avatar_cloudinary_public_id: newPublicId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateErr) {
    // Si l'update échoue, on supprime la nouvelle image Cloudinary pour ne pas laisser d'orphelin
    await deleteImageFromCloudinary(newPublicId);
    console.error("Erreur mise à jour avatar:", updateErr);
    return { error: "La mise à jour de la photo de profil a échoué. Veuillez réessayer." };
  }

  // 4. Suppression de l'ancienne image Cloudinary s'il y en avait une
  if (oldPublicId && oldPublicId !== newPublicId && isOwnedAvatarPublicId(oldPublicId, user.id)) {
    await deleteImageFromCloudinary(oldPublicId);
  }

  revalidatePath("/dashboard/reseller/profile");
  revalidatePath("/dashboard/reseller", "layout");
  return {
    success: true,
    message: "Photo de profil mise à jour avec succès.",
    avatarUrl: newUrl,
  };
}

/**
 * Supprime la photo de profil de l'utilisateur authentifié
 */
export async function deleteResellerAvatarAction(): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  // 1. Récupérer le public_id actuel
  const { data: currentProfile, error: fetchErr } = await supabase
    .from("profiles")
    .select("avatar_cloudinary_public_id")
    .eq("id", user.id)
    .single();

  if (fetchErr) {
    return { error: "Profil introuvable." };
  }

  const oldPublicId = currentProfile?.avatar_cloudinary_public_id;

  // 2. Suppression de l'image de Cloudinary
  // La colonne avatar_cloudinary_public_id est modifiable par l'utilisateur via l'API :
  // on ne supprime jamais une image qui ne lui appartient pas de façon vérifiable (SEC-09).
  if (oldPublicId && isOwnedAvatarPublicId(oldPublicId, user.id)) {
    await deleteImageFromCloudinary(oldPublicId);
  } else if (oldPublicId) {
    console.warn("Suppression Cloudinary ignorée : identifiant d'avatar non rattaché à l'utilisateur.");
  }

  // 3. Réinitialisation en base
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      avatar_cloudinary_public_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateErr) {
    console.error("Erreur suppression avatar:", updateErr);
    return { error: "La suppression de la photo de profil a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/reseller/profile");
  revalidatePath("/dashboard/reseller", "layout");
  return {
    success: true,
    message: "Photo de profil supprimée avec succès.",
    avatarUrl: null,
  };
}

export interface UpdateResellerGeneralProfileInput {
  full_name: string;
  phone?: string;
  business_name?: string;
  reseller_type: "wholesaler" | "semi_wholesaler" | "retailer" | "processor";
}

/**
 * Met à jour les informations générales et commerciales du profil revendeur
 */
export async function updateResellerGeneralProfileAction(
  input: UpdateResellerGeneralProfileInput
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  // 1. Contrôle du rôle de l'utilisateur
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reseller") {
    return { success: false, error: "Action réservée aux acheteurs professionnels." };
  }

  const trimmedFullName = input.full_name?.trim();
  if (!trimmedFullName || trimmedFullName.length < 2) {
    return { success: false, error: "Le nom du titulaire est obligatoire (au moins 2 caractères)." };
  }

  const validTypes = ["wholesaler", "semi_wholesaler", "retailer", "processor"];
  if (!validTypes.includes(input.reseller_type)) {
    return { success: false, error: "Typologie commerciale invalide." };
  }

  // 2. Mise à jour dans profiles
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name: trimmedFullName,
      phone: input.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileErr) {
    console.error("Erreur mise à jour profil:", profileErr);
    return { success: false, error: "La mise à jour de votre profil a échoué. Veuillez réessayer." };
  }

  // 3. Mise à jour dans resellers
  const { error: resellerErr } = await supabase
    .from("resellers")
    .update({
      business_name: input.business_name?.trim() || null,
      reseller_type: input.reseller_type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (resellerErr) {
    console.error("Erreur mise à jour revendeur:", resellerErr);
    return { success: false, error: "La mise à jour de votre profil revendeur a échoué. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/reseller/profile");
  revalidatePath("/dashboard/reseller", "layout");

  return {
    success: true,
    message: "Profil mis à jour avec succès.",
  };
}

/** Une image d'avatar appartient à l'utilisateur si son identifiant a été généré par le serveur pour lui. */
function isOwnedAvatarPublicId(publicId: string, userId: string): boolean {
  return publicId.startsWith(`synapta/profiles/${userId}-`);
}
