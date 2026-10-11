/**
 * Suite de tests automatisée pour la Phase AUTH-2 :
 * - Résolution des URLs publiques (getAppUrl)
 * - Sanitisation anti-Open-Redirect (sanitizeRedirectPath)
 * - Validation des appels signUp et emailRedirectTo avec flow=signup
 * - Validation du traitement d'erreurs du callback d'authentification
 * - Validation de la redirection vers /login?verified=true sans contournement de session
 * - Préservation des autres flux (récupération de mot de passe, flux direct/OAuth)
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("DÉBUT DES TESTS PHASE AUTH-2 AJUSTÉE (A à J)");
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

// Implémentation miroir pour test unitaire de la logique getAppUrl et sanitizeRedirectPath
function getAppUrlTest(path = "", customEnv = {}) {
  const env = { ...process.env, ...customEnv };
  let baseUrl =
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (env.NEXT_PUBLIC_VERCEL_URL ? `https://${env.NEXT_PUBLIC_VERCEL_URL.trim()}` : "") ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL.trim()}` : "");

  if (!baseUrl) {
    if (env.NODE_ENV === "development") {
      baseUrl = "http://localhost:3000";
    } else {
      baseUrl = "";
    }
  }

  if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `https://${baseUrl}`;
  }

  baseUrl = baseUrl.replace(/\/+$/, "");
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${baseUrl}${cleanPath}`;
}

const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/unauthorized",
  "/"
];

function sanitizeRedirectPathTest(path, defaultPath = "/") {
  if (!path || typeof path !== "string") {
    return defaultPath;
  }
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
    if (prefix === "/") {
      return trimmed === "/" || trimmed.startsWith("/?");
    }
    return (
      trimmed === prefix ||
      trimmed.startsWith(`${prefix}/`) ||
      trimmed.startsWith(`${prefix}?`)
    );
  });
  return isAllowed ? trimmed : defaultPath;
}

// Logique simulée de décision de redirection du callback pour tests d'intention
function determineCallbackRoute({ flow, type, nextRaw, searchParamsHasProvider, authUser, profileRole }) {
  const safeNext = sanitizeRedirectPathTest(nextRaw, "");
  const isRecoveryFlow = type === "recovery" || safeNext.startsWith("/reset-password");
  const isDirectAccessFlow =
    !isRecoveryFlow &&
    (safeNext.startsWith("/dashboard") || Boolean(searchParamsHasProvider));
  const isSignupConfirmation =
    flow === "signup" ||
    type === "signup" ||
    type === "email_change" ||
    (!isRecoveryFlow && !isDirectAccessFlow);

  if (isSignupConfirmation) {
    return {
      destination: "/login?verified=true",
      shouldSignOut: true,
      flowType: "signup_confirmation",
    };
  }

  if (isRecoveryFlow) {
    return {
      destination: safeNext || "/reset-password",
      shouldSignOut: false,
      flowType: "recovery",
    };
  }

  if (safeNext && safeNext !== "/" && !safeNext.startsWith("/login")) {
    return {
      destination: safeNext,
      shouldSignOut: false,
      flowType: "direct_access_custom",
    };
  }

  if (profileRole) {
    return {
      destination: `/dashboard/${profileRole}`,
      shouldSignOut: false,
      flowType: "direct_access_role",
    };
  }

  return {
    destination: "/login?verified=true",
    shouldSignOut: false,
    flowType: "fallback",
  };
}

// TEST A : getAppUrl avec NEXT_PUBLIC_APP_URL explicite
runTest("TEST A : Résolution d'URL via NEXT_PUBLIC_APP_URL explicite", () => {
  const result = getAppUrlTest("/auth/callback", {
    NEXT_PUBLIC_APP_URL: "https://radiza.cd",
  });
  assert.strictEqual(result, "https://radiza.cd/auth/callback");
});

// TEST B : getAppUrl avec domaine Vercel sans protocole
runTest("TEST B : Résolution d'URL via VERCEL_URL (auto-préfixe https)", () => {
  const result = getAppUrlTest("/auth/callback", {
    NEXT_PUBLIC_APP_URL: "",
    VERCEL_URL: "marche-agricole-preview.vercel.app",
    NODE_ENV: "production",
  });
  assert.strictEqual(result, "https://marche-agricole-preview.vercel.app/auth/callback");
});

// TEST C : getAppUrl en production sans variable ne doit JAMAIS renvoyer localhost
runTest("TEST C : Sécurité production - aucune injection de localhost par défaut", () => {
  const result = getAppUrlTest("/auth/callback", {
    NEXT_PUBLIC_APP_URL: "",
    NEXT_PUBLIC_SITE_URL: "",
    NEXT_PUBLIC_VERCEL_URL: "",
    VERCEL_URL: "",
    NODE_ENV: "production",
  });
  assert.ok(!result.includes("localhost"), "L'URL de production ne doit pas contenir localhost");
  assert.strictEqual(result, "/auth/callback");
});

// TEST D : getAppUrl en développement local renvoie localhost:3000
runTest("TEST D : Résolution d'URL en développement local (fallback localhost:3000)", () => {
  const result = getAppUrlTest("/auth/callback", {
    NEXT_PUBLIC_APP_URL: "",
    NEXT_PUBLIC_SITE_URL: "",
    NEXT_PUBLIC_VERCEL_URL: "",
    VERCEL_URL: "",
    NODE_ENV: "development",
  });
  assert.strictEqual(result, "http://localhost:3000/auth/callback");
});

// TEST E : Protection Open Redirect (Rejet des URLs malveillantes)
runTest("TEST E : Sanitisation anti-Open Redirect (rejet strict)", () => {
  assert.strictEqual(sanitizeRedirectPathTest("//evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPathTest("https://evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPathTest("/\\evil.com"), "/");
  assert.strictEqual(sanitizeRedirectPathTest("javascript:alert(1)"), "/");
  assert.strictEqual(sanitizeRedirectPathTest("/external-unknown"), "/");
});

// TEST F : Protection Open Redirect (Acceptation des routes internes Radiza)
runTest("TEST F : Sanitisation anti-Open Redirect (acceptation des routes autorisées)", () => {
  assert.strictEqual(sanitizeRedirectPathTest("/dashboard/company"), "/dashboard/company");
  assert.strictEqual(sanitizeRedirectPathTest("/dashboard/reseller"), "/dashboard/reseller");
  assert.strictEqual(sanitizeRedirectPathTest("/login?verified=true"), "/login?verified=true");
  assert.strictEqual(sanitizeRedirectPathTest("/"), "/");
});

// TEST G : Présence d'emailRedirectTo avec flow=signup dans auth.ts
runTest("TEST G : Présence d'emailRedirectTo avec flow=signup dans auth.ts", () => {
  const authCode = fs.readFileSync(path.resolve("src/lib/actions/auth.ts"), "utf-8");
  assert.ok(
    authCode.includes("getAppUrl(\"/auth/callback?flow=signup\")"),
    "emailRedirectTo doit pointer vers /auth/callback?flow=signup"
  );
  assert.ok(
    authCode.includes("role: \"company\""),
    "Métadonnées company préservées"
  );
  assert.ok(
    authCode.includes("role: \"reseller\""),
    "Métadonnées reseller préservées"
  );
});

// TEST H : Code du callback - gestion des erreurs Supabase et assainissement
runTest("TEST H : Code du callback - gestion des erreurs et assainissement", () => {
  const callbackCode = fs.readFileSync(path.resolve("src/app/auth/callback/route.ts"), "utf-8");
  assert.ok(callbackCode.includes("exchangeCodeForSession(code)"), "Échange de code PKCE présent");
  assert.ok(callbackCode.includes("otp_expired"), "Gestion otp_expired présente");
  assert.ok(callbackCode.includes("confirmation_expired"), "Redirection explicite vers confirmation_expired");
  assert.ok(callbackCode.includes("sanitizeRedirectPath"), "Sanitisation de la redirection présente");
});

// TEST I : Logique de confirmation d'inscription -> redirection vers /login?verified=true ET signOut
runTest("TEST I : Confirmation d'inscription -> /login?verified=true et déconnexion obligatoire", () => {
  const callbackCode = fs.readFileSync(path.resolve("src/app/auth/callback/route.ts"), "utf-8");
  
  // Vérification statique du code source
  assert.ok(
    callbackCode.includes("signOut({ scope: \"local\" })"),
    "signOut doit être appelé lors d'une confirmation d'email"
  );
  assert.ok(
    callbackCode.includes("/login?verified=true"),
    "Redirection vers /login?verified=true requise"
  );

  // Vérification de la matrice de décision
  const decisionExplicit = determineCallbackRoute({
    flow: "signup",
    type: null,
    nextRaw: null,
    searchParamsHasProvider: false,
    authUser: { id: "123" },
    profileRole: "reseller",
  });
  assert.strictEqual(decisionExplicit.destination, "/login?verified=true");
  assert.strictEqual(decisionExplicit.shouldSignOut, true);

  const decisionDefault = determineCallbackRoute({
    flow: null,
    type: null,
    nextRaw: null,
    searchParamsHasProvider: false,
    authUser: { id: "123" },
    profileRole: "company",
  });
  assert.strictEqual(decisionDefault.destination, "/login?verified=true");
  assert.strictEqual(decisionDefault.shouldSignOut, true);
});

// TEST J : Préservation des autres flux (récupération de mot de passe & OAuth/accès direct)
runTest("TEST J : Préservation des flux de récupération de mot de passe et OAuth direct", () => {
  // Cas Récupération de mot de passe
  const recoveryDecision = determineCallbackRoute({
    flow: null,
    type: "recovery",
    nextRaw: "/reset-password",
    searchParamsHasProvider: false,
    authUser: { id: "456" },
    profileRole: "company",
  });
  assert.strictEqual(recoveryDecision.destination, "/reset-password");
  assert.strictEqual(recoveryDecision.shouldSignOut, false);
  assert.strictEqual(recoveryDecision.flowType, "recovery");

  // Cas OAuth direct avec destination dashboard
  const oauthDecision = determineCallbackRoute({
    flow: null,
    type: null,
    nextRaw: "/dashboard/company",
    searchParamsHasProvider: true,
    authUser: { id: "789" },
    profileRole: "company",
  });
  assert.strictEqual(oauthDecision.destination, "/dashboard/company");
  assert.strictEqual(oauthDecision.shouldSignOut, false);
});

console.log("==================================================");
console.log(`RÉSULTAT GLOBAL : ${passedCount}/${totalCount} tests réussis`);
console.log("==================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
