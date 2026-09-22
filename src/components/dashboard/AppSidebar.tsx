"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sprout,
  LayoutDashboard,
  Package,
  Tractor,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  Building2,
  Store,
  ShieldCheck,
  User,
  Users,
  Compass,
  FileSpreadsheet,
  Bell,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "forest" | "earth" | "neutral" | "warning";
}

interface AppSidebarProps {
  role: "company" | "reseller" | "admin";
  entityName?: string;
  userName?: string;
  userEmail?: string;
  logoUrl?: string | null;
  unreadNotificationsCount?: number;
  onCloseMobile?: () => void;
}

export default function AppSidebar({
  role,
  entityName,
  userName,
  userEmail,
  logoUrl,
  unreadNotificationsCount,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();

  // Navigation configurée par rôle
  const companyNavItems: NavItem[] = [
    {
      label: "Tableau de bord",
      href: "/dashboard/company",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: "Catalogue Produits",
      href: "/dashboard/company/products",
      icon: <Package className="w-5 h-5" />,
    },
    {
      label: "Productions & Récoltes",
      href: "/dashboard/company/productions",
      icon: <Tractor className="w-5 h-5" />,
    },
    {
      label: "Demandes du Marché",
      href: "/dashboard/company/demands",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: "Campagnes de Vente",
      href: "/dashboard/company/campaigns",
      icon: <Megaphone className="w-5 h-5" />,
    },
    {
      label: "Commandes Reçues",
      href: "/dashboard/company/orders",
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      label: "Notifications",
      href: "/dashboard/company/notifications",
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotificationsCount && unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
      badgeVariant: "warning",
    },
    {
      label: "Profil Entreprise",
      href: "/dashboard/company/profile",
      icon: <Building2 className="w-5 h-5" />,
    },
  ];

  const resellerNavItems: NavItem[] = [
    {
      label: "Flux des Productions",
      href: "/dashboard/reseller",
      icon: <Compass className="w-5 h-5" />,
    },
    {
      label: "Offres Commerciales",
      href: "/dashboard/reseller/campaigns",
      icon: <Megaphone className="w-5 h-5" />,
    },
    {
      label: "Mes Demandes d'Achat",
      href: "/dashboard/reseller/demands",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: "Mes Commandes",
      href: "/dashboard/reseller/orders",
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      label: "Notifications",
      href: "/dashboard/reseller/notifications",
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotificationsCount && unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
      badgeVariant: "warning",
    },
    {
      label: "Mon Profil Revendeur",
      href: "/dashboard/reseller/profile",
      icon: <Store className="w-5 h-5" />,
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      label: "Vue Générale",
      href: "/dashboard/admin",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: "Entreprises Agricoles",
      href: "/dashboard/admin/companies",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      label: "Revendeurs",
      href: "/dashboard/admin/resellers",
      icon: <Store className="w-5 h-5" />,
    },
    {
      label: "Catalogue Produits",
      href: "/dashboard/admin/products",
      icon: <Package className="w-5 h-5" />,
    },
    {
      label: "Productions",
      href: "/dashboard/admin/productions",
      icon: <Tractor className="w-5 h-5" />,
    },
    {
      label: "Campagnes",
      href: "/dashboard/admin/campaigns",
      icon: <Megaphone className="w-5 h-5" />,
    },
    {
      label: "Commandes",
      href: "/dashboard/admin/orders",
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      label: "Demandes Marché",
      href: "/dashboard/admin/demands",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: "Audits & Traces",
      href: "/dashboard/admin/audits",
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
  ];

  const navItems =
    role === "company"
      ? companyNavItems
      : role === "reseller"
      ? resellerNavItems
      : adminNavItems;

  const roleLabels = {
    company: "Exploitation Agricole",
    reseller: "Revendeur / Distributeur",
    admin: "Supervision Admin",
  };

  const roleColors = {
    company: "bg-forest-100 text-forest-800 border-forest-200",
    reseller: "bg-earth-100 text-earth-800 border-earth-200",
    admin: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-full select-none shadow-xs">
      {/* En-tête de marque */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <Link
          href={`/dashboard/${role}`}
          className="flex items-center gap-3 group"
          onClick={onCloseMobile}
        >
          <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-white shadow-xs group-hover:bg-forest-700 transition-colors">
            <Sprout className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-bold text-base text-gray-900 tracking-tight block">
              Marché Agricole
            </span>
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest block">
              Plateforme B2B V1
            </span>
          </div>
        </Link>
      </div>

      {/* Cartouche d'identité contextuelle */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={entityName || userName || "Logo"}
                className="w-full h-full object-cover"
              />
            ) : role === "company" ? (
              <Building2 className="w-5 h-5 text-forest-700" />
            ) : role === "reseller" ? (
              <Store className="w-5 h-5 text-earth-700" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-purple-700" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-gray-900 truncate">
              {entityName || userName || "Mon Espace"}
            </h2>
            <span
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mt-0.5 ${roleColors[role]}`}
            >
              {roleLabels[role]}
            </span>
          </div>
        </div>
      </div>

      {/* Liste des liens de navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/dashboard/${role}` && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                isActive
                  ? role === "company"
                    ? "bg-forest-50 text-forest-800 font-semibold shadow-2xs"
                    : role === "reseller"
                    ? "bg-earth-50 text-earth-800 font-semibold shadow-2xs"
                    : "bg-purple-50 text-purple-800 font-semibold shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    isActive
                      ? role === "company"
                        ? "text-forest-700"
                        : role === "reseller"
                        ? "text-earth-700"
                        : "text-purple-700"
                      : "text-gray-400 group-hover:text-gray-600"
                  }
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pied de sidebar : utilisateur connecté */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {userName || userEmail || "Utilisateur"}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
