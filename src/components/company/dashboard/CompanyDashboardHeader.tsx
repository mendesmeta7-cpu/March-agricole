"use client";

import Link from "next/link";
import { MapPin, Plus, Megaphone, CheckCircle2, Clock } from "lucide-react";

export interface CompanyDashboardHeaderProps {
  companyName: string;
  userName?: string;
  verificationStatus: "verified" | "pending_verification" | "unverified";
  locationInfo?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function CompanyDashboardHeader({
  companyName,
  userName,
  verificationStatus,
  locationInfo,
}: CompanyDashboardHeaderProps) {
  const greeting = getGreeting();

  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const capitalizedDate =
    todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-900 via-forest-800 to-earth-900 px-6 py-7 sm:px-8 sm:py-8 shadow-lg border border-forest-800/40">
      {/* Décoration géométrique et halos d'ambiance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-52 w-52 rounded-full bg-white/5 blur-xl" />
        <div className="absolute right-1/3 bottom-0 h-44 w-44 rounded-full bg-forest-600/30 blur-2xl" />
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full border-[35px] border-white/5 -translate-y-1/2 translate-x-1/2" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Bloc d'accueil et informations */}
        <div className="space-y-3 max-w-2xl">
          {/* Pastille contextuelle supérieure */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Espace Exploitation Agricole</span>
            </div>
            <span className="text-xs text-forest-200/70 hidden sm:inline-flex items-center gap-1.5">
              <span>&bull;</span>
              <span>{capitalizedDate}</span>
            </span>
          </div>

          {/* Salutation esthétique & Nom de l'exploitation */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-300 tracking-tight">
                {greeting}
              </span>
              <span className="text-xl sm:text-2xl select-none" aria-hidden="true">
                👋
              </span>
              {userName && (
                <span className="text-xs sm:text-sm font-semibold text-white/90 bg-white/10 px-3 py-0.5 rounded-full border border-white/15 backdrop-blur-sm">
                  {userName}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mt-1 font-display">
              {companyName}
            </h1>
          </div>

          {/* Badges d'état et localisation géographique */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            {verificationStatus === "verified" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Exploitation vérifiée</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Vérification en cours</span>
              </span>
            )}

            {locationInfo && (
              <span className="inline-flex items-center gap-1.5 text-xs text-forest-200/90 font-medium bg-black/20 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>{locationInfo}</span>
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-forest-100/80 leading-relaxed pt-0.5">
            Voici un aperçu en direct de l&apos;activité commerciale et opérationnelle de votre exploitation sur Radiza.
          </p>
        </div>

        {/* Actions rapides contextuelles (avec contraste garanti et visibilité absolue) */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
          {/* Bouton secondaire Productions */}
          <Link
            href="/dashboard/company/productions"
            className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/35 backdrop-blur-md shadow-xs transition-all duration-150 active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-white font-semibold">Productions</span>
          </Link>

          {/* Bouton primaire Campagnes (Texte sombre garanti 100% lisible sur fond blanc) */}
          <Link
            href="/dashboard/company/campaigns"
            className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-white text-forest-950 hover:bg-emerald-50 hover:text-forest-900 shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 border border-white/90"
          >
            <Megaphone className="w-4 h-4 text-forest-800 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-forest-950 font-bold tracking-tight">Campagnes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
