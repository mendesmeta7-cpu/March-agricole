// Décisions C2, C3, A4/D1/D3, A12/A12-bis/D5 (ADR-046) — miroirs TypeScript des règles SQL 032.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getProductionChangeBlocker } from "../../src/lib/utils/productionRules.ts";
import {
  isCampaignEffectivelyOpen,
  canOfferReopen,
  isEndDateExtensionRequired,
  validateReopenEndDate,
  destinationsOpenAfterReopen,
} from "../../src/lib/utils/campaignReopenRules.ts";

const TODAY = "2026-11-03";

test("A4/D1/D3 — production non engagée : tout est permis", () => {
  assert.equal(getProductionChangeBlocker(false, { unit: "tonne", is_public: true }, { unit: "caisse", is_public: false }), null);
});

test("D1 — produit et unité figés, valeurs inchangées acceptées", () => {
  const before = { status: "harvested", product_id: "p1", company_product_id: "cp1", unit: "tonne", is_public: true };
  assert.equal(getProductionChangeBlocker(true, before, { unit: "caisse" }), "unit");
  assert.equal(getProductionChangeBlocker(true, before, { product_id: "p2" }), "product");
  assert.equal(getProductionChangeBlocker(true, before, { company_product_id: "cp2" }), "product");
  assert.equal(getProductionChangeBlocker(true, before, { ...before }), null, "édition descriptive renvoyant les mêmes valeurs");
});

test("A4/D3 — statut, archivage et passage en non public bloqués ; non public → public autorisé", () => {
  const before = { status: "harvested", unit: "tonne", is_public: true };
  assert.equal(getProductionChangeBlocker(true, before, { status: "cancelled", is_public: false }), "status");
  assert.equal(getProductionChangeBlocker(true, before, { is_public: false }), "visibility");
  assert.equal(getProductionChangeBlocker(true, { ...before, is_public: false }, { is_public: true }), null);
});

test("C2 — ouverture effective", () => {
  assert.equal(isCampaignEffectivelyOpen({ status: "active", end_date: null, destinations: [] }, TODAY), true);
  assert.equal(isCampaignEffectivelyOpen({ status: "paused", end_date: "2026-11-02" }, TODAY), false);
  assert.equal(isCampaignEffectivelyOpen({ status: "draft", end_date: TODAY }, TODAY), true);
  assert.equal(isCampaignEffectivelyOpen({ status: "completed" }, TODAY), false);
  assert.equal(
    isCampaignEffectivelyOpen({ status: "active", destinations: [{ order_deadline_date: "2026-11-01" }] }, TODAY),
    false
  );
  assert.equal(
    isCampaignEffectivelyOpen(
      { status: "active", destinations: [{ order_deadline_date: "2026-11-01" }, { order_deadline_date: null }] },
      TODAY
    ),
    true,
    "une destination sans date limite reste ouverte"
  );
});

test("A12 — réouverture proposée seulement si close et non annulée", () => {
  assert.equal(canOfferReopen({ status: "cancelled" }, TODAY), false);
  assert.equal(canOfferReopen({ status: "completed", end_date: "2026-12-01" }, TODAY), true);
  assert.equal(canOfferReopen({ status: "active", end_date: "2026-12-01" }, TODAY), false);
});

test("C3 / D5 — prolongation de la date générale seulement si elle est dépassée", () => {
  assert.equal(isEndDateExtensionRequired("2026-11-02", TODAY), true);
  assert.equal(isEndDateExtensionRequired("2026-12-01", TODAY), false);
  assert.equal(isEndDateExtensionRequired(null, TODAY), false);

  assert.notEqual(validateReopenEndDate("2026-11-02", null, TODAY), null, "date dépassée : nouvelle date obligatoire");
  assert.equal(validateReopenEndDate("2026-12-01", null, TODAY), null, "C3 : date valide, aucune prolongation exigée");
  assert.notEqual(validateReopenEndDate(null, "2026-11-01", TODAY), null, "ancienne vide : nouvelle ≥ aujourd'hui");
  assert.equal(validateReopenEndDate(null, TODAY, TODAY), null);
  assert.notEqual(validateReopenEndDate("2026-10-01", "2026-10-01", TODAY), null, "doit être postérieure et ≥ aujourd'hui");
  assert.notEqual(validateReopenEndDate("2026-12-31", "2026-12-31", TODAY), null, "strictement postérieure à l'ancienne");
  assert.equal(validateReopenEndDate("2026-11-02", "2026-11-30", TODAY), null);
});

test("A12-bis — au moins une destination ouverte après report", () => {
  const destinations = [
    { id: "d1", order_deadline_date: "2026-10-01" },
    { id: "d2", order_deadline_date: "2026-10-15" },
  ];
  assert.equal(destinationsOpenAfterReopen(destinations, {}, TODAY), false);
  assert.equal(destinationsOpenAfterReopen(destinations, { d2: "2026-11-20" }, TODAY), true);
  assert.equal(destinationsOpenAfterReopen([], {}, TODAY), true);
});
