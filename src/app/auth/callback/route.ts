import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getAppUrl, sanitizeRedirectPath } from "@/lib/utils/url";

/**
 * Route de callback d'authentification Radiza (Phase AUTH-2).
 * 
 * Traite les retours de confirmation d'email Supabase et les flux PKCE :
 * 1. Extraction et assainissement de l'URL publique de base (anti-localhost en production).
 * 2. Interception des erreurs d'authentification Supabase (otp_expired, access_denied...).
 * 3. Échange sécurisé du code d'authentification PKCE contre une session Supabase SSR.
 * 4. Protection stricte contre l'Open Redirect (whitelist de préfixes autorisés).
 * 5. Aiguillage sécurisé vers le tableau de bord métier ou vers la page publique /login.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;

  // 1. Détermination de la base URL absolue fiable
  const baseUrl = getAppUrl() || requestUrl.origin;

  // 2. Traitement préalable des erreurs retournées par Supabase
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (error || errorCode || errorDescription) {
    console.warn("[Auth Callback] Erreur Supabase reçue:", {
      error,
      errorCode,
    });

    let redirectErrorCode = "invalid_link";
    if (
      errorCode === "otp_expired" ||
      errorDescription?.toLowerCase().includes("expired") ||
      error === "otp_expired"
    ) {
      redirectErrorCode = "confirmation_expired";
    } else if (error === "access_denied") {
      redirectErrorCode = "access_denied";
    }

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(redirectErrorCode)}`, baseUrl)
    );
  }

  // 3. Extraction du code d'échange PKCE et assainissement de la redirection
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(nextRaw, "");

  if (code) {
    const supabase = createClient();

    // Échange du code temporaire contre une session valide
    const { data: authData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && authData?.user) {
      // Récupération stricte du profil pour aiguillage contextuel
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      // Si une destination interne sûre a été explicitement demandée (ex: /login?verified=true)
      if (safeNext && safeNext !== "/") {
        return NextResponse.redirect(new URL(safeNext, baseUrl));
      }

      // Redirection automatique vers l'espace métier correspondant au profil
      if (profile?.role === "company") {
        return NextResponse.redirect(new URL("/dashboard/company", baseUrl));
      } else if (profile?.role === "reseller") {
        return NextResponse.redirect(new URL("/dashboard/reseller", baseUrl));
      } else if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", baseUrl));
      }

      // Si aucun rôle spécifique n'est encore rattaché, rediriger vers login avec confirmation
      return NextResponse.redirect(new URL("/login?verified=true", baseUrl));
    }

    if (exchangeError) {
      console.warn("[Auth Callback] Échec échange code PKCE:", exchangeError.message);
      return NextResponse.redirect(
        new URL("/login?error=confirmation_expired", baseUrl)
      );
    }
  }

  // En cas d'absence de code valide ou de lien corrompu
  return NextResponse.redirect(new URL("/login?error=invalid_link", baseUrl));
}
