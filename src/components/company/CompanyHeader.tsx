"use client";

import Link from "next/link";
import { Bell, MapPin, Menu, Building2 } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

export interface CompanyHeaderProps {
  entityName?: string;
  userName?: string;
  locationInfo?: string;
  unreadNotificationsCount?: number;
  logoUrl?: string | null;
  onOpenMobileMenu?: () => void;
}

export default function CompanyHeader({
  entityName,
  userName,
  locationInfo,
  unreadNotificationsCount = 0,
  logoUrl,
  onOpenMobileMenu,
}: CompanyHeaderProps) {
  // Extraction respectueuse du prénom pour un accueil personnalisé
  const getGreeting = () => {
    if (entityName) return entityName;
    if (userName) {
      const firstName = userName.trim().split(" ")[0];
      return `Bonjour, ${firstName}`;
    }
    return "Espace Entreprise";
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Gauche : Bouton menu tiroir (mobile/tablette) + Logo végétal + Identité */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link
            href="/dashboard/company"
            className="flex items-center gap-2 group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-xl"
            aria-label="Accueil Radiza"
          >
            <BrandLogo variant="compact" height={36} priority />
          </Link>

          <div className="min-w-0">
            <h1 className="text-xs xs:text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
              {getGreeting()}
            </h1>
            {locationInfo ? (
              <span className="text-[10px] xs:text-[11px] text-gray-500 inline-flex items-center gap-1 truncate max-w-[140px] xs:max-w-[190px] sm:max-w-xs">
                <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                <span className="truncate">{locationInfo}</span>
              </span>
            ) : userName ? (
              <span className="text-[10px] xs:text-[11px] text-gray-500 truncate block max-w-[140px] xs:max-w-[190px]">
                {userName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Droite : Cloche notifications réelles + Mon Profil (avatar/logo) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Cloche notifications avec badge dynamique réel */}
          <Link
            href="/dashboard/company/notifications"
            className="relative p-2 sm:p-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-forest-50 active:bg-forest-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
            aria-label="Voir les notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-forest-700 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            )}
          </Link>

          {/* Avatar / lien vers Profil entreprise (visible uniquement sur mobile, masqué sur PC) */}
          <Link
            href="/dashboard/company/profile"
            className="lg:hidden flex items-center gap-2 p-1 sm:p-1.5 rounded-full hover:bg-gray-100 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
            aria-label="Accéder au profil de l'entreprise"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-forest-100 text-forest-800 border border-forest-200/80 flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs group-hover:border-forest-300 overflow-hidden shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={entityName || userName || "Profil"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4 text-forest-700" />
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
