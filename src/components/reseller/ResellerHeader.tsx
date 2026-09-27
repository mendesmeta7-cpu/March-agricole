"use client";

import Link from "next/link";
import { Sprout, Bell, User, MapPin } from "lucide-react";

interface ResellerHeaderProps {
  userName?: string;
  businessName?: string;
  locationInfo?: string;
  unreadNotificationsCount?: number;
  avatarUrl?: string | null;
}

export default function ResellerHeader({
  userName,
  businessName,
  locationInfo,
  unreadNotificationsCount = 0,
  avatarUrl,
}: ResellerHeaderProps) {
  // Extraction bienveillante du premier prénom pour un accueil personnalisé
  const getGreeting = () => {
    if (!userName) return "Bonjour";
    const firstName = userName.trim().split(" ")[0];
    return `Bonjour, ${firstName}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Gauche : Logo végétal épuré + Message de bienvenue */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/reseller"
            className="flex items-center gap-2.5 group flex-shrink-0"
            aria-label="Accueil Marché Agricole"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-forest-600 flex items-center justify-center text-white shadow-xs group-hover:bg-forest-700 transition-colors">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
          </Link>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
              {getGreeting()}
            </h1>
            {locationInfo ? (
              <span className="text-[11px] text-gray-500 inline-flex items-center gap-1 truncate max-w-[170px] xs:max-w-[220px] sm:max-w-xs">
                <MapPin className="w-3 h-3 text-forest-600 flex-shrink-0" />
                <span className="truncate">{locationInfo}</span>
              </span>
            ) : businessName ? (
              <span className="text-[11px] text-gray-500 truncate block">
                {businessName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Droite : Cloche de notifications avec badge + Avatar / Profil */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <Link
            href="/dashboard/reseller/notifications"
            className="relative p-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-forest-50 active:bg-forest-100 transition-colors"
            aria-label="Voir les notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/reseller/profile"
            className="flex items-center gap-2 p-1 sm:p-1.5 rounded-full hover:bg-gray-100 transition-colors group"
            aria-label="Accéder à mon profil"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-forest-100 text-forest-800 border border-forest-200/80 flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs group-hover:border-forest-300 overflow-hidden flex-shrink-0">
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
            {/* Nom visible uniquement sur grand écran */}
            <span className="hidden md:inline text-xs font-semibold text-gray-700 group-hover:text-gray-900 max-w-[120px] truncate">
              {userName || "Mon Profil"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
