// Décisions métier validées A5, A11, A13 (ADR-045) — règles partagées interface / base.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isConsumingReservation,
  sumConsumedQuantity,
} from "../../src/lib/utils/stockRules.ts";
import {
  getNextCompanyStatuses,
  canConfirmDelivery,
  canCompanyCancel,
  canResellerCancel,
} from "../../src/lib/utils/orderRules.ts";

test("A11 — une commande livrée reste consommée, une annulation libère le volume", () => {
  assert.equal(isConsumingReservation("active"), true);
  assert.equal(isConsumingReservation("confirmed"), true);
  assert.equal(isConsumingReservation("released"), false);
  assert.equal(isConsumingReservation(null), false);
  assert.equal(
    sumConsumedQuantity([
      { status: "active", quantity: 10 },
      { status: "confirmed", quantity: "15" },
      { status: "released", quantity: 99 },
    ]),
    25
  );
  assert.equal(sumConsumedQuantity(null), 0);
});

test("A13 — l'entreprise ne fait progresser une commande que vers l'avant", () => {
  assert.deepEqual(getNextCompanyStatuses("pending"), ["confirmed", "preparing", "ready"]);
  assert.deepEqual(getNextCompanyStatuses("confirmed"), ["preparing", "ready"]);
  assert.deepEqual(getNextCompanyStatuses("preparing"), ["ready"]);
  assert.deepEqual(getNextCompanyStatuses("ready"), []);
  assert.deepEqual(getNextCompanyStatuses("delivered"), []);
  assert.deepEqual(getNextCompanyStatuses("cancelled"), []);
});

test("A5 — livraison uniquement depuis « prête »", () => {
  for (const status of ["pending", "confirmed", "preparing", "delivered", "cancelled"]) {
    assert.equal(canConfirmDelivery(status), false, status);
  }
  assert.equal(canConfirmDelivery("ready"), true);
});

test("A5 — annulation : revendeur en attente seulement, entreprise en attente ou confirmée", () => {
  assert.equal(canResellerCancel("pending"), true);
  for (const status of ["confirmed", "preparing", "ready", "delivered", "cancelled"]) {
    assert.equal(canResellerCancel(status), false, status);
  }
  assert.equal(canCompanyCancel("pending"), true);
  assert.equal(canCompanyCancel("confirmed"), true);
  for (const status of ["preparing", "ready", "delivered", "cancelled"]) {
    assert.equal(canCompanyCancel(status), false, status);
  }
});
