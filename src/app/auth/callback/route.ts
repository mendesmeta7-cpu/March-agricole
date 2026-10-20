import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl, sanitizeRedirectPath } from "@/lib/utils/url";

/**
 * Détermine la destination sécurisée d'un utilisateur dont l'onboarding est complété.
 * 
 * Règle de routage safeNext (AUTH-5.18) :
 * - Le rôle en base de données prime de manière absolue sur tout paramètre d'URL.
 * - Si safeNext cible un espace dashboard concordant avec son rôle (/dashboard/${role} ou /dashboard/${role}/*) : autorisé.
 * - Si safeNext est une destination neutre autorisée (/dashboard ou /dashboard/notifications) : autorisé.
 * - Si safeNext cible l'espace d'un autre rôle (ex: /dashboard/reseller pour une société) : rejeté et repli sur /dashboard/${role}.
 * - Si aucun safeNext valide n'est fourni : /dashboard/${role}.
 */
function resolveCompletedDashboard(role: string, safeNext: string): string {
  const defaultDashboard =
    role === "company"
      ? "/dashboard/company"
      : role === "reseller"
      ? "/dashboard/reseller"
      : role === "admin"
      ? "/dashboard/admin"
      : "/onboarding";

  if (!safeNext || safeNext === "/" || safeNext.startsWith("/login")) {
    return defaultDashboard;
  }

  if (safeNext.startsWith("/dashboard")) {
    // Destinations génériques autorisées
    if (
      safeNext === "/dashboard" ||
      safeNext === "/dashboard/" ||
      safeNext.startsWith("/dashboard/notifications")
    ) {
      return safeNext;
    }

    // Destination correspondant au rôle effectif de l'utilisateur
    if (
      safeNext === `/dashboard/${role}` ||
      safeNext.startsWith(`/dashboard/${role}/`) ||
      safeNext.startsWith(`/dashboard/${role}?`)
    ) {
      return safeNext;
    }

    // Tentative d'accès à un espace tiers : repli strict sur son dashboard
    return defaultDashboard;
  }

  return defaultDashboard;
}

/**
 * Route de callback d'authentification Radiza (Consolidation AUTH-5.18).
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

  try {
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

      const errorResponse = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(redirectErrorCode)}`, baseUrl)
      );
      errorResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
      return errorResponse;
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
        const errorResponse = NextResponse.redirect(
          new URL(`/login?error=${redirectError}`, baseUrl)
        );
        errorResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
        return errorResponse;
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
            response.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
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
        // La session est préservée. Contrôle du profil utilisateur (role, onboarding_status, intended_role).
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, onboarding_status, intended_role")
          .eq("id", authData.user.id)
          .single();

        if (profileError || !profile) {
          console.warn("[Auth Callback] Profil introuvable pour l'utilisateur:", authData.user.id);
          const res = NextResponse.redirect(new URL("/login?error=profile_missing", baseUrl));
          res.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
          return res;
        }

        // Extraction et validation stricte de l'intention de rôle (whitelist : 'company' ou 'reseller' uniquement)
        const roleParam = searchParams.get("role")?.trim();
        const roleCookie = cookieStore.get("radiza_oauth_role")?.value?.trim();
        const rawRole = roleParam || roleCookie;
        const validatedRole: "company" | "reseller" | null =
          rawRole === "company" || rawRole === "reseller" ? rawRole : null;

        // Nettoyage systématique du cookie éphémère sur toutes les branches
        if (cookieStore.get("radiza_oauth_role")) {
          try {
            cookieStore.delete("radiza_oauth_role");
          } catch (_) {
            // Non bloquant
          }
        }

        // Si l'onboarding est déjà complété : son rôle réel en base de données prime de manière absolue.
        // Tout paramètre ?role=... est strictement ignoré pour empêcher toute altération ou usurpation.
        if (profile.onboarding_status === "completed" && profile.role !== "unassigned") {
          const targetDashboard = resolveCompletedDashboard(profile.role, safeNext);
          const response = NextResponse.redirect(new URL(targetDashboard, baseUrl));
          response.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
          return response;
        }

        // À ce stade : le compte est en attente d'onboarding (unassigned ou onboarding_status !== 'completed').
        // Détermination du rôle fiable et verrouillage irrévocable (AUTH-4.38, AUTH-5.11, AUTH-5.16, AUTH-5.18)

        let effectiveIntendedRole: "company" | "reseller" | null = null;

        // CAS A : Le profil en base possède déjà un intended_role fixé (source de vérité immuable)
        if (profile.intended_role === "company" || profile.intended_role === "reseller") {
          effectiveIntendedRole = profile.intended_role;
          // Tout paramètre validatedRole contradictoire est strictement ignoré au profit de la base
        }
        // CAS B : profiles.intended_role est NULL en base mais un rôle valide a été choisi lors de l'inscription OAuth
        else if (validatedRole) {
          let lockSucceeded = false;
          try {
            const { data: lockResult, error: lockError } = await supabase.rpc("set_user_intended_role", {
              p_role: validatedRole,
            });

            if (lockError) {
              console.warn("[Auth Callback] Échec RPC set_user_intended_role:", lockError.message);
            } else if (lockResult?.success) {
              lockSucceeded = true;
              effectiveIntendedRole = validatedRole;
            }
          } catch (lockEx) {
            console.warn("[Auth Callback] Exception set_user_intended_role:", lockEx);
          }

          // Si la RPC a échoué, on ne présume JAMAIS que le verrouillage a réussi.
          // On effectue une vérification défensive en base pour savoir si un intended_role existait déjà (conflit de rejeu)
          // ou si l'onboarding a été complété concurremment (AUTH-5.18)
          if (!lockSucceeded) {
            try {
              const { data: refreshedProfile, error: refreshError } = await supabase
                .from("profiles")
                .select("id, role, onboarding_status, intended_role")
                .eq("id", authData.user.id)
                .single();

              if (refreshError || !refreshedProfile) {
                console.error("[Auth Callback] Erreur relecture défensive profil:", refreshError?.message);
                const errResponse = NextResponse.redirect(new URL("/login?error=role_unknown", baseUrl));
                errResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
                return errResponse;
              }

              // Si le profil est désormais complété (concurrence résolue) : aiguillage immédiat vers son dashboard
              if (refreshedProfile.onboarding_status === "completed" && refreshedProfile.role !== "unassigned") {
                const target = resolveCompletedDashboard(refreshedProfile.role, safeNext);
                const response = NextResponse.redirect(new URL(target, baseUrl));
                response.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
                return response;
              }

              // Si le profil est toujours en attente et que intended_role est valide en base : la base prime
              if (refreshedProfile.intended_role === "company" || refreshedProfile.intended_role === "reseller") {
                effectiveIntendedRole = refreshedProfile.intended_role;
              } else {
                // Profil en attente sans intended_role fiable : état incohérent après échec de verrouillage
                console.error("[Auth Callback] Profil sans rôle verrouillé fiable:", authData.user.id);
                const errResponse = NextResponse.redirect(new URL("/login?error=role_unknown", baseUrl));
                errResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
                return errResponse;
              }
            } catch (refreshEx) {
              console.error("[Auth Callback] Exception inattendue lors de la relecture défensive:", refreshEx);
              const errResponse = NextResponse.redirect(new URL("/login?error=role_unknown", baseUrl));
              errResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
              return errResponse;
            }
          }
        }

        // Synchronisation de confort dans user_metadata.preferred_role SI un rôle fiable est confirmé
        if (effectiveIntendedRole) {
          if (authData.user.user_metadata?.preferred_role !== effectiveIntendedRole) {
            try {
              await supabase.auth.updateUser({
                data: { preferred_role: effectiveIntendedRole },
              });
            } catch (updateError) {
              // Si updateUser échoue, ce n'est pas bloquant car profiles.intended_role
              // en base est la source de vérité prioritaire lue par /onboarding (Priorité 1).
              console.warn("[Auth Callback] Avertissement synchronisation preferred_role:", updateError);
            }
          }
        }

        // AUTH-5.14 Fix-B1 & AUTH-5.14.1 : Garde-fou contre les utilisateurs non inscrits arrivant via /login.
        // Si aucun intended_role fiable n'a été déterminé (effectiveIntendedRole = null), cela signifie
        // que l'utilisateur a utilisé le bouton Google depuis /login sans passer par une page d'inscription
        // (/register/company ou /register/reseller). Son profil est "unassigned" sans rôle verrouillé.
        // On ferme sa session locale pour que le middleware ne le renvoie pas vers /onboarding,
        // et on l'invite à choisir son type de compte sur /register.
        if (!effectiveIntendedRole) {
          console.warn("[Auth Callback] Utilisateur Google sans rôle d'inscription détecté, fermeture de session locale et redirection vers /register.", authData.user.id);
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (signOutError) {
            console.warn("[Auth Callback] Erreur fermeture session locale:", signOutError);
          }

          const noRoleResponse = NextResponse.redirect(
            new URL("/register?error=no_account_google", baseUrl)
          );

          // Conserver sur la réponse finale les modifications de cookies produites par la déconnexion Supabase
          try {
            cookieStore.getAll().forEach((cookie) => {
              noRoleResponse.cookies.set(cookie.name, cookie.value, cookie);
            });
            noRoleResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
          } catch (cookieError) {
            console.warn("[Auth Callback] Erreur transfert cookies sur réponse:", cookieError);
          }

          return noRoleResponse;
        }

        const response = NextResponse.redirect(new URL("/onboarding", baseUrl));
        response.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
        return response;
      }
    }

    // En cas d'absence de code valide ou de lien corrompu
    const invalidResponse = NextResponse.redirect(new URL("/login?error=invalid_link", baseUrl));
    invalidResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
    return invalidResponse;
  } catch (fatalError) {
    // Interception globale des erreurs non gérées : réponse contrôlée et purge du cookie
    console.error("[Auth Callback] Erreur fatale non gérée:", fatalError);
    const fatalResponse = NextResponse.redirect(new URL("/login?error=oauth_error", baseUrl));
    fatalResponse.cookies.set("radiza_oauth_role", "", { maxAge: 0, path: "/" });
    return fatalResponse;
  }
}
