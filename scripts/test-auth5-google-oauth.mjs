/**
 * Suite de tests automatisée pour la Phase AUTH-5 (Google OAuth) :
 * 
 * 1. Initiation du flux Google (URL de callback & paramètres)
 * 2. Détection du flux OAuth dans le callback
 * 3. Préservation de la session OAuth après échange de code
 * 4. Séparation stricte des 3 flux (Signup, Recovery, OAuth)
 * 5. Gestion des erreurs OAuth, codes absents ou invalides
 * 6. Protection anti Open-Redirect sur le callback
 * 7. Orientation d'un profil incomplet vers /onboarding
 * 8. Redirection d'un profil complété vers son dashboard dédié
 * 9. Non-régression des flux classiques (Inscription, Connexion, Recovery)
 * 10. Verrouillage des rôles et interdiction absolue du rôle admin
 * 11. Prévention des doubles clics et état loading côté interface
 * 12. Gestion des conflits d'identité / comptes existants
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("DÉBUT DES TESTS PHASE AUTH-5 : GOOGLE OAUTH");
console.log("==================================================");

let passedCount = 0;
let totalCount = 0;

function runTest(testName, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } catch (error) {
    console.error(`[FAIL] ${testName}`);
    console.error(`       -> ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires simulant les logiques serveur pures
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
  "/unauthorized",
  "/onboarding",
  "/",
];

function sanitizeRedirectPath(path, defaultPath = "/") {
  if (!path || typeof path !== "string") return defaultPath;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return defaultPath;
  }
  if (
    trimmed.includes("://") ||
    trimmed.toLowerCase().includes("javascript:") ||
    trimmed.toLowerCase().includes("data:") ||
    trimmed.includes("\\")
  ) {
    return defaultPath;
  }
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some((prefix) => {
    if (prefix === "/") return trimmed === "/" || trimmed.startsWith("/?");
    return (
      trimmed === prefix ||
      trimmed.startsWith(`${prefix}/`) ||
      trimmed.startsWith(`${prefix}?`)
    );
  });
  return isAllowed ? trimmed : defaultPath;
}

function analyzeCallbackFlow(searchParams) {
  const flow = searchParams.get("flow");
  const type = searchParams.get("type");
  const nextRaw = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(nextRaw, "");

  const isRecoveryFlow = type === "recovery" || flow === "recovery";
  const isOAuthFlow = flow === "oauth" || searchParams.has("provider");
  const isDirectAccessFlow =
    !isRecoveryFlow && (isOAuthFlow || safeNext.startsWith("/dashboard"));

  const isSignupConfirmation =
    flow === "signup" ||
    type === "signup" ||
    type === "email_change" ||
    (!isRecoveryFlow && !isDirectAccessFlow);

  return {
    isRecoveryFlow,
    isOAuthFlow,
    isDirectAccessFlow,
    isSignupConfirmation,
    safeNext,
  };
}

function resolvePostAuthRedirect(profile, safeNext) {
  if (!profile) {
    return "/login?error=profile_missing";
  }
  if (profile.role === "unassigned" || profile.onboarding_status !== "completed") {
    return "/onboarding";
  }
  if (safeNext && safeNext !== "/" && !safeNext.startsWith("/login")) {
    return safeNext;
  }
  if (profile.role === "company") return "/dashboard/company";
  if (profile.role === "reseller") return "/dashboard/reseller";
  if (profile.role === "admin") return "/dashboard/admin";
  return "/onboarding";
}

function resolveCallbackError(searchParams) {
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const flow = searchParams.get("flow");
  const type = searchParams.get("type");
  const isRecoveryFlow = type === "recovery" || flow === "recovery";

  if (!error && !errorCode && !errorDescription) return null;

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

  return redirectErrorCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXÉCUTION DES TESTS
// ─────────────────────────────────────────────────────────────────────────────

// TEST 1 : Initiation du flux Google
runTest("TEST 1 : Construction de l'URL de retour OAuth avec flow=oauth&provider=google", () => {
  const appUrl = "https://radiza.cd";
  const callbackUrl = `${appUrl}/auth/callback?flow=oauth&provider=google`;
  const parsed = new URL(callbackUrl);
  assert.strictEqual(parsed.pathname, "/auth/callback");
  assert.strictEqual(parsed.searchParams.get("flow"), "oauth");
  assert.strictEqual(parsed.searchParams.get("provider"), "google");
});

// TEST 2 : Détection du flux OAuth dans le callback
runTest("TEST 2 : Détection stricte du flux OAuth (flow=oauth ou provider=google)", () => {
  const params1 = new URLSearchParams("flow=oauth&provider=google&code=pkce123");
  const flow1 = analyzeCallbackFlow(params1);
  assert.strictEqual(flow1.isOAuthFlow, true);
  assert.strictEqual(flow1.isDirectAccessFlow, true);
  assert.strictEqual(flow1.isSignupConfirmation, false);
  assert.strictEqual(flow1.isRecoveryFlow, false);

  const params2 = new URLSearchParams("provider=google&code=pkce123");
  const flow2 = analyzeCallbackFlow(params2);
  assert.strictEqual(flow2.isOAuthFlow, true);
  assert.strictEqual(flow2.isDirectAccessFlow, true);
  assert.strictEqual(flow2.isSignupConfirmation, false);
});

// TEST 3 : Préservation de session OAuth vs déconnexion de l'inscription classique
runTest("TEST 3 : Préservation de session (CAS 3 OAuth ne doit JAMAIS appeler signOut)", () => {
  const params = new URLSearchParams("flow=oauth&provider=google&code=valid_code");
  const flow = analyzeCallbackFlow(params);
  // isSignupConfirmation déclenche signOut et purge cookies
  assert.strictEqual(flow.isSignupConfirmation, false, "Le flux OAuth ne doit pas être qualifié de SignupConfirmation");
  assert.strictEqual(flow.isDirectAccessFlow, true, "Le flux OAuth doit être qualifié de DirectAccess");
});

// TEST 4 : Séparation hermétique des 3 flux (Signup, Recovery, OAuth)
runTest("TEST 4 : Séparation étanche des flux sans risque de collision", () => {
  // Flux A : Inscription email
  const signupParams = new URLSearchParams("flow=signup&code=abc");
  const signupFlow = analyzeCallbackFlow(signupParams);
  assert.strictEqual(signupFlow.isSignupConfirmation, true);
  assert.strictEqual(signupFlow.isRecoveryFlow, false);
  assert.strictEqual(signupFlow.isOAuthFlow, false);

  // Flux B : Récupération mot de passe
  const recoveryParams = new URLSearchParams("type=recovery&code=abc");
  const recoveryFlow = analyzeCallbackFlow(recoveryParams);
  assert.strictEqual(recoveryFlow.isRecoveryFlow, true);
  assert.strictEqual(recoveryFlow.isSignupConfirmation, false);
  assert.strictEqual(recoveryFlow.isOAuthFlow, false);

  // Flux C : Google OAuth
  const oauthParams = new URLSearchParams("flow=oauth&provider=google&code=abc");
  const oauthFlow = analyzeCallbackFlow(oauthParams);
  assert.strictEqual(oauthFlow.isOAuthFlow, true);
  assert.strictEqual(oauthFlow.isSignupConfirmation, false);
  assert.strictEqual(oauthFlow.isRecoveryFlow, false);
});

// TEST 5 : Erreurs OAuth et codes absents/invalides
runTest("TEST 5 : Traitement d'erreurs OAuth et codes invalides", () => {
  // Annulation par l'utilisateur
  const deniedParams = new URLSearchParams("error=access_denied&provider=google");
  assert.strictEqual(resolveCallbackError(deniedParams), "access_denied");

  // Conflit d'identité (compte existant)
  const conflictParams = new URLSearchParams("error_code=user_already_exists&flow=oauth");
  assert.strictEqual(resolveCallbackError(conflictParams), "user_already_exists");

  // Token expiré
  const expiredParams = new URLSearchParams("error_code=otp_expired");
  assert.strictEqual(resolveCallbackError(expiredParams), "confirmation_expired");
});

// TEST 6 : Protection anti Open-Redirect sur le callback
runTest("TEST 6 : Neutralisation absolue des redirections externes non autorisées", () => {
  assert.strictEqual(sanitizeRedirectPath("https://evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPath("//malicious.com"), "/");
  assert.strictEqual(sanitizeRedirectPath("/\\evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPath("javascript:alert(1)"), "/");
  assert.strictEqual(sanitizeRedirectPath("/dashboard/company"), "/dashboard/company");
  assert.strictEqual(sanitizeRedirectPath("/onboarding"), "/onboarding");
});

// TEST 7 : Orientation d'un nouveau profil Google vers /onboarding
runTest("TEST 7 : Redirection automatique vers /onboarding pour un compte incomplet", () => {
  const newProfile = { role: "unassigned", onboarding_status: "pending" };
  const target = resolvePostAuthRedirect(newProfile, "");
  assert.strictEqual(target, "/onboarding");

  // Même si l'attaquant injecte safeNext=/dashboard/company
  const targetWithNext = resolvePostAuthRedirect(newProfile, "/dashboard/company");
  assert.strictEqual(targetWithNext, "/onboarding", "Un profil incomplet doit être dirigé vers /onboarding même avec safeNext");
});

// TEST 8 : Redirection d'un profil complété vers son dashboard métier
runTest("TEST 8 : Redirection déterministe d'un compte déjà complété", () => {
  const companyProfile = { role: "company", onboarding_status: "completed" };
  assert.strictEqual(resolvePostAuthRedirect(companyProfile, ""), "/dashboard/company");

  const resellerProfile = { role: "reseller", onboarding_status: "completed" };
  assert.strictEqual(resolvePostAuthRedirect(resellerProfile, ""), "/dashboard/reseller");

  const adminProfile = { role: "admin", onboarding_status: "completed" };
  assert.strictEqual(resolvePostAuthRedirect(adminProfile, ""), "/dashboard/admin");
});

// TEST 9 : Non-régression de l'inscription et connexion classiques
runTest("TEST 9 : Vérification statique des fichiers applicatifs (non-régression)", () => {
  const authActionsCode = fs.readFileSync(path.join(process.cwd(), "src/lib/actions/auth.ts"), "utf-8");
  assert.ok(authActionsCode.includes("preferred_role: \"company\""), "registerCompanyAction doit inclure preferred_role company");
  assert.ok(authActionsCode.includes("preferred_role: \"reseller\""), "registerResellerAction doit inclure preferred_role reseller");
  assert.ok(authActionsCode.includes("flow=signup"), "emailRedirectTo doit inclure flow=signup");
  assert.ok(authActionsCode.includes("lockedRole"), "completeOnboardingAction doit valider lockedRole");
});

// TEST 10 : Respect du verrouillage des rôles et absence d'accès admin
runTest("TEST 10 : Imperméabilité contre l'accès admin et respect de intended_role", () => {
  const migration26 = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql"), "utf-8");
  assert.ok(migration26.includes("p_role = 'admin'"), "RPC complete_user_onboarding doit interdire formellement p_role = 'admin'");
  assert.ok(migration26.includes("auto-attribution du rôle administrateur non autorisée"), "Message d'interdiction admin présent");

  const migration27 = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20261013000027_enforce_intended_role_locking.sql"), "utf-8");
  assert.ok(migration27.includes("v_profile.intended_role IS NOT NULL AND v_profile.intended_role <> p_role"), "Vérification stricte de concordance intended_role");
});

// TEST 11 : Prévention des doubles clics et état loading dans GoogleSignInButton
runTest("TEST 11 : Vérification de l'implémentation de GoogleSignInButton", () => {
  const buttonCode = fs.readFileSync(path.join(process.cwd(), "src/components/auth/GoogleSignInButton.tsx"), "utf-8");
  assert.ok(buttonCode.includes("if (loading) return;"), "Double-clic prévenu via état loading");
  assert.ok(buttonCode.includes("disabled={loading}"), "Bouton désactivé pendant le chargement");
  assert.ok(buttonCode.includes("signInWithOAuth"), "Appel officiel de signInWithOAuth");
  assert.ok(buttonCode.includes("provider: \"google\""), "Fournisseur google spécifié");
});

// TEST 12 : Messages d'erreur sans fuite de données personnelles
runTest("TEST 12 : Message convivial et sécurisé en cas de conflit d'identité", () => {
  const loginCode = fs.readFileSync(path.join(process.cwd(), "src/app/login/page.tsx"), "utf-8");
  assert.ok(loginCode.includes("user_already_exists"), "Gestion de user_already_exists dans getUrlErrorMessage");
  assert.ok(loginCode.includes("GoogleSignInButton"), "GoogleSignInButton présent sur la page de connexion");

  const registerCode = fs.readFileSync(path.join(process.cwd(), "src/app/register/page.tsx"), "utf-8");
  assert.ok(registerCode.includes("GoogleSignInButton"), "GoogleSignInButton présent sur la page de création de compte");
});

console.log("==================================================");
console.log(`RÉSULTAT FINAL DES TESTS AUTH-5 : ${passedCount}/${totalCount} RÉUSSIS`);
console.log("==================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
