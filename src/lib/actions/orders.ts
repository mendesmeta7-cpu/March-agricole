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

  // 2. Validation des paramètres
  if (!input.campaign_id) {
    return { success: false, error: "Identifiant de campagne manquant." };
  }

  const quantity = Number(input.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "La quantité commandée doit être strictement supérieure à zéro." };
  }

  if (!input.delivery_province_id) {
    return { success: false, error: "Veuillez spécifier la province de livraison." };
  }

  // 3. Appel de la procédure stockée transactionnelle PostgreSQL
  try {
    const { data, error } = await supabase.rpc("create_order_with_reservation", {
      p_reseller_id: user.id,
      p_campaign_id: input.campaign_id,
      p_quantity: quantity,
      p_delivery_province_id: input.delivery_province_id,
      p_delivery_city: input.delivery_city?.trim() || null,
      p_delivery_address: input.delivery_address?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) {
      console.error("Erreur RPC create_order_with_reservation:", error);
      // Nettoyage du message d'erreur pour l'utilisateur final
      let friendlyMessage = error.message;
      if (friendlyMessage.includes("Stock disponible insuffisant")) {
        friendlyMessage = "Stock disponible insuffisant pour cette quantité sur cette offre.";
      } else if (friendlyMessage.includes("ne dessert pas la province")) {
        friendlyMessage = "Cette campagne ne dessert pas votre province de livraison.";
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
