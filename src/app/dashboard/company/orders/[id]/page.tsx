import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCompanyOrderById } from "@/lib/queries/orders";
import CompanyOrderDetailView from "@/components/orders/CompanyOrderDetailView";

interface CompanyOrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CompanyOrderDetailPage({
  params,
}: CompanyOrderDetailPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/orders/${params.id}`);
  }

  // 1. Récupération de l'entreprise rattachée
  const { data: memberData } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let companyId = memberData?.company_id;

  if (!companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", user.id)
      .maybeSingle();
    companyId = company?.id;
  }

  if (!companyId) {
    redirect("/dashboard/company");
  }

  const order = await getCompanyOrderById(params.id, companyId);

  if (!order) {
    notFound();
  }

  return <CompanyOrderDetailView order={order} />;
}
