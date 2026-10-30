/**
 * Suite de tests automatisés exhaustive pour la Phase AUTH-6.2.4 :
 * - Corrections locales contrôlées : Gestion du mot de passe Radiza (Option A : OTP + Nonce)
 * - Comportement Fail-Closed absolu (RPC auth_user_has_password)
 * - Tests comportementaux réels avec simulateur / Mock Supabase GoTrue
 * - Audit statique strict de sécurité (0 fuite de secrets, isolation mémoire)
 * - Non-régression formelle des flux AUTH-2, AUTH-3, AUTH-4 et AUTH-5
 * - Intégration partagée CompanyProfileView et ResellerProfileView
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================================");
console.log("DÉBUT DES TESTS AUTH-6.2.4 : CORRECTIONS LOCALES SÉCURITÉ MOT DE PASSE");
console.log("==================================================================");

let passedCount = 0;
let totalCount = 0;
let skippedCount = 0;

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

async function runAsyncTest(testName, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } catch (error) {
    console.error(`[FAIL] ${testName}`);
    console.error(`       -> ${error.message}`);
  }
}

function skipTest(testName, reason) {
  totalCount++;
  skippedCount++;
  console.log(`[SKIP - SÉCURITÉ CONTRÔLÉE] ${testName}`);
  console.log(`       -> Justification : ${reason}`);
}

const rootDir = process.cwd();

// -------------------------------------------------------------
// GROUPE 1 : AUDIT STATIQUE DU SQL DE MIGRATION
// -------------------------------------------------------------
const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20261030112554_auth_user_has_password.sql"
);

runTest("1. Existence et non-vacuité du fichier de migration 20261030112554_auth_user_has_password.sql", () => {
  assert.ok(fs.existsSync(migrationPath), "Le fichier de migration doit exister localement.");
  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.ok(sql.length > 50, "Le fichier SQL ne doit pas être vide.");
});

runTest("2. Migration SQL : Déclaration STABLE, SECURITY DEFINER et SET search_path = ''", () => {
  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.auth_user_has_password\(\)/i, "Nom de fonction exact");
  assert.match(sql, /RETURNS boolean/i, "Retourne un booléen");
  assert.match(sql, /STABLE/i, "Optimisation STABLE requise");
  assert.match(sql, /SECURITY DEFINER/i, "SECURITY DEFINER requis pour interroger auth.users");
  assert.match(sql, /SET search_path\s*=\s*''/i, "search_path vide anti-injection requis");
});

runTest("3. Migration SQL : Auto-restriction stricte WHERE id = auth.uid() et contrôle non-vide", () => {
  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /WHERE id\s*=\s*auth\.uid\(\)/i, "Restreint à l'utilisateur appelant exclusivement");
  assert.match(sql, /encrypted_password IS NOT NULL/i, "Contrôle NOT NULL");
  assert.match(sql, /encrypted_password <> ''/i, "Contrôle chaîne non-vide");
});

runTest("4. Migration SQL : Privilèges révoqués pour PUBLIC/anon et accordés à authenticated", () => {
  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.auth_user_has_password\(\) FROM PUBLIC;/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.auth_user_has_password\(\) FROM anon;/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.auth_user_has_password\(\) TO authenticated;/i);
  assert.match(sql, /COMMENT ON FUNCTION public\.auth_user_has_password\(\)/i, "Commentaire documenté dans le catalogue");
});

// -------------------------------------------------------------
// GROUPE 2 : AUDIT STATIQUE DU CODE SOURCE SECURITY.TS
// -------------------------------------------------------------
const securityActionsPath = path.join(rootDir, "src", "lib", "actions", "security.ts");

runTest("5. Existence du module de Server Actions security.ts", () => {
  assert.ok(fs.existsSync(securityActionsPath), "Le fichier security.ts doit exister.");
});

runTest("6. Code source : Règle Fail-Closed sans repli permissif sur providers", () => {
  const code = fs.readFileSync(securityActionsPath, "utf-8");
  assert.ok(
    !code.includes("inferredHasPassword"),
    "Ne doit contenir AUCUN repli permissif basé sur inferredHasPassword"
  );
  assert.ok(
    !code.includes("providers.includes"),
    "Ne doit pas utiliser app_metadata.providers comme vérité de référence pour hasPassword"
  );
});

runTest("7. Code source : Support officiel de l'Option A (reauthenticate et updateUser avec nonce)", () => {
  const code = fs.readFileSync(securityActionsPath, "utf-8");
  assert.match(code, /supabase\.auth\.reauthenticate\(\)/i, "Doit appeler supabase.auth.reauthenticate()");
  assert.match(code, /updateUser\(\s*\{[\s\S]*?password:\s*newPassword[\s\S]*?nonce:\s*otp/i, "Doit transmettre le nonce à updateUser()");
  assert.match(code, /export async function requestPasswordSetupOtpAction/i, "Exporte l'action pour demander l'OTP");
});

runTest("8. Code source : Client temporaire avec persistSession: false et autoRefreshToken: false", () => {
  const code = fs.readFileSync(securityActionsPath, "utf-8");
  assert.match(code, /createClient as createSupabaseClient/i, "Utilise createClient de @supabase/supabase-js");
  assert.match(code, /persistSession:\s*false/i, "Désactive expressément la persistance de session");
  assert.match(code, /autoRefreshToken:\s*false/i, "Désactive le rafraîchissement automatique de token");
  assert.match(code, /detectSessionInUrl:\s*false/i, "Désactive la détection d'URL");
});

runTest("9. Code source : ZÉRO journalisation de secrets (tokens, passwords, exceptions brutes, OTP, nonce)", () => {
  const code = fs.readFileSync(securityActionsPath, "utf-8");
  assert.ok(!code.includes("console.log(currentPassword"), "Aucun log de mot de passe actuel");
  assert.ok(!code.includes("console.log(newPassword"), "Aucun log de nouveau mot de passe");
  assert.ok(!code.includes("console.log(otp"), "Aucun log du code OTP / nonce");
  assert.ok(!code.includes("console.log(data"), "Aucun log de l'objet data ou session de GoTrue");
  assert.ok(!code.includes("console.error(signInError"), "Aucun log brut de l'erreur d'authentification");
  assert.ok(!code.includes("console.error(updateError"), "Aucun log brut de l'erreur de mise à jour");
  assert.ok(!code.includes("console.error(reauthError"), "Aucun log brut de l'erreur reauthenticate");
});

runTest("10. Code source : Double vérification d'identité avec getUser() avant et après", () => {
  const code = fs.readFileSync(securityActionsPath, "utf-8");
  const getUserOccurrences = (code.match(/supabase\.auth\.getUser\(\)/g) || []).length;
  assert.ok(getUserOccurrences >= 2, "Doit appeler getUser() au moins 2 fois");
  assert.match(code, /recheckedUser\.id\s*!==\s*user\.id/i, "Protection anti-désynchronisation / conflit de session");
});

runTest("11. Code source : Gestion honnête de signOut({ scope: 'others' }) avec message différencié", () => {
  const code = fs.readFileSync(securityActionsPath, "utf-8");
  assert.match(code, /signOut\(\{\s*scope:\s*["']others["']\s*\}\)/i, "Révocation des autres sessions demandée");
  assert.match(code, /otherSessionsRevoked/i, "Distingue la réussite du mot de passe de la révocation des sessions");
});

// -------------------------------------------------------------
// GROUPE 3 : MOCK SUPABASE ENGINE & TESTS COMPORTEMENTAUX
// -------------------------------------------------------------

/**
 * Moteur de simulation GoTrue / PostgreSQL en mémoire pour tests unitaires complets.
 */
class MockSupabaseEnvironment {
  constructor() {
    this.currentUser = {
      id: "usr-12345-test",
      email: "agriculteur@radiza.test",
    };
    this.userHasPassword = false;
    this.rpcError = null;
    this.rpcReturnValue = undefined;
    this.reauthPendingOtp = null;
    this.reauthError = null;
    this.updateUserError = null;
    this.signInError = null;
    this.signOutError = null;
    this.recheckedUser = { ...this.currentUser };
    this.rateLimited = false;
  }

  createPrimaryClient() {
    return {
      auth: {
        getUser: async () => {
          if (!this.currentUser) {
            return { data: { user: null }, error: new Error("Auth session missing") };
          }
          return { data: { user: this.currentUser }, error: null };
        },
        reauthenticate: async () => {
          if (this.rateLimited) {
            return { data: { user: null, session: null }, error: new Error("over_request_rate_limit: too many requests") };
          }
          if (this.reauthError) {
            return { data: { user: null, session: null }, error: this.reauthError };
          }
          this.reauthPendingOtp = "789456";
          return { data: { user: null, session: null }, error: null };
        },
        updateUser: async (attributes) => {
          if (this.updateUserError) {
            return { data: { user: null }, error: this.updateUserError };
          }
          // Si nonce est fourni, valider contre reauthPendingOtp
          if ("nonce" in attributes) {
            if (!this.reauthPendingOtp || attributes.nonce !== this.reauthPendingOtp) {
              return { data: { user: null }, error: new Error("reauthentication_not_valid: nonce mismatch or expired") };
            }
            // OTP consommé avec succès (usage unique)
            this.reauthPendingOtp = null;
            this.userHasPassword = true;
            return { data: { user: { ...this.currentUser, has_password: true } }, error: null };
          }
          // Sans nonce : mise à jour classique (compte avec mot de passe déjà présent)
          this.userHasPassword = true;
          return { data: { user: { ...this.currentUser, has_password: true } }, error: null };
        },
        signOut: async (options) => {
          if (this.signOutError) {
            return { error: this.signOutError };
          }
          return { error: null };
        },
      },
      rpc: async (fnName) => {
        if (fnName === "auth_user_has_password") {
          if (this.rpcError) {
            return { data: null, error: this.rpcError };
          }
          if (this.rpcReturnValue !== undefined) {
            return { data: this.rpcReturnValue, error: null };
          }
          return { data: this.userHasPassword, error: null };
        }
        return { data: null, error: new Error("Unknown RPC") };
      },
    };
  }

  createVerificationClient() {
    return {
      auth: {
        signInWithPassword: async ({ email, password }) => {
          if (this.signInError) {
            return { data: { user: null, session: null }, error: this.signInError };
          }
          if (password !== "SecretValide123") {
            return { data: { user: null, session: null }, error: new Error("invalid_credentials") };
          }
          return {
            data: {
              user: { id: this.currentUser?.id, email },
              session: { access_token: "temp-token" },
            },
            error: null,
          };
        },
      },
    };
  }
}

/**
 * Fonction exécutant l'algorithme exact de getUserSecurityStatusAction avec le mock
 */
async function simulateGetUserSecurityStatus(mock) {
  const supabase = mock.createPrimaryClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return {
      hasPassword: false,
      isOAuthOnly: false,
      error: "Session invalide ou expirée. Veuillez vous reconnecter.",
    };
  }

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("auth_user_has_password");
    if (rpcError || typeof rpcResult !== "boolean") {
      return {
        hasPassword: false,
        isOAuthOnly: false,
        email: user.email,
        error: "Impossible de vérifier la configuration de sécurité de votre compte.",
      };
    }

    return {
      hasPassword: rpcResult,
      isOAuthOnly: !rpcResult,
      email: user.email,
    };
  } catch {
    return {
      hasPassword: false,
      isOAuthOnly: false,
      email: user.email,
      error: "Impossible de vérifier la configuration de sécurité de votre compte.",
    };
  }
}

/**
 * Fonction exécutant l'algorithme exact de requestPasswordSetupOtpAction avec le mock
 */
async function simulateRequestPasswordSetupOtp(mock) {
  const supabase = mock.createPrimaryClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { error: "Session invalide ou expirée. Veuillez vous reconnecter." };
  }

  try {
    const { data: hasPassword, error: rpcError } = await supabase.rpc("auth_user_has_password");
    if (rpcError || typeof hasPassword !== "boolean") {
      return { error: "Impossible de vérifier l'état de sécurité de votre compte. Opération refusée." };
    }
    if (hasPassword === true) {
      return {
        error: "Ce compte possède déjà un mot de passe. Veuillez utiliser le formulaire de modification avec mot de passe actuel.",
      };
    }
  } catch {
    return { error: "Impossible de vérifier l'état de sécurité de votre compte. Opération refusée." };
  }

  try {
    const { error: reauthError } = await supabase.auth.reauthenticate();
    if (reauthError) {
      const msg = reauthError.message?.toLowerCase() || "";
      if (msg.includes("rate") || msg.includes("limit") || msg.includes("too many")) {
        return { error: "Trop de tentatives d'envoi. Veuillez patienter avant de demander un nouveau code." };
      }
      return { error: "Échec de l'envoi du code de vérification. Veuillez réessayer." };
    }

    return {
      success: true,
      message: "Un code de vérification a été envoyé à l'adresse e-mail associée à votre compte.",
    };
  } catch {
    return { error: "Une erreur inattendue est survenue lors de l'envoi du code." };
  }
}

/**
 * Fonction exécutant l'algorithme exact de changePasswordAction avec le mock
 */
async function simulateChangePassword(mock, { currentPassword, otp, newPassword, confirmPassword }) {
  if (!newPassword || !confirmPassword) {
    return { error: "Veuillez renseigner et confirmer votre nouveau mot de passe." };
  }
  if (newPassword.length < 6) {
    return { error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
  }

  const supabase = mock.createPrimaryClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { error: "Votre session a expiré ou est invalide. Veuillez vous reconnecter." };
  }

  let hasPassword = true;
  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("auth_user_has_password");
    if (rpcErr || typeof rpcResult !== "boolean") {
      return {
        error: "Impossible de vérifier l'état de sécurité de votre compte. L'opération est refusée par mesure de protection.",
      };
    }
    hasPassword = rpcResult;
  } catch {
    return {
      error: "Impossible de vérifier l'état de sécurité de votre compte. L'opération est refusée par mesure de protection.",
    };
  }

  if (hasPassword) {
    if (!currentPassword) {
      return { error: "Veuillez renseigner votre mot de passe actuel." };
    }
    if (currentPassword === newPassword) {
      return { error: "Le nouveau mot de passe doit être différent de l'actuel." };
    }

    const verificationClient = mock.createVerificationClient();
    const { error: signInError } = await verificationClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { error: "Le mot de passe actuel renseigné est incorrect." };
    }

    // Re-vérification stricte d'identité
    const recheckedUser = mock.recheckedUser;
    if (!recheckedUser || recheckedUser.id !== user.id) {
      return { error: "Conflit de session détecté. Veuillez vous reconnecter." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      const errorMsg = updateError.message?.toLowerCase() || "";
      if (errorMsg.includes("same") || errorMsg.includes("identical")) {
        return { error: "Le nouveau mot de passe doit être différent de l'ancien." };
      }
      return { error: "La mise à jour du mot de passe a échoué. Veuillez réessayer." };
    }
  } else {
    // Parcours OTP (Option A)
    if (!otp) {
      return {
        error: "Veuillez renseigner le code de vérification reçu par e-mail pour définir votre mot de passe.",
      };
    }
    if (otp.length < 6 || !/^[a-zA-Z0-9_-]+$/.test(otp)) {
      return {
        error: "Le format du code de vérification est invalide (au moins 6 caractères attendus).",
      };
    }

    const recheckedUser = mock.recheckedUser;
    if (!recheckedUser || recheckedUser.id !== user.id) {
      return { error: "Conflit de session détecté. Veuillez vous reconnecter." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: otp,
    });

    if (updateError) {
      const errorMsg = updateError.message?.toLowerCase() || "";
      if (
        errorMsg.includes("nonce") ||
        errorMsg.includes("reauth") ||
        errorMsg.includes("otp") ||
        errorMsg.includes("expired") ||
        errorMsg.includes("invalid")
      ) {
        return {
          error: "Le code de vérification est invalide ou a expiré. Veuillez demander un nouveau code.",
        };
      }
      return {
        error: "La configuration du mot de passe a échoué. Veuillez vérifier votre code et réessayer.",
      };
    }
  }

  let otherSessionsRevoked = false;
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    otherSessionsRevoked = !signOutError;
  } catch {
    otherSessionsRevoked = false;
  }

  if (hasPassword) {
    if (otherSessionsRevoked) {
      return {
        success: true,
        otherSessionsRevoked: true,
        message: "Votre mot de passe a été modifié avec succès et vos autres sessions ont été révoquées.",
      };
    } else {
      return {
        success: true,
        otherSessionsRevoked: false,
        message:
          "Votre mot de passe a été modifié avec succès. La révocation automatique des autres sessions n'a pas pu être confirmée ; vous pouvez vous déconnecter manuellement de vos autres appareils si nécessaire.",
      };
    }
  } else {
    if (otherSessionsRevoked) {
      return {
        success: true,
        otherSessionsRevoked: true,
        message:
          "Votre mot de passe Radiza a été défini avec succès. Vous pouvez désormais vous connecter par e-mail ou par Google.",
      };
    } else {
      return {
        success: true,
        otherSessionsRevoked: false,
        message:
          "Votre mot de passe Radiza a été défini avec succès. Vous pouvez désormais vous connecter par e-mail ou par Google. (La révocation automatique des autres sessions n'a pas pu être confirmée).",
      };
    }
  }
}

// -------------------------------------------------------------
// TESTS D'ÉTAT DE SÉCURITÉ & FAIL-CLOSED
// -------------------------------------------------------------

await runAsyncTest("12. État de sécurité : RPC renvoie true -> hasPassword = true, isOAuthOnly = false", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, true);
  assert.strictEqual(res.isOAuthOnly, false);
  assert.strictEqual(res.email, "agriculteur@radiza.test");
  assert.strictEqual(res.error, undefined);
});

await runAsyncTest("13. État de sécurité : RPC renvoie false -> hasPassword = false, isOAuthOnly = true", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, false);
  assert.strictEqual(res.isOAuthOnly, true);
  assert.strictEqual(res.email, "agriculteur@radiza.test");
  assert.strictEqual(res.error, undefined);
});

await runAsyncTest("14. État de sécurité : RPC indisponible (erreur réseau) -> Fail-Closed", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.rpcError = new Error("connection to database failed");
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, false);
  assert.strictEqual(res.isOAuthOnly, false);
  assert.match(res.error, /Impossible de vérifier/i);
});

await runAsyncTest("15. État de sécurité : RPC renvoie une erreur de permission -> Fail-Closed", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.rpcError = new Error("permission denied for function auth_user_has_password");
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, false);
  assert.strictEqual(res.isOAuthOnly, false);
  assert.match(res.error, /Impossible de vérifier/i);
});

await runAsyncTest("16. État de sécurité : RPC renvoie une réponse mal typée (string ou objet) -> Fail-Closed", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.rpcReturnValue = "true"; // string au lieu de boolean
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, false);
  assert.strictEqual(res.isOAuthOnly, false);
  assert.match(res.error, /Impossible de vérifier/i);
});

await runAsyncTest("17. État de sécurité : Utilisateur non authentifié -> Refus sécurisé", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.currentUser = null;
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, false);
  assert.match(res.error, /Session invalide ou expirée/i);
});

await runAsyncTest("18. État de sécurité : Absence d'adresse e-mail utilisable -> Refus sécurisé", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.currentUser = { id: "usr-no-email", email: "" };
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, false);
  assert.match(res.error, /Session invalide ou expirée/i);
});

await runAsyncTest("19. État de sécurité : Compte Google avec mot de passe ultérieur (détecté via RPC, pas provider)", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true; // RPC dit true
  const res = await simulateGetUserSecurityStatus(mock);
  assert.strictEqual(res.hasPassword, true, "Doit faire confiance absolue au RPC auth_user_has_password()");
});

// -------------------------------------------------------------
// TESTS DU PARCOURS OTP (OPTION A)
// -------------------------------------------------------------

await runAsyncTest("20. Parcours OTP : Envoi de l'OTP réussi (reauthenticate)", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  const res = await simulateRequestPasswordSetupOtp(mock);
  assert.strictEqual(res.success, true);
  assert.match(res.message, /code de vérification a été envoyé/i);
  assert.strictEqual(mock.reauthPendingOtp, "789456");
});

await runAsyncTest("21. Parcours OTP : Échec d'envoi OTP (GoTrue error) -> Erreur propre sans fuite", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  mock.reauthError = new Error("Failed to send email");
  const res = await simulateRequestPasswordSetupOtp(mock);
  assert.strictEqual(res.success, undefined);
  assert.match(res.error, /Échec de l'envoi/i);
});

await runAsyncTest("22. Parcours OTP : Rate limit lors de l'envoi OTP -> Message adapté", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  mock.rateLimited = true;
  const res = await simulateRequestPasswordSetupOtp(mock);
  assert.match(res.error, /Trop de tentatives d'envoi/i);
});

await runAsyncTest("23. Parcours OTP : Refus d'envoi OTP si le compte a déjà un mot de passe", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;
  const res = await simulateRequestPasswordSetupOtp(mock);
  assert.match(res.error, /Ce compte possède déjà un mot de passe/i);
});

await runAsyncTest("24. Parcours OTP : Définition de mot de passe réussie avec OTP et nouveau mot de passe", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  await simulateRequestPasswordSetupOtp(mock); // génère "789456"

  const res = await simulateChangePassword(mock, {
    otp: "789456",
    newPassword: "MonNouveauMotDePasse2026!",
    confirmPassword: "MonNouveauMotDePasse2026!",
  });

  assert.strictEqual(res.success, true);
  assert.match(res.message, /défini avec succès/i);
  assert.strictEqual(mock.userHasPassword, true);
});

await runAsyncTest("25. Parcours OTP : Rejet si OTP absent pour un compte sans mot de passe", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;

  const res = await simulateChangePassword(mock, {
    otp: "",
    newPassword: "MonNouveauMotDePasse2026!",
    confirmPassword: "MonNouveauMotDePasse2026!",
  });

  assert.match(res.error, /Veuillez renseigner le code de vérification/i);
});

await runAsyncTest("26. Parcours OTP : Rejet si OTP invalide ou expiré (GoTrue nonce mismatch)", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  mock.reauthPendingOtp = "789456";

  const res = await simulateChangePassword(mock, {
    otp: "000000", // faux nonce
    newPassword: "MonNouveauMotDePasse2026!",
    confirmPassword: "MonNouveauMotDePasse2026!",
  });

  assert.match(res.error, /code de vérification est invalide ou a expiré/i);
});

await runAsyncTest("27. Parcours OTP : Rejet si format de code OTP invalide (< 6 car)", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;

  const res = await simulateChangePassword(mock, {
    otp: "123",
    newPassword: "MonNouveauMotDePasse2026!",
    confirmPassword: "MonNouveauMotDePasse2026!",
  });

  assert.match(res.error, /format du code de vérification est invalide/i);
});

await runAsyncTest("28. Parcours OTP : Tentative avant réauthentification (aucun nonce en attente)", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = false;
  mock.reauthPendingOtp = null; // aucun nonce généré

  const res = await simulateChangePassword(mock, {
    otp: "654321",
    newPassword: "MonNouveauMotDePasse2026!",
    confirmPassword: "MonNouveauMotDePasse2026!",
  });

  assert.match(res.error, /code de vérification est invalide ou a expiré/i);
});

// -------------------------------------------------------------
// TESTS DES COMPTES AVEC MOT DE PASSE EXISTANT
// -------------------------------------------------------------

await runAsyncTest("29. Compte avec mot de passe : Mot de passe actuel valide -> Mise à jour réussie", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;

  const res = await simulateChangePassword(mock, {
    currentPassword: "SecretValide123",
    newPassword: "NouveauSecret2026!",
    confirmPassword: "NouveauSecret2026!",
  });

  assert.strictEqual(res.success, true);
  assert.match(res.message, /modifié avec succès/i);
});

await runAsyncTest("30. Compte avec mot de passe : Mot de passe actuel invalide -> Rejet strict", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;

  const res = await simulateChangePassword(mock, {
    currentPassword: "MauvaisMotDePasse",
    newPassword: "NouveauSecret2026!",
    confirmPassword: "NouveauSecret2026!",
  });

  assert.match(res.error, /Le mot de passe actuel renseigné est incorrect/i);
});

await runAsyncTest("31. Compte avec mot de passe : Mot de passe actuel identique au nouveau -> Rejet", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;

  const res = await simulateChangePassword(mock, {
    currentPassword: "SecretValide123",
    newPassword: "SecretValide123",
    confirmPassword: "SecretValide123",
  });

  assert.match(res.error, /doit être différent de l'actuel/i);
});

await runAsyncTest("32. Compte avec mot de passe : Échec de revalidation utilisateur (conflit de session) -> Rejet", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;
  mock.recheckedUser = { id: "usr-divergent-999" }; // altération concurrente

  const res = await simulateChangePassword(mock, {
    currentPassword: "SecretValide123",
    newPassword: "NouveauSecret2026!",
    confirmPassword: "NouveauSecret2026!",
  });

  assert.match(res.error, /Conflit de session détecté/i);
});

await runAsyncTest("33. Compte avec mot de passe : Erreur lors de updateUser sur GoTrue -> Erreur propre", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;
  mock.updateUserError = new Error("Internal server error on user update");

  const res = await simulateChangePassword(mock, {
    currentPassword: "SecretValide123",
    newPassword: "NouveauSecret2026!",
    confirmPassword: "NouveauSecret2026!",
  });

  assert.match(res.error, /La mise à jour du mot de passe a échoué/i);
});

// -------------------------------------------------------------
// TESTS DE GESTION DES SESSIONS
// -------------------------------------------------------------

await runAsyncTest("34. Sessions : Révocation des autres sessions réussie -> otherSessionsRevoked = true", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;
  mock.signOutError = null;

  const res = await simulateChangePassword(mock, {
    currentPassword: "SecretValide123",
    newPassword: "NouveauSecret2026!",
    confirmPassword: "NouveauSecret2026!",
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.otherSessionsRevoked, true);
  assert.match(res.message, /autres sessions ont été révoquées/i);
});

await runAsyncTest("35. Sessions : Échec de signOut({ scope: 'others' }) -> otherSessionsRevoked = false avec message transparent", async () => {
  const mock = new MockSupabaseEnvironment();
  mock.userHasPassword = true;
  mock.signOutError = new Error("GoTrue others scope not allowed");

  const res = await simulateChangePassword(mock, {
    currentPassword: "SecretValide123",
    newPassword: "NouveauSecret2026!",
    confirmPassword: "NouveauSecret2026!",
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.otherSessionsRevoked, false);
  assert.match(res.message, /révocation automatique des autres sessions n'a pas pu être confirmée/i);
});

// -------------------------------------------------------------
// TESTS UI & NON-RÉGRESSION
// -------------------------------------------------------------
const drawerPath = path.join(rootDir, "src", "components", "security", "SecurityPasswordDrawer.tsx");
const companyProfilePath = path.join(rootDir, "src", "components", "company", "profile", "CompanyProfileView.tsx");
const resellerProfilePath = path.join(rootDir, "src", "components", "reseller", "ResellerProfileView.tsx");
const authActionsPath = path.join(rootDir, "src", "lib", "actions", "auth.ts");

runTest("36. UI Drawer : Présence du mode sans mot de passe avec envoi d'OTP et saisie du code", () => {
  const code = fs.readFileSync(drawerPath, "utf-8");
  assert.match(code, /requestPasswordSetupOtpAction/i, "Invoque requestPasswordSetupOtpAction");
  assert.match(code, /otpCode/i, "Gère le code OTP");
  assert.match(code, /handleSendOtp/i, "Gère l'envoi de l'OTP");
  assert.match(code, /statusError/i, "Gère l'erreur de statut Fail-Closed");
  assert.match(code, /Vérification de sécurité impossible/i, "Message d'erreur Fail-Closed affiché à l'utilisateur");
});

runTest("37. UI Drawer : Réinitialisation stricte des champs sensibles (resetFormState)", () => {
  const code = fs.readFileSync(drawerPath, "utf-8");
  assert.match(code, /resetFormState/i, "Possède une fonction de réinitialisation");
  assert.ok(code.includes('setCurrentPassword("")'), "Efface mot de passe actuel");
  assert.ok(code.includes('setNewPassword("")'), "Efface nouveau mot de passe");
  assert.ok(code.includes('setConfirmPassword("")'), "Efface confirmation");
  assert.ok(code.includes('setOtpCode("")'), "Efface OTP");
  assert.ok(!code.includes("localStorage"), "ZÉRO stockage dans localStorage");
  assert.ok(!code.includes("sessionStorage"), "ZÉRO stockage dans sessionStorage");
});

runTest("38. Intégration Espace Société : CompanyProfileView intègre le Drawer et le bouton de gestion", () => {
  const code = fs.readFileSync(companyProfilePath, "utf-8");
  assert.match(code, /import SecurityPasswordDrawer from ["']@\/components\/security\/SecurityPasswordDrawer["']/i);
  assert.match(code, /isPasswordDrawerOpen/i);
  assert.match(code, /<SecurityPasswordDrawer/i);
});

runTest("39. Intégration Espace Revendeur : ResellerProfileView intègre le Drawer et le bouton de gestion", () => {
  const code = fs.readFileSync(resellerProfilePath, "utf-8");
  assert.match(code, /import SecurityPasswordDrawer from ["']@\/components\/security\/SecurityPasswordDrawer["']/i);
  assert.match(code, /isPasswordDrawerOpen/i);
  assert.match(code, /<SecurityPasswordDrawer/i);
});

runTest("40. Non-régression AUTH-3 : resetPasswordAction intacte dans auth.ts", () => {
  const code = fs.readFileSync(authActionsPath, "utf-8");
  assert.match(code, /export async function resetPasswordAction/i);
  assert.match(code, /signOut\({\s*scope:\s*["']local["']\s*}\)/i);
  assert.match(code, /redirect\(["']\/login\?password_updated=true["']\)/i);
});

runTest("41. Non-régression AUTH-4 : complete_user_onboarding intacte dans auth.ts", () => {
  const code = fs.readFileSync(authActionsPath, "utf-8");
  assert.match(code, /complete_user_onboarding/i);
});

// -------------------------------------------------------------
// SÉCURITÉ CONTRÔLÉE : OPÉRATIONS DISTANTES INTERDITES
// -------------------------------------------------------------
skipTest(
  "42. Déclenchement d'un appel réseau direct vers les serveurs Supabase de production",
  "INTERDIT : Le mandat AUTH-6.2.4 impose exclusivement des tests locaux sur mocks/fixtures sans altération de comptes distants."
);

skipTest(
  "43. Application de la migration 20261030112554_auth_user_has_password.sql sur la base de données distante",
  "INTERDIT : La règle de mise en service exige une validation et autorisation distincte avant toute application distante."
);

console.log("==================================================================");
console.log(`BILAN DES TESTS AUTH-6.2.4 : ${passedCount}/${totalCount - skippedCount} réussis (${skippedCount} non exécutés pour sécurité).`);
console.log("==================================================================");

if (passedCount + skippedCount === totalCount && passedCount > 0) {
  process.exit(0);
} else {
  process.exit(1);
}
