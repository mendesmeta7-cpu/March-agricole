import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Route passerelle universelle /dashboard/notifications :
 * Aiguille de manière déterministe l'utilisateur authentifié
 * vers le centre de notifications correspondant à son rôle réel.
 */
export default async function GenericNotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/notifications");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "company") {
    redirect("/dashboard/company/notifications");
  } else if (profile?.role === "reseller") {
    redirect("/dashboard/reseller/notifications");
  } else if (profile?.role === "admin") {
    redirect("/dashboard/admin");
  }

  redirect("/unauthorized");
}
