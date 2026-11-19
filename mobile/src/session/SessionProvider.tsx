import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Session } from "@/domain/auth";
import { services, type ServiceError } from "@/services";

export type SessionState =
  | { status: "loading" }
  | { status: "ready"; session: Session | null }
  | { status: "error"; error: ServiceError };

interface SessionContextValue {
  state: SessionState;
  refresh: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Session de l'utilisateur, lue par le service d'authentification au démarrage. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    const result = await services.auth.getSession();
    setState(result.ok ? { status: "ready", session: result.data } : { status: "error", error: result.error });
  }, []);

  const setSession = useCallback((session: Session | null) => {
    setState({ status: "ready", session });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ state, refresh, setSession }), [state, refresh, setSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession doit être utilisé dans SessionProvider.");
  return value;
}
