"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
  demandId?: string;
}

/**
 * Crée une nouvelle expression de besoin (Demande) par un revendeur
 */
export async function createDemandAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour exprimer une demande." };
  }

  // 1. Vérification du rôle revendeur
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reseller" && profile?.role !== "admin") {
    return { error: "Seuls les revendeurs et acheteurs professionnels peuvent publier une demande." };
  }

  // 2. Extraction et validation des données du formulaire
  const productId = (formData.get("productId") as string)?.trim();
  const rawQuantity = formData.get("quantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  const countryId = (formData.get("countryId") as string)?.trim();
  const provinceId = (formData.get("provinceId") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const targetPeriodStart = (formData.get("targetPeriodStart") as string)?.trim() || null;
  const targetPeriodEnd = (formData.get("targetPeriodEnd") as string)?.trim() || null;
  const targetCompanyId = (formData.get("targetCompanyId") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!productId) {
    return { error: "Veuillez sélectionner le produit agricole recherché." };
  }

  const quantity = Number(rawQuantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { error: "La quantité recherchée doit être un nombre strictement positif." };
  }

  if (!countryId || !provinceId) {
    return { error: "Veuillez spécifier la zone géographique (Pays et Province) de livraison souhaitée." };
  }

  if (targetPeriodStart && targetPeriodEnd && targetPeriodEnd < targetPeriodStart) {
    return { error: "La date de fin de période souhaitée ne peut pas être antérieure à la date de début." };
  }

  // 3. Vérification de l'existence du produit
  const { data: product } = await supabase
    .from("products")
    .select("id, name, is_active")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_active) {
    return { error: "Le produit sélectionné n'est pas actif dans le catalogue." };
  }

  // 4. Insertion dans la table demands
  const { data: inserted, error: insertError } = await supabase
    .from("demands")
    .insert({
      reseller_id: user.id,
      product_id: productId,
      target_company_id: targetCompanyId,
      quantity,
      unit,
      country_id: countryId,
      province_id: provinceId,
      city,
      target_period_start: targetPeriodStart,
      target_period_end: targetPeriodEnd,
      notes,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Erreur lors de la publication de la demande : ${insertError.message}` };
  }

  revalidatePath("/dashboard/reseller/demands");
  revalidatePath("/dashboard/reseller");
  revalidatePath("/dashboard/company/demands");

  return {
    success: true,
    message: "Votre demande d'approvisionnement a été enregistrée et transmise aux producteurs.",
    demandId: inserted.id,
  };
}

/**
 * Met à jour une demande existante
 */
export async function updateDemandAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour modifier cette demande." };
  }

  const demandId = formData.get("demandId") as string;
  if (!demandId) {
    return { error: "Identifiant de demande manquant." };
  }

  // 1. Vérification d'appartenance et de statut
  const { data: existing } = await supabase
    .from("demands")
    .select("id, reseller_id, status")
    .eq("id", demandId)
    .maybeSingle();

  if (!existing || existing.reseller_id !== user.id) {
    return { error: "Demande introuvable ou vous n'avez pas l'autorisation de la modifier." };
  }

  if (existing.status !== "active") {
    return { error: "Seules les demandes actives peuvent être modifiées." };
  }

  // 2. Extraction des champs
  const rawQuantity = formData.get("quantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  const countryId = (formData.get("countryId") as string)?.trim();
  const provinceId = (formData.get("provinceId") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const targetPeriodStart = (formData.get("targetPeriodStart") as string)?.trim() || null;
  const targetPeriodEnd = (formData.get("targetPeriodEnd") as string)?.trim() || null;
  const targetCompanyId = (formData.get("targetCompanyId") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const quantity = Number(rawQuantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { error: "La quantité recherchée doit être un nombre strictement positif." };
  }

  if (!countryId || !provinceId) {
    return { error: "Veuillez spécifier la zone géographique." };
  }

  if (targetPeriodStart && targetPeriodEnd && targetPeriodEnd < targetPeriodStart) {
    return { error: "La date de fin ne peut pas être antérieure à la date de début." };
  }

  // 3. Mise à jour en base
  const { error: updateError } = await supabase
    .from("demands")
    .update({
      quantity,
      unit,
      country_id: countryId,
      province_id: provinceId,
      city,
      target_period_start: targetPeriodStart,
      target_period_end: targetPeriodEnd,
      target_company_id: targetCompanyId,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandId)
    .eq("reseller_id", user.id);

  if (updateError) {
    return { error: `Erreur de modification : ${updateError.message}` };
  }

  revalidatePath("/dashboard/reseller/demands");
  revalidatePath("/dashboard/reseller");
  revalidatePath("/dashboard/company/demands");

  return { success: true, message: "Demande mise à jour avec succès." };
}

/**
 * Annule une demande existante
 */
export async function cancelDemandAction(demandId: string): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const { error } = await supabase
    .from("demands")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandId)
    .eq("reseller_id", user.id);

  if (error) {
    return { error: `Erreur d'annulation : ${error.message}` };
  }

  revalidatePath("/dashboard/reseller/demands");
  revalidatePath("/dashboard/reseller");
  revalidatePath("/dashboard/company/demands");

  return {
    success: true,
    message: "Demande annulée. Elle ne sera plus comptabilisée dans l'analyse de marché.",
  };
}
