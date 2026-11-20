/**
 * Rubriques des espaces Société et Revendeur : libellés et icônes identiques aux barres basses du Web
 * (src/components/company/CompanyBottomNav.tsx, src/components/reseller/ResellerBottomNav.tsx ; ADR-055, ADR-056).
 * Les pastilles (commandes en attente, notifications non lues) viendront des services réels : aucune valeur ici.
 */
import {
  Bell,
  Building2,
  Compass,
  LayoutDashboard,
  Megaphone,
  Package,
  ShoppingBag,
  Tractor,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react-native";

export interface SectionLink {
  /** Chemin Expo Router de l'écran. */
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Rubriques Société logées dans « Plus » (tiroir du Web). */
export const companyMoreSections: SectionLink[] = [
  { href: "/company/products", label: "Catalogue produits", Icon: Package },
  { href: "/company/demands", label: "Demandes du marché", Icon: TrendingUp },
  { href: "/company/notifications", label: "Notifications", Icon: Bell },
  { href: "/company/profile", label: "Profil de la société", Icon: Building2 },
];

/** Rubriques Revendeur logées dans « Plus ». */
export const resellerMoreSections: SectionLink[] = [
  { href: "/reseller/notifications", label: "Notifications", Icon: Bell },
  { href: "/reseller/profile", label: "Mon profil", Icon: User },
];

/** Icônes des onglets, par nom de route. */
export const companyTabIcons = {
  index: LayoutDashboard,
  productions: Tractor,
  campaigns: Megaphone,
  orders: ShoppingBag,
} as const;

export const resellerTabIcons = {
  index: Compass,
  campaigns: Megaphone,
  demands: TrendingUp,
  orders: ShoppingBag,
} as const;
