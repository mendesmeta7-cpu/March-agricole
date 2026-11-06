import { getCurrentUser } from "@/lib/auth/currentCompany";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/lib/queries/notifications";
import CompanyNotificationsView from "@/components/notifications/CompanyNotificationsView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyNotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/notifications");
  }

  const result = await getUserNotifications(user.id);

  return (
    <CompanyNotificationsView
      initialNotifications={result.notifications}
      unreadCount={result.unreadCount}
      totalCount={result.totalCount}
    />
  );
}
