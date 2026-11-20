import { Easing } from "react-native";

/** Espacements (base 4). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Rayons : rounded-lg, rounded-xl et rounded-2xl du Web. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

/** Tailles de texte. 12 au minimum, comme le Web après le Lot 3B (ADR-059). */
export const fontSize = {
  caption: 12,
  small: 14,
  body: 16,
  lead: 18,
  title: 22,
  display: 26,
} as const;

/** Cible tactile minimale : 44 px sur le Web (ADR-063, D9), 48 dp recommandés sur Android. */
export const touchTarget = 48;

/** Animations (ADR-057) : courbe d'entrée du Web et durées des fenêtres et tiroirs. */
export const motion = {
  enter: 200,
  dialog: 320,
  drawer: 360,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
} as const;
