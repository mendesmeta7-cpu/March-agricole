// Tests unitaires de la source unique de vérité du statut des campagnes (BR-CMP-06).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getEffectiveCampaignStatus,
  isCampaignActive,
  getCampaignDestinationsSummary,
} from "../../src/lib/utils/campaignStatus.ts";

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split("T")[0];
};

test("une campagne non active garde son statut stocké", () => {
  assert.equal(getEffectiveCampaignStatus({ status: "paused" }), "paused");
  assert.equal(getEffectiveCampaignStatus({ status: "draft" }), "draft");
});

test("date de fin globale dépassée => terminée", () => {
  assert.equal(getEffectiveCampaignStatus({ status: "active", end_date: day(-1) }), "completed");
});

test("une destination expirée sur deux => toujours active (règle 1)", () => {
  const campaign = {
    status: "active",
    destinations: [{ order_deadline_date: day(-2) }, { order_deadline_date: day(3) }],
  };
  assert.equal(getEffectiveCampaignStatus(campaign), "active");
  assert.equal(isCampaignActive(campaign), true);
});

test("toutes les destinations expirées => terminée (règle 2)", () => {
  const campaign = {
    status: "active",
    campaign_destinations: [{ order_deadline_date: day(-2) }, { order_deadline_date: day(-1) }],
  };
  assert.equal(getEffectiveCampaignStatus(campaign), "completed");
});

test("destination sans date limite => reste ouverte", () => {
  assert.equal(
    getEffectiveCampaignStatus({ status: "active", destinations: [{ order_deadline_date: null }] }),
    "active"
  );
});

test("résumé des destinations", () => {
  const summary = getCampaignDestinationsSummary([
    { order_deadline_date: day(-1) },
    { order_deadline_date: day(1) },
    { order_deadline_date: null },
  ]);
  assert.deepEqual(summary, { total: 3, active: 2, expired: 1, noDeadline: 1 });
  assert.deepEqual(getCampaignDestinationsSummary(null), { total: 0, active: 0, expired: 0, noDeadline: 0 });
});
