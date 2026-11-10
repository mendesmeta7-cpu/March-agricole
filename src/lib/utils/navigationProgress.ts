/** Décision pure : un clic sur un lien déclenche-t-il une navigation interne ? */

export interface LinkClick {
  href: string | null;
  target: string | null;
  hasDownload: boolean;
  button: number;
  hasModifierKey: boolean;
}

export function isInternalNavigation(click: LinkClick, currentHref: string): boolean {
  if (!click.href || click.button !== 0 || click.hasModifierKey || click.hasDownload) return false;
  if (click.target && click.target !== "_self") return false;

  let next: URL;
  let current: URL;
  try {
    current = new URL(currentHref);
    next = new URL(click.href, current);
  } catch {
    return false;
  }
  if (next.origin !== current.origin) return false;
  // Une ancre seule ne change pas de page.
  return next.pathname !== current.pathname || next.search !== current.search;
}
