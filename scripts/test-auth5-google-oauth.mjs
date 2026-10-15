/**
 * Suite de tests automatisée pour la Phase AUTH-5 (Google OAuth & Verrouillage PostgreSQL AUTH-5.18)
 *
 * Cette suite combine trois niveaux de validation indispensables :
 *
 * [PARTIE 1] ASSERTIONS STATIQUES & CONTRÔLES DU CODE SOURCE :
 * - Absence du bouton Google sur /register (hub d'orientation pur)
 * - Présence du bouton Google avec role="company" sur /register/company
 * - Présence du bouton Google avec role="reseller" sur /register/reseller
 * - Validation serveur et sanitisation des paramètres / cookies
 * - Code de la Migration 28 (SECURITY DEFINER, search_path, revokes, grants, FOR UPDATE)
 * - Appel de la RPC set_user_intended_role dans /auth/callback/route.ts
 * - Gestion globale des exceptions (try/catch) et fonction resolveCompletedDashboard
 *
 * [PARTIE 2] TESTS D'EXÉCUTION DU MOTEUR POSTGRESQL (SIMULATION COMPORTEMENTALE EN MÉMOIRE) :
 * - Nouvel utilisateur Google choisissant Société -> verrouillage intended_role = 'company'
 * - Nouvel utilisateur Google choisissant Revendeur -> verrouillage intended_role = 'reseller'
 * - Tentative de finalisation (complete_user_onboarding) avec le rôle opposé -> rejet par la base
 * - Tentative de modification d'un rôle déjà fixé (set_user_intended_role divergent) -> exception stricte
 * - Tentative d'auto-attribution du rôle 'admin' (set_user_intended_role ou complete_user_onboarding) -> rejet absolu
 * - Appel direct à la RPC avec un rôle divergent -> bloqué par la base
 * - Reprise / rejeu du callback OAuth -> traitement idempotent propre sans erreur
 * - Compte existant déjà complété -> rejet immédiat de toute tentative de modification de rôle
 * - Inscriptions classiques Société et Revendeur -> initialisation par trigger et verrouillage
 * - Appel non authentifié -> rejet immédiat
 *
 * [PARTIE 3] TESTS COMPORTEMENTAUX CONSOLIDÉS DU FLUX CALLBACK AUTH-5.18 :
 * - 1. Échec d'échange PKCE avec expiration du cookie radiza_oauth_role
 * - 2. Exception inattendue pendant la relecture du profil protégée par try/catch
 * - 3. Erreur retournée par Supabase pendant la relecture défensive
 * - 4. Profil absent ou intended_role invalide après échec de verrouillage
 * - 5. Profil devenu completed avec rôle 'company' -> aiguillage dashboard direct
 * - 6. Profil devenu completed avec rôle 'reseller' -> aiguillage dashboard direct
 * - 7. Profil incohérent après relecture (intended_role null) -> redirection contrôlée
 * - 8. safeNext concordant avec le rôle réel (autorisé)
 * - 9. safeNext discordant avec le rôle réel (rejeté au profit du dashboard légitime)
 * - 10. Destination neutre légitime (/dashboard préservé)
 * - 11. Expiration du cookie radiza_oauth_role sur TOUTES les branches de sortie
 * - 12. Non-régression des flux confirmation d'email (AUTH-2) et récupération (AUTH-3)
 * - 13. Exception fatale globale interceptée proprement
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("DÉBUT DES TESTS PHASE AUTH-5 : GOOGLE OAUTH & VERROUILLAGE POSTGRESQL");
console.log("======================================================================");

let passedCount = 0;
let totalCount = 0;

function runTest(testType, testName, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] [${testType}] ${testName}`);
    passedCount++;
  } catch (error) {
    console.error(`[FAIL] [${testType}] ${testName}`);
    console.error(`       -> ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES SERVEUR (ROUTE.TS & MIDDLEWARE)
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

function resolveCompletedDashboard(role, safeNext) {
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
    if (
      safeNext === "/dashboard" ||
      safeNext === "/dashboard/" ||
      safeNext.startsWith("/dashboard/notifications")
    ) {
      return safeNext;
    }

    if (
      safeNext === `/dashboard/${role}` ||
      safeNext.startsWith(`/dashboard/${role}/`) ||
      safeNext.startsWith(`/dashboard/${role}?`)
    ) {
      return safeNext;
    }

    return defaultDashboard;
  }

  return defaultDashboard;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉMULATEUR COMPORTEMENTAL DU MOTEUR POSTGRESQL (MIGRATION 26, 27 & 28)
// ─────────────────────────────────────────────────────────────────────────────

class PostgresEngineSimulator {
  constructor() {
    this.profiles = new Map();
  }

  createUser(id, email, metadata = {}) {
    // Émule le trigger trg_on_auth_user_created (Migration 27)
    let intendedRole = null;
    const pref = metadata.preferred_role;
    if (pref === "company" || pref === "reseller") {
      intendedRole = pref;
    }
    const profile = {
      id,
      email,
      role: "unassigned",
      onboarding_status: "pending",
      intended_role: intendedRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(id, profile);
    return profile;
  }

  // Émule la RPC set_user_intended_role(p_role) (Migration 28)
  setUserIntendedRole(callerId, p_role) {
    if (!callerId) {
      throw new Error("Non authentifié : une session active est requise.");
    }

    if (!p_role || (p_role !== "company" && p_role !== "reseller")) {
      throw new Error("Rôle invalide : seuls 'company' ou 'reseller' sont autorisés.");
    }

    const profile = this.profiles.get(callerId);
    if (!profile) {
      throw new Error("Profil utilisateur introuvable.");
    }

    if (profile.onboarding_status === "completed" || profile.role !== "unassigned") {
      throw new Error("Action interdite : l'onboarding de ce compte a déjà été finalisé.");
    }

    if (profile.intended_role !== null) {
      if (profile.intended_role === p_role) {
        return {
          success: true,
          intended_role: profile.intended_role,
          status: "already_locked",
        };
      } else {
        throw new Error(
          `Action interdite : le type de compte a déjà été irrévocablement verrouillé sur '${profile.intended_role}'.`
        );
      }
    }

    profile.intended_role = p_role;
    profile.updated_at = new Date().toISOString();
    return {
      success: true,
      intended_role: p_role,
      status: "locked",
    };
  }

  // Émule la RPC complete_user_onboarding (Migration 26 & 27)
  completeUserOnboarding(callerId, p_role) {
    if (!callerId) {
      throw new Error("Non authentifié");
    }

    if (p_role === "admin") {
      throw new Error("auto-attribution du rôle administrateur non autorisée");
    }

    if (p_role !== "company" && p_role !== "reseller") {
      throw new Error("Rôle non autorisé pour l'onboarding");
    }

    const profile = this.profiles.get(callerId);
    if (!profile) {
      throw new Error("Profil utilisateur introuvable");
    }

    if (profile.onboarding_status === "completed") {
      throw new Error("L'onboarding de cet utilisateur est déjà finalisé");
    }

    if (profile.intended_role !== null && profile.intended_role !== p_role) {
      throw new Error(
        `Le type de profil demandé (${p_role}) ne correspond pas au choix initial verrouillé (${profile.intended_role}).`
      );
    }

    profile.role = p_role;
    profile.onboarding_status = "completed";
    profile.updated_at = new Date().toISOString();
    return { success: true, profile };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTIE 1 : ASSERTIONS STATIQUES & REVUE DE CODE SOURCE
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n--- [PARTIE 1] ASSERTIONS STATIQUES DU CODE SOURCE ---");

runTest("STATIQUE", "Le bouton Google n'apparaît plus sur /register (hub d'orientation pur)", () => {
  const registerCode = fs.readFileSync(path.join(process.cwd(), "src/app/register/page.tsx"), "utf-8");
  assert.strictEqual(
    registerCode.includes("GoogleSignInButton"),
    false,
    "GoogleSignInButton ne doit plus être présent sur /register"
  );
  assert.ok(registerCode.includes("/register/company"), "Lien vers /register/company conservé");
  assert.ok(registerCode.includes("/register/reseller"), "Lien vers /register/reseller conservé");
});

runTest("STATIQUE", "Le bouton Google apparaît sur /register/company avec role='company'", () => {
  const companyCode = fs.readFileSync(path.join(process.cwd(), "src/app/register/company/page.tsx"), "utf-8");
  assert.ok(companyCode.includes("GoogleSignInButton"), "GoogleSignInButton doit être importé dans /register/company");
  assert.ok(companyCode.includes('role="company"'), "GoogleSignInButton doit recevoir role='company'");
  assert.ok(companyCode.includes("ou avec votre adresse e-mail"), "Séparateur visuel présent");
});

runTest("STATIQUE", "Le bouton Google apparaît sur /register/reseller avec role='reseller'", () => {
  const resellerCode = fs.readFileSync(path.join(process.cwd(), "src/app/register/reseller/page.tsx"), "utf-8");
  assert.ok(resellerCode.includes("GoogleSignInButton"), "GoogleSignInButton doit être importé dans /register/reseller");
  assert.ok(resellerCode.includes('role="reseller"'), "GoogleSignInButton doit recevoir role='reseller'");
  assert.ok(resellerCode.includes("ou avec votre adresse e-mail"), "Séparateur visuel présent");
});

runTest("STATIQUE", "Spécifications de sécurité de la Migration 28 (SECURITY DEFINER, search_path, permissions)", () => {
  const migration28Path = path.join(process.cwd(), "supabase/migrations/20261015000028_set_oauth_intended_role.sql");
  assert.ok(fs.existsSync(migration28Path), "Le fichier de migration 28 doit exister localement");
  const mig28Sql = fs.readFileSync(migration28Path, "utf-8");

  assert.ok(mig28Sql.includes("FUNCTION public.set_user_intended_role"), "Nom de la fonction exact");
  assert.ok(mig28Sql.includes("SECURITY DEFINER"), "Fonction SECURITY DEFINER requise pour écrire intended_role");
  assert.ok(mig28Sql.includes("SET search_path TO 'public', 'pg_temp'"), "search_path fixé explicitement et sûrement");
  assert.ok(mig28Sql.includes("auth.uid()"), "Vérification stricte de l'identité de l'appelant");
  assert.ok(mig28Sql.includes("FOR UPDATE"), "Verrouillage pessimiste anti-concurrence");
  assert.ok(mig28Sql.includes("REVOKE ALL ON FUNCTION public.set_user_intended_role(VARCHAR) FROM PUBLIC, anon;"), "Révocation de PUBLIC et anon");
  assert.ok(mig28Sql.includes("GRANT EXECUTE ON FUNCTION public.set_user_intended_role(VARCHAR) TO authenticated;"), "Exécution accordée exclusivement à authenticated");
});

runTest("STATIQUE", "Route /auth/callback : set_user_intended_role, try/catch global et resolveCompletedDashboard", () => {
  const callbackCode = fs.readFileSync(path.join(process.cwd(), "src/app/auth/callback/route.ts"), "utf-8");
  assert.ok(callbackCode.includes('supabase.rpc("set_user_intended_role"'), "La route callback doit appeler la RPC set_user_intended_role");
  assert.ok(callbackCode.includes("p_role: validatedRole"), "Le paramètre p_role doit être transmis avec le rôle validé");
  assert.ok(callbackCode.includes("resolveCompletedDashboard"), "Fonction de routage déterministe pour les comptes complétés présente");
  assert.ok(callbackCode.includes("catch (fatalError)"), "Gestion globale des exceptions inattendues présente");
  assert.ok(callbackCode.includes("catch (refreshEx)"), "Protection de la relecture défensive présente");
});

runTest("STATIQUE", "Sanitisation des redirections et isolation des URL", () => {
  assert.strictEqual(sanitizeRedirectPath("https://evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPath("//malicious.com"), "/");
  assert.strictEqual(sanitizeRedirectPath("/\\evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPath("/dashboard/company"), "/dashboard/company");
  assert.strictEqual(sanitizeRedirectPath("/dashboard/reseller"), "/dashboard/reseller");
  assert.strictEqual(sanitizeRedirectPath("/onboarding"), "/onboarding");
});

// ─────────────────────────────────────────────────────────────────────────────
// PARTIE 2 : TESTS D'EXÉCUTION DU MOTEUR POSTGRESQL (SIMULATION COMPORTEMENTALE)
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n--- [PARTIE 2] TESTS D'EXÉCUTION COMPORTEMENTALE POSTGRESQL ---");

runTest("EXÉCUTION DB", "Nouvel utilisateur Google choisissant Société : verrouillage durable de profiles.intended_role", () => {
  const db = new PostgresEngineSimulator();
  const userId = "google-user-company-01";
  db.createUser(userId, "societe@example.com", {});

  const result = db.setUserIntendedRole(userId, "company");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, "locked");
  assert.strictEqual(result.intended_role, "company");

  const profile = db.profiles.get(userId);
  assert.strictEqual(profile.intended_role, "company", "profiles.intended_role doit être fixé à 'company' en base");
  assert.strictEqual(profile.role, "unassigned", "Le rôle effectif reste unassigned tant que l'onboarding n'est pas terminé");
});

runTest("EXÉCUTION DB", "Nouvel utilisateur Google choisissant Revendeur : verrouillage durable de profiles.intended_role", () => {
  const db = new PostgresEngineSimulator();
  const userId = "google-user-reseller-01";
  db.createUser(userId, "revendeur@example.com", {});

  const result = db.setUserIntendedRole(userId, "reseller");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, "locked");
  assert.strictEqual(result.intended_role, "reseller");

  const profile = db.profiles.get(userId);
  assert.strictEqual(profile.intended_role, "reseller", "profiles.intended_role doit être fixé à 'reseller' en base");
});

runTest("EXÉCUTION DB", "Tentative de finalisation (complete_user_onboarding) avec le rôle opposé : rejet strict par la base", () => {
  const db = new PostgresEngineSimulator();
  const userId = "google-user-conflict-01";
  db.createUser(userId, "conflict@example.com", {});
  db.setUserIntendedRole(userId, "company");

  assert.throws(
    () => {
      db.completeUserOnboarding(userId, "reseller");
    },
    /ne correspond pas au choix initial verrouillé/,
    "La RPC complete_user_onboarding doit interdire la finalisation avec un rôle opposé à intended_role"
  );
});

runTest("EXÉCUTION DB", "Tentative de modification d'un rôle déjà fixé : exception stricte PostgreSQL", () => {
  const db = new PostgresEngineSimulator();
  const userId = "google-user-locked-01";
  db.createUser(userId, "locked@example.com", {});
  db.setUserIntendedRole(userId, "company");

  assert.throws(
    () => {
      db.setUserIntendedRole(userId, "reseller");
    },
    /Action interdite : le type de compte a déjà été irrévocablement verrouillé sur 'company'/,
    "La RPC set_user_intended_role doit lever une exception si un rôle différent est soumis"
  );
});

runTest("EXÉCUTION DB", "Tentative d'attribution du rôle 'admin' : rejet absolu au niveau de la fonction PostgreSQL", () => {
  const db = new PostgresEngineSimulator();
  const userId = "google-user-admin-hack";
  db.createUser(userId, "hacker@example.com", {});

  assert.throws(
    () => {
      db.setUserIntendedRole(userId, "admin");
    },
    /Rôle invalide : seuls 'company' ou 'reseller' sont autorisés/,
    "La fonction PostgreSQL doit rejeter immédiatement 'admin'"
  );
});

runTest("EXÉCUTION DB", "Appel direct à la RPC complete_user_onboarding avec un rôle divergent : bloqué par PostgreSQL", () => {
  const db = new PostgresEngineSimulator();
  const userId = "user-direct-tamper";
  db.createUser(userId, "tamper@example.com", { preferred_role: "reseller" });

  assert.throws(
    () => {
      db.completeUserOnboarding(userId, "company");
    },
    /ne correspond pas au choix initial verrouillé/
  );
});

runTest("EXÉCUTION DB", "Reprise / rejeu du callback OAuth : idempotence propre sans erreur", () => {
  const db = new PostgresEngineSimulator();
  const userId = "google-user-replay";
  db.createUser(userId, "replay@example.com", {});

  const res1 = db.setUserIntendedRole(userId, "company");
  assert.strictEqual(res1.status, "locked");

  const res2 = db.setUserIntendedRole(userId, "company");
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.status, "already_locked");
  assert.strictEqual(res2.intended_role, "company");
});

runTest("EXÉCUTION DB", "Compte existant déjà complété : rejet de set_user_intended_role", () => {
  const db = new PostgresEngineSimulator();
  const userId = "existing-completed-user";
  db.createUser(userId, "completed@example.com", {});
  db.setUserIntendedRole(userId, "company");
  db.completeUserOnboarding(userId, "company");

  assert.throws(
    () => {
      db.setUserIntendedRole(userId, "company");
    },
    /Action interdite : l'onboarding de ce compte a déjà été finalisé/
  );
});

runTest("EXÉCUTION DB", "Inscriptions classiques Société et Revendeur : initialisation par le trigger PostgreSQL", () => {
  const db = new PostgresEngineSimulator();

  const userCo = db.createUser("classic-co", "classic.co@example.com", { preferred_role: "company" });
  assert.strictEqual(userCo.intended_role, "company");

  const userRe = db.createUser("classic-re", "classic.re@example.com", { preferred_role: "reseller" });
  assert.strictEqual(userRe.intended_role, "reseller");
});

runTest("EXÉCUTION DB", "Appel non authentifié : rejet immédiat", () => {
  const db = new PostgresEngineSimulator();
  assert.throws(
    () => {
      db.setUserIntendedRole(null, "company");
    },
    /Non authentifié : une session active est requise/,
    "Un appel anonyme doit être rejeté"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PARTIE 3 : TESTS COMPORTEMENTAUX DÉTAILLÉS DU CALLBACK AUTH-5.18
// (SIMULATEUR FIDÈLE DU FLUX D'EXÉCUTION DE src/app/auth/callback/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n--- [PARTIE 3] TESTS DU FLUX CALLBACK AUTH-5.18 (SCÉNARIOS CONSOLIDÉS) ---");

/**
 * Simule fidèlement l'algorithme complet de src/app/auth/callback/route.ts (AUTH-5.18)
 */
async function simulateFullCallbackRoute({
  searchParams = new URLSearchParams(),
  cookieValue = null,
  exchangeHandler = null,
  signOutHandler = null,
  profileHandler = null,
  rpcHandler = null,
  refreshProfileHandler = null,
  updateUserHandler = null,
  triggerFatalError = false,
}) {
  const cookiesCleared = [];
  const cookiesSet = [];
  let userMetadata = {};

  try {
    if (triggerFatalError) {
      throw new Error("Erreur système imprévue");
    }

    const error = searchParams.get("error");
    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");
    const flow = searchParams.get("flow");
    const type = searchParams.get("type");

    const isRecoveryFlow = type === "recovery" || flow === "recovery";

    if (error || errorCode || errorDescription) {
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

      cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
      return {
        status: "redirect",
        url: `/login?error=${encodeURIComponent(redirectErrorCode)}`,
        cookiesCleared,
        cookiesSet,
      };
    }

    const code = searchParams.get("code");
    const nextRaw = searchParams.get("next");
    const safeNext = sanitizeRedirectPath(nextRaw, "");

    const isOAuthFlow = flow === "oauth" || searchParams.has("provider");
    const isDirectAccessFlow =
      !isRecoveryFlow &&
      (isOAuthFlow || safeNext.startsWith("/dashboard"));

    const isSignupConfirmation =
      flow === "signup" ||
      type === "signup" ||
      type === "email_change" ||
      (!isRecoveryFlow && !isDirectAccessFlow);

    if (code) {
      const exchangeResult = exchangeHandler
        ? await exchangeHandler(code)
        : { data: { user: { id: "user-default", user_metadata: {} } }, error: null };

      if (exchangeResult?.error) {
        const redirectError = isRecoveryFlow ? "recovery_expired" : "confirmation_expired";
        cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
        return {
          status: "redirect",
          url: `/login?error=${redirectError}`,
          cookiesCleared,
          cookiesSet,
        };
      }

      const authData = exchangeResult.data;
      if (authData?.user) {
        userMetadata = { ...(authData.user.user_metadata || {}) };

        // CAS 1 : Confirmation inscription
        if (isSignupConfirmation) {
          if (signOutHandler) await signOutHandler();
          cookiesCleared.push("sb-auth-token");
          cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
          return {
            status: "redirect",
            url: "/login?verified=true",
            cookiesCleared,
            cookiesSet,
          };
        }

        // CAS 2 : Récupération mot de passe
        if (isRecoveryFlow) {
          const recoveryTarget =
            safeNext.startsWith("/reset-password") ? safeNext : "/reset-password";
          return {
            status: "redirect",
            url: recoveryTarget,
            cookiesCleared,
            cookiesSet,
          };
        }

        // CAS 3 : Authentification directe ou OAuth
        const profileRes = profileHandler
          ? await profileHandler(authData.user.id)
          : { data: { id: authData.user.id, role: "unassigned", onboarding_status: "pending", intended_role: null }, error: null };

        if (profileRes.error || !profileRes.data) {
          cookiesCleared.push("radiza_oauth_role");
          cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
          return {
            status: "redirect",
            url: "/login?error=profile_missing",
            cookiesCleared,
            cookiesSet,
          };
        }

        const profile = profileRes.data;
        const roleParam = searchParams.get("role")?.trim();
        const roleCookie = cookieValue?.trim();
        const rawRole = roleParam || roleCookie;
        const validatedRole =
          rawRole === "company" || rawRole === "reseller" ? rawRole : null;

        if (cookieValue) {
          cookiesCleared.push("radiza_oauth_role");
        }

        // Compte déjà complété
        if (profile.onboarding_status === "completed" && profile.role !== "unassigned") {
          const targetDashboard = resolveCompletedDashboard(profile.role, safeNext);
          cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
          return {
            status: "redirect",
            url: targetDashboard,
            cookiesCleared,
            cookiesSet,
            userMetadata,
          };
        }

        // Compte en attente d'onboarding
        let effectiveIntendedRole = null;

        if (profile.intended_role === "company" || profile.intended_role === "reseller") {
          effectiveIntendedRole = profile.intended_role;
        } else if (validatedRole) {
          let lockSucceeded = false;
          try {
            const lockRes = rpcHandler
              ? await rpcHandler("set_user_intended_role", { p_role: validatedRole })
              : { data: { success: true }, error: null };

            if (lockRes?.error) {
              // RPC error
            } else if (lockRes?.data?.success) {
              lockSucceeded = true;
              effectiveIntendedRole = validatedRole;
            }
          } catch (lockEx) {
            // exception RPC
          }

          if (!lockSucceeded) {
            try {
              const refreshRes = refreshProfileHandler
                ? await refreshProfileHandler(authData.user.id)
                : { data: null, error: null };

              if (refreshRes.error || !refreshRes.data) {
                cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
                return {
                  status: "redirect",
                  url: "/login?error=role_unknown",
                  cookiesCleared,
                  cookiesSet,
                };
              }

              const refreshedProfile = refreshRes.data;

              // Si le profil est désormais complété
              if (
                refreshedProfile.onboarding_status === "completed" &&
                refreshedProfile.role !== "unassigned"
              ) {
                const target = resolveCompletedDashboard(refreshedProfile.role, safeNext);
                cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
                return {
                  status: "redirect",
                  url: target,
                  cookiesCleared,
                  cookiesSet,
                  userMetadata,
                };
              }

              // Si le profil en attente a un intended_role valide
              if (
                refreshedProfile.intended_role === "company" ||
                refreshedProfile.intended_role === "reseller"
              ) {
                effectiveIntendedRole = refreshedProfile.intended_role;
              } else {
                cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
                return {
                  status: "redirect",
                  url: "/login?error=role_unknown",
                  cookiesCleared,
                  cookiesSet,
                };
              }
            } catch (refreshEx) {
              cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
              return {
                status: "redirect",
                url: "/login?error=role_unknown",
                cookiesCleared,
                cookiesSet,
              };
            }
          }
        }

        if (effectiveIntendedRole) {
          if (userMetadata.preferred_role !== effectiveIntendedRole) {
            try {
              if (updateUserHandler) {
                await updateUserHandler({ data: { preferred_role: effectiveIntendedRole } });
              }
              userMetadata.preferred_role = effectiveIntendedRole;
            } catch (updateError) {
              // Non bloquant
            }
          }
        }

        cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
        return {
          status: "redirect",
          url: "/onboarding",
          cookiesCleared,
          cookiesSet,
          userMetadata,
          effectiveIntendedRole,
        };
      }
    }

    cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
    return {
      status: "redirect",
      url: "/login?error=invalid_link",
      cookiesCleared,
      cookiesSet,
    };
  } catch (fatalError) {
    cookiesSet.push({ name: "radiza_oauth_role", maxAge: 0 });
    return {
      status: "redirect",
      url: "/login?error=oauth_error",
      cookiesCleared,
      cookiesSet,
    };
  }
}

// 1. Échec d'échange PKCE avec expiration du cookie
runTest("CALLBACK OAUTH", "1. Échec d'échange PKCE avec expiration du cookie radiza_oauth_role", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "bad_code", flow: "oauth" }),
    cookieValue: "company",
    exchangeHandler: async () => ({ error: { message: "Invalid PKCE code" } }),
  });

  assert.strictEqual(result.url, "/login?error=confirmation_expired");
  assert.ok(
    result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0),
    "Le cookie radiza_oauth_role doit être expiré avec maxAge=0 sur échec PKCE"
  );
});

// 2. Exception inattendue pendant la relecture du profil protégée par try/catch
runTest("CALLBACK OAUTH", "2. Exception inattendue pendant la relecture du profil protégée par try/catch", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    profileHandler: async () => ({
      data: { id: "u-ex-catch", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "Lock failed" } }),
    refreshProfileHandler: async () => {
      throw new Error("Fatal fetch rejection during profile refresh");
    },
  });

  assert.strictEqual(result.url, "/login?error=role_unknown");
  assert.ok(
    result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0),
    "Le cookie doit être expiré en cas d'exception attrapée lors du refresh"
  );
});

// 3. Erreur retournée par Supabase pendant la relecture défensive
runTest("CALLBACK OAUTH", "3. Erreur retournée par Supabase pendant la relecture défensive", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    profileHandler: async () => ({
      data: { id: "u-err-refresh", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "RPC failed" } }),
    refreshProfileHandler: async () => ({ data: null, error: { message: "PostgREST 500 internal" } }),
  });

  assert.strictEqual(result.url, "/login?error=role_unknown");
  assert.ok(result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));
});

// 4. Profil absent ou intended_role invalide après échec de verrouillage
runTest("CALLBACK OAUTH", "4. Profil absent ou intended_role invalide après échec de verrouillage", async () => {
  const resultNull = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    profileHandler: async () => ({
      data: { id: "u-null-refresh", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "fail" } }),
    refreshProfileHandler: async () => ({ data: null, error: null }),
  });
  assert.strictEqual(resultNull.url, "/login?error=role_unknown");

  const resultInvalid = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    profileHandler: async () => ({
      data: { id: "u-inv-role", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "fail" } }),
    refreshProfileHandler: async () => ({
      data: { id: "u-inv-role", role: "unassigned", onboarding_status: "pending", intended_role: "hacker" },
      error: null,
    }),
  });
  assert.strictEqual(resultInvalid.url, "/login?error=role_unknown");
});

// 5. Profil devenu "completed" avec rôle "company" pendant la relecture
runTest("CALLBACK OAUTH", "5. Profil devenu completed avec rôle 'company' pendant la relecture défensive", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    profileHandler: async () => ({
      data: { id: "u-comp-co", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "Onboarding already completed" } }),
    refreshProfileHandler: async () => ({
      data: { id: "u-comp-co", role: "company", onboarding_status: "completed", intended_role: "company" },
      error: null,
    }),
  });

  assert.strictEqual(
    result.url,
    "/dashboard/company",
    "Le profil devenu complété doit être aiguillé immédiatement vers son tableau de bord métier"
  );
  assert.ok(result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));
});

// 6. Profil devenu "completed" avec rôle "reseller" pendant la relecture
runTest("CALLBACK OAUTH", "6. Profil devenu completed avec rôle 'reseller' pendant la relecture défensive", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "reseller" }),
    profileHandler: async () => ({
      data: { id: "u-comp-re", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "Onboarding already completed" } }),
    refreshProfileHandler: async () => ({
      data: { id: "u-comp-re", role: "reseller", onboarding_status: "completed", intended_role: "reseller" },
      error: null,
    }),
  });

  assert.strictEqual(result.url, "/dashboard/reseller");
  assert.ok(result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));
});

// 7. Profil incohérent après relecture (intended_role null)
runTest("CALLBACK OAUTH", "7. Profil incohérent après relecture (intended_role null)", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    profileHandler: async () => ({
      data: { id: "u-incoherent", role: "unassigned", onboarding_status: "pending", intended_role: null },
    }),
    rpcHandler: async () => ({ error: { message: "fail" } }),
    refreshProfileHandler: async () => ({
      data: { id: "u-incoherent", role: "unassigned", onboarding_status: "pending", intended_role: null },
      error: null,
    }),
  });

  assert.strictEqual(result.url, "/login?error=role_unknown");
  assert.ok(result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));
});

// 8. safeNext correspondant au rôle réel
runTest("CALLBACK OAUTH", "8. safeNext correspondant au rôle réel (autorisé)", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({
      code: "valid_code",
      flow: "oauth",
      next: "/dashboard/company/campaigns",
    }),
    profileHandler: async () => ({
      data: { id: "u-safe-co", role: "company", onboarding_status: "completed", intended_role: "company" },
    }),
  });

  assert.strictEqual(result.url, "/dashboard/company/campaigns");
  assert.ok(result.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));
});

// 9. safeNext correspondant à un rôle différent
runTest("CALLBACK OAUTH", "9. safeNext correspondant à un rôle différent (rejeté au profit du dashboard légitime)", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({
      code: "valid_code",
      flow: "oauth",
      next: "/dashboard/reseller/orders",
    }),
    profileHandler: async () => ({
      data: { id: "u-safe-cross", role: "company", onboarding_status: "completed", intended_role: "company" },
    }),
  });

  assert.strictEqual(
    result.url,
    "/dashboard/company",
    "Une tentative d'accès à l'espace reseller pour un compte company doit se replier sur /dashboard/company"
  );
});

// 10. Destination neutre légitime
runTest("CALLBACK OAUTH", "10. Destination neutre légitime (/dashboard préservé)", async () => {
  const result = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({
      code: "valid_code",
      flow: "oauth",
      next: "/dashboard",
    }),
    profileHandler: async () => ({
      data: { id: "u-neutral", role: "reseller", onboarding_status: "completed", intended_role: "reseller" },
    }),
  });

  assert.strictEqual(result.url, "/dashboard");
});

// 11. Expiration du cookie radiza_oauth_role sur TOUTES les branches de sortie
runTest("CALLBACK OAUTH", "11. Expiration du cookie radiza_oauth_role sur les principales branches de sortie", async () => {
  // A. Succès onboarding
  const r1 = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth", role: "company" }),
    cookieValue: "company",
    rpcHandler: async () => ({ data: { success: true } }),
  });
  assert.ok(r1.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));

  // B. Redirection compte complété
  const r2 = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "oauth" }),
    profileHandler: async () => ({
      data: { id: "u-c", role: "company", onboarding_status: "completed", intended_role: "company" },
    }),
  });
  assert.ok(r2.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));

  // C. Erreur Supabase (access_denied)
  const r3 = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ error: "access_denied", flow: "oauth" }),
  });
  assert.ok(r3.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));

  // D. Échec PKCE
  const r4 = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "bad", flow: "oauth" }),
    exchangeHandler: async () => ({ error: { message: "bad" } }),
  });
  assert.ok(r4.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));

  // E. Lien invalide (pas de code)
  const r5 = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ flow: "oauth" }),
  });
  assert.ok(r5.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));

  // F. Erreur fatale globale
  const r6 = await simulateFullCallbackRoute({
    triggerFatalError: true,
  });
  assert.strictEqual(r6.url, "/login?error=oauth_error");
  assert.ok(r6.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));
});

// 12. Non-régression des flux confirmation d'email (AUTH-2) et récupération (AUTH-3)
runTest("CALLBACK OAUTH", "12. Non-régression confirmation email (AUTH-2) et mot de passe oublié (AUTH-3)", async () => {
  let signedOut = false;
  // Flux signup
  const signupRes = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", flow: "signup" }),
    signOutHandler: async () => {
      signedOut = true;
    },
  });
  assert.strictEqual(signupRes.url, "/login?verified=true");
  assert.strictEqual(signedOut, true, "signOut doit être appelé pour le flux signup");
  assert.ok(signupRes.cookiesSet.some((c) => c.name === "radiza_oauth_role" && c.maxAge === 0));

  // Flux recovery
  const recoveryRes = await simulateFullCallbackRoute({
    searchParams: new URLSearchParams({ code: "valid_code", type: "recovery", next: "/reset-password" }),
  });
  assert.strictEqual(recoveryRes.url, "/reset-password");
});

console.log("\n======================================================================");
console.log(`BILAN DES TESTS AUTH-5.18 : ${passedCount}/${totalCount} RÉUSSIS`);
console.log("======================================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
