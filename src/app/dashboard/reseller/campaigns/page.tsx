import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getResellerCampaigns } from "@/lib/queries/campaigns";
import ResellerCampaignsView from "@/components/campaigns/ResellerCampaignsView";

export default async function ResellerCampaignsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller/campaigns");
  }

  // 1. Récupération du profil revendeur et de sa localisation
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, province_id, provinces(name)")
    .eq("id", user.id)
    .maybeSingle();

  const provinceName = (reseller?.provinces as any)?.name;

  // 2. Chargement des campagnes actives avec calcul d'éligibilité
  const campaigns = await getResellerCampaigns(reseller?.province_id);

  return (
    <ResellerCampaignsView
      initialCampaigns={campaigns}
      resellerProvinceName={provinceName}
    />
  );
}
