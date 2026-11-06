import { Building2 } from "lucide-react";
import { NO_COMPANY_MESSAGE } from "@/lib/auth/currentCompany";

/**
 * État explicite affiché lorsqu'aucune exploitation n'est rattachée au compte (FUN-18).
 * Remplace les redirections vers /onboarding ou /dashboard/company, qui pouvaient
 * provoquer une boucle de redirection pour un collaborateur non créateur.
 */
export default function CompanyAccountMissing() {
  return (
    <div className="max-w-xl mx-auto py-10" role="alert">
      <div className="bg-white rounded-3xl border border-amber-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7" aria-hidden="true" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Exploitation introuvable
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">{NO_COMPANY_MESSAGE}</p>
      </div>
    </div>
  );
}
