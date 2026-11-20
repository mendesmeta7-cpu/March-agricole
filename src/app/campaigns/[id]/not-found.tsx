import Link from "next/link";
import { CalendarX } from "lucide-react";
import PublicCampaignHeader from "./PublicCampaignHeader";

/**
 * Campagne non consultable (Lot UX/UI 5B, ADR-058, décision 1) : brouillon, suspendue, terminée,
 * annulée, close par date, inexistante ou adresse incomplète. Le message ne dit pas laquelle de ces
 * raisons s'applique, pour ne rien révéler d'une campagne qui n'est pas publique.
 */
export default function CampaignUnavailable() {
  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <PublicCampaignHeader connecte={false} />
        <main className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <CalendarX className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campagne indisponible</h1>
          <p className="text-sm text-gray-700 max-w-md mx-auto leading-relaxed">
            Cette campagne n&apos;est pas ouverte à la consultation. Elle a pu être clôturée, suspendue
            ou retirée par la société, ou le lien est incomplet.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-forest-700 text-white hover:bg-forest-800 text-sm font-semibold transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm font-semibold transition-colors"
            >
              Mon espace
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
