// BR-FIN-07 : CDF et USD ne sont jamais additionnés ; unités jamais mélangées (FUN-04).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sumByCurrency, sumByUnit, nonZeroCurrencies } from "../../src/lib/utils/currencyTotals.ts";

const orders = [
  { total_amount: 20000000, currency: "CDF" },
  { total_amount: "1500.50", currency: "usd" },
  { total_amount: 2500000, currency: "CDF" },
  { total_amount: 99, currency: "EUR" },
  { total_amount: Number.NaN, currency: "USD" },
];

test("totaux ventilés par devise, sans mélange ni conversion", () => {
  const totals = sumByCurrency(orders, (o) => o.total_amount, (o) => o.currency);
  assert.deepEqual(totals, { CDF: 22500000, USD: 1500.5 });
  assert.deepEqual(nonZeroCurrencies(totals), ["CDF", "USD"]);
});

test("arrondi monétaire à 2 décimales", () => {
  const totals = sumByCurrency(
    [{ a: 0.1, c: "USD" }, { a: 0.2, c: "USD" }],
    (x) => x.a,
    (x) => x.c
  );
  assert.equal(totals.USD, 0.3);
});

test("quantités ventilées par unité", () => {
  const totals = sumByUnit(
    [{ q: 10, u: "tonne" }, { q: 5, u: "Tonne" }, { q: 100, u: "caisse" }, { q: 3, u: null }],
    (x) => x.q,
    (x) => x.u
  );
  assert.deepEqual(totals, { tonne: 15, caisse: 100 });
});

test("entrées vides", () => {
  assert.deepEqual(sumByCurrency(null, () => 0, () => "CDF"), { CDF: 0, USD: 0 });
  assert.deepEqual(nonZeroCurrencies({ CDF: 0, USD: 0 }), []);
});
