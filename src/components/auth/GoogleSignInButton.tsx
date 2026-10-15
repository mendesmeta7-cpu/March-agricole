"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl } from "@/lib/utils/url";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  text?: string;
  className?: string;
  redirectTo?: string;
  role?: "company" | "reseller";
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  text = "Continuer avec Google",
  className = "",
  redirectTo,
  role,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Résolution de l'URL absolue de redirection
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const base = getAppUrl() || origin;
      
      let defaultCallback = `${base.replace(/\/+$/, "")}/auth/callback?flow=oauth&provider=google`;
      if (role && (role === "company" || role === "reseller")) {
        defaultCallback += `&role=${encodeURIComponent(role)}`;
        
        // Mémorisation de secours par cookie sécurisé éphémère (10 minutes)
        if (typeof document !== "undefined") {
          const isSecure = window.location.protocol === "https:";
          const secureFlag = isSecure ? "; Secure" : "";
          document.cookie = `radiza_oauth_role=${encodeURIComponent(role)}; Path=/; Max-Age=600; SameSite=Lax${secureFlag}`;
        }
      }

      const callbackUrl = redirectTo || defaultCallback;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("[Google OAuth] Erreur signInWithOAuth:", error);
        setErrorMessage(
          "Impossible d'initialiser la connexion avec Google. Veuillez réessayer."
        );
        setLoading(false);
      }
    } catch (err) {
      console.error("[Google OAuth] Exception inattendue:", err);
      setErrorMessage("Une erreur inattendue est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        aria-label={text}
        aria-busy={loading}
        className={`w-full py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold text-sm shadow-xs hover:shadow transition-all duration-150 flex items-center justify-center gap-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-forest-600 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-forest-700" />
            <span>Connexion avec Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{text}</span>
          </>
        )}
      </button>

      {errorMessage && (
        <p
          className="mt-2 text-xs text-red-600 text-center font-medium"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
