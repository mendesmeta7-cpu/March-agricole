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
  onCloseMobile?: () => void;
}

export default function AppSidebar({
  role,
  entityName,
  userName,
  userEmail,
  logoUrl,
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
      badge: "Phase 9",
      badgeVariant: "neutral",
    },
    {
      label: "Commandes Reçues",
      href: "/dashboard/company/orders",
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: "Phase 10",
      badgeVariant: "neutral",
    },
    {
      label: "Profil Entreprise",
      href: "/dashboard/company/profile",
      icon: <Building2 className="w-5 h-5" />,
    },
  ];

  const resellerNavItems: NavItem[] = [
    {
      label: "Accueil & Territoire",
      href: "/dashboard/reseller",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: "Flux des Productions",
      href: "/dashboard/reseller/feed",
      icon: <Compass className="w-5 h-5" />,
      badge: "Phase 7",
      badgeVariant: "neutral",
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
      badge: "Phase 10",
      badgeVariant: "neutral",
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
      label: "Demandes Marché",
      href: "/dashboard/admin/demands",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: "Campagnes",
      href: "/dashboard/admin/campaigns",
      icon: <Megaphone className="w-5 h-5" />,
    },
    {
      label: "Commandes & Stocks",
      href: "/dashboard/admin/orders",
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
  ];

  const items =
    role === "company"
      ? companyNavItems
      : role === "reseller"
      ? resellerNavItems
      : adminNavItems;

  const roleLabels = {
    company: "Espace Entreprise",
    reseller: "Espace Revendeur",
    admin: "Supervision Admin",
  };

  const roleThemes = {
    company: "text-forest-700 bg-forest-50 border-forest-200",
    reseller: "text-earth-700 bg-earth-50 border-earth-200",
    admin: "text-slate-800 bg-slate-100 border-slate-300",
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-200 h-full flex flex-col justify-between select-none">
      {/* En-tête Marque & Espace */}
      <div>
        <div className="p-6 border-b border-gray-100">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="inline-flex items-center gap-2.5 mb-3"
          >
            <div className="w-9 h-9 rounded-xl bg-forest-700 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-forest-950 tracking-tight">
              Marché Agricole
            </span>
          </Link>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${roleThemes[role]}`}
          >
            {role === "company" && (
              logoUrl ? (
                <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-white border border-forest-300">
                  <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <Building2 className="w-4 h-4" />
              )
            )}
            {role === "reseller" && <Store className="w-4 h-4" />}
            {role === "admin" && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            <span>{roleLabels[role]}</span>
          </div>
        </div>

        {/* Liens de Navigation */}
        <nav className="p-4 space-y-1.5 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? role === "company"
                      ? "bg-forest-700 text-white shadow-sm"
                      : role === "reseller"
                      ? "bg-earth-700 text-white shadow-sm"
                      : "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100/80 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-white" : "text-gray-500"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Cartouche Profil en pied de sidebar */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-gray-200/70 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200/60 flex items-center justify-center text-gray-600 flex-shrink-0 overflow-hidden relative">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={entityName || "Logo"}
                className="w-full h-full object-cover"
              />
            ) : role === "company" ? (
              <Building2 className="w-5 h-5 text-forest-700" />
            ) : role === "reseller" ? (
              <Store className="w-5 h-5 text-earth-700" />
            ) : (
              <User className="w-5 h-5 text-gray-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-gray-900 truncate">
              {entityName || userName || "Utilisateur"}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {userEmail || role}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
