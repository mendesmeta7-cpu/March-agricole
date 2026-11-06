// Disponibilité agrégée des campagnes (migration 32) : absente = 0, erreur = inconnue.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toCampaignAvailabilityLookup,
  resolveCampaignAvailability,
  chunkIds,
  toProductionAvailability,
} from "../../src/lib/actions/campaignAvailability.ts";

test("campagne présente dans le résultat : disponible renvoyé, commandable si > 0", () => {
  const lookup = toCampaignAvailabilityLookup(
    [
      { campaign_id: "a", available_quantity: "12.5" },
      { campaign_id: "b", available_quantity: 0 },
    ],
    false
  );
  assert.deepEqual(resolveCampaignAvailability(lookup, "a"), {
    available_quantity: 12.5,
    availability_unavailable: false,
    orderable: true,
  });
  assert.equal(resolveCampaignAvailability(lookup, "b").orderable, false);
});

test("campagne absente du résultat : disponible 0 et non commandable", () => {
  const lookup = toCampaignAvailabilityLookup([], false);
  assert.deepEqual(resolveCampaignAvailability(lookup, "x"), {
    available_quantity: 0,
    availability_unavailable: false,
    orderable: false,
  });
});

test("erreur RPC : disponibilité inconnue (null), jamais de repli", () => {
  const lookup = toCampaignAvailabilityLookup([{ campaign_id: "a", available_quantity: 99 }], true);
  assert.deepEqual(resolveCampaignAvailability(lookup, "a"), {
    available_quantity: null,
    availability_unavailable: true,
    orderable: false,
  });
});

test("découpage en lots de 200 identifiants dédoublonnés", () => {
  const ids = Array.from({ length: 450 }, (_, i) => `id-${i}`);
  const chunks = chunkIds([...ids, "id-0", ""]);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 200);
  assert.equal(chunks[2].length, 50);
  assert.equal(chunkIds([]).length, 0);
});

test("normalisation d'une ligne de disponibilité production", () => {
  assert.deepEqual(
    toProductionAvailability({
      production_id: "p",
      production_status: "harvested",
      unit: "tonne",
      expected_quantity: "100",
      committed_quantity: "40",
      available_quantity: "60",
    }),
    {
      production_id: "p",
      production_status: "harvested",
      unit: "tonne",
      expected_quantity: 100,
      committed_quantity: 40,
      available_quantity: 60,
    }
  );
});
