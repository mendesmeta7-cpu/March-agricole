import { createClient } from "@/lib/supabase/server";
import { getDemandById } from "@/lib/queries/demands";
import { notFound, redirect } from "next/navigation";
import CompanyDemandDetailView from "@/components/demands/CompanyDemandDetailView";

interface CompanyDemandDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CompanyDemandDetailPage({
  params,
}: CompanyDemandDetailPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/demands/${params.id}`);
  }

  // 1. Récupération de l'entreprise connectée
  const { data: memberData } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let companyId = memberData?.company_id;

  if (!companyId) {
    const { data: comp } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", user.id)
      .maybeSingle();
    companyId = comp?.id;
  }

  if (!companyId) {
    redirect("/dashboard/company");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();

  // 2. Chargement de la demande exacte
  const demand = await getDemandById(params.id);

  if (!demand) {
    notFound();
  }

  // 3. Chargement conjoint des productions de l'entreprise, de la proposition existante et du revendeur
  const [productionsRes, proposalRes, resellerRes] = await Promise.all([
    supabase
      .from("productions")
      .select("id, title, expected_quantity, unit, status, product_id")
      .eq("company_id", companyId)
      .in("status", ["growing", "harvested"])
      .order("created_at", { ascending: false }),
    supabase
      .from("demand_responses")
      .select(`
        id,
        demand_id,
        company_id,
        production_id,
        status,
        proposed_quantity,
        unit,
        unit_price,
        currency,
        message,
        created_at,
        updated_at,
        production:productions (
          id,
          title,
          status,
          expected_quantity,
          unit
        )
      `)
      .eq("demand_id", params.id)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("resellers")
      .select("business_name, reseller_type, city")
      .eq("id", demand.reseller_id)
      .maybeSingle(),
  ]);

  const companyProductions = productionsRes.data || [];
  const myProposal = proposalRes.data
    ? {
        ...proposalRes.data,
        proposed_quantity: Number(proposalRes.data.proposed_quantity || 0),
        unit_price: Number(proposalRes.data.unit_price || 0),
        production: Array.isArray(proposalRes.data.production)
          ? proposalRes.data.production[0]
          : proposalRes.data.production,
      }
    : null;

  return (
    <CompanyDemandDetailView
      demand={demand}
      companyProductions={companyProductions}
      myProposal={myProposal as any}
      companyName={company?.name || "Exploitation agricole"}
      resellerInfo={resellerRes.data}
    />
  );
}
