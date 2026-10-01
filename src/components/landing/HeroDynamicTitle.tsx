"use client";

import { useState, useEffect, useRef } from "react";

interface WelcomeGreeting {
  word: string;
  lang: string;
  langName: string;
}

/**
 * Liste ordonnée des formules de bienvenue :
 * 1. Français : Bienvenue
 * 2. Anglais : Welcome
 * 3. Lingala : Boyei malamu (formule usuelle et chaleureuse en RDC)
 * 4. Swahili : Karibu (salutation d'accueil officielle en RDC et Afrique de l'Est)
 * 5. Kikongo : Luiza mu yenge (littéralement « venez dans la paix / bienvenue », expression authentique)
 * 6. Tshiluba : Difika dilenga (littéralement « bonne arrivée / bienvenue », formule d'accueil certifiée)
 * -> Retour à Bienvenue
 */
const GREETINGS: WelcomeGreeting[] = [
  { word: "Bienvenue", lang: "fr", langName: "Français" },
  { word: "Welcome", lang: "en", langName: "Anglais" },
  { word: "Boyei malamu", lang: "ln", langName: "Lingala" },
  { word: "Karibu", lang: "sw", langName: "Swahili" },
  { word: "Luiza mu yenge", lang: "kg", langName: "Kikongo" },
  { word: "Difika dilenga", lang: "lua", langName: "Tshiluba" },
];

/**
 * HeroDynamicTitle
 *
 * Composant client ultra-léger dédié à l'alternance multilingue du titre du Hero.
 * - Conçu selon l'esprit KokonutUI (fade vertical lent, calme et premium).
 * - Aucune dépendance externe (0 kB supplémentaire, pur React + CSS Tailwind).
 * - Préserve strictement la typographie, la taille et la hiérarchie du Hero.
 * - Hauteur réservée stable pour garantir un Cumulative Layout Shift (CLS) de 0.
 * - Respect total de prefers-reduced-motion (affiche fixement "Bienvenue").
 * - SSR déterministe avec "Bienvenue" en première passe (zéro layout shift à l'hydratation).
 */
export default function HeroDynamicTitle() {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Détection du respect de l'accessibilité prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Cycle d'alternance automatique lent, régulier et discret (4200ms par mot)
  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      // 1. Disparition légère et douce vers le haut (fade-out)
      setIsTransitioning(true);

      // 2. Bascule du mot au creux de la transition (380ms)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % GREETINGS.length);
        setIsTransitioning(false);
      }, 380);
    }, 4200);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  const current = GREETINGS[index];

  return (
    <h1
      className="text-[2rem] xs:text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-forest-950 mb-4 sm:mb-6 leading-[1.08] min-h-[46px] xs:min-h-[58px] sm:min-h-[76px] lg:min-h-[92px] flex items-center justify-center overflow-visible select-none"
      aria-label="Bienvenue — Welcome — Boyei malamu — Karibu — Luiza mu yenge — Difika dilenga"
    >
      <span
        key={reducedMotion ? "static" : current.word}
        lang={current.lang}
        className={`inline-block transition-all duration-400 ease-out transform ${
          isTransitioning
            ? "opacity-0 -translate-y-2 scale-[0.98] blur-[0.5px]"
            : "opacity-100 translate-y-0 scale-100 blur-0"
        }`}
      >
        {current.word}
      </span>
    </h1>
  );
}
