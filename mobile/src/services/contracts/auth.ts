import type { Session } from "@/domain/auth";
import type { Result } from "./result";

export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Authentification. Implémentation réelle prévue : Supabase Auth (clé publique, session sur l'appareil),
 * après la validation de la sécurité Supabase (ADR-067).
 */
export interface AuthService {
  /** Session en cours sur l'appareil, ou `null` s'il n'y en a pas. */
  getSession(): Promise<Result<Session | null>>;
  signInWithPassword(input: SignInInput): Promise<Result<Session>>;
  signOut(): Promise<Result<void>>;
}
