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
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";

interface ResellerBottomNavProps {
  unreadNotificationsCount?: number;
}

interface NavDestination {
  id: string;
  label: string;
  href: string;
  icon: typeof Compass;
}

interface SecondaryDestination extends NavDestination {
  description: string;
  badge?: number;
}

function formatBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function isDestinationActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/reseller") {
    return (
      pathname === "/dashboard/reseller" ||
      pathname.startsWith("/dashboard/reseller/productions") ||
      pathname.startsWith("/dashboard/reseller/companies")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tabClassName(isActive: boolean): string {
  return `group flex-1 min-w-0 flex flex-col items-center justify-between py-1 px-0.5 relative transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-xl active:scale-95 motion-reduce:transform-none ${
    isActive
      ? "text-forest-800 font-bold"
      : "text-gray-500 hover:text-gray-900 font-medium"
  }`;
}

function TabContent({
  icon: Icon,
  label,
  isActive,
  badge = 0,
}: {
  icon: typeof Compass;
  label: string;
  isActive: boolean;
  badge?: number;
}) {
  return (
    <>
      {/* Conteneur d'icône avec fond actif doux en pilule */}
      <div
        className={`relative px-2.5 py-1 rounded-full transition-all duration-200 ${
          isActive
            ? "bg-forest-100/90 text-forest-800 shadow-2xs"
            : "text-gray-500 group-hover:text-gray-800"
        }`}
      >
        <Icon
          className={`w-5 h-5 transition-transform ${
            isActive ? "stroke-[2.4]" : "stroke-[1.8]"
          }`}
        />

        {/* Badge pour notifications non lues (données réelles) */}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {formatBadge(badge)}
          </span>
        )}
      </div>

      <span
        className={`text-[11px] tracking-tight mt-0.5 text-center leading-[1.15] max-w-full transition-colors line-clamp-2 ${
          isActive
            ? "text-forest-900 font-bold"
            : "text-gray-600 group-hover:text-gray-900"
        }`}
      >
        {label}
      </span>

      {/* Indicateur de position actif */}
      <span
        className={`w-4 h-0.5 rounded-full mt-0.5 ${
          isActive ? "bg-forest-600" : "bg-transparent"
        }`}
      />
    </>
  );
}

export default function ResellerBottomNav({
  unreadNotificationsCount = 0,
}: ResellerBottomNavProps) {
  const pathname = usePathname();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Quatre rubriques principales : toute la barre reste visible dès 320 px.
  const primaryItems: NavDestination[] = [
    {
      id: "feed",
      label: "Tableau de bord",
      href: "/dashboard/reseller",
      icon: Compass,
    },
    {
      id: "campaigns",
      label: "Campagnes",
      href: "/dashboard/reseller/campaigns",
      icon: Megaphone,
    },
    {
      id: "demands",
      label: "Demandes",
      href: "/dashboard/reseller/demands",
      icon: TrendingUp,
    },
    {
      id: "orders",
      label: "Commandes",
      href: "/dashboard/reseller/orders",
      icon: ShoppingBag,
    },
  ];

  // Rubriques logées dans le tiroir « Plus »
  const secondaryItems: SecondaryDestination[] = [
    {
      id: "notifications",
      label: "Notifications",
      description: "Alertes commandes et demandes",
      href: "/dashboard/reseller/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: "profile",
      label: "Mon profil",
      description: "Coordonnées et mot de passe",
      href: "/dashboard/reseller/profile",
      icon: User,
    },
  ];

  const isMoreActive = secondaryItems.some((item) =>
    isDestinationActive(pathname, item.href)
  );

  const moreLabel =
    unreadNotificationsCount > 0
      ? `Plus d'options de navigation, ${unreadNotificationsCount} notification${
          unreadNotificationsCount > 1 ? "s" : ""
        } non lue${unreadNotificationsCount > 1 ? "s" : ""}`
      : "Plus d'options de navigation";

  return (
    <>
      <nav
        aria-label="Navigation principale revendeur"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-xl mx-auto px-1 sm:px-2 flex items-stretch justify-around py-1">
          {primaryItems.map((item) => {
            const isActive = isDestinationActive(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={tabClassName(isActive)}
              >
                <TabContent icon={item.icon} label={item.label} isActive={isActive} />
              </Link>
            );
          })}

          {/* Bouton « Plus » : le badge de notifications reste visible depuis la barre */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            aria-label={moreLabel}
            aria-haspopup="dialog"
            aria-expanded={isMoreSheetOpen}
            className={tabClassName(isMoreActive)}
          >
            <TabContent
              icon={MoreHorizontal}
              label="Plus"
              isActive={isMoreActive}
              badge={unreadNotificationsCount}
            />
          </button>
        </div>
      </nav>

      {/* Tiroir « Plus » */}
      <Drawer
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        side="bottom"
        size="md"
        title="Plus"
        className="rounded-t-3xl max-h-[85vh] overflow-hidden"
        bodyClassName="p-3 overflow-y-auto"
      >
        <div className="space-y-1.5">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = isDestinationActive(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
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
                      <span className="text-sm font-bold truncate">{item.label}</span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                          {formatBadge(item.badge)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
