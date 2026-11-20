/**
 * Titre de la rubrique courante (Lot UX/UI 6B, fiche NAV-08).
 *
 * À partir de 1 024 px, le menu latéral affiche déjà le nom de la société ou de l'établissement :
 * l'en-tête affiche alors le nom de la rubrique ouverte. Les libellés sont ceux des menus,
 * validés au Lot 6A-1 ; toute page non listée relève du tableau de bord.
 */
type Space = "company" | "reseller";

const SECTIONS: Record<Space, [string, string][]> = {
  company: [
    ["/dashboard/company/products", "Catalogue produits"],
    ["/dashboard/company/productions", "Productions & récoltes"],
    ["/dashboard/company/demands", "Demandes du marché"],
    ["/dashboard/company/campaigns", "Campagnes"],
    ["/dashboard/company/orders", "Commandes reçues"],
    ["/dashboard/company/notifications", "Notifications"],
    ["/dashboard/company/profile", "Profil de la société"],
  ],
  reseller: [
    ["/dashboard/reseller/campaigns", "Campagnes"],
    ["/dashboard/reseller/demands", "Mes demandes"],
    ["/dashboard/reseller/orders", "Mes commandes"],
    ["/dashboard/reseller/notifications", "Notifications"],
    ["/dashboard/reseller/profile", "Mon profil"],
  ],
};

export function sectionTitle(space: Space, pathname: string | null): string {
  const path = pathname || "";
  const found = SECTIONS[space].find(([href]) => path === href || path.startsWith(`${href}/`));
  return found ? found[1] : "Tableau de bord";
}
