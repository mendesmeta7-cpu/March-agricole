import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getResellerOrderById } from "@/lib/queries/orders";
import ResellerOrderDetailView from "@/components/orders/ResellerOrderDetailView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Détail de la commande — Radiza" };

interface ResellerOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    commande?: string;
  }>;
}

export default async function ResellerOrderDetailPage(props: ResellerOrderDetailPageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/reseller/orders/${params.id}`);
  }

  const order = await getResellerOrderById(params.id, user.id);

  if (!order) {
    notFound();
  }

  const { commande } = await props.searchParams;

  return <ResellerOrderDetailView order={order} justCreated={commande === "enregistree"} />;
}
