/**
 * Lien d'évitement « Aller au contenu principal » (Lot UX/UI 6B, fiche A11-07).
 *
 * Premier arrêt de tabulation de la page, invisible tant qu'il n'a pas le focus clavier.
 * Il mène au repère `<main id={MAIN_CONTENT_ID} tabIndex={-1}>` de la page : le `tabIndex`
 * permet au navigateur d'y placer réellement le focus, la tabulation suivante reprend
 * donc dans le contenu et non dans l'en-tête ou le menu.
 */
export const MAIN_CONTENT_ID = "contenu-principal";

export default function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:inline-flex focus:items-center focus:min-h-11 focus:px-4 focus:rounded-xl focus:bg-white focus:text-forest-900 focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
    >
      Aller au contenu principal
    </a>
  );
}
