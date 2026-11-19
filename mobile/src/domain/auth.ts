/**
 * Types d'authentification, alignés sur `profiles.role` et `profiles.onboarding_status` du Web
 * (src/lib/supabase/middleware.ts). Aucune logique : les valeurs viendront du serveur.
 */
export type UserRole = "company" | "reseller" | "admin" | "unassigned";

/** Espaces disponibles dans l'application mobile (l'administration reste sur le Web). */
export type MobileSpace = "company" | "reseller";

export interface Session {
  userId: string;
  email: string | null;
  role: UserRole;
  /** `true` si `onboarding_status = 'completed'`. */
  onboardingCompleted: boolean;
}
