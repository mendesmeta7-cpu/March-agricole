// Éligibilité régionale (BR-ORD-01/02) : source de vérité côté interface.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isResellerEligibleForCampaign } from "../../src/lib/services/campaignEligibility.ts";

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split("T")[0];
};

const reseller = { id: "r1", country_id: "cod", province_id: "kin" };
const baseCampaign = {
  status: "active",
  start_date: day(-5),
  end_date: day(30),
  marketable_quantity: 100,
  reserved_quantity: 10,
  campaign_destinations: [{ id: "d1", province_id: "kin", order_deadline_date: day(10) }],
};

test("revendeur non connecté", () => {
  assert.equal(isResellerEligibleForCampaign({ reseller: null, campaign: baseCampaign }).reason, "UNAUTHENTICATED");
});

test("province desservie => commande autorisée", () => {
  const r = isResellerEligibleForCampaign({ reseller, campaign: baseCampaign });
  assert.equal(r.reason, "ORDER_ALLOWED");
  assert.equal(r.canOrder, true);
});

test("province non desservie => commande refusée", () => {
  const r = isResellerEligibleForCampaign({ reseller: { ...reseller, province_id: "kas" }, campaign: baseCampaign });
  assert.equal(r.eligible, false);
  assert.equal(r.canOrder, false);
});

test("date limite de la destination dépassée => éligible mais ne peut pas commander", () => {
  const r = isResellerEligibleForCampaign({
    reseller,
    campaign: { ...baseCampaign, campaign_destinations: [{ id: "d1", province_id: "kin", order_deadline_date: day(-1) }] },
  });
  assert.equal(r.eligible, true);
  assert.equal(r.canOrder, false);
  assert.equal(r.reason, "DESTINATION_DEADLINE_EXPIRED");
});

test("stock épuisé => ne peut pas commander", () => {
  const r = isResellerEligibleForCampaign({ reseller, campaign: { ...baseCampaign, reserved_quantity: 100 } });
  assert.equal(r.canOrder, false);
  assert.equal(r.reason, "OUT_OF_STOCK");
});
