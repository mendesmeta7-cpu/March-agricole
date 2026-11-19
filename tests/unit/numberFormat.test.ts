// Lot UX/UI 3C (SYS-05) : formats communs des montants et des quantités.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatAmount,
  formatMoney,
  formatQuantity,
  formatQuantityWithUnit,
  unitLabel,
  VALEUR_ABSENTE,
} from "../../src/lib/utils/numberFormat.ts";

// Les séparateurs français sont des espaces insécables (fine ou normale) : comparaison sur espaces normalisées.
const norm = (s: string) => s.replace(/\s/g, " ");

test("montant : deux décimales, séparateurs français", () => {
  assert.equal(norm(formatAmount(2400000)), "2 400 000,00");
  assert.equal(norm(formatAmount(450000)), "450 000,00");
  assert.equal(norm(formatAmount(12.5)), "12,50");
  assert.equal(norm(formatAmount("1234.567")), "1 234,57");
});

test("montant et devise : code après le montant, jamais « $US »", () => {
  assert.equal(norm(formatMoney(2400000, "USD")), "2 400 000,00 USD");
  assert.equal(norm(formatMoney(8400000, "CDF")), "8 400 000,00 CDF");
  assert.ok(!formatMoney(10, "USD").includes("$"));
  // espace insécable entre le montant et la devise : jamais coupée en fin de ligne
  assert.ok(formatMoney(10, "USD").includes(" USD"));
  assert.equal(norm(formatMoney(10, null)), "10,00");
});

test("quantité : aucune précision réelle perdue (stockage NUMERIC(12,2)), bruit flottant retiré", () => {
  assert.equal(norm(formatQuantity(1250.5)), "1 250,5");
  assert.equal(norm(formatQuantity(0.25)), "0,25");
  assert.equal(norm(formatQuantity(0.1 + 0.2)), "0,3");
  assert.equal(norm(formatQuantity(5)), "5");
});

test("valeurs absentes ou illisibles : « — » plutôt que NaN", () => {
  for (const v of [null, undefined, "", "abc", Number.NaN]) {
    assert.equal(formatAmount(v as never), VALEUR_ABSENTE);
    assert.equal(formatQuantity(v as never), VALEUR_ABSENTE);
    assert.equal(formatMoney(v as never, "USD"), VALEUR_ABSENTE);
  }
});

test("unité : pluriel français à partir de 2, liste fermée, aucune conversion", () => {
  assert.equal(unitLabel("tonne", 5), "tonnes");
  assert.equal(unitLabel("tonne", 2), "tonnes");
  assert.equal(unitLabel("tonne", 1.5), "tonne");
  assert.equal(unitLabel("tonne", 1), "tonne");
  assert.equal(unitLabel("tonne", 0), "tonne");
  assert.equal(unitLabel("Sac", 3), "Sacs");
  assert.equal(unitLabel("kg", 40), "kg");
  assert.equal(unitLabel("caisses", 40), "caisses");
  assert.equal(unitLabel("bottillon", 40), "bottillon");
  assert.equal(unitLabel(null, 4), "");
});

test("quantité et unité accordée", () => {
  assert.equal(norm(formatQuantityWithUnit(12, "tonne")), "12 tonnes");
  assert.equal(norm(formatQuantityWithUnit(1.5, "tonne")), "1,5 tonne");
  assert.equal(norm(formatQuantityWithUnit(15486, "kg")), "15 486 kg");
  assert.equal(formatQuantityWithUnit(null, "tonne"), VALEUR_ABSENTE);
});
