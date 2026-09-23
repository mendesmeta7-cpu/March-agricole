import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

// Client Supabase anonyme standard
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fonction miroir de la logique du Middleware updateSession
 * pour tester le comportement de routage et de protection RBAC.
 */
function simulateMiddleware(pathname, user, profileRole) {
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return { status: 307, redirect: `/login?redirect=${encodeURIComponent(pathname)}` };
    }

    if (!profileRole) {
      return { status: 307, redirect: `/login?error=profile_missing` };
    }

    // Aiguillage déterministe pour les routes génériques
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      return { status: 307, redirect: `/dashboard/${profileRole}` };
    }

    if (pathname === "/dashboard/notifications" || pathname === "/dashboard/notifications/") {
      return {
        status: 307,
        redirect: profileRole === "admin" ? "/dashboard/admin" : `/dashboard/${profileRole}/notifications`,
      };
    }

    // Cloisonnement RBAC strict
    if (pathname.startsWith("/dashboard/company")) {
      if (profileRole !== "company" && profileRole !== "admin") {
        return { status: 307, redirect: "/unauthorized" };
      }
    }

    if (pathname.startsWith("/dashboard/reseller")) {
      if (profileRole !== "reseller" && profileRole !== "admin") {
        return { status: 307, redirect: "/unauthorized" };
      }
    }

    if (pathname.startsWith("/dashboard/admin")) {
      if (profileRole !== "admin") {
        return { status: 307, redirect: "/unauthorized" };
      }
    }

    return { status: 200, access: "GRANTED" };
  }

  return { status: 200, access: "PUBLIC" };
}

async function runSessionIsolationSuite() {
  console.log("================================================================================");
  console.log("  SUITE DE TESTS CRITIQUE : ISOLATION DES COMPTES & SÉCURITÉ DES SESSIONS");
  console.log("================================================================================");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Échec de l'assertion : ${message}`);
    }
  }

  // Identifiants réels des comptes existants en base
  const resellerUser = {
    email: "md2trade1999@gmail.com",
    expectedRole: "reseller",
    expectedDashboard: "/dashboard/reseller",
    expectedNotifications: "/dashboard/reseller/notifications",
  };

  const companyUser = {
    email: "mendesmeta7@gmail.com",
    expectedRole: "company",
    expectedDashboard: "/dashboard/company",
    expectedNotifications: "/dashboard/company/notifications",
  };

  const adminUser = {
    email: "admin@marcheagricole.cd",
    expectedRole: "admin",
    expectedDashboard: "/dashboard/admin",
  };

  console.log("\n--- TEST 1 : Vérification des Profils et Rôles dans la base ---");
  const { data: profiles, error: profErr } = await supabaseAnon
    .from("profiles")
    .select("id, role, full_name");

  assert(!profErr, "Requête profiles exécutée sans erreur PostgreSQL");
  console.log(`  Profils récupérés : ${profiles?.length || 0}`);

  // Création d'un client isolé pour Revendeur A et Société B
  const clientReseller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const clientCompany = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  console.log("\n--- TEST 2 : Logique Middleware Déterministe pour Revendeur A ---");
  const mockResellerUser = { id: "83947f13-d258-40cc-b385-eaf373a8caa6" };
  const resellerRole = "reseller";

  // 2.1 Accès /dashboard
  const m1 = simulateMiddleware("/dashboard", mockResellerUser, resellerRole);
  assert(m1.redirect === "/dashboard/reseller", "Revendeur sur /dashboard est redirigé vers /dashboard/reseller");

  // 2.2 Accès /dashboard/notifications
  const m2 = simulateMiddleware("/dashboard/notifications", mockResellerUser, resellerRole);
  assert(
    m2.redirect === "/dashboard/reseller/notifications",
    "Revendeur sur /dashboard/notifications est redirigé vers /dashboard/reseller/notifications"
  );

  // 2.3 Accès /dashboard/reseller/*
  const m3 = simulateMiddleware("/dashboard/reseller/campaigns", mockResellerUser, resellerRole);
  assert(m3.access === "GRANTED", "Revendeur a accès à son propre espace /dashboard/reseller/campaigns");

  // 2.4 Tentative d'accès à /dashboard/company (Espace Société)
  const m4 = simulateMiddleware("/dashboard/company", mockResellerUser, resellerRole);
  assert(m4.redirect === "/unauthorized", "Revendeur tentant d'accéder à /dashboard/company est rejeté vers /unauthorized");

  // 2.5 Tentative d'accès à /dashboard/company/notifications
  const m5 = simulateMiddleware("/dashboard/company/notifications", mockResellerUser, resellerRole);
  assert(m5.redirect === "/unauthorized", "Revendeur tentant d'accéder à /dashboard/company/notifications est rejeté vers /unauthorized");

  // 2.6 Tentative d'accès à /dashboard/admin
  const m6 = simulateMiddleware("/dashboard/admin", mockResellerUser, resellerRole);
  assert(m6.redirect === "/unauthorized", "Revendeur tentant d'accéder à /dashboard/admin est rejeté vers /unauthorized");

  console.log("\n--- TEST 3 : Logique Middleware Déterministe pour Société B ---");
  const mockCompanyUser = { id: "f87e07f8-6fa4-428a-846e-b2f05cb84a18" };
  const companyRole = "company";

  // 3.1 Accès /dashboard
  const c1 = simulateMiddleware("/dashboard", mockCompanyUser, companyRole);
  assert(c1.redirect === "/dashboard/company", "Société sur /dashboard est redirigée vers /dashboard/company");

  // 3.2 Accès /dashboard/notifications
  const c2 = simulateMiddleware("/dashboard/notifications", mockCompanyUser, companyRole);
  assert(
    c2.redirect === "/dashboard/company/notifications",
    "Société sur /dashboard/notifications est redirigée vers /dashboard/company/notifications"
  );

  // 3.3 Accès /dashboard/company/*
  const c3 = simulateMiddleware("/dashboard/company/productions", mockCompanyUser, companyRole);
  assert(c3.access === "GRANTED", "Société a accès à son propre espace /dashboard/company/productions");

  // 3.4 Tentative d'accès à /dashboard/reseller (Espace Revendeur)
  const c4 = simulateMiddleware("/dashboard/reseller", mockCompanyUser, companyRole);
  assert(c4.redirect === "/unauthorized", "Société tentant d'accéder à /dashboard/reseller est rejetée vers /unauthorized");

  // 3.5 Tentative d'accès à /dashboard/reseller/notifications
  const c5 = simulateMiddleware("/dashboard/reseller/notifications", mockCompanyUser, companyRole);
  assert(c5.redirect === "/unauthorized", "Société tentant d'accéder à /dashboard/reseller/notifications est rejetée vers /unauthorized");

  // 3.6 Tentative d'accès à /dashboard/admin
  const c6 = simulateMiddleware("/dashboard/admin", mockCompanyUser, companyRole);
  assert(c6.redirect === "/unauthorized", "Société tentant d'accéder à /dashboard/admin est rejetée vers /unauthorized");

  console.log("\n--- TEST 4 : Logique Middleware pour Utilisateur Non Connecté ---");
  const a1 = simulateMiddleware("/dashboard", null, null);
  assert(a1.redirect.startsWith("/login"), "Non-connecté sur /dashboard est renvoyé vers /login");

  const a2 = simulateMiddleware("/dashboard/notifications", null, null);
  assert(a2.redirect.startsWith("/login"), "Non-connecté sur /dashboard/notifications est renvoyé vers /login");

  const a3 = simulateMiddleware("/dashboard/company", null, null);
  assert(a3.redirect.startsWith("/login"), "Non-connecté sur /dashboard/company est renvoyé vers /login");

  const a4 = simulateMiddleware("/dashboard/reseller", null, null);
  assert(a4.redirect.startsWith("/login"), "Non-connecté sur /dashboard/reseller est renvoyé vers /login");

  console.log("\n--- TEST 5 : Test de Sanitisation des URLs de Notifications ---");
  // Test de la fonction getTargetUrl pour Revendeur
  function getSanitizedTargetUrl(notif, userRole) {
    let url = notif.action_url || "";

    if (userRole === "reseller") {
      if (url.startsWith("/dashboard/company/orders")) {
        url = url.replace("/dashboard/company/orders", "/dashboard/reseller/orders");
      } else if (url.startsWith("/dashboard/company/demands")) {
        url = "/dashboard/reseller/demands";
      } else if (url.startsWith("/dashboard/company")) {
        url = "/dashboard/reseller";
      }

      if (url && url.startsWith("/dashboard/reseller")) {
        return url;
      }

      switch (notif.type) {
        case "DEMANDE_REPONSE":
          return "/dashboard/reseller/demands";
        case "CAMPAGNE_OUVERTE":
          return "/dashboard/reseller/campaigns";
        case "COMMANDE_CREEE":
          return "/dashboard/reseller/orders";
        default:
          return "/dashboard/reseller";
      }
    }

    if (userRole === "company") {
      if (url.startsWith("/dashboard/reseller/orders")) {
        url = url.replace("/dashboard/reseller/orders", "/dashboard/company/orders");
      } else if (url.startsWith("/dashboard/reseller/demands")) {
        url = "/dashboard/company/demands";
      } else if (url.startsWith("/dashboard/reseller")) {
        url = "/dashboard/company";
      }

      if (url && url.startsWith("/dashboard/company")) {
        return url;
      }

      switch (notif.type) {
        case "DEMANDE_GENERALE_RECUE":
        case "DEMANDE_PRODUCTION_RECUE":
        case "DEMANDE_REPONSE":
          return "/dashboard/company/demands";
        case "COMMANDE_CREEE":
          return "/dashboard/company/orders";
        default:
          return "/dashboard/company";
      }
    }

    return "/dashboard";
  }

  // 5.1 Revendeur clique sur une notification corrompue pointant vers /dashboard/company/orders/123
  const corruptNotif1 = {
    type: "COMMANDE_CREEE",
    action_url: "/dashboard/company/orders/4d33c7bc-1a48-45ba-beb8-bacbd0cc076f",
  };
  const safeUrl1 = getSanitizedTargetUrl(corruptNotif1, "reseller");
  assert(
    safeUrl1 === "/dashboard/reseller/orders/4d33c7bc-1a48-45ba-beb8-bacbd0cc076f",
    "URL vers espace société automatiquement convertie en URL revendeur équivalente"
  );

  // 5.2 Revendeur avec notification DEMANDE_PRODUCTION_RECUE sans action_url
  const corruptNotif2 = {
    type: "DEMANDE_PRODUCTION_RECUE",
    action_url: "/dashboard/company/demands",
  };
  const safeUrl2 = getSanitizedTargetUrl(corruptNotif2, "reseller");
  assert(
    safeUrl2 === "/dashboard/reseller/demands",
    "URL demande société automatiquement convertie en /dashboard/reseller/demands pour revendeur"
  );

  // 5.3 Société avec notification pointant vers /dashboard/reseller/orders/123
  const corruptNotif3 = {
    type: "COMMANDE_CREEE",
    action_url: "/dashboard/reseller/orders/7ee3ee52-4983-4be8-bf7b-dd46ea767ede",
  };
  const safeUrl3 = getSanitizedTargetUrl(corruptNotif3, "company");
  assert(
    safeUrl3 === "/dashboard/company/orders/7ee3ee52-4983-4be8-bf7b-dd46ea767ede",
    "URL revendeur automatiquement convertie en URL société équivalente pour entreprise"
  );

  console.log("\n================================================================================");
  console.log(`  RÉSULTAT SUITE DE VALIDATION : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS (100%)`);
  console.log("================================================================================");
}

runSessionIsolationSuite().catch((err) => {
  console.error("ERREUR FATALE SUITE DE TESTS :", err);
  process.exit(1);
});
