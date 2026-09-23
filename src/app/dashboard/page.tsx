import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Route passerelle racine /dashboard :
 * Aiguille de manière déterministe et étanche l'utilisateur authentifié
 * vers son espace dashboard exclusif selon son rôle.
 */
export default async function DashboardRootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "company") {
    redirect("/dashboard/company");
  } else if (profile?.role === "reseller") {
    redirect("/dashboard/reseller");
  } else if (profile?.role === "admin") {
    redirect("/dashboard/admin");
  }

  redirect("/unauthorized");
}
