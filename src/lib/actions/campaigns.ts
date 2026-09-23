"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CampaignStatus } from "@/lib/queries/campaigns";

export interface CampaignActionResult {
  success: boolean;
  message?: string;
  error?: string;
  campaignId?: string;
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
 * Crée une nouvelle campagne commerciale adossée à une production existante
 * RÈGLE STRICTE V1 : Campagnes autorisées UNIQUEMENT sur productions récoltées ('harvested')
 */
export async function createCampaignAction(
  formData: FormData
): Promise<CampaignActionResult> {
  const supabase = createClient();

  // 1. Vérification de l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié pour créer une campagne." };
  }

  // 2. Récupération de l'entreprise rattachée à l'utilisateur
  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { success: false, error: "Aucune entreprise agricole associée à votre compte." };
  }

  // 3. Extraction et assainissement des données du formulaire
  const productionId = formData.get("production_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const marketableQuantityStr = formData.get("marketable_quantity") as string;
  const unitPriceStr = formData.get("unit_price") as string;
  const currency = (formData.get("currency") as string)?.trim() || "USD";
  const minOrderQuantityStr = (formData.get("min_order_quantity") as string) || "1";
  const startDate = formData.get("start_date") as string;
  const endDate = (formData.get("end_date") as string) || null;
  const availabilityPeriod = (formData.get("availability_period") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "draft";
  const provincesRaw = formData.getAll("province_ids") as string[];
  const destinationsJson = formData.get("destinations_json") as string;

  let parsedDestinations: Array<{
    province_id: string;
    city_name: string;
    expected_arrival_date: string;
    depots?: Array<{
      name: string;
      commune: string;
      quartier?: string;
      address: string;
      complement?: string;
    }>;
  }> = [];

  if (destinationsJson) {
    try {
      parsedDestinations = JSON.parse(destinationsJson);
    } catch (e) {
      console.warn("Erreur parsing destinations_json:", e);
    }
  }

  // Si des destinations par ville sont fournies, déduire automatiquement les provinces
  let provinceIds = Array.from(new Set(provincesRaw)).filter(Boolean);
  if (parsedDestinations.length > 0) {
    for (const d of parsedDestinations) {
      if (d.province_id && !provinceIds.includes(d.province_id)) {
        provinceIds.push(d.province_id);
      }
    }
  }

  // 4. Validations métier
  if (!productionId) {
    return { success: false, error: "L'adossement à une production existante est obligatoire." };
  }

  if (!title || title.length < 3) {
    return { success: false, error: "Le titre de la campagne doit comporter au moins 3 caractères." };
  }

  const marketableQuantity = parseFloat(marketableQuantityStr);
  if (isNaN(marketableQuantity) || marketableQuantity <= 0) {
    return { success: false, error: "La quantité commercialisée doit être un nombre strictement positif." };
  }

  const unitPrice = parseFloat(unitPriceStr);
  if (isNaN(unitPrice) || unitPrice <= 0) {
    return { success: false, error: "Le prix unitaire doit être un montant strictement positif." };
  }

  const minOrderQuantity = parseFloat(minOrderQuantityStr) || 1;
  if (minOrderQuantity <= 0) {
    return { success: false, error: "La quantité minimale de commande doit être strictement positive." };
  }

  if (!startDate) {
    return { success: false, error: "La date de début de commercialisation est obligatoire." };
  }

  if (endDate && new Date(endDate) < new Date(startDate)) {
    return { success: false, error: "La date de fin ne peut être antérieure à la date de début." };
  }

  if (provinceIds.length === 0 && parsedDestinations.length === 0) {
    return { success: false, error: "Veuillez configurer au moins une destination ou province desservie par cette offre." };
  }

  // 5. Contrôle strict de la production parente (appartenance + volume max autorisé + statut 'harvested')
  const { data: production, error: prodErr } = await supabase
    .from("productions")
    .select("id, company_id, product_id, expected_quantity, unit, status")
    .eq("id", productionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (prodErr || !production) {
    return {
      success: false,
      error: "La production sélectionnée est introuvable ou n'appartient pas à votre exploitation.",
    };
  }

  // RÈGLE MÉTIER STRICTE : Les campagnes ne peuvent être créées que sur des productions récoltées
  if (production.status !== "harvested") {
    return {
      success: false,
      error: "Une campagne commerciale ne peut être ouverte que sur une production au statut 'Récoltée' (harvested). Les cultures en cours ou planifiées ne peuvent pas faire l'objet de campagnes.",
    };
  }

  // Règle métier : la quantité commercialisée ne peut excéder le volume de la production de référence
  const maxAllowedQuantity = Number(production.expected_quantity);
  if (marketableQuantity > maxAllowedQuantity) {
    return {
      success: false,
      error: `La quantité commercialisée (${marketableQuantity.toLocaleString("fr-FR")} ${production.unit}) ne peut excéder le volume déclaré de la production parente (${maxAllowedQuantity.toLocaleString("fr-FR")} ${production.unit}).`,
    };
  }

  // 6. Récupération du country_id depuis l'entreprise
  const { data: company } = await supabase
    .from("companies")
    .select("country_id")
    .eq("id", companyId)
    .single();

  const countryId = company?.country_id;
  if (!countryId) {
    return { success: false, error: "Pays de rattachement introuvable pour votre exploitation." };
  }

  // 7. Insertion de la campagne dans PostgreSQL
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .insert({
      company_id: companyId,
      production_id: production.id,
      product_id: production.product_id,
      title,
      description,
      marketable_quantity: marketableQuantity,
      unit: production.unit,
      unit_price: unitPrice,
      currency,
      min_order_quantity: minOrderQuantity,
      start_date: startDate,
      end_date: endDate,
      availability_period: availabilityPeriod,
      status: status as CampaignStatus,
    })
    .select("id")
    .single();

  if (campErr || !campaign) {
    console.error("Erreur insertion campagne:", campErr);
    return { success: false, error: `Erreur lors de l'enregistrement de la campagne: ${campErr?.message}` };
  }

  // 8. Insertion des zones de livraison dans campaign_delivery_zones
  const zonesToInsert = provinceIds.map((provId) => ({
    campaign_id: campaign.id,
    country_id: countryId,
    province_id: provId,
  }));

  if (zonesToInsert.length > 0) {
    const { error: zonesErr } = await supabase
      .from("campaign_delivery_zones")
      .insert(zonesToInsert);

    if (zonesErr) {
      console.error("Erreur insertion zones de chalandise:", zonesErr);
    }
  }

  // 8.b. Insertion des destinations par ville et de leurs dépôts associés
  if (parsedDestinations.length > 0) {
    for (const dest of parsedDestinations) {
      if (!dest.city_name || !dest.expected_arrival_date || !dest.province_id) continue;

      const { data: createdDest, error: destErr } = await supabase
        .from("campaign_destinations")
        .insert({
          campaign_id: campaign.id,
          province_id: dest.province_id,
          city_name: dest.city_name.trim(),
          expected_arrival_date: dest.expected_arrival_date,
        })
        .select("id")
        .single();

      if (destErr) {
        console.error("Erreur insertion campaign_destinations:", destErr);
        continue;
      }

      if (createdDest && dest.depots && dest.depots.length > 0) {
        const depotsToInsert = dest.depots.map((depot) => ({
          campaign_destination_id: createdDest.id,
          campaign_id: campaign.id,
          name: depot.name?.trim() || `Dépôt ${dest.city_name}`,
          commune: depot.commune?.trim() || "Centre",
          quartier: depot.quartier?.trim() || null,
          address: depot.address?.trim() || "Adresse principale",
          complement: depot.complement?.trim() || null,
        }));

        const { error: depotsErr } = await supabase
          .from("campaign_depots")
          .insert(depotsToInsert);

        if (depotsErr) {
          console.error("Erreur insertion campaign_depots:", depotsErr);
        }
      }
    }
  }

  // 9. Si la campagne est immédiatement active, notifier les revendeurs
  if (status === "active") {
    try {
      await supabase.rpc("notify_resellers_on_campaign_opened", {
        p_campaign_id: campaign.id,
      });
    } catch (notifErr) {
      console.warn("Erreur notification revendeurs ouverture campagne:", notifErr);
    }
  }

  // 10. Rafraîchissement du cache Next.js
  revalidatePath("/dashboard/company/campaigns");
  revalidatePath("/dashboard/reseller/campaigns");

  return {
    success: true,
    message: status === "active" ? "Campagne commerciale ouverte avec succès !" : "Campagne enregistrée comme brouillon.",
    campaignId: campaign.id,
  };
}

/**
 * Met à jour une campagne commerciale existante et ses zones de livraison
 */
export async function updateCampaignAction(
  campaignId: string,
  formData: FormData
): Promise<CampaignActionResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { success: false, error: "Exploitation introuvable." };
  }

  // Vérification préalable de la campagne
  const { data: currentCampaign } = await supabase
    .from("campaigns")
    .select("id, company_id, production_id, status, productions(expected_quantity, unit, status)")
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!currentCampaign) {
    return { success: false, error: "Campagne introuvable ou non autorisée." };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const marketableQuantityStr = formData.get("marketable_quantity") as string;
  const unitPriceStr = formData.get("unit_price") as string;
  const currency = (formData.get("currency") as string)?.trim() || "USD";
  const minOrderQuantityStr = (formData.get("min_order_quantity") as string) || "1";
  const startDate = formData.get("start_date") as string;
  const endDate = (formData.get("end_date") as string) || null;
  const availabilityPeriod = (formData.get("availability_period") as string)?.trim() || null;
  const provincesRaw = formData.getAll("province_ids") as string[];
  const destinationsJson = formData.get("destinations_json") as string;

  let parsedDestinations: Array<{
    province_id: string;
    city_name: string;
    expected_arrival_date: string;
    depots?: Array<{
      name: string;
      commune: string;
      quartier?: string;
      address: string;
      complement?: string;
    }>;
  }> = [];

  if (destinationsJson) {
    try {
      parsedDestinations = JSON.parse(destinationsJson);
    } catch (e) {
      console.warn("Erreur parsing destinations_json dans update:", e);
    }
  }

  let provinceIds = Array.from(new Set(provincesRaw)).filter(Boolean);
  if (parsedDestinations.length > 0) {
    for (const d of parsedDestinations) {
      if (d.province_id && !provinceIds.includes(d.province_id)) {
        provinceIds.push(d.province_id);
      }
    }
  }

  if (!title || title.length < 3) {
    return { success: false, error: "Le titre doit comporter au moins 3 caractères." };
  }

  const marketableQuantity = parseFloat(marketableQuantityStr);
  if (isNaN(marketableQuantity) || marketableQuantity <= 0) {
    return { success: false, error: "La quantité commercialisée doit être positive." };
  }

  const unitPrice = parseFloat(unitPriceStr);
  if (isNaN(unitPrice) || unitPrice <= 0) {
    return { success: false, error: "Le prix unitaire doit être positif." };
  }

  const minOrderQuantity = parseFloat(minOrderQuantityStr) || 1;

  if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
    return { success: false, error: "La date de fin ne peut être antérieure à la date de début." };
  }

  const parentProd = Array.isArray(currentCampaign.productions)
    ? currentCampaign.productions[0]
    : currentCampaign.productions;
  const maxAllowedQuantity = Number((parentProd as any)?.expected_quantity || Infinity);

  if (marketableQuantity > maxAllowedQuantity) {
    return {
      success: false,
      error: `La quantité (${marketableQuantity}) dépasse le volume de la production parente (${maxAllowedQuantity}).`,
    };
  }

  if (provinceIds.length === 0 && parsedDestinations.length === 0) {
    return { success: false, error: "Au moins une province ou destination de livraison doit être sélectionnée." };
  }

  // 1. Mise à jour de la campagne
  const { error: updateErr } = await supabase
    .from("campaigns")
    .update({
      title,
      description,
      marketable_quantity: marketableQuantity,
      unit_price: unitPrice,
      currency,
      min_order_quantity: minOrderQuantity,
      start_date: startDate,
      end_date: endDate,
      availability_period: availabilityPeriod,
    })
    .eq("id", campaignId)
    .eq("company_id", companyId);

  if (updateErr) {
    return { success: false, error: `Erreur mise à jour campagne: ${updateErr.message}` };
  }

  // 2. Synchronisation des zones de chalandise
  const { data: company } = await supabase
    .from("companies")
    .select("country_id")
    .eq("id", companyId)
    .single();

  const countryId = company?.country_id;

  if (countryId) {
    // Suppression des anciennes zones
    await supabase.from("campaign_delivery_zones").delete().eq("campaign_id", campaignId);

    // Réinsertion des nouvelles zones
    const zonesToInsert = provinceIds.map((provId) => ({
      campaign_id: campaignId,
      country_id: countryId,
      province_id: provId,
    }));

    if (zonesToInsert.length > 0) {
      await supabase.from("campaign_delivery_zones").insert(zonesToInsert);
    }
  }

  // 3. Synchronisation des destinations par ville si fournies
  if (parsedDestinations.length > 0) {
    await supabase.from("campaign_destinations").delete().eq("campaign_id", campaignId);

    for (const dest of parsedDestinations) {
      if (!dest.city_name || !dest.expected_arrival_date || !dest.province_id) continue;

      const { data: createdDest, error: destErr } = await supabase
        .from("campaign_destinations")
        .insert({
          campaign_id: campaignId,
          province_id: dest.province_id,
          city_name: dest.city_name.trim(),
          expected_arrival_date: dest.expected_arrival_date,
        })
        .select("id")
        .single();

      if (destErr) {
        console.error("Erreur insertion destination update:", destErr);
        continue;
      }

      if (createdDest && dest.depots && dest.depots.length > 0) {
        const depotsToInsert = dest.depots.map((depot) => ({
          campaign_destination_id: createdDest.id,
          campaign_id: campaignId,
          name: depot.name?.trim() || `Dépôt ${dest.city_name}`,
          commune: depot.commune?.trim() || "Centre",
          quartier: depot.quartier?.trim() || null,
          address: depot.address?.trim() || "Adresse principale",
          complement: depot.complement?.trim() || null,
        }));

        await supabase.from("campaign_depots").insert(depotsToInsert);
      }
    }
  }

  revalidatePath("/dashboard/company/campaigns");
  revalidatePath("/dashboard/reseller/campaigns");

  return { success: true, message: "Campagne commerciale mise à jour avec succès !" };
}

/**
 * Modifie le statut opérationnel d'une campagne
 */
export async function updateCampaignStatusAction(
  campaignId: string,
  newStatus: CampaignStatus
): Promise<CampaignActionResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié." };
  }

  const companyId = await getCompanyIdForUser(supabase, user.id);

  if (!companyId) {
    return { success: false, error: "Exploitation introuvable." };
  }

  // Si tentative d'ouverture (active), vérifier que des territoires sont bien configurés
  if (newStatus === "active") {
    const { count } = await supabase
      .from("campaign_delivery_zones")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if (!count || count === 0) {
      return {
        success: false,
        error: "Impossible d'ouvrir une campagne commerciale sans aucune province de livraison définie.",
      };
    }
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: newStatus })
    .eq("id", campaignId)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, error: `Erreur lors du changement de statut: ${error.message}` };
  }

  // Si passage à 'active', notifier les revendeurs
  if (newStatus === "active") {
    try {
      await supabase.rpc("notify_resellers_on_campaign_opened", {
        p_campaign_id: campaignId,
      });
    } catch (notifErr) {
      console.warn("Erreur notification revendeurs ouverture campagne:", notifErr);
    }
  }

  revalidatePath("/dashboard/company/campaigns");
  revalidatePath("/dashboard/reseller/campaigns");

  const statusLabels: Record<CampaignStatus, string> = {
    draft: "remise en brouillon",
    active: "ouverte aux revendeurs",
    paused: "suspendue",
    completed: "clôturée",
    cancelled: "annulée",
  };

  return {
    success: true,
    message: `Campagne commerciale ${statusLabels[newStatus] || newStatus} avec succès.`,
  };
}

/**
 * Modifie la date d'arrivée prévue d'une ville sans altérer la campagne ni la commande,
 * et notifie automatiquement tous les revendeurs ayant une commande sur cette destination.
 */
export async function updateDestinationArrivalDateAction(
  destinationId: string,
  newArrivalDate: string
): Promise<CampaignActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être authentifié pour modifier une date d'arrivée." };
  }

  if (!destinationId || !newArrivalDate) {
    return { success: false, error: "Paramètres de modification de date manquants." };
  }

  try {
    const { data, error } = await supabase.rpc("update_destination_arrival_date", {
      p_destination_id: destinationId,
      p_new_arrival_date: newArrivalDate,
    });

    if (error) {
      console.error("Erreur RPC update_destination_arrival_date:", error);
      return { success: false, error: error.message || "Erreur lors de la modification de la date." };
    }

    revalidatePath("/dashboard/company/campaigns");
    revalidatePath("/dashboard/reseller/campaigns");
    revalidatePath("/dashboard/company/orders");
    revalidatePath("/dashboard/reseller/orders");
    revalidatePath("/dashboard/reseller/notifications");
    revalidatePath("/dashboard/company/notifications");

    const result = data && data.length > 0 ? data[0] : null;
    return {
      success: true,
      message: result?.message || "Date d'arrivée mise à jour et revendeurs notifiés avec succès.",
    };
  } catch (err: any) {
    console.error("Exception updateDestinationArrivalDateAction:", err);
    return { success: false, error: err.message || "Une erreur inattendue est survenue." };
  }
}
