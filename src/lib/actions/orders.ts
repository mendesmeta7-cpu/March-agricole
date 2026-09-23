"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/lib/queries/orders";

export interface CreateOrderInput {
  campaign_id: string;
  quantity: number;
  delivery_province_id: string;
  delivery_city?: string;
  delivery_address?: string;
  notes?: string;
  destination_id?: string;
  depot_id?: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Crée une commande ferme avec réservation atomique via RPC
 */
export async function createOrderAction(
  input: CreateOrderInput
): Promise<ActionResult<{ orderId: string; orderNumber: string; totalAmount: number }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour passer une commande." };
  }

  // 1. Vérification du rôle revendeur et récupération de la province authentifiée
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reseller") {
    return {
      success: false,
      error: "Seuls les revendeurs enregistrés peuvent passer des commandes fermes.",
    };
  }

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, province_id, city, delivery_address")
    .eq("id", user.id)
    .maybeSingle();

  if (!reseller || !reseller.province_id) {
    return {
      success: false,
      error: "Votre profil revendeur n'est rattaché à aucune province. Veuillez configurer votre territoire dans votre profil.",
    };
  }

  // 2. Validation des paramètres
  if (!input.campaign_id) {
    return { success: false, error: "Identifiant de campagne manquant." };
  }

  const quantity = Number(input.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "La quantité commandée doit être strictement supérieure à zéro." };
  }

  // 3. Appel de la procédure stockée transactionnelle PostgreSQL
  try {
    const { data, error } = await supabase.rpc("create_order_with_reservation", {
      p_reseller_id: user.id,
      p_campaign_id: input.campaign_id,
      p_quantity: quantity,
      p_delivery_province_id: reseller.province_id,
      p_delivery_city: input.delivery_city?.trim() || reseller.city || null,
      p_delivery_address: input.delivery_address?.trim() || reseller.delivery_address || null,
      p_notes: input.notes?.trim() || null,
      p_destination_id: input.destination_id || null,
      p_depot_id: input.depot_id || null,
    });

    if (error) {
      console.error("Erreur RPC create_order_with_reservation:", error);
      let friendlyMessage = error.message;
      if (friendlyMessage.includes("Cette campagne n'est pas disponible dans votre région") || friendlyMessage.includes("ne dessert pas la province")) {
        friendlyMessage = "Cette campagne n'est pas disponible dans votre région.";
      } else if (friendlyMessage.includes("Vous ne pouvez commander que pour la destination")) {
        friendlyMessage = "Vous ne pouvez commander que pour la destination correspondant à votre région de rattachement.";
      } else if (friendlyMessage.includes("Stock disponible insuffisant")) {
        friendlyMessage = "Stock disponible insuffisant pour cette quantité sur cette offre.";
      } else if (friendlyMessage.includes("période de commercialisation")) {
        friendlyMessage = "Cette offre n'est plus ou pas encore ouverte à la vente.";
      } else if (friendlyMessage.includes("seuil minimum")) {
        friendlyMessage = "La quantité demandée est inférieure au seuil minimum d'achat imposé par le producteur.";
      }
      return { success: false, error: friendlyMessage };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Échec de l'enregistrement transactionnel de la commande." };
    }

    const createdOrder = data[0];

    // Revalidation des caches Next.js
    revalidatePath("/dashboard/reseller/orders");
    revalidatePath("/dashboard/reseller/campaigns");
    revalidatePath("/dashboard/company/orders");
    revalidatePath("/dashboard/company/campaigns");
    revalidatePath("/dashboard/reseller");
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/admin/orders");

    return {
      success: true,
      data: {
        orderId: createdOrder.order_id,
        orderNumber: createdOrder.order_number,
        totalAmount: Number(createdOrder.total_amount),
      },
    };
  } catch (err: any) {
    console.error("Exception inattendue création commande:", err);
    return {
      success: false,
      error: err.message || "Une erreur inattendue est survenue lors de la commande.",
    };
  }
}

/**
 * Annule une commande et libère immédiatement sa réservation de stock
 */
export async function cancelOrderAction(
  orderId: string,
  reason: string = "Annulation demandée par l'acheteur"
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour annuler une commande." };
  }

  if (!orderId) {
    return { success: false, error: "Identifiant de commande manquant." };
  }

  try {
    const { error } = await supabase.rpc("cancel_order_and_release_reservation", {
      p_order_id: orderId,
      p_reason: reason.trim() || "Annulation demandée",
    });

    if (error) {
      console.error("Erreur RPC cancel_order_and_release_reservation:", error);
      return { success: false, error: error.message };
    }

    // Revalidation
    revalidatePath("/dashboard/reseller/orders");
    revalidatePath(`/dashboard/reseller/orders/${orderId}`);
    revalidatePath("/dashboard/company/orders");
    revalidatePath(`/dashboard/company/orders/${orderId}`);
    revalidatePath("/dashboard/reseller/campaigns");
    revalidatePath("/dashboard/company/campaigns");

    return { success: true };
  } catch (err: any) {
    console.error("Exception inattendue annulation commande:", err);
    return { success: false, error: err.message || "Erreur lors de l'annulation de la commande." };
  }
}

/**
 * Met à jour le statut logistique d'une commande reçue (réservé à l'entreprise propriétaire)
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: OrderStatus
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour modifier une commande." };
  }

  if (!orderId || !newStatus) {
    return { success: false, error: "Paramètres manquants pour la mise à jour." };
  }

  // 1. Récupération de la commande
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, company_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { success: false, error: "Commande introuvable." };
  }

  // 2. Si le nouveau statut est 'cancelled', utiliser la fonction RPC dédiée pour libérer le stock
  if (newStatus === "cancelled") {
    return cancelOrderAction(orderId, "Annulation par l'exploitation agricole");
  }

  // 3. Mise à jour directe du statut (protégée par RLS)
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) {
    console.error("Erreur mise à jour statut commande:", updateErr);
    return { success: false, error: "Impossible de mettre à jour le statut de la commande." };
  }

  // 4. Trace dans audit_logs
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "ORDER_STATUS_UPDATED",
    entity_type: "order",
    entity_id: orderId,
    details: {
      previous_status: order.status,
      new_status: newStatus,
    },
  });

  revalidatePath("/dashboard/company/orders");
  revalidatePath(`/dashboard/company/orders/${orderId}`);
  revalidatePath("/dashboard/reseller/orders");
  revalidatePath(`/dashboard/reseller/orders/${orderId}`);

  return { success: true };
}

export interface CreateOrderFromDemandResponseInput {
  response_id: string;
  quantity?: number;
  delivery_province_id: string;
  delivery_city?: string;
  delivery_address?: string;
  notes?: string;
}

/**
 * Crée une commande ferme directement depuis une proposition d'entreprise (réponse à demande)
 */
export async function createOrderFromDemandResponseAction(
  input: CreateOrderFromDemandResponseInput
): Promise<ActionResult<{ orderId: string; orderNumber: string; totalAmount: number }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour accepter une proposition et passer commande." };
  }

  // 1. Vérification du rôle revendeur
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reseller") {
    return {
      success: false,
      error: "Seuls les revendeurs enregistrés peuvent passer des commandes fermes.",
    };
  }

  // 2. Validation
  if (!input.response_id) {
    return { success: false, error: "Identifiant de la proposition manquant." };
  }

  if (!input.delivery_province_id) {
    return { success: false, error: "Veuillez spécifier la province de livraison." };
  }

  // 3. Récupération de la quantité proposée si non spécifiée
  let orderQty = input.quantity;
  if (!orderQty || orderQty <= 0) {
    const { data: respData } = await supabase
      .from("demand_responses")
      .select("proposed_quantity")
      .eq("id", input.response_id)
      .single();
    orderQty = Number(respData?.proposed_quantity || 1);
  }

  try {
    const { data, error } = await supabase.rpc("create_order_from_demand_response", {
      p_reseller_id: user.id,
      p_demand_response_id: input.response_id,
      p_quantity: orderQty,
      p_delivery_province_id: input.delivery_province_id,
      p_delivery_city: input.delivery_city?.trim() || null,
      p_delivery_address: input.delivery_address?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) {
      console.error("Erreur RPC create_order_from_demand_response:", error);
      let friendlyMessage = error.message;
      if (friendlyMessage.includes("Stock disponible insuffisant")) {
        friendlyMessage = "Le stock disponible de la production proposée est désormais insuffisant.";
      } else if (friendlyMessage.includes("Cette proposition n'est plus disponible")) {
        friendlyMessage = "Cette proposition n'est plus disponible ou a déjà été traitée.";
      }
      return { success: false, error: friendlyMessage };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Échec de l'enregistrement de la commande." };
    }

    const createdOrder = data[0];

    // Revalidation des caches Next.js
    revalidatePath("/dashboard/reseller/orders");
    revalidatePath("/dashboard/reseller/demands");
    revalidatePath("/dashboard/reseller/notifications");
    revalidatePath("/dashboard/company/orders");
    revalidatePath("/dashboard/company/demands");
    revalidatePath("/dashboard/admin/orders");

    return {
      success: true,
      data: {
        orderId: createdOrder.order_id,
        orderNumber: createdOrder.order_number,
        totalAmount: Number(createdOrder.total_amount),
      },
    };
  } catch (err: any) {
    console.error("Exception inattendue création commande depuis proposition:", err);
    return {
      success: false,
      error: err.message || "Une erreur inattendue est survenue lors de la commande.",
    };
  }
}

export interface LookupDeliveryOrderResult {
  order_id: string;
  order_number: string;
  qr_code_token: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  delivered_at: string | null;
  delivered_quantity: number | null;
  delivery_notes: string | null;
  delivery_province_name: string | null;
  delivery_city: string | null;
  delivery_address: string | null;
  reseller_id: string;
  reseller_business_name: string;
  company_id: string;
  company_name: string;
  campaign_title: string | null;
  production_title: string | null;
  total_ordered_quantity: number;
  unit: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    subtotal: number;
  }>;
}

/**
 * Recherche sécurisée d'une commande par son numéro lisible ou jeton QR code
 * RÈGLE ANTI-FUITE : Si la commande n'appartient pas à l'entreprise connectée, renvoie neutre "Commande introuvable"
 */
export async function lookupOrderForDeliveryAction(
  identifier: string
): Promise<ActionResult<LookupDeliveryOrderResult>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour rechercher une commande." };
  }

  const cleanIdentifier = identifier?.trim();
  if (!cleanIdentifier) {
    return {
      success: false,
      error: "Veuillez saisir un numéro de commande ou scanner un QR code valide.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("lookup_order_for_delivery", {
      p_identifier: cleanIdentifier,
    });

    if (error) {
      console.error("Erreur RPC lookup_order_for_delivery:", error);
      return { success: false, error: "Commande introuvable." };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Commande introuvable." };
    }

    const raw = data[0];
    const result: LookupDeliveryOrderResult = {
      order_id: raw.order_id,
      order_number: raw.order_number,
      qr_code_token: raw.qr_code_token,
      status: raw.status,
      total_amount: Number(raw.total_amount || 0),
      currency: raw.currency,
      created_at: raw.created_at,
      delivered_at: raw.delivered_at || null,
      delivered_quantity: raw.delivered_quantity ? Number(raw.delivered_quantity) : null,
      delivery_notes: raw.delivery_notes || null,
      delivery_province_name: raw.delivery_province_name || null,
      delivery_city: raw.delivery_city || null,
      delivery_address: raw.delivery_address || null,
      reseller_id: raw.reseller_id,
      reseller_business_name: raw.reseller_business_name,
      company_id: raw.company_id,
      company_name: raw.company_name,
      campaign_title: raw.campaign_title || null,
      production_title: raw.production_title || null,
      total_ordered_quantity: Number(raw.total_ordered_quantity || 0),
      unit: raw.unit || "tonne",
      items: (raw.items || []).map((it: any) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: Number(it.quantity || 0),
        unit: it.unit || "tonne",
        unit_price: Number(it.unit_price || 0),
        subtotal: Number(it.subtotal || 0),
      })),
    };

    return { success: true, data: result };
  } catch (err: any) {
    console.error("Exception inattendue lookupOrderForDeliveryAction:", err);
    return { success: false, error: "Commande introuvable." };
  }
}

/**
 * Confirme la livraison physique d'une commande avec garde-fous stricts
 */
export async function confirmOrderDeliveryAction(
  orderId: string,
  notes?: string
): Promise<
  ActionResult<{
    orderId: string;
    orderNumber: string;
    status: string;
    deliveredAt: string;
    deliveredQuantity: number;
  }>
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour confirmer une livraison." };
  }

  if (!orderId) {
    return { success: false, error: "Identifiant de commande manquant." };
  }

  try {
    const { data, error } = await supabase.rpc("confirm_order_delivery", {
      p_order_id: orderId,
      p_notes: notes?.trim() || null,
    });

    if (error) {
      console.error("Erreur RPC confirm_order_delivery:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la confirmation de livraison.",
      };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Impossible de valider la livraison." };
    }

    const row = data[0];

    revalidatePath("/dashboard/company/orders");
    revalidatePath(`/dashboard/company/orders/${orderId}`);
    revalidatePath("/dashboard/reseller/orders");
    revalidatePath(`/dashboard/reseller/orders/${orderId}`);
    revalidatePath("/dashboard/company/notifications");
    revalidatePath("/dashboard/reseller/notifications");
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/reseller");

    return {
      success: true,
      data: {
        orderId: row.order_id,
        orderNumber: row.order_number,
        status: row.status,
        deliveredAt: row.delivered_at,
        deliveredQuantity: Number(row.delivered_quantity),
      },
    };
  } catch (err: any) {
    console.error("Exception inattendue confirmOrderDeliveryAction:", err);
    return {
      success: false,
      error: err.message || "Erreur inattendue lors de la confirmation de livraison.",
    };
  }
}
