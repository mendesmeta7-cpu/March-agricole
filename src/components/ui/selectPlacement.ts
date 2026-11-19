/**
 * Placement du menu de `Select` (Lot UX/UI 5B, fiche MOB-08) : dans un tiroir ou une fenêtre, un menu
 * ouvert vers le bas passait sous le pied de page fixe ou hors de la zone visible. Le menu s'ouvre
 * vers le haut quand la place manque en dessous et qu'il y en a davantage au-dessus.
 *
 * Module pur, sans dépendance, testé dans `tests/unit/selectPlacement.test.ts`.
 */

export type SelectPlacement = "bas" | "haut";

export interface Zone {
  top: number;
  bottom: number;
}

/** Marge entre le menu et le bord de la zone visible. */
export const MARGE_MENU = 8;
/** Hauteur minimale de liste conservée quand le menu doit être réduit. */
export const HAUTEUR_LISTE_MINIMALE = 140;

/**
 * Choisit le sens d'ouverture : vers le bas si le menu y tient, sinon du côté qui offre le plus de
 * place (à égalité, vers le bas, comportement d'origine).
 */
export function choisirPlacement(espaceDessous: number, espaceDessus: number, hauteurMenu: number): SelectPlacement {
  if (espaceDessous >= hauteurMenu + MARGE_MENU) return "bas";
  return espaceDessus > espaceDessous ? "haut" : "bas";
}

/**
 * Hauteur maximale de la liste pour que le menu tienne dans l'espace choisi ; null si le menu tient
 * déjà. `horsListe` est la hauteur du menu sans la liste (barre de recherche, marges internes).
 */
export function hauteurListeMaximale(
  espaceDisponible: number,
  hauteurMenu: number,
  horsListe: number
): number | null {
  if (hauteurMenu + MARGE_MENU <= espaceDisponible) return null;
  return Math.max(HAUTEUR_LISTE_MINIMALE, Math.floor(espaceDisponible - horsListe - MARGE_MENU));
}

/**
 * Zone réellement visible autour d'un élément : la fenêtre, réduite par chaque ancêtre qui coupe
 * son contenu (corps défilant d'un tiroir ou d'une fenêtre, dont le pied de page est hors du corps).
 */
export function zoneVisible(element: HTMLElement): Zone {
  let top = 0;
  let bottom = window.innerHeight;
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
      const rect = parent.getBoundingClientRect();
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
    parent = parent.parentElement;
  }
  return { top, bottom };
}
