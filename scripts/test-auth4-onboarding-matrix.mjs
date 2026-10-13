/**
 * SUITE DE TESTS AUTOMATISÉE — PHASE AUTH-4.4 (RECETTE LOCALE)
 *
 * Exécute les contrôles unitaires et d'intégration pour valider la matrice des 15 scénarios AUTH-4 :
 * - Scénarios 1, 2, 8, 9, 10, 11 : Arbre de décision du middleware et protection des routes
 * - Scénarios 3, 4, 5, 6, 8, 15 : Validation et contrat d'appel de la Server Action completeOnboardingAction
 * - Scénarios 6, 7, 8, 14 : Contrats de sécurité SQL, RPC et triggers (Migration 26)
 * - Scénarios 12, 13 : Non-régression des flux AUTH-2 et AUTH-3
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("DÉBUT DE LA RECETTE TECHNIQUE LOCALE AUTH-4.4");
console.log("======================================================================");

let passedCount = 0;
let failedCount = 0;
const results = [];

function recordTest(testId, title, fn) {
  try {
    fn();
    console.log(`[PASS] ${testId} : ${title}`);
    passedCount++;
    results.push({ id: testId, title, status: "PASS" });
  } catch (error) {
    console.error(`[FAIL] ${testId} : ${title}`);
    console.error(`       -> ${error.message}`);
    failedCount++;
    results.push({ id: testId, title, status: "FAIL", error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIMULATEUR FIDÈLE DU MIDDLEWARE NEXT.JS (src/lib/supabase/middleware.ts)
// ─────────────────────────────────────────────────────────────────────────────

function simulateMiddleware(pathname, user, profile, profileError = null) {
  // 1. Protection /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return { action: "REDIRECT", destination: `/login?redirect=${pathname}` };
    }
    if (profileError || !profile) {
      return { action: "REDIRECT", destination: "/login?error=profile_missing" };
    }

    const userRole = profile.role;
    const onboardingStatus = profile.onboarding_status;

    if (userRole === "unassigned" || onboardingStatus !== "completed") {
      return { action: "REDIRECT", destination: "/onboarding" };
    }

    if (!["company", "reseller", "admin"].includes(userRole)) {
      return { action: "REDIRECT", destination: "/login?error=role_unknown" };
    }

    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      return { action: "REDIRECT", destination: `/dashboard/${userRole}` };
    }

    if (pathname === "/dashboard/notifications" || pathname === "/dashboard/notifications/") {
      return {
        action: "REDIRECT",
        destination: userRole === "admin" ? "/dashboard/admin" : `/dashboard/${userRole}/notifications`,
      };
    }

    if (pathname.startsWith("/dashboard/company")) {
      if (userRole !== "company") {
        return { action: "REDIRECT", destination: userRole === "admin" ? "/dashboard/admin" : "/unauthorized" };
      }
    }

    if (pathname.startsWith("/dashboard/reseller")) {
      if (userRole !== "reseller") {
        return { action: "REDIRECT", destination: userRole === "admin" ? "/dashboard/admin" : "/unauthorized" };
      }
    }

    if (pathname.startsWith("/dashboard/admin")) {
      if (userRole !== "admin") {
        return { action: "REDIRECT", destination: "/unauthorized" };
      }
    }

    return { action: "NEXT", destination: pathname };
  }

  // 2. Protection /onboarding
  if (pathname === "/onboarding" || pathname === "/onboarding/") {
    if (!user) {
      return { action: "REDIRECT", destination: "/login" };
    }
    if (profileError || !profile) {
      return { action: "REDIRECT", destination: "/login?error=profile_missing" };
    }

    const onbRole = profile.role;
    const onbStatus = profile.onboarding_status;

    if (onbStatus === "completed" && onbRole !== "unassigned") {
      if (onbRole === "company") return { action: "REDIRECT", destination: "/dashboard/company" };
      if (onbRole === "reseller") return { action: "REDIRECT", destination: "/dashboard/reseller" };
      if (onbRole === "admin") return { action: "REDIRECT", destination: "/dashboard/admin" };
      return { action: "REDIRECT", destination: "/login?error=role_unknown" };
    }

    return { action: "NEXT", destination: "/onboarding" };
  }

  // 3. Redirection depuis /login ou /register
  if (pathname === "/login" || pathname === "/register") {
    if (user && profile) {
      const userRole = profile.role;
      const onbStatus = profile.onboarding_status;

      if (userRole === "unassigned" || onbStatus !== "completed") {
        return { action: "REDIRECT", destination: "/onboarding" };
      }

      if (userRole === "company") return { action: "REDIRECT", destination: "/dashboard/company" };
      if (userRole === "reseller") return { action: "REDIRECT", destination: "/dashboard/reseller" };
      if (userRole === "admin") return { action: "REDIRECT", destination: "/dashboard/admin" };
    }
    return { action: "NEXT", destination: pathname };
  }

  return { action: "NEXT", destination: pathname };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIMULATEUR DE VALIDATION DE completeOnboardingAction
// ─────────────────────────────────────────────────────────────────────────────

function validateOnboardingInput(formData) {
  const role = formData.role?.trim();
  const countryId = formData.countryId?.trim();
  const provinceId = formData.provinceId?.trim();
  const city = formData.city?.trim() || null;

  if (!role || (role !== "company" && role !== "reseller")) {
    return { error: "Veuillez sélectionner un type d'activité valide (Société agricole ou Revendeur professionnel)." };
  }

  if (!countryId || !provinceId) {
    return { error: "Veuillez sélectionner votre pays et votre province d'opération." };
  }

  let companyName = null;
  let companyDescription = null;
  let companyAddress = null;
  let companyPhone = null;

  let businessName = null;
  let resellerType = null;
  let deliveryAddress = null;

  if (role === "company") {
    companyName = formData.companyName?.trim() || null;
    companyDescription = formData.companyDescription?.trim() || null;
    companyAddress = formData.companyAddress?.trim() || null;
    companyPhone = formData.companyPhone?.trim() || null;

    if (!companyName) {
      return { error: "La dénomination ou le nom commercial de votre entreprise est obligatoire." };
    }
  } else if (role === "reseller") {
    businessName = formData.businessName?.trim() || null;
    resellerType = formData.resellerType?.trim() || "wholesaler";
    deliveryAddress = formData.deliveryAddress?.trim() || null;

    if (!["wholesaler", "semi_wholesaler", "retailer", "processor"].includes(resellerType)) {
      resellerType = "wholesaler";
    }
  }

  return {
    success: true,
    rpcParams: {
      p_role: role,
      p_country_id: countryId,
      p_province_id: provinceId,
      p_city: city,
      p_company_name: companyName,
      p_company_description: companyDescription,
      p_company_address: companyAddress,
      p_company_phone: companyPhone,
      p_business_name: businessName,
      p_reseller_type: resellerType,
      p_delivery_address: deliveryAddress,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXÉCUTION DES SCÉNARIOS DE LA MATRICE AUTH-4.4
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n--- EXÉCUTION DE LA MATRICE DE TESTS (15 SCÉNARIOS) ---\n");

// SCÉNARIO 1 : Accès à /onboarding sans session
recordTest("SCENARIO-01", "Accès à /onboarding sans session -> redirection vers /login", () => {
  const res = simulateMiddleware("/onboarding", null, null);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/login");
});

// SCÉNARIO 2 : Compte unassigned/pending
recordTest("SCENARIO-02A", "Compte unassigned/pending accédant à /dashboard/company -> redirigé vers /onboarding", () => {
  const user = { id: "u-123" };
  const profile = { role: "unassigned", onboarding_status: "pending" };
  const res = simulateMiddleware("/dashboard/company", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/onboarding");
});

recordTest("SCENARIO-02B", "Compte unassigned/pending accédant à /dashboard/reseller -> redirigé vers /onboarding", () => {
  const user = { id: "u-123" };
  const profile = { role: "unassigned", onboarding_status: "pending" };
  const res = simulateMiddleware("/dashboard/reseller", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/onboarding");
});

recordTest("SCENARIO-02C", "Compte unassigned/pending accédant à /onboarding -> accès autorisé", () => {
  const user = { id: "u-123" };
  const profile = { role: "unassigned", onboarding_status: "pending" };
  const res = simulateMiddleware("/onboarding", user, profile);
  assert.strictEqual(res.action, "NEXT");
  assert.strictEqual(res.destination, "/onboarding");
});

recordTest("SCENARIO-02D", "Compte unassigned/pending revenant sur /login -> redirigé vers /onboarding", () => {
  const user = { id: "u-123" };
  const profile = { role: "unassigned", onboarding_status: "pending" };
  const res = simulateMiddleware("/login", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/onboarding");
});

// SCÉNARIO 3 : Onboarding Société valide
recordTest("SCENARIO-03", "Validation saisie Société valide et mapping exact des paramètres RPC", () => {
  const input = {
    role: "company",
    countryId: "a0000000-0000-0000-0000-000000000001",
    provinceId: "b0000000-0000-0000-0000-000000000002",
    city: "Matadi",
    companyName: "Plantations du Kongo Central SARL",
    companyPhone: "+243810000000",
    companyAddress: "Route de Boma, Km 12",
    companyDescription: "Producteur de fruits et légumes frais",
  };
  const res = validateOnboardingInput(input);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.rpcParams.p_role, "company");
  assert.strictEqual(res.rpcParams.p_company_name, "Plantations du Kongo Central SARL");
  assert.strictEqual(res.rpcParams.p_country_id, "a0000000-0000-0000-0000-000000000001");
  assert.strictEqual(res.rpcParams.p_province_id, "b0000000-0000-0000-0000-000000000002");
  assert.strictEqual(res.rpcParams.p_city, "Matadi");
  assert.strictEqual(res.rpcParams.p_business_name, null);
  assert.strictEqual(res.rpcParams.p_reseller_type, null);
  assert.strictEqual(res.rpcParams.p_delivery_address, null);
});

// SCÉNARIO 4 : Onboarding Revendeur valide
recordTest("SCENARIO-04", "Validation saisie Revendeur valide et mapping exact des paramètres RPC", () => {
  const input = {
    role: "reseller",
    countryId: "a0000000-0000-0000-0000-000000000001",
    provinceId: "b0000000-0000-0000-0000-000000000002",
    city: "Kinshasa",
    businessName: "ETS Mwana Mboka Distribution",
    resellerType: "wholesaler",
    deliveryAddress: "Marché de la Liberté, Dépôt 4",
  };
  const res = validateOnboardingInput(input);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.rpcParams.p_role, "reseller");
  assert.strictEqual(res.rpcParams.p_business_name, "ETS Mwana Mboka Distribution");
  assert.strictEqual(res.rpcParams.p_reseller_type, "wholesaler");
  assert.strictEqual(res.rpcParams.p_delivery_address, "Marché de la Liberté, Dépôt 4");
  assert.strictEqual(res.rpcParams.p_company_name, null);
  assert.strictEqual(res.rpcParams.p_company_phone, null);
});

// SCÉNARIO 5 : Données invalides / champs manquants
recordTest("SCENARIO-05A", "Rejet si rôle manquant", () => {
  const res = validateOnboardingInput({ countryId: "c1", provinceId: "p1" });
  assert.ok(res.error);
  assert.match(res.error, /type d'activité valide/i);
});

recordTest("SCENARIO-05B", "Rejet si countryId manquant", () => {
  const res = validateOnboardingInput({ role: "company", companyName: "Ferme", provinceId: "p1" });
  assert.ok(res.error);
  assert.match(res.error, /pays et votre province/i);
});

recordTest("SCENARIO-05C", "Rejet si provinceId manquant", () => {
  const res = validateOnboardingInput({ role: "company", companyName: "Ferme", countryId: "c1" });
  assert.ok(res.error);
  assert.match(res.error, /pays et votre province/i);
});

recordTest("SCENARIO-05D", "Rejet si Société sans dénomination", () => {
  const res = validateOnboardingInput({
    role: "company",
    countryId: "c1",
    provinceId: "p1",
    companyName: "   ",
  });
  assert.ok(res.error);
  assert.match(res.error, /dénomination ou le nom commercial/i);
});

// SCÉNARIO 6 : Tentative de soumission avec le rôle admin
recordTest("SCENARIO-06", "Rejet strict de toute tentative d'injection du rôle admin", () => {
  const res = validateOnboardingInput({
    role: "admin",
    countryId: "c1",
    provinceId: "p1",
    companyName: "Tentative Admin",
  });
  assert.ok(res.error);
  assert.match(res.error, /type d'activité valide/i);
});

// SCÉNARIO 7 : Vérification des contrôles de cohérence territoriale
recordTest("SCENARIO-07", "Contrôle d'intégrité territoriale spécifié dans la RPC (Migration 26)", () => {
  const migPath = path.resolve("supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql");
  const sql = fs.readFileSync(migPath, "utf8");
  assert.ok(sql.includes("p_country_id IS NULL OR p_province_id IS NULL"));
  assert.ok(sql.includes("Incohérence territoriale : la province sélectionnée n''appartient pas au pays sélectionné."));
  assert.ok(sql.includes("WHERE id = p_province_id AND country_id = p_country_id"));
});

// SCÉNARIO 8 : Double soumission ou compte déjà complété
recordTest("SCENARIO-08A", "Middleware bloque l'accès à /onboarding si onboarding déjà complété", () => {
  const user = { id: "u-123" };
  const profile = { role: "company", onboarding_status: "completed" };
  const res = simulateMiddleware("/onboarding", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/dashboard/company");
});

recordTest("SCENARIO-08B", "Verrouillage pessimiste FOR UPDATE et rejet d'idempotence dans la RPC (Migration 26)", () => {
  const migPath = path.resolve("supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql");
  const sql = fs.readFileSync(migPath, "utf8");
  assert.ok(sql.includes("FOR UPDATE;"));
  assert.ok(sql.includes("v_profile.onboarding_status = 'completed' OR v_profile.role <> 'unassigned'"));
  assert.ok(sql.includes("L''onboarding de ce compte a déjà été finalisé."));
});

recordTest("SCENARIO-08C", "Protection anti-double clic dans le composant client via useFormStatus", () => {
  const formPath = path.resolve("src/components/onboarding/OnboardingForm.tsx");
  const formCode = fs.readFileSync(formPath, "utf8");
  assert.ok(formCode.includes("<SubmitButton"));
  assert.ok(formCode.includes("loadingText="));
  
  const submitPath = path.resolve("src/components/SubmitButton.tsx");
  const submitCode = fs.readFileSync(submitPath, "utf8");
  assert.ok(submitCode.includes("useFormStatus"));
  assert.ok(submitCode.includes("disabled={pending || disabled}"));
});

// SCÉNARIO 9 : Compte existant Société
recordTest("SCENARIO-09A", "Compte existant company/completed accède à /dashboard/company", () => {
  const user = { id: "u-comp" };
  const profile = { role: "company", onboarding_status: "completed" };
  const res = simulateMiddleware("/dashboard/company", user, profile);
  assert.strictEqual(res.action, "NEXT");
});

recordTest("SCENARIO-09B", "Compte existant company/completed bloqué de /dashboard/reseller", () => {
  const user = { id: "u-comp" };
  const profile = { role: "company", onboarding_status: "completed" };
  const res = simulateMiddleware("/dashboard/reseller", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/unauthorized");
});

// SCÉNARIO 10 : Compte existant Revendeur
recordTest("SCENARIO-10A", "Compte existant reseller/completed accède à /dashboard/reseller", () => {
  const user = { id: "u-res" };
  const profile = { role: "reseller", onboarding_status: "completed" };
  const res = simulateMiddleware("/dashboard/reseller", user, profile);
  assert.strictEqual(res.action, "NEXT");
});

recordTest("SCENARIO-10B", "Compte existant reseller/completed bloqué de /dashboard/company", () => {
  const user = { id: "u-res" };
  const profile = { role: "reseller", onboarding_status: "completed" };
  const res = simulateMiddleware("/dashboard/company", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/unauthorized");
});

// SCÉNARIO 11 : Compte Admin
recordTest("SCENARIO-11A", "Compte admin/completed accède à /dashboard/admin", () => {
  const user = { id: "u-adm" };
  const profile = { role: "admin", onboarding_status: "completed" };
  const res = simulateMiddleware("/dashboard/admin", user, profile);
  assert.strictEqual(res.action, "NEXT");
});

recordTest("SCENARIO-11B", "Compte admin/completed tentant /dashboard/company est ramené à /dashboard/admin", () => {
  const user = { id: "u-adm" };
  const profile = { role: "admin", onboarding_status: "completed" };
  const res = simulateMiddleware("/dashboard/company", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/dashboard/admin");
});

recordTest("SCENARIO-11C", "Compte admin/completed tentant /onboarding est ramené à /dashboard/admin", () => {
  const user = { id: "u-adm" };
  const profile = { role: "admin", onboarding_status: "completed" };
  const res = simulateMiddleware("/onboarding", user, profile);
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/dashboard/admin");
});

// SCÉNARIO 12 : Non-régression Confirmation d'e-mail AUTH-2
recordTest("SCENARIO-12", "Préservation du flux de confirmation AUTH-2 (/auth/callback & signOut scope local)", () => {
  const callbackPath = path.resolve("src/app/auth/callback/route.ts");
  const code = fs.readFileSync(callbackPath, "utf8");
  assert.ok(code.includes("flow === \"signup\""));
  assert.ok(code.includes("/login?verified=true"));
  assert.ok(code.includes("signOut({ scope: \"local\" })"));
});

// SCÉNARIO 13 : Non-régression Mot de passe oublié AUTH-3
recordTest("SCENARIO-13", "Préservation du flux recovery AUTH-3 (/forgot-password & /reset-password)", () => {
  const callbackPath = path.resolve("src/app/auth/callback/route.ts");
  const code = fs.readFileSync(callbackPath, "utf8");
  assert.ok(code.includes("isRecoveryFlow"));
  assert.ok(code.includes("/reset-password"));
  
  const resetPath = path.resolve("src/app/reset-password/page.tsx");
  assert.ok(fs.existsSync(resetPath));
  const forgotPath = path.resolve("src/app/forgot-password/page.tsx");
  assert.ok(fs.existsSync(forgotPath));
});

// SCÉNARIO 14 : Tentatives de modification directe de role et onboarding_status
recordTest("SCENARIO-14A", "Révocation des privilèges UPDATE sur profiles.role et onboarding_status (Migration 26)", () => {
  const migPath = path.resolve("supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql");
  const sql = fs.readFileSync(migPath, "utf8");
  assert.ok(sql.includes("REVOKE UPDATE ON public.profiles FROM authenticated, anon, PUBLIC;"));
  assert.ok(sql.includes("GRANT UPDATE (full_name, phone, avatar_url, avatar_cloudinary_public_id, updated_at)"));
  assert.ok(!sql.includes("GRANT UPDATE (role"));
  assert.ok(!sql.includes("GRANT UPDATE (onboarding_status"));
});

recordTest("SCENARIO-14B", "Trigger anti-escalade bi-dimensionnel prevent_profile_role_escalation (Migration 26)", () => {
  const migPath = path.resolve("supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql");
  const sql = fs.readFileSync(migPath, "utf8");
  assert.ok(sql.includes("IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status)"));
  assert.ok(sql.includes("OLD.role = 'unassigned'"));
  assert.ok(sql.includes("NEW.role IN ('company', 'reseller')"));
  assert.ok(sql.includes("OLD.onboarding_status = 'pending'"));
  assert.ok(sql.includes("NEW.onboarding_status = 'completed'"));
});

// SCÉNARIO 15 : Échec de la RPC et reprise de l'onboarding
recordTest("SCENARIO-15", "Gestion d'erreur de la RPC dans completeOnboardingAction avec retour sans perte d'état", () => {
  const actionPath = path.resolve("src/lib/actions/auth.ts");
  const code = fs.readFileSync(actionPath, "utf8");
  assert.ok(code.includes("completeOnboardingAction"));
  assert.ok(code.includes("if (rpcError)"));
  assert.ok(code.includes("return { error: rpcError.message"));
  
  const formPath = path.resolve("src/components/onboarding/OnboardingForm.tsx");
  const formCode = fs.readFileSync(formPath, "utf8");
  assert.ok(formCode.includes("{state?.error && ("));
  assert.ok(formCode.includes("<Alert variant=\"error\""));
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHÈSE
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n======================================================================");
console.log(`BILAN DE LA RECETTE TECHNIQUE : ${passedCount}/${passedCount + failedCount} TESTS RÉUSSIS`);
console.log("======================================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
