// BR-ORD-12 : seules les commandes livrées sont des ventes réalisées, par devise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRealizedSales, isRealizedSale } from "../../src/lib/utils/realizedSales.ts";

test("seul le statut delivered est une vente réalisée", () => {
  for (const s of ["pending", "confirmed", "preparing", "ready", "cancelled"]) {
    assert.equal(isRealizedSale(s), false, s);
  }
  assert.equal(isRealizedSale("delivered"), true);
});

test("ventes réalisées ventilées par devise", () => {
  const summary = calculateRealizedSales([
    { status: "delivered", total_amount: 1000, currency: "CDF", delivered_quantity: 2 },
    { status: "delivered", total_amount: 50, currency: "USD", delivered_quantity: 1 },
    { status: "ready", total_amount: 999999, currency: "CDF" },
    { status: "cancelled", total_amount: 999999, currency: "USD" },
  ]);
  assert.equal(summary.totalDeliveredOrders, 2);
  assert.equal(summary.byCurrency.CDF.deliveredAmount, 1000);
  assert.equal(summary.byCurrency.USD.deliveredAmount, 50);
});
