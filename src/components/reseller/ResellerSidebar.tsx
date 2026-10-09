"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Megaphone,
  TrendingUp,
  ShoppingBag,
  Bell,
  User,
  Store,
  MapPin,
  LogOut,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/ui/BrandLogo";

interface ResellerSidebarProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  locationInfo?: string;
  logoUrl?: string | null;
  unreadNotificationsCount?: number;
  onClose?: () => void;
}

interface NavDestination {
  id: string;
  label: string;
  href: string;
  icon: typeof Compass;
  badge?: number;
}

export default function ResellerSidebar({
  businessName,
  userName,
  userEmail,
  locationInfo,
  logoUrl,
  unreadNotificationsCount = 0,
  onClose,
}: ResellerSidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // EXACTEMENT ces six entrées obligatoires — aucun raccourcissement ni formulation générique
  const navItems: NavDestination[] = [
    {
      id: "feed",
      label: "Flux des Productions",
      href: "/dashboard/reseller",
      icon: Compass,
    },
    {
      id: "campaigns",
      label: "Offres Commerciales",
      href: "/dashboard/reseller/campaigns",
      icon: Megaphone,
    },
    {
      id: "demands",
      label: "Mes Demandes d'Achat",
      href: "/dashboard/reseller/demands",
      icon: TrendingUp,
    },
    {
      id: "orders",
      label: "Mes Commandes",
      href: "/dashboard/reseller/orders",
      icon: ShoppingBag,
    },
    {
      id: "notifications",
      label: "Notifications",
      href: "/dashboard/reseller/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: "profile",
      label: "Mon Profil",
      href: "/dashboard/reseller/profile",
      icon: User,
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignorer si non disponible côté client
      }
      await logoutAction();
    } catch {
      // Ignorer si redirection levée
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-full select-none shadow-xs">
      {/* 1. En-tête de marque */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <Link
          href="/dashboard/reseller"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-xl"
          onClick={onClose}
          aria-label="Accueil Radiza"
        >
          <BrandLogo variant="horizontal" height={34} />
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Fermer la navigation latérale"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Cartouche d'identité revendeur (avatar restauré sur PC, masqué sur mobile où il est en en-tête) */}
      <div className="px-5 py-3.5 lg:py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex w-10 h-10 rounded-xl bg-white border border-gray-200 items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName || userName || "Profil"}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-5 h-5 text-earth-700" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-gray-900 truncate">
              {businessName || userName || "Revendeur Agréé"}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-earth-100 text-earth-800 border-earth-200">
                Revendeur / Distributeur
              </span>
              {locationInfo && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1 truncate max-w-[150px]">
                  <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                  <span className="truncate">{locationInfo}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation principale — 6 entrées obligatoires strictes */}
      <nav
        aria-label="Navigation latérale revendeur"
        className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard/reseller"
              ? pathname === "/dashboard/reseller" ||
                pathname.startsWith("/dashboard/reseller/productions") ||
                pathname.startsWith("/dashboard/reseller/companies")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 ${
                isActive
                  ? "bg-earth-50 text-earth-900 font-bold shadow-2xs border-l-4 border-earth-600 pl-2.5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform ${
                    isActive
                      ? "text-earth-700 stroke-[2.3]"
                      : "text-gray-400 group-hover:text-gray-600 stroke-[1.8]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {/* Badge de notifications réel uniquement si > 0 */}
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 4. Pied de sidebar : Profil & Déconnexion sécurisée (avatar restauré sur PC, chevron sur mobile) */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
        <Link
          href="/dashboard/reseller/profile"
          onClick={onClose}
          className="flex items-center justify-between lg:justify-start gap-3 p-2 lg:p-1.5 rounded-xl hover:bg-white transition-colors group"
          aria-label="Voir mon profil revendeur"
        >
          <div className="hidden lg:flex w-8 h-8 rounded-full bg-forest-100 text-forest-800 border border-forest-200/80 items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={userName || "Profil"}
                className="w-full h-full object-cover"
              />
            ) : userName ? (
              userName.charAt(0).toUpperCase()
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-forest-700">
              {userName || businessName || "Mon Compte"}
            </p>
            {userEmail && (
              <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-forest-700 transition-colors shrink-0 lg:hidden" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-100 hover:border-red-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          title="Se déconnecter"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Déconnexion...</span>
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
