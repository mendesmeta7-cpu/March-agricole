// Lot UX/UI 5B : cohérence de la migration préparée des dépôts, du lien entre champs et erreurs,
// et des classes de bouton réutilisées sur les liens (A11-10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mergeIds } from "../../src/components/ui/formFieldContext.ts";

const RACINE = new URL("../../", import.meta.url);
const lire = (chemin: string) => readFileSync(new URL(chemin, RACINE), "utf8");
const MIGRATION = "supabase/pending/20261118000034_revoke_anon_select_campaign_depots.sql";

test("migration des dépôts : préparée hors du dossier appliqué automatiquement", () => {
  assert.ok(existsSync(new URL(MIGRATION, RACINE)), "fichier préparé présent");
  const appliquees = readdirSync(new URL("supabase/migrations/", RACINE));
  assert.ok(
    !appliquees.some((f) => /campaign_depots|034_/.test(f)),
    "aucune migration des dépôts dans supabase/migrations"
  );
});

test("migration des dépôts : une seule instruction, limitée au rôle anon et à la lecture", () => {
  const sql = lire(MIGRATION);
  assert.match(sql, /NON APPLIQUÉE — AUTORISATION EXPLICITE REQUISE/);
  const instructions = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--") && l.trim() !== "")
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  assert.deepEqual(instructions, ["REVOKE SELECT ON public.campaign_depots FROM anon"]);
});

test("test SQL des dépôts : refus pour anon, accès conservé pour authenticated, sans écriture", () => {
  const sql = lire("supabase/tests/campaign_depots_anon_test.sql");
  assert.match(sql, /has_table_privilege\('anon', 'public\.campaign_depots', 'SELECT'\)/);
  assert.match(sql, /has_table_privilege\('authenticated', 'public\.campaign_depots', 'SELECT'\)/);
  assert.match(sql, /insufficient_privilege/);
  assert.match(sql, /ROLLBACK;\s*$/);
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|GRANT|REVOKE|ALTER|DROP)\b\s+(INTO|ON|TABLE|POLICY|public\.)/i);
});

test("FormField : identifiants d'erreur et d'aide fusionnés sans doublon", () => {
  assert.equal(mergeIds(undefined, null, false), undefined);
  assert.equal(mergeIds("a-erreur", undefined, "a-aide"), "a-erreur a-aide");
  assert.equal(mergeIds("x y", "y z"), "x y z");
});

test("A11-10 : aucun lien ne contient de bouton dans les écrans corrigés", () => {
  for (const f of [
    "src/components/company/dashboard/CompanyRecentActivity.tsx",
    "src/components/company/dashboard/CompanyDemandGeoChart.tsx",
  ]) {
    const s = lire(f);
    assert.doesNotMatch(s, /<Link\b[^>]*>\s*<Button\b/, f);
    assert.match(s, /buttonClassName\(/, f);
  }
});
