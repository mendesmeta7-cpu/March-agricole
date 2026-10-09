"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tractor,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  Bell,
  Building2,
  MapPin,
  LogOut,
  X,
  User,
  ChevronRight,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/Dialog";
import BrandLogo from "@/components/ui/BrandLogo";

export interface CompanySidebarProps {
  entityName?: string;
  userName?: string;
  userEmail?: string;
  locationInfo?: string;
  logoUrl?: string | null;
  unreadNotificationsCount?: number;
  pendingOrdersCount?: number;
  onClose?: () => void;
}

interface NavDestination {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export default function CompanySidebar({
  entityName,
  userName,
  userEmail,
  locationInfo,
  logoUrl,
  unreadNotificationsCount = 0,
  pendingOrdersCount = 0,
  onClose,
}: CompanySidebarProps) {
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // EXACTEMENT les 8 sections attendues selon les spécifications officielles
  const navItems: NavDestination[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard/company",
      icon: LayoutDashboard,
    },
    {
      id: "products",
      label: "Catalogue Produits",
      href: "/dashboard/company/products",
      icon: Package,
    },
    {
      id: "productions",
      label: "Productions & Récoltes",
      href: "/dashboard/company/productions",
      icon: Tractor,
    },
    {
      id: "demands",
      label: "Demande du marché",
      href: "/dashboard/company/demands",
      icon: TrendingUp,
    },
    {
      id: "campaigns",
      label: "Campagne de vente",
      href: "/dashboard/company/campaigns",
      icon: Megaphone,
    },
    {
      id: "orders",
      label: "Commandes reçues",
      href: "/dashboard/company/orders",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      id: "notifications",
      label: "Notifications",
      href: "/dashboard/company/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: "profile",
      label: "Profil entreprise",
      href: "/dashboard/company/profile",
      icon: Building2,
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
      // Ignorer si Next.js lève une redirection
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <>
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-full select-none shadow-xs">
        {/* 1. En-tête de marque */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <Link
            href="/dashboard/company"
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

        {/* 2. Cartouche d'identité entreprise agricole (sans avatar redondant) */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-gray-900 truncate">
              {entityName || userName || "Mon Entreprise"}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-forest-100 text-forest-800 border-forest-200">
                Producteur Agricole
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

        {/* 3. Navigation principale — 8 sections obligatoires strictes */}
        <nav
          aria-label="Navigation latérale société"
          className="flex-1 px-3 py-3 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard/company"
                ? pathname === "/dashboard/company"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 ${
                  isActive
                    ? "bg-forest-50 text-forest-900 font-bold shadow-2xs border-l-4 border-forest-600 pl-2.5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      isActive
                        ? "text-forest-700 stroke-[2.3]"
                        : "text-gray-400 group-hover:text-gray-600 stroke-[1.8]"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {/* Badge notifications réelles */}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-forest-700 text-white shadow-2xs">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 4. Pied de sidebar : Profil & Déconnexion sécurisée (sans avatar redondant) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2.5">
          <Link
            href="/dashboard/company/profile"
            onClick={onClose}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors group"
            aria-label="Voir le profil de l'entreprise"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-forest-700">
                {userName || entityName || "Mon Compte"}
              </p>
              {userEmail && (
                <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-forest-700 transition-colors shrink-0" />
          </Link>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 shadow-2xs transition-all cursor-pointer"
            title="Se déconnecter de la session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleLogout}
        title="Confirmation de déconnexion"
        description="Êtes-vous certain de vouloir fermer votre session active sur l'espace Entreprise ? Vos jetons de sécurité locaux seront réinitialisés."
        confirmText="Oui, me déconnecter"
        cancelText="Rester connecté"
        variant="destructive"
        isLoading={isLoggingOut}
      />
    </>
  );
}
