"use client";

import { useEffect } from "react";
import { pageScrollLock } from "./scrollLock";

/**
 * Verrouille le défilement de la page tant que `active` est vrai (Lot UX/UI 5B).
 * Compteur partagé : les surfaces imbriquées ne libèrent la page qu'à la fermeture de la dernière.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    pageScrollLock.lock();
    return () => pageScrollLock.unlock();
  }, [active]);
}

export default useScrollLock;
