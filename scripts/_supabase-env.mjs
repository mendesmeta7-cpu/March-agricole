// Configuration partagée des scripts qui accèdent à une base Supabase distante.
//
// Aucun identifiant ne doit être écrit en dur dans les scripts (audit SEC-01).
// Les valeurs sont lues exclusivement depuis l'environnement du terminal :
//
//   RADIZA_SCRIPT_SUPABASE_URL       URL du projet Supabase CIBLE (local ou staging)
//   RADIZA_SCRIPT_SUPABASE_ANON_KEY  Clé anon publique du projet CIBLE
//   RADIZA_SCRIPT_ADMIN_EMAIL        (scripts admin uniquement)
//   RADIZA_SCRIPT_ADMIN_PASSWORD     (scripts admin uniquement)
//
// Garde-fou : le projet distant de production est refusé pour tout script qui
// écrit. Les scripts en lecture seule exigent en plus une confirmation explicite
// (RADIZA_ALLOW_PRODUCTION_READ=oui) avant de cibler la production.

const PRODUCTION_PROJECT_REFS = ["gonerlgkdnbdewjbebvq"];

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`❌ Variable d'environnement manquante : ${name}`);
    console.error("   Consultez l'en-tête de scripts/_supabase-env.mjs.");
    process.exit(2);
  }
  return value.trim();
}

function isProductionUrl(url) {
  return PRODUCTION_PROJECT_REFS.some((ref) => url.includes(ref));
}

/**
 * @param {{ writes: boolean }} options
 *   writes = true si le script insère, modifie, supprime ou crée des comptes.
 */
export function getSupabaseScriptConfig({ writes }) {
  const url = requireEnv("RADIZA_SCRIPT_SUPABASE_URL");
  const anonKey = requireEnv("RADIZA_SCRIPT_SUPABASE_ANON_KEY");

  if (isProductionUrl(url)) {
    if (writes) {
      console.error("⛔ Ce script écrit dans la base : exécution refusée sur le projet de production.");
      console.error("   Utilisez une base Supabase locale ou un projet de staging.");
      process.exit(3);
    }
    if (process.env.RADIZA_ALLOW_PRODUCTION_READ !== "oui") {
      console.error("⛔ Cible = production. Script en lecture seule : définissez RADIZA_ALLOW_PRODUCTION_READ=oui pour confirmer.");
      process.exit(3);
    }
  }

  return { url, anonKey };
}

export function getAdminCredentials() {
  return {
    email: requireEnv("RADIZA_SCRIPT_ADMIN_EMAIL"),
    password: requireEnv("RADIZA_SCRIPT_ADMIN_PASSWORD"),
  };
}

/** Mot de passe aléatoire pour les comptes de test créés à la volée. */
export function generateTestPassword() {
  return `T3st-${crypto.randomUUID()}`;
}
