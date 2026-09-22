"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface NotificationActionResult {
  success: boolean;
  error?: string;
}

/**
 * Marque une notification spécifique comme lue
 */
export async function markNotificationAsReadAction(
  notificationId: string
): Promise<NotificationActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Utilisateur non authentifié." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/reseller/notifications");
  revalidatePath("/dashboard/company/notifications");
  return { success: true };
}

/**
 * Marque toutes les notifications non lues de l'utilisateur comme lues
 */
export async function markAllNotificationsAsReadAction(): Promise<NotificationActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Utilisateur non authentifié." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/reseller/notifications");
  revalidatePath("/dashboard/company/notifications");
  return { success: true };
}
