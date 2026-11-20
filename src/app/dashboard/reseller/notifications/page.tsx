import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/lib/queries/notifications";
import ResellerNotificationsView from "@/components/notifications/ResellerNotificationsView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Notifications — Radiza" };

export default async function ResellerNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller/notifications");
  }

  const result = await getUserNotifications(user.id);

  return (
    <ResellerNotificationsView
      initialNotifications={result.notifications}
      unreadCount={result.unreadCount}
      totalCount={result.totalCount}
    />
  );
}
