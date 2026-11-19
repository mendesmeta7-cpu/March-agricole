import { getPublicCompanyProfile, getCompanyPublicProductions } from "@/lib/queries/companies";
import { notFound } from "next/navigation";
import { settleRead } from "@/lib/utils/settleRead";
import CompanyPublicProfileView from "@/components/companies/CompanyPublicProfileView";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Fiche de la société — Radiza" };

interface ResellerCompanyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResellerCompanyDetailPage(props: ResellerCompanyDetailPageProps) {
  const params = await props.params;
  const company = await getPublicCompanyProfile(params.id);

  if (!company) {
    notFound();
  }

  // Lot 2C : panne des productions signalée sans faire tomber la fiche
  const productionsRead = await settleRead(getCompanyPublicProductions(params.id), []);

  return (
    <CompanyPublicProfileView
      company={company}
      productions={productionsRead.data}
      productionsUnavailable={productionsRead.failed}
    />
  );
}
