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
  const flow = searchParams.get("flow");
  const type = searchParams.get("type");

  // Détection explicite et sécurisée du flux de récupération (AUTH-3) :
  // Exige obligatoirement une preuve d'intention (type="recovery" ou flow="recovery").
  // Le seul paramètre next=/reset-password ne constitue JAMAIS une preuve suffisante.
  const isRecoveryFlow = type === "recovery" || flow === "recovery";

  if (error || errorCode || errorDescription) {
    console.warn("[Auth Callback] Erreur Supabase reçue:", {
      error,
      errorCode,
      flow,
      type,
    });

    let redirectErrorCode = isRecoveryFlow ? "recovery_expired" : "invalid_link";
    if (
      errorCode === "otp_expired" ||
      errorDescription?.toLowerCase().includes("expired") ||
      error === "otp_expired"
    ) {
      redirectErrorCode = isRecoveryFlow ? "recovery_expired" : "confirmation_expired";
    } else if (error === "access_denied") {
      redirectErrorCode = isRecoveryFlow ? "recovery_expired" : "access_denied";
    } else if (
      errorCode === "user_already_exists" ||
      errorCode === "identity_already_exists" ||
      errorDescription?.toLowerCase().includes("already registered") ||
      errorDescription?.toLowerCase().includes("already been registered") ||
      errorDescription?.toLowerCase().includes("already linked")
    ) {
      redirectErrorCode = "user_already_exists";
    } else if (flow === "oauth" || searchParams.has("provider")) {
      redirectErrorCode = "access_denied";
    }

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(redirectErrorCode)}`, baseUrl)
    );
  }

  // 3. Extraction du code d'échange PKCE et analyse de l'intention
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(nextRaw, "");

  // - Flux d'accès direct ou OAuth (destination explicite vers un dashboard, flow=oauth ou présence d'un provider)
  const isOAuthFlow = flow === "oauth" || searchParams.has("provider");
  const isDirectAccessFlow =
    !isRecoveryFlow &&
    (isOAuthFlow || safeNext.startsWith("/dashboard"));

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
      const redirectError = isRecoveryFlow ? "recovery_expired" : "confirmation_expired";
      return NextResponse.redirect(
        new URL(`/login?error=${redirectError}`, baseUrl)
      );
    }

    if (authData?.user) {
      // CAS 1 : Confirmation d'inscription par email (Flux classique AUTH-2 & AUTH-4)
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

      // CAS 2 : Récupération de mot de passe (AUTH-3)
      // La session temporaire doit être conservée pour autoriser la saisie du nouveau mot de passe
      if (isRecoveryFlow) {
        const recoveryTarget =
          safeNext.startsWith("/reset-password") ? safeNext : "/reset-password";
        return NextResponse.redirect(new URL(recoveryTarget, baseUrl));
      }

      // CAS 3 : Authentification directe ou OAuth (Google OAuth — AUTH-5)
      // La session est préservée. Contrôle du profil utilisateur (role et onboarding_status).
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, onboarding_status")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        console.warn("[Auth Callback] Profil introuvable pour l'utilisateur:", authData.user.id);
        return NextResponse.redirect(new URL("/login?error=profile_missing", baseUrl));
      }

      // Si l'utilisateur est unassigned ou si son onboarding est incomplet :
      // Redirection impérative vers /onboarding pour compléter son activité
      if (profile.role === "unassigned" || profile.onboarding_status !== "completed") {
        return NextResponse.redirect(new URL("/onboarding", baseUrl));
      }

      // Si une destination spécifique sécurisée était demandée pour un compte déjà complété
      if (safeNext && safeNext !== "/" && !safeNext.startsWith("/login")) {
        return NextResponse.redirect(new URL(safeNext, baseUrl));
      }

      // Aiguillage déterministe par rôle pour un compte complété
      if (profile.role === "company") {
        return NextResponse.redirect(new URL("/dashboard/company", baseUrl));
      } else if (profile.role === "reseller") {
        return NextResponse.redirect(new URL("/dashboard/reseller", baseUrl));
      } else if (profile.role === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", baseUrl));
      }

      return NextResponse.redirect(new URL("/onboarding", baseUrl));
    }
  }

  // En cas d'absence de code valide ou de lien corrompu
  return NextResponse.redirect(new URL("/login?error=invalid_link", baseUrl));
}
