/**
 * Couleurs de Radiza.
 * - forest et earth : charte du Web (tailwind.config.ts, inchangée).
 * - gray, rose, amber, emerald : palette Tailwind par défaut employée par le Web.
 * Les écrans utilisent les couleurs sémantiques de `colors`, jamais une valeur en dur.
 */
export const forest = {
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
} as const;

export const earth = {
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
} as const;

export const gray = {
  50: "#f9fafb",
  100: "#f3f4f6",
  200: "#e5e7eb",
  300: "#d1d5db",
  400: "#9ca3af",
  500: "#6b7280",
  600: "#4b5563",
  700: "#374151",
  800: "#1f2937",
  900: "#111827",
  950: "#030712",
} as const;

export const rose = { 50: "#fff1f2", 200: "#fecdd3", 600: "#e11d48", 700: "#be123c", 900: "#881337" } as const;
export const amber = { 50: "#fffbeb", 200: "#fde68a", 700: "#b45309", 900: "#78350f" } as const;

export const colors = {
  background: gray[50],
  surface: "#ffffff",
  surfaceMuted: gray[100],
  border: gray[200],
  borderStrong: gray[300],

  text: gray[900],
  textSecondary: gray[700],
  textMuted: gray[600],
  placeholder: gray[400],

  primary: forest[700],
  primaryPressed: forest[800],
  primarySoft: forest[50],
  onPrimary: "#ffffff",
  accent: earth[700],

  danger: rose[600],
  dangerPressed: rose[700],
  dangerSoft: rose[50],
  dangerBorder: rose[200],
  dangerText: rose[900],

  warningSoft: amber[50],
  warningBorder: amber[200],
  warningText: amber[900],
  warningIcon: amber[700],

  focus: forest[600],
  skeleton: gray[200],
  tabInactive: gray[500],
} as const;
