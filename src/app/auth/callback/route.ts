import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl, sanitizeRedirectPath } from "@/lib/utils/url";

/**
 * Route de callback d'authentification Radiza (Ajustement Phase AUTH-2).
 * 
 * Traite les retours de confirmation d'email Supabase et les flux PKCE :
 * 1. Extraction et assainissement de l'URL publique de base.
 * 2. Interception des erreurs d'authentification Supabase (otp_expired, access_denied...).
 * 3. Échange sécurisé du code d'authentification PKCE.
 * 4. Distinction stricte de l'intention du flux :
 *    - Confirmation d'inscription (flow=signup / type=signup / défaut) :
 *      Validation de l'email, terminaison de la session temporaire pour empêcher
 *      le contournement de la connexion obligatoire, purge des cookies et redirection
 *      vers la page publique /login?verified=true.
 *    - Récupération de mot de passe (type=recovery / next=/reset-password) :
 *      Préservation de la session temporaire et redirection vers /reset-password.
 *    - Accès direct / OAuth (provider / destination interne vers un dashboard) :
 *      Préservation de la session et redirection vers l'espace autorisé.
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

  // 3. Extraction du code d'échange PKCE et analyse de l'intention
  const code = searchParams.get("code");
  const flow = searchParams.get("flow");
  const type = searchParams.get("type");
  const nextRaw = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(nextRaw, "");

  // Identification précise des flux d'authentification :
  // - Flux de récupération de mot de passe (AUTH-3 futur)
  const isRecoveryFlow =
    type === "recovery" || safeNext.startsWith("/reset-password");

  // - Flux d'accès direct ou OAuth (destination explicite vers un dashboard ou présence d'un provider OAuth)
  const isDirectAccessFlow =
    !isRecoveryFlow &&
    (safeNext.startsWith("/dashboard") || searchParams.has("provider"));

  // - Flux de confirmation d'inscription (explicite via flow=signup / type=signup ou par défaut pour un lien email)
  const isSignupConfirmation =
    flow === "signup" ||
    type === "signup" ||
    type === "email_change" ||
    (!isRecoveryFlow && !isDirectAccessFlow);

  if (code) {
    const supabase = createClient();
    const cookieStore = cookies();

    // Échange du code temporaire contre la validation du compte et session
    const { data: authData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.warn("[Auth Callback] Échec échange code PKCE:", exchangeError.message);
      return NextResponse.redirect(
        new URL("/login?error=confirmation_expired", baseUrl)
      );
    }

    if (authData?.user) {
      // CAS 1 : Confirmation d'inscription par email
      // L'adresse e-mail est validée. On termine proprement la session temporaire pour
      // imposer une connexion explicite avec identifiants, sans accès direct au dashboard.
      if (isSignupConfirmation) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (signOutError) {
          console.warn("[Auth Callback] Nettoyage session post-confirmation:", signOutError);
        }

        const response = NextResponse.redirect(
          new URL("/login?verified=true", baseUrl)
        );

        // Purge exhaustive des cookies de session pour empêcher tout contournement par le middleware
        try {
          cookieStore.getAll().forEach((cookie) => {
            if (
              cookie.name.startsWith("sb-") ||
              cookie.name.includes("auth-token") ||
              cookie.name.includes("supabase")
            ) {
              cookieStore.delete(cookie.name);
              response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
            }
          });
        } catch (cookieError) {
          console.warn("[Auth Callback] Purge cookies:", cookieError);
        }

        return response;
      }

      // CAS 2 : Récupération de mot de passe (AUTH-3 futur)
      // La session temporaire doit être conservée pour autoriser la saisie du nouveau mot de passe
      if (isRecoveryFlow) {
        const recoveryTarget = safeNext || "/reset-password";
        return NextResponse.redirect(new URL(recoveryTarget, baseUrl));
      }

      // CAS 3 : Authentification directe ou OAuth (AUTH-6 futur)
      // La session est préservée et l'utilisateur est aiguillé selon sa destination ou son rôle
      if (safeNext && safeNext !== "/" && !safeNext.startsWith("/login")) {
        return NextResponse.redirect(new URL(safeNext, baseUrl));
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profile?.role === "company") {
        return NextResponse.redirect(new URL("/dashboard/company", baseUrl));
      } else if (profile?.role === "reseller") {
        return NextResponse.redirect(new URL("/dashboard/reseller", baseUrl));
      } else if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", baseUrl));
      }

      return NextResponse.redirect(new URL("/login?verified=true", baseUrl));
    }
  }

  // En cas d'absence de code valide ou de lien corrompu
  return NextResponse.redirect(new URL("/login?error=invalid_link", baseUrl));
}
