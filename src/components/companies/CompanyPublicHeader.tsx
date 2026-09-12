"use client";

import { useState } from "react";
import { PublicCompanyProfile } from "@/lib/queries/companies";
import { Building2, MapPin, Calendar, Sparkles, CheckCircle2, ShieldCheck, ImageOff } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface CompanyPublicHeaderProps {
  company: PublicCompanyProfile;
}

export default function CompanyPublicHeader({ company }: CompanyPublicHeaderProps) {
  const [logoError, setLogoError] = useState(false);

  const formattedJoinDate = (() => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
      }).format(new Date(company.created_at));
    } catch {
      return null;
    }
  })();

  const provinceName = company.provinces?.name || "";
  const countryName = company.countries?.name || "RDC";
  const locationDisplay = [company.city, provinceName, countryName]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
      {/* Accent décoratif de fond */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-forest-50/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
        {/* 1. Logo / Avatar de l'entreprise */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-forest-50 border-2 border-forest-100 flex items-center justify-center text-forest-800 flex-shrink-0 overflow-hidden relative shadow-xs">
          {company.logo_url && !logoError ? (
            <img
              src={company.logo_url}
              alt={company.name}
              onError={() => setLogoError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="w-10 h-10 text-forest-700" />
          )}
        </div>

        {/* 2. Informations principales */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {company.name}
            </h1>

            {/* Statut de vérification */}
            {company.verification_status === "verified" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Exploitation Vérifiée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                Producteur Enregistré
              </span>
            )}
          </div>

          {/* Localisation et ancienneté */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-gray-600">
            {locationDisplay && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-forest-600 flex-shrink-0" />
                <span className="font-medium text-gray-800">{locationDisplay}</span>
              </div>
            )}

            {formattedJoinDate && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Membre depuis {formattedJoinDate}</span>
              </div>
            )}
          </div>

          {/* Description de l'entreprise */}
          {company.description ? (
            <p className="text-sm text-gray-700 leading-relaxed pt-1 whitespace-pre-line max-w-3xl">
              {company.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic pt-1">
              Aucune présentation descriptive supplémentaire enregistrée pour cette exploitation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
