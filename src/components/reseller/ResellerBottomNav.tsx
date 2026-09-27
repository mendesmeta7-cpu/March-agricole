"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Megaphone,
  TrendingUp,
  ShoppingBag,
  Bell,
  User,
} from "lucide-react";

interface ResellerBottomNavProps {
  unreadNotificationsCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  href: string;
  icon: typeof Compass;
  badge?: number;
}

export default function ResellerBottomNav({
  unreadNotificationsCount = 0,
}: ResellerBottomNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: "feed",
      label: "Flux des Productions",
      shortLabel: "Flux",
      href: "/dashboard/reseller",
      icon: Compass,
    },
    {
      id: "campaigns",
      label: "Offres Commerciales",
      shortLabel: "Offres",
      href: "/dashboard/reseller/campaigns",
      icon: Megaphone,
    },
    {
      id: "demands",
      label: "Mes Demandes d'Achat",
      shortLabel: "Demandes",
      href: "/dashboard/reseller/demands",
      icon: TrendingUp,
    },
    {
      id: "orders",
      label: "Mes Commandes",
      shortLabel: "Commandes",
      href: "/dashboard/reseller/orders",
      icon: ShoppingBag,
    },
    {
      id: "notifications",
      label: "Notifications",
      shortLabel: "Notifs",
      href: "/dashboard/reseller/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: "profile",
      label: "Mon Profil",
      shortLabel: "Profil",
      href: "/dashboard/reseller/profile",
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Navigation principale revendeur"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md sm:max-w-lg mx-auto px-1 sm:px-2 flex items-center justify-around h-16">
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
              className={`group flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 relative transition-all duration-150 select-none min-w-0 ${
                isActive
                  ? "text-forest-700 font-bold"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              {/* Conteneur d'icône avec fond actif doux */}
              <div
                className={`relative px-2.5 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-forest-100/90 text-forest-800 scale-105"
                    : "text-gray-500 group-hover:text-gray-800 group-active:scale-95"
                }`}
              >
                <Icon
                  className={`w-4 h-4 xs:w-5 xs:h-5 transition-transform ${
                    isActive ? "stroke-[2.4]" : "stroke-[1.8]"
                  }`}
                />

                {/* Badge pour notifications non lues */}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-in zoom-in-75">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Libellé adaptatif : libellé court sur très petits écrans, complet dès sm */}
              <span
                className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 text-center truncate max-w-full leading-tight transition-colors ${
                  isActive ? "text-forest-800 font-bold" : "text-gray-600"
                }`}
                title={item.label}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </span>

              {/* Indicateur sous forme de trait discret sous l'onglet actif */}
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-forest-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
