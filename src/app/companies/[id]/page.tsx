import { getPublicCompanyProfile, getCompanyPublicProductions } from "@/lib/queries/companies";
import { notFound } from "next/navigation";
import CompanyPublicProfileView from "@/components/companies/CompanyPublicProfileView";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

interface PublicCompanyPageProps {
  params: {
    id: string;
  };
}

export default async function PublicCompanyPage({ params }: PublicCompanyPageProps) {
  const company = await getPublicCompanyProfile(params.id);

  if (!company) {
    notFound();
  }

  const productions = await getCompanyPublicProductions(params.id);

  return (
    <div className="min-h-screen bg-sand-50/40 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation d'en-tête publique */}
        <header className="flex items-center justify-between pb-4 border-b border-gray-200/80">
          <Link
            href="/"
            className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-lg"
            aria-label="Accueil Radiza"
          >
            <BrandLogo variant="horizontal" height={32} priority />
          </Link>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-white transition-colors font-medium"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors font-semibold"
            >
              S&apos;inscrire
            </Link>
          </div>
        </header>

        {/* Vue profil public */}
        <CompanyPublicProfileView
          company={company}
          productions={productions}
          backHref="/"
          backLabel="Retour à l'accueil"
        />
      </div>
    </div>
  );
}
