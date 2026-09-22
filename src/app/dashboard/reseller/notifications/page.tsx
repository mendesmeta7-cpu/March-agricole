import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/lib/queries/notifications";
import NotificationsView from "@/components/notifications/NotificationsView";

export default async function ResellerNotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller/notifications");
  }

  const result = await getUserNotifications(user.id);

  return (
    <NotificationsView
      initialNotifications={result.notifications}
      userRole="reseller"
    />
  );
}
