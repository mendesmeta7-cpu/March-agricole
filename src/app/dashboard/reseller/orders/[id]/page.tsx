import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getResellerOrderById } from "@/lib/queries/orders";
import ResellerOrderDetailView from "@/components/orders/ResellerOrderDetailView";

interface ResellerOrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ResellerOrderDetailPage({
  params,
}: ResellerOrderDetailPageProps) {
  const supabase = createClient();
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

  return <ResellerOrderDetailView order={order} />;
}
