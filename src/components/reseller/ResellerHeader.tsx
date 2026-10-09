"use client";

import Link from "next/link";
import { Bell, User, MapPin, Menu } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

interface ResellerHeaderProps {
  userName?: string;
  businessName?: string;
  locationInfo?: string;
  unreadNotificationsCount?: number;
  avatarUrl?: string | null;
  onOpenMobileMenu?: () => void;
}

export default function ResellerHeader({
  userName,
  businessName,
  locationInfo,
  unreadNotificationsCount = 0,
  avatarUrl,
  onOpenMobileMenu,
}: ResellerHeaderProps) {
  // Extraction bienveillante du premier prénom pour un accueil personnalisé
  const getGreeting = () => {
    if (!userName) return "Bonjour";
    const firstName = userName.trim().split(" ")[0];
    return `Bonjour, ${firstName}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Gauche : Bouton menu tiroir (mobile/tablette) + Logo végétal + Accueil personnalisé */}
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
            href="/dashboard/reseller"
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
            ) : businessName ? (
              <span className="text-[10px] xs:text-[11px] text-gray-500 truncate block max-w-[140px] xs:max-w-[190px]">
                {businessName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Droite : Cloche notifications réelles + Mon Profil (avatar) */}
        {/* Déconnexion supprimée ici — accessible dans la sidebar desktop */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Cloche notifications avec badge dynamique réel — conservée dans le header */}
          <Link
            href="/dashboard/reseller/notifications"
            className="relative p-2 sm:p-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-forest-50 active:bg-forest-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
            aria-label="Voir les notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            )}
          </Link>

          {/* Avatar / lien vers Mon Profil (visible uniquement sur mobile, masqué sur PC) */}
          <Link
            href="/dashboard/reseller/profile"
            className="lg:hidden flex items-center gap-2 p-1 sm:p-1.5 rounded-full hover:bg-gray-100 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
            aria-label="Accéder à mon profil"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-forest-100 text-forest-800 border border-forest-200/80 flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs group-hover:border-forest-300 overflow-hidden shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName || "Profil"}
                  className="w-full h-full object-cover"
                />
              ) : userName ? (
                userName.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
