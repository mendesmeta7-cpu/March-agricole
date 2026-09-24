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
 * Récupère l'ID d'entreprise pour un utilisateur
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
 * Crée une DEMANDE GÉNÉRALE (sans production ciblée) par un revendeur
 */
export async function createGeneralDemandAction(
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

  // 4. Insertion dans la table demands (type général)
  const { data: inserted, error: insertError } = await supabase
    .from("demands")
    .insert({
      reseller_id: user.id,
      demand_type: "general",
      product_id: productId,
      production_id: null,
      target_company_id: null,
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

  // Notification RPC vers les exploitants concernés
  try {
    await supabase.rpc("notify_company_on_demand_received", {
      p_demand_id: inserted.id,
    });
  } catch (rpcErr) {
    console.error("Erreur notification RPC demande générale:", rpcErr);
  }

  revalidatePath("/dashboard/reseller/demands");
  revalidatePath("/dashboard/reseller");
  revalidatePath("/dashboard/admin/demands");
  revalidatePath("/dashboard/company/demands");
  revalidatePath("/dashboard/company/notifications");

  return {
    success: true,
    message: "Votre demande générale d'approvisionnement a été enregistrée et transmise aux producteurs.",
    demandId: inserted.id,
  };
}

// Rétrocompatibilité
export const createDemandAction = createGeneralDemandAction;

/**
 * Crée une DEMANDE LIÉE À UNE PRODUCTION SPÉCIFIQUE (En culture ou Récoltée)
 */
export async function createProductionDemandAction(
  prevStateOrFormData: ActionResponse | null | FormData,
  maybeFormData?: FormData
): Promise<ActionResponse> {
  const formData = maybeFormData || (prevStateOrFormData instanceof FormData ? prevStateOrFormData : new FormData());
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
    return { error: "Seuls les revendeurs peuvent faire une demande sur une production." };
  }

  const productionId = ((formData.get("productionId") || formData.get("production_id")) as string)?.trim();
  const rawQuantity = formData.get("quantity") as string;
  const provinceId = ((formData.get("provinceId") || formData.get("province_id")) as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!productionId) {
    return { error: "Production de référence manquante." };
  }

  const quantity = Number(rawQuantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { error: "La quantité souhaitée doit être un nombre strictement positif." };
  }

  // 2. Vérification de la production
  const { data: production, error: prodErr } = await supabase
    .from("productions")
    .select("id, company_id, product_id, unit, status, is_public, company:companies(country_id)")
    .eq("id", productionId)
    .maybeSingle();

  if (prodErr || !production) {
    return { error: "Production introuvable." };
  }

  if (!production.is_public || !["growing", "harvested"].includes(production.status)) {
    return { error: "Cette production n'accepte pas de demandes actuellement." };
  }

  const countryId = (production.company as any)?.country_id || "c719f958-b43c-4eff-97ec-b8aca0eae4a5";

  // 3. Récupération de la province du revendeur si non spécifiée
  let targetProvinceId = provinceId;
  if (!targetProvinceId) {
    const { data: reseller } = await supabase
      .from("resellers")
      .select("province_id")
      .eq("id", user.id)
      .maybeSingle();
    targetProvinceId = reseller?.province_id;
  }

  if (!targetProvinceId) {
    return { error: "Veuillez spécifier votre province de livraison." };
  }

  // 4. Insertion dans la table demands (type production)
  const { data: inserted, error: insertError } = await supabase
    .from("demands")
    .insert({
      reseller_id: user.id,
      demand_type: "production",
      product_id: production.product_id,
      production_id: production.id,
      target_company_id: production.company_id,
      quantity,
      unit: production.unit,
      country_id: countryId,
      province_id: targetProvinceId,
      city,
      notes,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Erreur lors de la formulation de la demande : ${insertError.message}` };
  }

  // Notification RPC vers la société exploitante
  try {
    await supabase.rpc("notify_company_on_demand_received", {
      p_demand_id: inserted.id,
    });
  } catch (rpcErr) {
    console.error("Erreur notification RPC demande production:", rpcErr);
  }

  revalidatePath("/dashboard/reseller/demands");
  revalidatePath("/dashboard/reseller/productions/" + productionId);
  revalidatePath("/dashboard/company/productions/" + productionId);
  revalidatePath("/dashboard/company/demands");
  revalidatePath("/dashboard/company/notifications");

  return {
    success: true,
    message: "Votre demande sur cette production a été enregistrée avec succès. L'exploitant a été notifié.",
    demandId: inserted.id,
  };
}

/**
 * Enregistre le REFUS d'une demande générale par une entreprise
 */
export async function refuseDemandAction(demandId: string): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { error: "Aucune entreprise associée à votre compte." };
  }

  // Insertion ou mise à jour du refus dans demand_responses
  const { error } = await supabase
    .from("demand_responses")
    .upsert(
      {
        demand_id: demandId,
        company_id: companyId,
        production_id: null,
        status: "refused",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "demand_id,company_id" }
    );

  if (error) {
    return { error: `Erreur lors de l'enregistrement du refus : ${error.message}` };
  }

  revalidatePath("/dashboard/company/demands");
  return { success: true, message: "Demande marquée comme refusée pour votre exploitation." };
}

/**
 * Crée une PROPOSITION / RÉPONSE FORMELLE à une demande générale par une entreprise
 */
export async function createDemandProposalAction(
  prevStateOrFormData: ActionResponse | null | FormData,
  maybeFormData?: FormData
): Promise<ActionResponse> {
  const formData = maybeFormData || (prevStateOrFormData instanceof FormData ? prevStateOrFormData : new FormData());
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté pour proposer une réponse." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);
  if (!companyId) {
    return { error: "Aucune entreprise agricole associée." };
  }

  const demandId = ((formData.get("demandId") || formData.get("demand_id")) as string)?.trim();
  const productionId = ((formData.get("productionId") || formData.get("production_id")) as string)?.trim();
  const rawQuantity = ((formData.get("proposedQuantity") || formData.get("proposed_quantity") || formData.get("quantity")) as string);
  const rawPrice = ((formData.get("unitPrice") || formData.get("unit_price")) as string);
  const message = (formData.get("message") as string)?.trim() || null;

  if (!demandId || !productionId) {
    return { error: "Veuillez sélectionner une production réelle de votre exploitation." };
  }

  const proposedQuantity = Number(rawQuantity);
  if (isNaN(proposedQuantity) || proposedQuantity <= 0) {
    return { error: "La quantité proposée doit être supérieure à zéro." };
  }

  const unitPrice = rawPrice ? Number(rawPrice) : 0;

  // 1. Vérification que la production appartient bien à l'entreprise
  const { data: production, error: prodErr } = await supabase
    .from("productions")
    .select("id, title, product_id, unit, status, company_id, products:product_id(name)")
    .eq("id", productionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (prodErr || !production) {
    return { error: "La production sélectionnée n'appartient pas à votre exploitation." };
  }

  // 2. Récupération des informations de la demande et de l'entreprise
  const { data: demand, error: demErr } = await supabase
    .from("demands")
    .select("id, reseller_id, quantity, unit, product_id")
    .eq("id", demandId)
    .maybeSingle();

  if (demErr || !demand) {
    return { error: "Demande introuvable." };
  }

  // Contrôle strict de correspondance produit (Règle Métier Section 5)
  if (production.product_id !== demand.product_id) {
    return { error: "La production sélectionnée ne correspond pas au produit demandé." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  const currency = ((formData.get("currency") as string) || "USD").toUpperCase();

  // 3. Enregistrement de la proposition
  const { data: responseData, error: respErr } = await supabase
    .from("demand_responses")
    .upsert(
      {
        demand_id: demandId,
        company_id: companyId,
        production_id: production.id,
        proposed_quantity: proposedQuantity,
        unit: production.unit,
        unit_price: unitPrice,
        currency,
        message,
        status: "proposed",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "demand_id,company_id" }
    )
    .select("id")
    .single();

  if (respErr) {
    return { error: `Erreur lors de l'enregistrement de la proposition : ${respErr.message}` };
  }

  // 4. Création d'une notification interne pour le revendeur
  const productName = Array.isArray(production.products)
    ? production.products[0]?.name
    : (production.products as any)?.name || "Produit";

  await supabase.from("notifications").insert({
    user_id: demand.reseller_id,
    type: "DEMANDE_REPONSE",
    title: `Nouvelle proposition de ${company?.name || "un producteur"}`,
    message: `${company?.name || "Une société"} a répondu à votre demande pour ${proposedQuantity} ${production.unit} de ${productName}.`,
    related_entity_type: "demand_response",
    related_entity_id: responseData.id,
    action_url: "/dashboard/reseller/demands",
  });

  revalidatePath("/dashboard/company/demands");
  revalidatePath(`/dashboard/company/demands/${demandId}`);
  revalidatePath("/dashboard/reseller/demands");
  revalidatePath("/dashboard/reseller/notifications");

  return {
    success: true,
    message: "Votre proposition a été transmise au revendeur avec succès.",
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

  const rawQuantity = formData.get("quantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || "tonne";
  const countryId = (formData.get("countryId") as string)?.trim();
  const provinceId = (formData.get("provinceId") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const targetPeriodStart = (formData.get("targetPeriodStart") as string)?.trim() || null;
  const targetPeriodEnd = (formData.get("targetPeriodEnd") as string)?.trim() || null;
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
  revalidatePath("/dashboard/admin/demands");
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
  revalidatePath("/dashboard/admin/demands");
  revalidatePath("/dashboard/company/demands");

  return {
    success: true,
    message: "Demande annulée. Elle ne sera plus comptabilisée dans l'analyse de marché.",
  };
}
