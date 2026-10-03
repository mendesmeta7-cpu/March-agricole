"use client";

import { useRef, useEffect } from "react";
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

interface NavDestination {
  id: string;
  label: string;
  href: string;
  icon: typeof Compass;
  badge?: number;
}

export default function ResellerBottomNav({
  unreadNotificationsCount = 0,
}: ResellerBottomNavProps) {
  const pathname = usePathname();
  const navContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  // EXACTEMENT ces six entrées obligatoires — aucun raccourcissement, aucun texte générique
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

  // Centrage automatique doux de la destination active sur petits écrans (ex: 320px, 360px)
  useEffect(() => {
    if (activeItemRef.current && navContainerRef.current) {
      const container = navContainerRef.current;
      const element = activeItemRef.current;

      // Calcul pour centrer l'élément sans à-coup
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = elementLeft - containerWidth / 2 + elementWidth / 2;

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, [pathname]);

  return (
    <nav
      aria-label="Navigation principale revendeur"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div
        ref={navContainerRef}
        className="max-w-xl mx-auto px-1 sm:px-2 flex items-stretch justify-start sm:justify-around overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1"
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
              ref={isActive ? activeItemRef : undefined}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex-1 min-w-[68px] xs:min-w-[74px] sm:min-w-0 snap-center flex flex-col items-center justify-between py-1 px-1 relative transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-xl active:scale-95 motion-reduce:transform-none ${
                isActive
                  ? "text-forest-800 font-bold"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              {/* Conteneur d'icône avec fond actif doux en pilule */}
              <div
                className={`relative px-2.5 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-forest-100/90 text-forest-800 shadow-2xs"
                    : "text-gray-500 group-hover:text-gray-800"
                }`}
              >
                <Icon
                  className={`w-4 h-4 xs:w-5 xs:h-5 transition-transform ${
                    isActive ? "stroke-[2.4]" : "stroke-[1.8]"
                  }`}
                />

                {/* Badge pour notifications non lues (données réelles) */}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-in zoom-in-75">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Libellé intégral obligatoire — Ne jamais raccourcir */}
              <span
                className={`text-[9px] xs:text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 text-center leading-[1.15] max-w-full transition-colors line-clamp-2 px-0.5 ${
                  isActive
                    ? "text-forest-900 font-bold"
                    : "text-gray-600 group-hover:text-gray-900"
                }`}
                title={item.label}
              >
                {item.label}
              </span>

              {/* Indicateur de position actif */}
              {isActive ? (
                <span className="w-4 h-0.5 bg-forest-600 rounded-full mt-0.5" />
              ) : (
                <span className="w-4 h-0.5 bg-transparent rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
