"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function ResellerLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Purge du stockage local client
      if (typeof window !== "undefined") {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }

      // 2. Déconnexion côté client Supabase
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignorer si non initialisé
      }

      // 3. Purge des cookies côté serveur Next.js
      await logoutAction();
    } catch {
      // Si Next.js lève une redirection
    } finally {
      // 4. Redirection ferme vers /login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <div className="pt-4 flex justify-center sm:justify-start">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs sm:text-sm font-bold border border-gray-200/90 hover:border-red-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
      >
        <LogOut className="w-4 h-4 text-red-500" />
        <span>{isLoggingOut ? "Déconnexion en cours..." : "Se déconnecter"}</span>
      </button>
    </div>
  );
}
