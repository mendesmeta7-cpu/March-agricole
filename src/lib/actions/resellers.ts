"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UpdateResellerLocationInput {
  province_id: string;
  city?: string;
  delivery_address?: string;
}

export interface ResellerActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Met à jour la région/province de rattachement du revendeur
 * Les anciennes commandes conservent leur destination et snapshots historiques.
 */
export async function updateResellerLocationAction(
  input: UpdateResellerLocationInput
): Promise<ResellerActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Vérification du rôle revendeur
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reseller") {
    return { success: false, error: "Action réservée aux acheteurs professionnels." };
  }

  if (!input.province_id) {
    return { success: false, error: "Veuillez sélectionner une province valide." };
  }

  // Vérification de la province
  const { data: province } = await supabase
    .from("provinces")
    .select("id, name")
    .eq("id", input.province_id)
    .single();

  if (!province) {
    return { success: false, error: "Province introuvable." };
  }

  // Mise à jour de la fiche revendeur
  const { error } = await supabase
    .from("resellers")
    .update({
      province_id: input.province_id,
      city: input.city?.trim() || null,
      delivery_address: input.delivery_address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Erreur mise à jour localisation revendeur:", error);
    return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
  }

  revalidatePath("/dashboard/reseller/profile");
  revalidatePath("/dashboard/reseller/campaigns");
  revalidatePath("/dashboard/reseller");

  return {
    success: true,
    message: `Territoire d'opération mis à jour vers ${province.name}. Vos futures campagnes seront filtrées sur cette région. Vos anciennes commandes restent inchangées.`,
  };
}
