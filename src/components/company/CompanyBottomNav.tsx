"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tractor,
  Megaphone,
  ShoppingBag,
  MoreHorizontal,
  Package,
  TrendingUp,
  Bell,
  Building2,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

export interface CompanyBottomNavProps {
  unreadNotificationsCount?: number;
  pendingOrdersCount?: number;
  entityName?: string;
  userName?: string;
  userEmail?: string;
  logoUrl?: string | null;
}

export default function CompanyBottomNav({
  unreadNotificationsCount = 0,
  pendingOrdersCount = 0,
  entityName,
  userName,
  userEmail,
  logoUrl,
}: CompanyBottomNavProps) {
  const pathname = usePathname();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sections principales de la barre inférieure (les 4 plus fréquentes pour l'exploitation)
  const primaryTabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard/company",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard/company",
    },
    {
      id: "productions",
      label: "Productions",
      href: "/dashboard/company/productions",
      icon: Tractor,
      isActive:
        pathname === "/dashboard/company/productions" ||
        pathname.startsWith("/dashboard/company/productions/"),
    },
    {
      id: "campaigns",
      label: "Campagnes",
      href: "/dashboard/company/campaigns",
      icon: Megaphone,
      isActive:
        pathname === "/dashboard/company/campaigns" ||
        pathname.startsWith("/dashboard/company/campaigns/"),
    },
    {
      id: "orders",
      label: "Commandes",
      href: "/dashboard/company/orders",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      isActive:
        pathname === "/dashboard/company/orders" ||
        pathname.startsWith("/dashboard/company/orders/"),
    },
  ];

  // Sections complémentaires logées dans le tiroir "Plus"
  const secondarySections = [
    {
      id: "products",
      label: "Catalogue Produits",
      description: "Gestion des produits et configuration du catalogue",
      href: "/dashboard/company/products",
      icon: Package,
    },
    {
      id: "demands",
      label: "Demande du marché",
      description: "Besoins d'approvisionnement exprimés par les revendeurs",
      href: "/dashboard/company/demands",
      icon: TrendingUp,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Alertes commandes, messages et évolutions du marché",
      href: "/dashboard/company/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: "profile",
      label: "Profil entreprise",
      description: "Identité juridique, coordonnées et logo de l'exploitation",
      href: "/dashboard/company/profile",
      icon: Building2,
    },
  ];

  // Le bouton "Plus" est actif si l'utilisateur consulte l'une des pages secondaires
  const isMoreActive = secondarySections.some(
    (sec) =>
      pathname === sec.href ||
      (sec.href !== "/dashboard/company" && pathname.startsWith(`${sec.href}/`))
  );

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
      <nav
        aria-label="Navigation mobile espace société"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={tab.isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-colors relative min-w-[56px] focus-visible:outline-none ${
                  tab.isActive
                    ? "text-forest-700 font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      tab.isActive
                        ? "stroke-[2.4] scale-110 text-forest-700"
                        : "stroke-[1.8] text-gray-500"
                    }`}
                  />
                  {/* Badge commandes en attente sur l'onglet */}
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  )}
                  {tab.isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-forest-600 rounded-full" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* Bouton "Plus" déclencheur du tiroir mobile */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            aria-label="Plus d'options de navigation"
            aria-expanded={isMoreSheetOpen}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-colors relative min-w-[56px] focus-visible:outline-none ${
              isMoreActive
                ? "text-forest-700 font-bold"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <div className="relative">
              <MoreHorizontal
                className={`w-5 h-5 transition-transform duration-150 ${
                  isMoreActive
                    ? "stroke-[2.4] scale-110 text-forest-700"
                    : "stroke-[1.8] text-gray-500"
                }`}
              />
              {/* Badge si notifications non lues */}
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-forest-700 text-white text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </span>
              )}
              {isMoreActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-forest-600 rounded-full" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
              Plus
            </span>
          </button>
        </div>
      </nav>

      {/* Tiroir "Plus" (Bottom Sheet) pour écrans mobiles */}
      <Drawer
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        side="bottom"
        size="md"
        showCloseButton={false}
        className="p-0 rounded-t-3xl max-h-[85vh] overflow-hidden"
        bodyClassName="p-0 overflow-y-auto"
      >
        <div className="p-4 sm:p-5">
          {/* Poignée de drag visuelle et barre d'en-tête */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Sections Complémentaires
                </h3>
                <p className="text-[11px] text-gray-500">
                  {entityName || "Espace Entreprise Agricole"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMoreSheetOpen(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Liste des sections complémentaires */}
          <div className="py-3 space-y-1.5">
            {secondarySections.map((sec) => {
              const Icon = sec.icon;
              const isActive =
                pathname === sec.href ||
                (sec.href !== "/dashboard/company" && pathname.startsWith(`${sec.href}/`));

              return (
                <Link
                  key={sec.id}
                  href={sec.href}
                  onClick={() => setIsMoreSheetOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                    isActive
                      ? "bg-forest-50 border border-forest-200 text-forest-900"
                      : "hover:bg-gray-50 border border-transparent text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-forest-600 text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {sec.label}
                        </span>
                        {typeof sec.badge === "number" && sec.badge > 0 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-forest-700 text-white">
                            {sec.badge > 99 ? "99+" : sec.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {sec.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>

          {/* Séparateur & Action de Déconnexion */}
          <div className="pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsMoreSheetOpen(false);
                setIsLogoutDialogOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-bold block">
                    Se déconnecter
                  </span>
                  <span className="text-[11px] text-rose-500">
                    Fermer la session sur cet appareil
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
            </button>
          </div>
        </div>
      </Drawer>

      {/* Dialogue de confirmation de déconnexion */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
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
