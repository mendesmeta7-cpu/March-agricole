"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Gestion du focus pour les surfaces modales (Dialog, Drawer) — A11Y-03.
 *
 * - Focus initial dans la surface à l'ouverture (un élément déjà focalisé à
 *   l'intérieur, par ex. un champ `autoFocus`, est conservé) ;
 * - Piège Tab / Maj+Tab : le focus cycle à l'intérieur de la surface ;
 * - Échap : ferme uniquement la surface la plus haute (modales imbriquées) ;
 * - Restauration du focus sur l'élément déclencheur à la fermeture.
 *
 * Aucune dépendance externe.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Pile des surfaces modales ouvertes : seule la dernière réagit au clavier.
const openStack: symbol[] = [];

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.tabIndex !== -1 &&
      // Exclut les éléments non rendus (display:none, parents masqués)
      (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
  );
}

interface UseFocusTrapOptions {
  isOpen: boolean;
  onEscape?: () => void;
  /** Échap autorisé (ex. : faux pendant un envoi en cours) */
  escapeEnabled?: boolean;
}

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  { isOpen, onEscape, escapeEnabled = true }: UseFocusTrapOptions
) {
  // Références stables pour ne pas réinitialiser le piège à chaque rendu parent
  const onEscapeRef = useRef(onEscape);
  const escapeEnabledRef = useRef(escapeEnabled);
  useEffect(() => {
    onEscapeRef.current = onEscape;
    escapeEnabledRef.current = escapeEnabled;
  }, [onEscape, escapeEnabled]);

  useEffect(() => {
    if (!isOpen) return;

    const token = Symbol("modal-surface");
    openStack.push(token);
    const isTopMost = () => openStack[openStack.length - 1] === token;

    const previouslyFocused =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    // Focus initial (après le rendu de la surface)
    const raf = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      if (container.contains(document.activeElement)) return;
      const preferred = container.querySelector<HTMLElement>("[data-autofocus]");
      const focusables = getFocusableElements(container);
      const target = preferred ?? focusables[0] ?? container;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTopMost()) return;
      const container = containerRef.current;
      if (!container) return;

      if (e.key === "Escape") {
        // Une liste déroulante ouverte se ferme d'abord : la surface reste ouverte.
        if (container.querySelector('[aria-haspopup="listbox"][aria-expanded="true"]')) return;
        if (escapeEnabledRef.current && onEscapeRef.current) {
          e.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        // Surface masquée (ex. menu mobile sur grand écran) : ne pas retenir le focus.
        if (container.getClientRects().length === 0) return;
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const isInside = active ? container.contains(active) : false;

      if (e.shiftKey) {
        if (!isInside || active === first || active === container) {
          e.preventDefault();
          last.focus();
        }
      } else if (!isInside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      const index = openStack.indexOf(token);
      if (index !== -1) openStack.splice(index, 1);

      // Restauration du focus vers le déclencheur s'il est toujours présent
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === "function" &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef]);
}

export default useFocusTrap;
