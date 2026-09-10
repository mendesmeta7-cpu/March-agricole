"use client";

import { Menu, LogOut, MapPin, Building2, Store } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";

interface AppHeaderProps {
  role: "company" | "reseller" | "admin";
  entityName?: string;
  locationInfo?: string;
  userName?: string;
  onToggleMobileMenu: () => void;
}

export default function AppHeader({
  role,
  entityName,
  locationInfo,
  userName,
  onToggleMobileMenu,
}: AppHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Bouton Hamburger Mobile + Identité */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center active:bg-gray-200"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {role === "company" && (
              <span className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </span>
            )}
            {role === "reseller" && (
              <span className="w-8 h-8 rounded-lg bg-earth-100 text-earth-800 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="font-bold text-gray-900 text-xs xs:text-sm sm:text-base leading-tight block truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs">
              {entityName || userName || "Marché Agricole"}
            </span>
            {locationInfo && (
              <span className="text-[10px] xs:text-xs text-gray-500 inline-flex items-center gap-1 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-xs">
                <MapPin className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{locationInfo}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions de droite : Déconnexion */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <form action={logoutAction}>
          <SubmitButton
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm shadow-2xs hover:border-gray-300 min-h-[40px] flex items-center justify-center"
            loadingText=""
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">Déconnexion</span>
          </SubmitButton>
        </form>
      </div>
    </header>
  );
}
