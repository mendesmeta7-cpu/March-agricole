import { getPublicCompanyProfile, getCompanyPublicProductions } from "@/lib/queries/companies";
import { notFound } from "next/navigation";
import CompanyPublicProfileView from "@/components/companies/CompanyPublicProfileView";

interface ResellerCompanyDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ResellerCompanyDetailPage({
  params,
}: ResellerCompanyDetailPageProps) {
  const company = await getPublicCompanyProfile(params.id);

  if (!company) {
    notFound();
  }

  const productions = await getCompanyPublicProductions(params.id);

  return (
    <CompanyPublicProfileView
      company={company}
      productions={productions}
    />
  );
}
