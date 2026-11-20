// Lot UX/UI 3A (SYS-01, LAN-04, RET-08) : contrôle automatique « aucune classe Tailwind sans effet ».
// Le projet est en Tailwind 3 : une classe écrite pour Tailwind 4 ou pour une extension absente est
// ignorée en silence (ombres plates, animations absentes, point de rupture xs jamais appliqué…).
// Ce test interroge le moteur Tailwind du projet, avec la configuration du projet, pour chaque classe
// écrite dans le code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "../..");
const loadConfig = require("tailwindcss/loadConfig");
const resolveConfig = require("tailwindcss/resolveConfig");
const { createContext } = require("tailwindcss/lib/lib/setupContextUtils");
const { generateRules } = require("tailwindcss/lib/lib/generateRules");

const config = resolveConfig(loadConfig(path.join(ROOT, "tailwind.config.ts")));
const context = createContext(config);

// Composants importés nulle part, réservés au Lot 8 (retrait fichier par fichier) : non contrôlés.
const FICHIERS_LOT_8 = new Set([
  "src/components/company/EditCompanyProfileModal.tsx",
  "src/components/demands/ResellerDemandSkeleton.tsx",
  "src/components/notifications/NotificationsView.tsx",
  "src/components/notifications/ResellerNotificationSkeleton.tsx",
  "src/components/productions/ProductionFormModal.tsx",
  "src/components/products/AddProductModal.tsx",
  "src/components/products/EditProductModal.tsx",
  "src/components/reseller/ResellerAvatarSection.tsx",
  "src/components/reseller/ResellerProfileTerritoryCard.tsx",
]);

// Exceptions justifiées : classe, fichier, raison. Chacune doit rester présente (sinon, la retirer d'ici).
// (L'exception « sm:animate-slide-in-down » du Toast est levée au Lot 5B : les animations de globals.css
// sont désormais déclarées dans @layer utilities et acceptent les variantes.)
const EXCEPTIONS: { classe: string; fichier: string; raison: string }[] = [
  // Relevées par ce contrôle pendant le Lot 3A, hors liste de l'audit : retrait ou remplacement à arbitrer.
  {
    classe: "prose",
    fichier: "src/components/company/profile/CompanyProfileView.tsx",
    raison: "extension @tailwindcss/typography non installée (aucune dépendance npm, décision du 2026-11-15) : à arbitrer",
  },
  {
    classe: "prose-sm",
    fichier: "src/components/company/profile/CompanyProfileView.tsx",
    raison: "extension @tailwindcss/typography non installée (aucune dépendance npm, décision du 2026-11-15) : à arbitrer",
  },
  {
    classe: "preserve-3d",
    fichier: "src/app/page.tsx",
    raison: "classe inexistante en Tailwind 3, sur un élément sans transformation 3D : à arbitrer",
  },
];

// Classes marqueurs de Tailwind : sans CSS propre, elles servent aux variantes group-* et peer-*.
const MARQUEURS = /^(group|peer)(\/[\w-]+)?$/;

// Classes écrites directement dans globals.css : valides sans variante (sm:, hover:…).
const CLASSES_GLOBALES = new Set(
  [...fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8").matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])
);

// Syntaxes repérées par l'audit (Tailwind 4, extension d'animation absente) : contrôlées même isolées.
const SYNTAXES_SUSPECTES = /(^|:)(outline-hidden|shadow-2?xs|(backdrop-)?blur-2?xs|drop-shadow-2?xs|aspect-\d+\/\d+|bg-linear-|animate-(in|out)$|fade-(in|out)|zoom-(in|out)|slide-(in|out)-|scrollbar-(none|hide)|font-display|xs:)/;

const cache = new Map<string, boolean>();
function genere(classe: string): boolean {
  if (!cache.has(classe)) {
    let ok = false;
    try {
      ok = generateRules(new Set([classe]), context).length > 0;
    } catch {
      ok = false;
    }
    cache.set(classe, ok);
  }
  return cache.get(classe) as boolean;
}
// Classes déclarées dans un bloc @layer utilities de globals.css : Tailwind leur applique ses variantes.
const GLOBALS_CSS = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
function blocsUtilities(css: string): string[] {
  const blocs: string[] = [];
  for (const m of css.matchAll(/@layer utilities\s*\{/g)) {
    let depth = 1, i = (m.index ?? 0) + m[0].length;
    const start = i;
    for (; i < css.length && depth > 0; i++) depth += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
    blocs.push(css.slice(start, i - 1));
  }
  return blocs;
}
const UTILITAIRES_GLOBAUX = new Set(
  blocsUtilities(GLOBALS_CSS).flatMap((b) => [...b.matchAll(/\.([a-zA-Z][\w-]*)\s*\{/g)].map((m) => m[1]))
);
const varianteDeUtilitaireGlobal = (classe: string) => {
  const parts = classe.split(":");
  const base = parts[parts.length - 1];
  return parts.length > 1 && UTILITAIRES_GLOBAUX.has(base) && genere(parts.slice(0, -1).join(":") + ":block");
};
const valide = (classe: string) =>
  MARQUEURS.test(classe) || CLASSES_GLOBALES.has(classe) || varianteDeUtilitaireGlobal(classe) || genere(classe);

function fichiers(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) fichiers(rel, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
}

// Une chaîne est une liste de classes si au moins la moitié de ses mots produisent du CSS :
// les phrases, identifiants et requêtes Supabase sont ainsi écartés.
function classesSansEffet(): { classe: string; fichier: string }[] {
  const trouvees: { classe: string; fichier: string }[] = [];
  const chaine = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  for (const fichier of fichiers("src")) {
    if (FICHIERS_LOT_8.has(fichier)) continue;
    const source = fs.readFileSync(path.join(ROOT, fichier), "utf8");
    for (const m of source.matchAll(chaine)) {
      // Les parties calculées (${…}) rendent le mot qui les contient incontrôlable : il est écarté.
      // Les mots sans lettre ou avec une majuscule hors crochets sont du code, pas des classes.
      const texte = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, "§");
      const mots = texte
        .split(/\s+/)
        .filter((w) => w && !w.includes("§") && /^[!\-a-z0-9@\[\]:\/.%_#(),=&>*+'~]+$/i.test(w))
        .filter((w) => /[a-z]/.test(w) && !/[A-Z]/.test(w.replace(/\[[^\]]*\]/g, "")));
      if (!mots.length) continue;
      const nbValides = mots.filter(valide).length;
      const listeDeClasses = nbValides * 2 >= mots.length;
      for (const mot of mots) {
        if (valide(mot)) continue;
        if (listeDeClasses || SYNTAXES_SUSPECTES.test(mot)) trouvees.push({ classe: mot, fichier });
      }
    }
  }
  return trouvees.filter((t) => !EXCEPTIONS.some((x) => x.classe === t.classe && x.fichier === t.fichier));
}

test("aucune classe Tailwind sans effet dans src (hors Lot 8 et exceptions justifiées)", () => {
  assert.deepEqual(classesSansEffet(), []);
});

test("les exceptions restent présentes dans le code (sinon les retirer de la liste)", () => {
  for (const x of EXCEPTIONS) {
    const source = fs.readFileSync(path.join(ROOT, x.fichier), "utf8");
    assert.ok(source.includes(x.classe), `${x.classe} absente de ${x.fichier}`);
    assert.ok(!valide(x.classe), `${x.classe} produit désormais du CSS : retirer l'exception`);
  }
});

test("points de rupture : xs à 480 px, avant ceux de Tailwind, inchangés", () => {
  assert.deepEqual(Object.entries(config.theme.screens), [
    ["xs", "480px"],
    ["sm", "640px"],
    ["md", "768px"],
    ["lg", "1024px"],
    ["xl", "1280px"],
    ["2xl", "1536px"],
  ]);
});

test("les valeurs réactivées par le Lot 3A produisent du CSS", () => {
  for (const classe of [
    "xs:inline",
    "shadow-xs",
    "shadow-2xs",
    "hover:shadow-2xs",
    "drop-shadow-xs",
    "backdrop-blur-xs",
    "font-display",
    "animate-in",
    "fade-in",
    "zoom-in",
    "zoom-in-95",
    "sm:zoom-in-95",
    "slide-in-from-left",
    "slide-in-from-bottom-6",
    "sm:slide-in-from-bottom-0",
    "slide-in-from-top-2",
    "slide-in-from-right-4",
    "duration-[180ms]",
  ]) {
    assert.ok(genere(classe), `${classe} sans effet`);
  }
});

test("palette forest et earth inchangée", () => {
  assert.equal(config.theme.colors.forest["700"], "#2f563d");
  assert.equal(config.theme.colors.earth["600"], "#9e6f40");
  assert.equal(Object.keys(config.theme.colors.forest).length, 11);
  assert.equal(Object.keys(config.theme.colors.earth).length, 11);
});
