// Corrections du lot 032 (C-4, C-5, C-6) — miroirs TypeScript des règles SQL 032.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getProductionChangeBlocker, hasUnitCommitments } from "../../src/lib/utils/productionRules.ts";
import {
  isDeadlineOpen,
  planDestinationSync,
  sortOpenDestinationsFirst,
  type SubmittedDestination,
} from "../../src/lib/utils/destinationSync.ts";
import { formatUnitTotals, groupQuantitiesByUnit } from "../../src/lib/utils/unitSeries.ts";

const TODAY = "2026-11-03";
const PAST = "2026-10-01";
const FUTURE = "2026-12-01";

test("C-4 — unité bloquée par un brouillon, une commande en cours ou une proposition ouverte", () => {
  assert.equal(hasUnitCommitments({ campaigns: [{ status: "draft" }] }), true);
  assert.equal(hasUnitCommitments({ campaigns: [{ status: "completed" }] }), true);
  assert.equal(hasUnitCommitments({ orders: [{ status: "ready" }] }), true);
  assert.equal(hasUnitCommitments({ demandResponses: [{ status: "proposed" }] }), true);
  assert.equal(hasUnitCommitments({ demandResponses: [{ status: "accepted" }] }), true);
});

test("C-4 — unité libre : campagnes annulées, commandes livrées ou annulées, propositions closes", () => {
  assert.equal(hasUnitCommitments({}), false);
  assert.equal(
    hasUnitCommitments({
      campaigns: [{ status: "cancelled" }],
      orders: [{ status: "delivered" }, { status: "cancelled" }],
      demandResponses: [{ status: "rejected" }],
    }),
    false
  );
});

test("C-4 — getProductionChangeBlocker : l'unité suit unitCommitted, indépendamment de l'engagement", () => {
  const before = { status: "harvested", unit: "tonne", is_public: true };
  assert.equal(getProductionChangeBlocker(false, before, { unit: "caisse" }, true), "unit", "brouillon seul");
  assert.equal(getProductionChangeBlocker(true, before, { unit: "caisse" }, false), null, "aucun engagement d'unité");
  assert.equal(getProductionChangeBlocker(true, before, { unit: "tonne" }, true), null, "unité inchangée");
  assert.equal(getProductionChangeBlocker(true, before, { unit: "caisse" }), "unit", "par défaut : unitCommitted = isEngaged");
});

test("C-5 — volumes déclarés regroupés par unité de production, sans total global", () => {
  const prods = [
    { expected_quantity: 10, unit: "tonne" },
    { expected_quantity: 5, unit: "tonne" },
    { expected_quantity: 200, unit: "caisse" },
  ];
  const totals = groupQuantitiesByUnit(prods, (p) => p.expected_quantity, (p) => p.unit);
  assert.equal(totals.length, 2);
  const text = formatUnitTotals(totals);
  assert.match(text, /15/);
  assert.match(text, /200/);
  assert.doesNotMatch(text, /215/);
});

test("C-6 — isDeadlineOpen et tri des destinations ouvertes en premier", () => {
  assert.equal(isDeadlineOpen(null, TODAY), true);
  assert.equal(isDeadlineOpen(TODAY, TODAY), true);
  assert.equal(isDeadlineOpen(PAST, TODAY), false);
  const sorted = sortOpenDestinationsFirst(
    [
      { city_name: "A", order_deadline_date: PAST },
      { city_name: "B", order_deadline_date: FUTURE },
      { city_name: "C", order_deadline_date: null },
    ],
    TODAY
  );
  assert.deepEqual(sorted.map((d) => d.city_name), ["B", "C", "A"]);
});

test("C-6 — remplacement d'une destination ouverte : ajout avant suppression", () => {
  const existing = [
    { id: "d1", city_name: "Kinshasa", order_deadline_date: FUTURE },
    { id: "d2", city_name: "Matadi", order_deadline_date: PAST },
  ];
  const plan = planDestinationSync(
    existing,
    [
      { id: "d2", city_name: "Matadi", order_deadline_date: PAST },
      { city_name: "Boma", order_deadline_date: FUTURE },
    ],
    TODAY
  );
  assert.deepEqual(plan.inserts.map((d) => d.city_name), ["Boma"]);
  assert.deepEqual(plan.updatesClosing.map((d) => d.id), ["d2"]);
  assert.deepEqual(plan.deletes, ["d1"]);
  assert.deepEqual(plan.earlyDeletes, []);
  assert.equal(plan.reopensWithoutPostponement, false);
});

test("C-6 — ville retirée puis rajoutée : la destination existante est reprise", () => {
  const existing = [{ id: "d1", city_name: "Kinshasa", order_deadline_date: FUTURE }];
  const submitted: SubmittedDestination[] = [{ city_name: " Kinshasa ", order_deadline_date: FUTURE }];
  const plan = planDestinationSync(existing, submitted, TODAY);
  assert.deepEqual(plan.reusedIds, ["d1"]);
  assert.deepEqual(plan.inserts, []);
  assert.deepEqual(plan.deletes, []);
  assert.deepEqual(plan.updatesKeepingOpen.map((d) => d.id), ["d1"]);
});

test("C-6 — renommage vers la ville d'une destination retirée : suppression anticipée", () => {
  const existing = [
    { id: "d1", city_name: "Kinshasa", order_deadline_date: FUTURE },
    { id: "d2", city_name: "Matadi", order_deadline_date: FUTURE },
  ];
  const plan = planDestinationSync(existing, [{ id: "d2", city_name: "Kinshasa", order_deadline_date: FUTURE }], TODAY);
  assert.deepEqual(plan.earlyDeletes, ["d1"]);
  assert.deepEqual(plan.deletes, []);
});

test("C3 / R-4 — campagne fermée par ses destinations : seul un report la rouvre", () => {
  const existing = [{ id: "d1", city_name: "Kinshasa", order_deadline_date: PAST }];
  // Ajout d'une destination ouverte sans report : refusé
  const add = planDestinationSync(
    existing,
    [
      { id: "d1", city_name: "Kinshasa", order_deadline_date: PAST },
      { city_name: "Boma", order_deadline_date: FUTURE },
    ],
    TODAY
  );
  assert.equal(add.reopensWithoutPostponement, true);
  // Remplacement complet (suppression + ajout) : refusé
  assert.equal(
    planDestinationSync(existing, [{ city_name: "Boma", order_deadline_date: FUTURE }], TODAY).reopensWithoutPostponement,
    true
  );
  // Report de la destination existante (avec ou sans ajout) : autorisé
  const postponed = planDestinationSync(
    existing,
    [
      { id: "d1", city_name: "Kinshasa", order_deadline_date: FUTURE },
      { city_name: "Boma", order_deadline_date: FUTURE },
    ],
    TODAY
  );
  assert.equal(postponed.reopensWithoutPostponement, false);
  assert.deepEqual(postponed.updatesKeepingOpen.map((d) => d.id), ["d1"]);
  // Ajout d'une destination expirée : la campagne reste fermée, autorisé
  assert.equal(
    planDestinationSync(
      existing,
      [
        { id: "d1", city_name: "Kinshasa", order_deadline_date: PAST },
        { city_name: "Boma", order_deadline_date: PAST },
      ],
      TODAY
    ).reopensWithoutPostponement,
    false
  );
});

test("C3 / R-4 — reprise d'une ville expirée avec une nouvelle date = report de la destination existante", () => {
  const existing = [{ id: "d1", city_name: "Kinshasa", order_deadline_date: PAST }];
  const plan = planDestinationSync(existing, [{ city_name: "Kinshasa", order_deadline_date: FUTURE }], TODAY);
  assert.deepEqual(plan.reusedIds, ["d1"]);
  assert.equal(plan.reopensWithoutPostponement, false);
});
