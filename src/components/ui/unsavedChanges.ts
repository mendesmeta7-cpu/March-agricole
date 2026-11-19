/**
 * Règle de la protection des saisies (Lot UX/UI 5B) : un clic sur un lien quitte-t-il la page ?
 * Retourne le chemin interne à confirmer, ou null si la navigation n'est pas à intercepter :
 * lien externe (laissé à l'alerte native du navigateur), ancre interne à la page, même adresse.
 * Module pur, sans dépendance (testable par node:test).
 */
export function estSortieProtegee(lien: string, pageActuelle: string): string | null {
  let cible: URL, actuelle: URL;
  try {
    actuelle = new URL(pageActuelle);
    cible = new URL(lien, actuelle);
  } catch {
    return null;
  }
  if (cible.origin !== actuelle.origin) return null;
  if (!/^https?:$/.test(cible.protocol)) return null;
  const memePage = cible.pathname === actuelle.pathname && cible.search === actuelle.search;
  if (memePage) return null;
  return cible.pathname + cible.search + cible.hash;
}
