import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getResellerOrders } from "@/lib/queries/orders";
import ResellerOrdersView from "@/components/orders/ResellerOrdersView";

export default async function ResellerOrdersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/reseller/orders");
  }

  // Chargement des commandes réelles de l'acheteur
  const orders = await getResellerOrders(user.id);

  return <ResellerOrdersView initialOrders={orders} />;
}
