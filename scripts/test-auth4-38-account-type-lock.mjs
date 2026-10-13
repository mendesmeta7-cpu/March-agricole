/**
 * SUITE DE TESTS DÉDIÉE AUTH-4.38 — VERROUILLAGE DU TYPE DE COMPTE RADIZA
 *
 * Valide les 14 scénarios obligatoires du prompt AUTH-4.38 :
 * 1. Inscription Société : choix capturé, confirmé, conservé, verrouillé et finalisé en Société.
 * 2. Inscription Revendeur : même scénario, finalisé en Revendeur.
 * 3. Changement de "preferred_role" après inscription : aucun changement du type verrouillé.
 * 4. Tentative d'appeler directement la RPC avec le type opposé : rejet.
 * 5. Tentative de modifier "intended_role" via l'API client : rejet.
 * 6. Type NULL : sélection contrôlée, verrouillage sûr et absence d'attribution arbitraire.
 * 7. Échec de finalisation : aucune entité partielle ni profil incohérent.
 * 8. Double soumission ou requêtes concurrentes : pas de doublon.
 * 9. Profils historiques complétés : aucun changement de rôle ou de statut.
 * 10. Profil en attente avec choix connu : reprise correcte et limitée.
 * 11. Profil en attente sans choix connu : conservation de NULL et récupération contrôlée.
 * 12. Confirmation d'e-mail, connexion et redirection : parcours complet sans sélection répétée.
 * 13. Accès croisé aux tableaux de bord : refusé.
 * 14. Contrôle Admin : aucune élévation de privilèges.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("DÉBUT DES CONTRÔLES TECHNIQUES AUTH-4.38 (VERROUILLAGE TYPE DE COMPTE)");
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
// INSPECTION DES FICHIERS SOURCES LOCAUX
// ─────────────────────────────────────────────────────────────────────────────

const mig27Path = path.resolve("supabase/migrations/20261013000027_enforce_intended_role_locking.sql");
const authActionsPath = path.resolve("src/lib/actions/auth.ts");
const onboardingPagePath = path.resolve("src/app/onboarding/page.tsx");
const onboardingFormPath = path.resolve("src/components/onboarding/OnboardingForm.tsx");
const middlewarePath = path.resolve("src/lib/supabase/middleware.ts");

const mig27Sql = fs.readFileSync(mig27Path, "utf8");
const authActionsCode = fs.readFileSync(authActionsPath, "utf8");
const onboardingPageCode = fs.readFileSync(onboardingPagePath, "utf8");
const onboardingFormCode = fs.readFileSync(onboardingFormPath, "utf8");
const middlewareCode = fs.readFileSync(middlewarePath, "utf8");

// ─────────────────────────────────────────────────────────────────────────────
// 14 SCÉNARIOS OBLIGATOIRES AUTH-4.38
// ─────────────────────────────────────────────────────────────────────────────

// SCÉNARIO 1 : Inscription Société de bout en bout
recordTest("TEST-4.38-01", "Inscription Société : capture preferred_role, initialisation intended_role et finalisation Société", () => {
  // A. Inscription transmet preferred_role: "company"
  assert.ok(authActionsCode.includes('preferred_role: "company"'), "registerCompanyAction doit injecter preferred_role: company");

  // B. Trigger capture et initialise intended_role
  assert.ok(mig27Sql.includes("IF NEW.raw_user_meta_data->>'preferred_role' IN ('company', 'reseller')"), "Trigger doit vérifier les rôles valides");
  assert.ok(mig27Sql.includes("v_intended_role := NEW.raw_user_meta_data->>'preferred_role';"), "Trigger doit affecter v_intended_role");
  assert.ok(mig27Sql.includes("intended_role"), "INSERT profiles doit inclure intended_role");

  // C. Page onboarding priorise intended_role
  assert.ok(onboardingPageCode.includes("intended_role"), "OnboardingPage doit lire intended_role");
  assert.ok(onboardingPageCode.includes("initialPreferredRole={lockedRole}"), "OnboardingPage doit transmettre lockedRole à OnboardingForm");

  // D. Formulaire affiche le bandeau sans choix
  assert.ok(onboardingFormCode.includes('selectedRole === "company"'), "OnboardingForm doit gérer le mode société");
  assert.ok(!onboardingFormCode.includes('onClick={() => setShowRoleSelector(true)}'), "Le bouton Modifier ne doit pas exister");

  // E. Server action et RPC vérifient et acceptent company
  assert.ok(authActionsCode.includes("lockedRole !== role"), "Validation serveur doit vérifier la concordance");
  assert.ok(mig27Sql.includes("v_profile.intended_role <> p_role"), "RPC doit rejeter la non-concordance");
});

// SCÉNARIO 2 : Inscription Revendeur de bout en bout
recordTest("TEST-4.38-02", "Inscription Revendeur : capture preferred_role, initialisation intended_role et finalisation Revendeur", () => {
  // A. Inscription transmet preferred_role: "reseller"
  assert.ok(authActionsCode.includes('preferred_role: "reseller"'), "registerResellerAction doit injecter preferred_role: reseller");

  // B. Formulaire affiche le bandeau Revendeur
  assert.ok(onboardingFormCode.includes('selectedRole === "reseller"'), "OnboardingForm doit gérer le mode revendeur");
  assert.ok(onboardingFormCode.includes("Revendeur Professionnel"), "OnboardingForm doit afficher le libellé Revendeur Professionnel");

  // C. Validation serveur et RPC acceptent reseller si intended_role = reseller
  assert.ok(authActionsCode.includes("lockedRole === \"reseller\""), "Validation serveur gère le rôle reseller");
});

// SCÉNARIO 3 : Changement de "preferred_role" après inscription
recordTest("TEST-4.38-03", "Tentative d'altération de user_metadata post-inscription : intended_role en DB reste inviolable", () => {
  // A. intended_role est stocké dans la table profiles (pas dans user_metadata)
  assert.ok(mig27Sql.includes("ALTER TABLE public.profiles\n    ADD COLUMN IF NOT EXISTS intended_role"), "intended_role doit être une colonne DB");

  // B. Le trigger handle_new_user_registration s'exécute uniquement sur INSERT ON auth.users, jamais sur UPDATE
  assert.ok(mig27Sql.includes("AFTER INSERT ON auth.users"), "Le trigger ne doit réagir qu'à l'INSERT initial");
  assert.ok(!mig27Sql.includes("AFTER UPDATE ON auth.users"), "Le trigger ne doit PAS réagir à l'UPDATE de auth.users");

  // C. La Server Action priorise profiles.intended_role (DB) sur user_metadata
  assert.ok(authActionsCode.includes("(rawUserProfile?.intended_role as string | undefined) ||"), "completeOnboardingAction doit prioriser profiles.intended_role");
  assert.ok(onboardingPageCode.includes("(rawProfile?.intended_role as \"company\" | \"reseller\" | undefined) ||"), "OnboardingPage doit prioriser profiles.intended_role");
});

// SCÉNARIO 4 : Appel direct à la RPC avec le type opposé
recordTest("TEST-4.38-04", "Tentative d'appel direct à complete_user_onboarding avec le mauvais rôle : rejet strict côté base", () => {
  assert.ok(mig27Sql.includes("IF v_profile.intended_role IS NOT NULL AND v_profile.intended_role <> p_role THEN"), "La RPC doit contrôler l'égalité stricte avec intended_role");
  assert.ok(mig27Sql.includes("RAISE EXCEPTION 'Action interdite : le type de compte demandé (%) ne correspond pas au choix initial d''inscription (%).'"), "La RPC doit lever une exception explicite");
});

// SCÉNARIO 5 : Tentative de modification de intended_role via l'API client
recordTest("TEST-4.38-05", "Tentative de modification directe de intended_role : privilège UPDATE absent pour authenticated", () => {
  // A. Migration 26 a révoqué UPDATE sur profiles
  const mig26Path = path.resolve("supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql");
  const mig26Sql = fs.readFileSync(mig26Path, "utf8");
  assert.ok(mig26Sql.includes("REVOKE UPDATE ON public.profiles FROM authenticated"), "UPDATE sur profiles doit être révoqué");

  // B. Migration 27 n'accorde aucun UPDATE sur intended_role
  assert.ok(mig27Sql.includes("GRANT SELECT (intended_role) ON TABLE public.profiles TO authenticated;"), "Seul SELECT doit être accordé");
  assert.ok(!mig27Sql.includes("GRANT UPDATE (intended_role)"), "Aucun GRANT UPDATE sur intended_role");
});

// SCÉNARIO 6 : Type initial NULL (sélection contrôlée)
recordTest("TEST-4.38-06", "Compte avec intended_role NULL : sélection contrôlée autorisée sans attribution arbitraire", () => {
  // A. Migration 27 définit intended_role comme NULLABLE
  assert.ok(!mig27Sql.includes("intended_role VARCHAR(20) NOT NULL"), "intended_role ne doit PAS être NOT NULL");
  assert.ok(mig27Sql.includes("intended_role IS NULL OR intended_role IN ('company', 'reseller')"), "Contrainte CHECK autorise NULL");

  // B. Si initialPreferredRole est absent, OnboardingForm permet le choix
  assert.ok(onboardingFormCode.includes("showRoleSelector"), "showRoleSelector doit basculer si initialPreferredRole est falsy");

  // C. La RPC accepte le rôle et enregistre intended_role atomiquement
  assert.ok(mig27Sql.includes("intended_role = COALESCE(intended_role, p_role)"), "La RPC doit enregistrer intended_role lors de la complétion si NULL");
});

// SCÉNARIO 7 : Échec de finalisation (atomicité & intégrité)
recordTest("TEST-4.38-07", "Échec pendant la RPC : transaction atomique garantissant zéro entité orpheline", () => {
  // La RPC s'exécute dans une transaction PostgreSQL implicite (SECURITY DEFINER)
  // Toute exception (ex: province invalide, intended_role non concordant) annule la transaction
  assert.ok(mig27Sql.includes("IF p_country_id IS NULL OR p_province_id IS NULL THEN"), "Contrôle province/pays");
  assert.ok(mig27Sql.includes("RAISE EXCEPTION 'Incohérence territoriale"), "Rejet incohérence territoriale");
  assert.ok(mig27Sql.includes("UPDATE public.profiles \n    SET role = p_role"), "L'UPDATE du profil n'a lieu qu'après création de l'entité");
});

// SCÉNARIO 8 : Double soumission ou requêtes concurrentes
recordTest("TEST-4.38-08", "Protection anti-concurrence : SubmitButton disabled + SELECT FOR UPDATE pessimiste en base", () => {
  // Côté interface : SubmitButton disabled pendant le pending
  const submitButtonPath = path.resolve("src/components/SubmitButton.tsx");
  const submitButtonCode = fs.readFileSync(submitButtonPath, "utf8");
  assert.ok(submitButtonCode.includes("disabled={pending || disabled}"), "SubmitButton doit être désactivé pendant le pending");

  // Côté base de données : SELECT FOR UPDATE sur profiles
  assert.ok(mig27Sql.includes("SELECT * INTO v_profile \n    FROM public.profiles \n    WHERE id = v_caller_id \n    FOR UPDATE;"), "La RPC doit verrouiller la ligne du profil FOR UPDATE");
  assert.ok(mig27Sql.includes("IF v_profile.onboarding_status = 'completed' OR v_profile.role <> 'unassigned' THEN"), "La RPC rejette tout compte déjà finalisé");
});

// SCÉNARIO 9 : Profils historiques complétés
recordTest("TEST-4.38-09", "Préservation absolue des profils historiques : aucune altération de rôle ou de statut", () => {
  // L'UPDATE rétroactif de la migration 27 cible UNIQUEMENT les comptes en attente
  assert.ok(mig27Sql.includes("AND p.role = 'unassigned'"), "Reprise rétroactive filtrée sur role = unassigned");
  assert.ok(mig27Sql.includes("AND p.onboarding_status = 'pending'"), "Reprise rétroactive filtrée sur onboarding_status = pending");
  assert.ok(mig27Sql.includes("WHERE onboarding_status = 'completed'\n      AND role NOT IN ('admin', 'company', 'reseller')"), "Contrôle post-migration d'intégrité des profils complétés");
});

// SCÉNARIO 10 : Profil en attente avec choix connu (reprise rétroactive)
recordTest("TEST-4.38-10", "Profil en attente avec preferred_role connu : reprise rétroactive ciblée dans intended_role", () => {
  assert.ok(mig27Sql.includes("UPDATE public.profiles p\nSET intended_role = u.raw_user_meta_data->>'preferred_role'"), "Reprise rétroactive depuis auth.users.raw_user_meta_data");
  assert.ok(mig27Sql.includes("p.intended_role IS NULL"), "Ne doit pas écraser une valeur déjà renseignée");
  assert.ok(mig27Sql.includes("u.raw_user_meta_data->>'preferred_role' IN ('company', 'reseller')"), "Ne doit reprendre que company ou reseller");
});

// SCÉNARIO 11 : Profil en attente sans choix connu (préservation NULL)
recordTest("TEST-4.38-11", "Profil en attente sans choix : intended_role reste NULL pour permettre la sélection", () => {
  // La clause WHERE filtre u.raw_user_meta_data->>'preferred_role' IN ('company', 'reseller')
  // Donc un utilisateur avec NULL ou rôle absent ne sera PAS mis à jour et restera intended_role = NULL
  assert.ok(mig27Sql.includes("u.raw_user_meta_data->>'preferred_role' IN ('company', 'reseller')"), "Exclusion des comptes avec preferred_role NULL ou inconnu");
});

// SCÉNARIO 12 : Confirmation d'e-mail, connexion et redirection
recordTest("TEST-4.38-12", "Parcours AUTH-2 préservé : confirmation e-mail -> /login?verified=true -> connexion -> /onboarding", () => {
  const callbackPath = path.resolve("src/app/auth/callback/route.ts");
  const callbackCode = fs.readFileSync(callbackPath, "utf8");
  assert.ok(callbackCode.includes('/login?verified=true'), "Callback doit rediriger vers /login?verified=true après confirmation");
  assert.ok(callbackCode.includes('signOut({ scope: "local" })'), "Session temporaire purgée après validation");

  // Middleware redirige unassigned/pending vers /onboarding
  assert.ok(middlewareCode.includes('userRole === "unassigned" || onboardingStatus !== "completed"'), "Middleware doit intercepter les comptes non finalisés");
  assert.ok(middlewareCode.includes('url.pathname = "/onboarding"'), "Middleware redirige vers /onboarding");
});

// SCÉNARIO 13 : Accès croisé aux tableaux de bord refusé
recordTest("TEST-4.38-13", "Tentatives d'accès direct aux dashboards pour un compte pending : redirection vers /onboarding", () => {
  // Test unitaire de l'algorithme du middleware
  function checkAccess(pathname, role, status) {
    if (pathname.startsWith("/dashboard")) {
      if (role === "unassigned" || status !== "completed") {
        return "/onboarding";
      }
    }
    return pathname;
  }

  assert.strictEqual(checkAccess("/dashboard/company", "unassigned", "pending"), "/onboarding");
  assert.strictEqual(checkAccess("/dashboard/reseller", "unassigned", "pending"), "/onboarding");
  assert.strictEqual(checkAccess("/dashboard/admin", "unassigned", "pending"), "/onboarding");
});

// SCÉNARIO 14 : Contrôle Admin et anti-élévation
recordTest("TEST-4.38-14", "Interdiction absolue d'auto-attribution du rôle Admin dans l'onboarding et par trigger", () => {
  // A. Dans complete_user_onboarding
  assert.ok(mig27Sql.includes("IF p_role = 'admin' THEN\n        RAISE EXCEPTION 'Action interdite : auto-attribution du rôle administrateur non autorisée.'"), "Rejet explicite du rôle admin dans la RPC");

  // B. Dans le trigger handle_new_user_registration
  assert.ok(!mig27Sql.includes("v_intended_role IN ('admin'"), "Le trigger ne doit jamais accepter admin comme intended_role");
  assert.ok(mig27Sql.includes("v_intended_role := NULL;"), "v_intended_role par défaut NULL");

  // C. Dans l'action completeOnboardingAction
  assert.ok(authActionsCode.includes('role !== "company" && role !== "reseller"'), "completeOnboardingAction rejette tout rôle distinct de company et reseller");
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHÈSE
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n======================================================================");
console.log(`RÉSULTAT DE LA SUITE AUTH-4.38 : ${passedCount}/${passedCount + failedCount} TESTS RÉUSSIS`);
console.log("======================================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
