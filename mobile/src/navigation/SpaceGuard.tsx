import type { ReactNode } from "react";
import { Redirect } from "expo-router";

import type { MobileSpace } from "@/domain/auth";
import { useSession } from "@/session/SessionProvider";

/**
 * Garde d'accès à un espace : sans session valide pour ce rôle, retour à l'aiguillage (`/`).
 * Confort de navigation uniquement : l'isolement des données reste assuré par la RLS en base.
 */
export function SpaceGuard({ space, children }: { space: MobileSpace; children: ReactNode }) {
  const { state } = useSession();
  const allowed =
    state.status === "ready" &&
    state.session !== null &&
    state.session.role === space &&
    state.session.onboardingCompleted;

  if (!allowed) return <Redirect href="/" />;
  return <>{children}</>;
}
