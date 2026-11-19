/**
 * Verrouillage du défilement de la page arrière (Lot UX/UI 5B, ADR-058).
 *
 * Compteur partagé par toutes les surfaces modales (Dialog, Drawer, menu mobile) : la page reste
 * verrouillée tant qu'au moins une surface est ouverte. La fermeture d'une fenêtre imbriquée (un
 * Dialog ouvert au-dessus d'un Drawer) ne libère donc plus la page prématurément. Les styles
 * d'origine sont restaurés à la fermeture de la dernière surface ; la largeur de la barre de
 * défilement est compensée pour éviter un saut de mise en page sur ordinateur.
 *
 * Module sans dépendance : la logique de compteur est testable avec un environnement simulé.
 */

export interface ScrollLockEnv {
  body: { style: { overflow: string; paddingRight: string } };
  /** Largeur de la barre de défilement verticale de la page (0 si aucune) */
  scrollbarWidth: () => number;
}

export interface ScrollLocker {
  lock: () => void;
  unlock: () => void;
  /** Nombre de surfaces ouvertes (pour les tests) */
  count: () => number;
}

export function createScrollLocker(getEnv: () => ScrollLockEnv | null): ScrollLocker {
  let count = 0;
  let saved: { overflow: string; paddingRight: string } | null = null;
  return {
    lock() {
      const env = getEnv();
      if (!env) return;
      if (count === 0) {
        const s = env.body.style;
        saved = { overflow: s.overflow, paddingRight: s.paddingRight };
        const width = env.scrollbarWidth();
        s.overflow = "hidden";
        if (width > 0) s.paddingRight = `${width}px`;
      }
      count++;
    },
    unlock() {
      const env = getEnv();
      if (!env || count === 0) return;
      count--;
      if (count === 0 && saved) {
        env.body.style.overflow = saved.overflow;
        env.body.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    },
    count: () => count,
  };
}

/** Verrou unique de l'application, lié au document du navigateur. */
export const pageScrollLock = createScrollLocker(() =>
  typeof document === "undefined"
    ? null
    : {
        body: document.body,
        scrollbarWidth: () => Math.max(0, window.innerWidth - document.documentElement.clientWidth),
      }
);
