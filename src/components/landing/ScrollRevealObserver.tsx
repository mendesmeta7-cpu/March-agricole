"use client";

import { useEffect, useRef } from "react";

/**
 * ScrollRevealObserver
 *
 * Composant client léger qui installe un IntersectionObserver global
 * pour activer les animations .reveal / .reveal-left / .reveal-right
 * sur l'ensemble de la page.
 *
 * Respecte automatiquement prefers-reduced-motion via CSS.
 */
export default function ScrollRevealObserver() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Détection de prefers-reduced-motion côté JS (fallback si CSS non respecté)
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Sélecteur : tous les éléments ciblés par les animations scroll-reveal
    const targets = document.querySelectorAll<HTMLElement>(
      ".reveal, .reveal-left, .reveal-right"
    );

    if (prefersReduced) {
      // Si l'utilisateur préfère réduire les animations, rendre directement visible
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            // Arrêter d'observer une fois l'élément visible (animation one-shot)
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,    // Déclencher quand 12% de l'élément est visible
        rootMargin: "0px 0px -40px 0px", // Légèrement avant le bord de l'écran
      }
    );

    targets.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return null; // Ce composant ne rend rien visuellement
}
