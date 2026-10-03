"use client";

import { useState } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

export default function ResellerLogoutButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      // Si Next.js lève une redirection interne
    } finally {
      // 4. Redirection ferme vers /login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-500" />
            Déconnexion de session
          </h3>
          <p className="text-xs text-gray-500">
            Fermez votre session active en toute sécurité sur cet appareil.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          disabled={isLoggingOut}
          className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 w-full sm:w-auto"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
          <span>Se déconnecter</span>
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleLogout}
        title="Confirmation de déconnexion"
        description="Êtes-vous certain de vouloir vous déconnecter de votre espace Revendeur ? Vos sessions et jetons de sécurité locaux seront réinitialisés."
        confirmText="Oui, me déconnecter"
        cancelText="Rester connecté"
        variant="destructive"
        isLoading={isLoggingOut}
      />
    </>
  );
}
