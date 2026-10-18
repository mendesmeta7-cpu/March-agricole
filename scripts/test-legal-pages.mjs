/**
 * Test de validation pour les pages légales publiques Radiza :
 * - /privacy (Politique de confidentialité)
 * - /terms (Conditions d'utilisation)
 * 
 * Vérifications :
 * 1. Existence des fichiers de pages Next.js App Router (src/app/privacy/page.tsx, src/app/terms/page.tsx).
 * 2. Vérification de l'absence de session requise (accès public anonyme).
 * 3. Vérification du comportement du middleware (non intercepté par matcher de redirection).
 * 4. Présence des métadonnées SEO (title, description).
 * 5. Présence des liens croisés réciproques (/privacy <-> /terms).
 * 6. Présence des liens légaux dans le footer public (src/app/page.tsx).
 * 7. Inclusion dans la liste blanche de redirection (src/lib/utils/url.ts).
 * 8. Conformité aux mentions obligatoires (Synapta SARL, B2B, absence de paiement en ligne V1, Google OAuth).
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

console.log("======================================================================");
console.log("DÉBUT DU TEST DE VALIDATION DES PAGES JURIDIQUES PUBLIQUES RADIZA");
console.log("======================================================================\n");

const rootDir = process.cwd();
const privacyPath = path.join(rootDir, 'src', 'app', 'privacy', 'page.tsx');
const termsPath = path.join(rootDir, 'src', 'app', 'terms', 'page.tsx');
const landingPath = path.join(rootDir, 'src', 'app', 'page.tsx');
const urlUtilsPath = path.join(rootDir, 'src', 'lib', 'utils', 'url.ts');
const middlewarePath = path.join(rootDir, 'src', 'lib', 'supabase', 'middleware.ts');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name} :`, err.message);
  }
}

// 1. Existence des fichiers
runTest("TEST 1 : Le fichier src/app/privacy/page.tsx existe", () => {
  assert.ok(fs.existsSync(privacyPath), "Le fichier src/app/privacy/page.tsx est introuvable");
});

runTest("TEST 2 : Le fichier src/app/terms/page.tsx existe", () => {
  assert.ok(fs.existsSync(termsPath), "Le fichier src/app/terms/page.tsx est introuvable");
});

const privacyContent = fs.existsSync(privacyPath) ? fs.readFileSync(privacyPath, 'utf8') : '';
const termsContent = fs.existsSync(termsPath) ? fs.readFileSync(termsPath, 'utf8') : '';
const landingContent = fs.existsSync(landingPath) ? fs.readFileSync(landingPath, 'utf8') : '';
const urlUtilsContent = fs.existsSync(urlUtilsPath) ? fs.readFileSync(urlUtilsPath, 'utf8') : '';
const middlewareContent = fs.existsSync(middlewarePath) ? fs.readFileSync(middlewarePath, 'utf8') : '';

// 2. Vérification des métadonnées SEO
runTest("TEST 3 : Métadonnées SEO sur /privacy", () => {
  assert.ok(privacyContent.includes("Politique de confidentialité — Radiza"), "Titre manquant sur /privacy");
  assert.ok(privacyContent.includes("export const metadata"), "export metadata manquant sur /privacy");
});

runTest("TEST 4 : Métadonnées SEO sur /terms", () => {
  assert.ok(termsContent.includes("Conditions d'utilisation — Radiza"), "Titre manquant sur /terms");
  assert.ok(termsContent.includes("export const metadata"), "export metadata manquant sur /terms");
});

// 3. Présence des liens réciproques
runTest("TEST 5 : La page /privacy contient un lien vers /terms", () => {
  assert.ok(privacyContent.includes('href="/terms"'), "Lien vers /terms absent de la page /privacy");
});

runTest("TEST 6 : La page /terms contient un lien vers /privacy", () => {
  assert.ok(termsContent.includes('href="/privacy"'), "Lien vers /privacy absent de la page /terms");
});

// 4. Intégration dans le footer public de la landing page
runTest("TEST 7 : Le footer de src/app/page.tsx référence /terms et /privacy", () => {
  assert.ok(landingContent.includes('href="/terms"'), "Lien /terms manquant dans le footer public");
  assert.ok(landingContent.includes('href="/privacy"'), "Lien /privacy manquant dans le footer public");
});

// 5. Whitelist de redirection
runTest("TEST 8 : src/lib/utils/url.ts autorise /privacy et /terms dans ALLOWED_REDIRECT_PREFIXES", () => {
  assert.ok(urlUtilsContent.includes('"/privacy"'), '"/privacy" non présent dans ALLOWED_REDIRECT_PREFIXES');
  assert.ok(urlUtilsContent.includes('"/terms"'), '"/terms" non présent dans ALLOWED_REDIRECT_PREFIXES');
});

// 6. Non-interception par le middleware
runTest("TEST 9 : Le middleware ne restreint pas /privacy et /terms", () => {
  // Les conditions du middleware ne doivent cibler que /dashboard, /onboarding, /login, /register
  assert.ok(!middlewareContent.includes('pathname.startsWith("/privacy")'), "Le middleware ne doit pas intercepter /privacy");
  assert.ok(!middlewareContent.includes('pathname.startsWith("/terms")'), "Le middleware ne doit pas intercepter /terms");
});

// 7. Contenu réel conforme et sans données fictives
runTest("TEST 10 : Mentions obligatoires de Synapta SARL et de la V1 sur /privacy", () => {
  assert.ok(privacyContent.includes("Synapta SARL"), "Éditeur Synapta SARL manquant");
  assert.ok(privacyContent.includes("Google"), "Fournisseur Google OAuth manquant");
  assert.ok(privacyContent.includes("Supabase"), "Fournisseur Supabase manquant");
  assert.ok(privacyContent.includes("Vercel"), "Hébergeur Vercel manquant");
  assert.ok(privacyContent.includes("radiza_oauth_role"), "Cookie éphémère radiza_oauth_role manquant");
});

runTest("TEST 11 : Mentions obligatoires de la plateforme B2B et absence de paiement en ligne sur /terms", () => {
  assert.ok(termsContent.includes("Synapta SARL"), "Éditeur Synapta SARL manquant");
  assert.ok(termsContent.includes("B2B"), "Caractère B2B manquant");
  assert.ok(termsContent.includes("aucun système de paiement en ligne"), "Clause d'absence de paiement en ligne manquante");
  assert.ok(termsContent.includes("gré à gré"), "Mention des règlements et contrats de gré à gré manquante");
});

// 8. Compatibilité avec futur domaine personnalisé
const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
const layoutContent = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf8') : '';

runTest("TEST 12 : Configuration dynamique de metadataBase dans RootLayout", () => {
  assert.ok(layoutContent.includes("metadataBase"), "metadataBase non configuré dans layout.tsx");
  assert.ok(layoutContent.includes("getAppUrl"), "getAppUrl non utilisé pour metadataBase");
});

runTest("TEST 13 : Balises canoniques relatives alternates.canonical sur /privacy et /terms", () => {
  assert.ok(privacyContent.includes('canonical: "/privacy"'), 'canonical: "/privacy" manquant sur /privacy');
  assert.ok(termsContent.includes('canonical: "/terms"'), 'canonical: "/terms" manquant sur /terms');
});

runTest("TEST 14 : Zéro domaine en dur dans les pages /privacy et /terms", () => {
  assert.ok(!privacyContent.includes("march-agricole.vercel.app"), "URL en dur trouvée dans /privacy");
  assert.ok(!termsContent.includes("march-agricole.vercel.app"), "URL en dur trouvée dans /terms");
});

runTest("TEST 15 : Zéro domaine en dur dans layout.tsx et page.tsx", () => {
  assert.ok(!layoutContent.includes("march-agricole.vercel.app"), "URL en dur trouvée dans layout.tsx");
  assert.ok(!landingContent.includes("march-agricole.vercel.app"), "URL en dur trouvée dans page.tsx");
});

console.log("\n======================================================================");
console.log(`BILAN DU TEST DES PAGES JURIDIQUES : ${passedTests}/${totalTests} RÉUSSIS`);
console.log("======================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
