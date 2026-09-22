import { createClient } from "@/lib/supabase/server";

export type NotificationType =
  | "DEMANDE_REPONSE"
  | "DEMANDE_ACCEPTEE"
  | "DEMANDE_REFUSEE"
  | "CAMPAGNE_OUVERTE"
  | "COMMANDE_CREEE"
  | "DEMANDE_GENERALE_RECUE"
  | "DEMANDE_PRODUCTION_RECUE";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: "demand" | "demand_response" | "campaign" | "order" | "production";
  related_entity_id: string;
  action_url: string;
  read_at: string | null;
  created_at: string;
}

export interface UserNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
}

/**
 * Récupère les notifications d'un utilisateur avec filtrage optionnel
 */
export async function getUserNotifications(
  userId: string,
  filterCategory: "all" | "demands" | "campaigns" | "orders" = "all"
): Promise<UserNotificationsResult> {
  const supabase = createClient();

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filterCategory === "demands") {
    query = query.in("type", [
      "DEMANDE_REPONSE",
      "DEMANDE_ACCEPTEE",
      "DEMANDE_REFUSEE",
      "DEMANDE_GENERALE_RECUE",
      "DEMANDE_PRODUCTION_RECUE",
    ]);
  } else if (filterCategory === "campaigns") {
    query = query.eq("type", "CAMPAGNE_OUVERTE");
  } else if (filterCategory === "orders") {
    query = query.eq("type", "COMMANDE_CREEE");
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Erreur récupération notifications utilisateur:", error);
    return { notifications: [], unreadCount: 0, totalCount: 0 };
  }

  // Comptage des non-lues
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  const notifications = (data || []).map((item: any) => ({
    ...item,
  })) as NotificationItem[];

  return {
    notifications,
    unreadCount: unreadCount || 0,
    totalCount: count || 0,
  };
}

/**
 * Récupère le nombre de notifications non lues d'un utilisateur
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) return 0;
  return count || 0;
}
