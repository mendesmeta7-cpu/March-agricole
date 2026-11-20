import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

/**
 * Animations d'entrée (Lot UX/UI 3A, RET-08).
 *
 * Le code emploie la syntaxe `animate-in fade-in zoom-in-95 slide-in-from-*` d'une extension
 * jamais installée : ces classes n'avaient aucun effet. Ce greffon local (aucune dépendance npm)
 * leur donne un effet, sans toucher aux animations de globals.css ni aux composants Dialog,
 * Drawer et Toast (réservés au Lot 5B).
 *  - Une seule animation d'entrée : fondu, échelle et décalage facultatifs vers l'état normal.
 *  - Propriétés `translate` et `scale` individuelles : la transformation propre de l'élément
 *    (centrage par translate-x, etc.) est conservée pendant l'animation ; sans décalage ni
 *    échelle demandés, elles restent à `none`.
 *  - Durée : celle de la classe `duration-*` posée sur le même élément (intention des auteurs),
 *    150 ms par défaut. `prefers-reduced-motion` est déjà neutralisé dans globals.css.
 *  - `zoom-in` sans valeur part de 0,95 (légère montée), et non de 0.
 */
const enterAnimations = plugin(({ addUtilities, matchUtilities, theme }) => {
  addUtilities({
    "@keyframes radiza-enter": {
      from: {
        opacity: "var(--tw-enter-opacity, 1)",
        translate: "var(--tw-enter-translate, none)",
        scale: "var(--tw-enter-scale, none)",
      },
    },
    ".animate-in": {
      "--tw-enter-opacity": "initial",
      "--tw-enter-translate": "initial",
      "--tw-enter-scale": "initial",
      "--tw-anim-duration": "initial",
      animationName: "radiza-enter",
      animationDuration: "var(--tw-anim-duration, 150ms)",
      animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
  });

  matchUtilities(
    { "fade-in": (value: string) => ({ "--tw-enter-opacity": value }) },
    { values: { DEFAULT: "0", ...theme("opacity") } }
  );
  matchUtilities(
    { "zoom-in": (value: string) => ({ "--tw-enter-scale": value }) },
    { values: { DEFAULT: "0.95", ...theme("scale") } }
  );

  const translate: Record<string, string> = { DEFAULT: "100%", ...theme("translate") };
  matchUtilities(
    {
      "slide-in-from-top": (value: string) => ({ "--tw-enter-translate": `0 calc(${value} * -1)` }),
      "slide-in-from-bottom": (value: string) => ({ "--tw-enter-translate": `0 ${value}` }),
      "slide-in-from-left": (value: string) => ({ "--tw-enter-translate": `calc(${value} * -1) 0` }),
      "slide-in-from-right": (value: string) => ({ "--tw-enter-translate": `${value} 0` }),
    },
    { values: translate }
  );

  // Durée de l'animation d'entrée : lue sur la classe duration-* du même élément.
  // Seule une variable est ajoutée ; transition-duration reste celle de Tailwind.
  // Type « lookup » : valeurs du thème seulement, pour que les durées arbitraires
  // (duration-[180ms]) restent gérées par Tailwind seul, sans ambiguïté.
  const durations: Record<string, string> = { ...theme("transitionDuration") };
  delete durations.DEFAULT;
  matchUtilities(
    { duration: (value: string) => ({ "--tw-anim-duration": value }) },
    { values: durations, type: "lookup" }
  );
});

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Lot UX/UI 3A (SYS-01, LAN-04) : point de rupture xs à 480 px, déclaré avant ceux de
    // Tailwind (sm 640, md 768, lg 1024, xl 1280, 2xl 1536), qui restent inchangés.
    screens: {
      xs: "480px",
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        forest: {
          50: "#f2f8f4",
          100: "#e1efe6",
          200: "#c4decb",
          300: "#9ec5aa",
          400: "#74a784",
          500: "#4f8961",
          600: "#3b6d4b",
          700: "#2f563d",
          800: "#284532",
          900: "#22392b",
          950: "#0f1f16",
        },
        earth: {
          50: "#faf6f0",
          100: "#f3ebde",
          200: "#e6d5bd",
          300: "#d6bc95",
          400: "#c59f6d",
          500: "#b5874f",
          600: "#9e6f40",
          700: "#7e5435",
          800: "#674530",
          900: "#553a2b",
          950: "#2f1e16",
        },
      },
      // Lot UX/UI 3A (SYS-01) : valeurs déjà employées par le code (syntaxe Tailwind 4),
      // reprises à l'identique de Tailwind 4.
      boxShadow: {
        "2xs": "0 1px rgb(0 0 0 / 0.05)",
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      dropShadow: {
        xs: "0 1px 1px rgb(0 0 0 / 0.05)",
      },
      blur: {
        xs: "4px",
      },
      // Police système conservée (décision du 2026-11-15) : font-display désigne la même police
      // que le texte courant ; elle servira de point d'ancrage si une police de marque est choisie.
      fontFamily: {
        display: defaultTheme.fontFamily.sans,
      },
    },
  },
  plugins: [enterAnimations],
};
export default config;
