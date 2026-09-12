"use client";

import Link from "next/link";
import { PublicCompanyProfile, CompanyPublicProductionItem } from "@/lib/queries/companies";
import CompanyPublicHeader from "@/components/companies/CompanyPublicHeader";
import CompanyPublicProductionsList from "@/components/companies/CompanyPublicProductionsList";
import Card from "@/components/ui/Card";
import { ArrowLeft, Sprout, Info, TrendingUp } from "lucide-react";

interface CompanyPublicProfileViewProps {
  company: PublicCompanyProfile;
  productions: CompanyPublicProductionItem[];
  backHref?: string;
  backLabel?: string;
}

export default function CompanyPublicProfileView({
  company,
  productions,
  backHref = "/dashboard/reseller/feed",
  backLabel = "Retour aux productions",
}: CompanyPublicProfileViewProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Navigation de retour */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-forest-800 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* 2. En-tête de l'entreprise */}
      <CompanyPublicHeader company={company} />

      {/* 3. Section des productions publiques */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-forest-50 text-forest-700">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Productions & Récoltes Publiques
              </h2>
              <p className="text-xs text-gray-500">
                Déclarations de cultures partagées publiquement par cette exploitation
              </p>
            </div>
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {productions.length} {productions.length > 1 ? "productions déclarées" : "production déclarée"}
          </span>
        </div>

        {/* Liste des productions réelles */}
        <CompanyPublicProductionsList productions={productions} />
      </div>

      {/* 4. Note d'information revendeur */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <Card padding="md" className="bg-amber-50/50 border-amber-200/80">
          <div className="flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                Cadre informatif & Découplage commercial :
              </span>
              <p className="text-amber-800 text-xs leading-relaxed">
                Les fiches affichées sur ce profil constituent des déclarations de cultures prévisionnelles. Aucune commande ferme ni réservation directe de stock n&apos;est disponible sans campagne commerciale active.
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-earth-200/80 bg-earth-50/40">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-earth-900 font-bold text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 text-earth-700" />
              Un besoin spécifique d&apos;approvisionnement ?
            </div>
            <p className="text-xs text-earth-800 leading-relaxed">
              Vous pouvez publier une demande d&apos;achat sur la plateforme pour informer les exploitations de vos volumes cibles.
            </p>
            <Link
              href="/dashboard/reseller/demands"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-earth-800 hover:text-earth-950 underline underline-offset-2"
            >
              Publier une demande d&apos;achat &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
