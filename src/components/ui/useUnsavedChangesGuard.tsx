"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./Dialog";
import { estSortieProtegee } from "./unsavedChanges";

/**
 * Protection des saisies non enregistrées sur une page dédiée (Lot UX/UI 5B, ADR-058).
 *
 * Active seulement si le formulaire a été modifié (`isDirty`) :
 *  - lien interne de l'application (menus, fil d'Ariane, retour) : confirmation avant de quitter ;
 *  - rechargement, fermeture de l'onglet ou lien externe : alerte native du navigateur ;
 *  - boutons « Annuler » ou « Retour » de la page : `naviguer(href)`.
 * Les ancres internes à la page (sections) ne sont pas interceptées. Après un enregistrement réussi,
 * `desarmer()` laisse partir sans confirmation. Limite : le bouton « Précédent » du navigateur n'est
 * pas intercepté (le routeur de Next.js ne fournit pas d'événement de sortie de page fiable).
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const armedRef = useRef(true);
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty && armedRef.current;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest ? (target.closest("a[href]") as HTMLAnchorElement | null) : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = estSortieProtegee(anchor.href, window.location.href);
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const desarmer = useCallback(() => {
    armedRef.current = false;
    dirtyRef.current = false;
  }, []);

  const naviguer = useCallback(
    (href: string) => {
      if (dirtyRef.current) setPendingHref(href);
      else router.push(href);
    },
    [router]
  );

  const dialog = (
    <ConfirmDialog
      isOpen={pendingHref !== null}
      onClose={() => setPendingHref(null)}
      onConfirm={() => {
        const href = pendingHref;
        desarmer();
        setPendingHref(null);
        if (href) router.push(href);
      }}
      title="Quitter sans enregistrer ?"
      description="Les modifications de ce formulaire n'ont pas été enregistrées. Si vous quittez cette page, elles seront perdues."
      confirmText="Quitter sans enregistrer"
      cancelText="Continuer la saisie"
      variant="warning"
    />
  );

  return { naviguer, desarmer, dialog };
}

export default useUnsavedChangesGuard;
