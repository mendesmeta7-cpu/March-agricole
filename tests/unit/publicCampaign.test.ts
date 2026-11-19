// Lot UX/UI 5B : page publique de campagne — seules les informations déclarées publiques sortent.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_CAMPAIGN_SELECT,
  PUBLIC_PRODUCTION_STATUSES,
  publicCampaignPath,
  publicCampaignSummary,
  toPublicCampaign,
} from "../../src/lib/utils/publicCampaign.ts";

const LIGNE = {
  id: "c1",
  company_id: "s1",
  production_id: "p1",
  title: "Maïs blanc — saison A",
  description: "Maïs  séché,\n conditionné en sacs.",
  marketable_quantity: "120.50",
  reserved_quantity: 80,
  available_quantity: 40.5,
  unit: "tonne",
  unit_price: "350000",
  currency: "CDF",
  min_order_quantity: "2",
  start_date: "2026-11-01",
  end_date: null,
  availability_period: "Novembre",
  status: "active",
  company: [{ id: "s1", name: "Ferme Kivu", logo_url: null, city: "Goma", verification_status: "verified", is_active: true, phone: "+243 000", email: "ferme@exemple.cd", address: "Rue 1", provinces: { name: "Nord-Kivu" }, countries: [{ name: "RDC" }] }],
  product: { name: "Maïs", category: "Céréales", image_url: "https://img.exemple/mais.jpg", is_global: true, is_active: true },
  production: { id: "p1", title: "Maïs 2026", main_image_url: null, status: "harvested", is_public: true, expected_quantity: 200 },
  delivery_zones: [{ id: "z1", provinces: { name: "Kinshasa" } }, { id: "z2", provinces: [{ name: "Kinshasa" }] }, { id: "z3", provinces: null }],
  destinations: [
    {
      id: "d1", city_name: "Kinshasa", expected_arrival_date: "2026-12-01", order_deadline_date: "2026-11-25",
      provinces: { name: "Kinshasa" },
      depots: [{ id: "dep1", name: "Dépôt Central", commune: "Lemba", quartier: "Q1", address: "1ère Rue, marché", complement: "En face de la station" }],
    },
  ],
  depots: [{ address: "ne doit jamais sortir" }],
};

test("forme publique : offre, société, zones générales et dates", () => {
  const c = toPublicCampaign(LIGNE);
  assert.equal(c.id, "c1");
  assert.equal(c.unit_price, 350000);
  assert.equal(c.marketable_quantity, 120.5);
  assert.equal(c.min_order_quantity, 2);
  assert.equal(c.company.name, "Ferme Kivu");
  assert.equal(c.company.province_name, "Nord-Kivu");
  assert.equal(c.company.country_name, "RDC");
  assert.deepEqual(c.provinces, ["Kinshasa"], "provinces sans doublon ni valeur vide");
  assert.deepEqual(c.destinations, [
    { id: "d1", city_name: "Kinshasa", province_name: "Kinshasa", expected_arrival_date: "2026-12-01", order_deadline_date: "2026-11-25" },
  ]);
  assert.equal(c.image_url, "https://img.exemple/mais.jpg", "photo de production absente : image du produit");
});

test("aucune donnée non publique : dépôts, stock restant, coordonnées de la société", () => {
  const texte = JSON.stringify(toPublicCampaign(LIGNE));
  for (const interdit of ["Dépôt Central", "Lemba", "1ère Rue", "En face de la station", "ne doit jamais sortir", "+243 000", "ferme@exemple.cd", "Rue 1"]) {
    assert.ok(!texte.includes(interdit), `« ${interdit} » ne doit pas apparaître`);
  }
  const c = toPublicCampaign(LIGNE) as unknown as Record<string, unknown>;
  for (const cle of ["available_quantity", "reserved_quantity", "depots", "status", "company_id", "production_id"]) {
    assert.ok(!(cle in c), `la clé ${cle} ne doit pas être exposée`);
  }
  assert.ok(!("depots" in (c.destinations as Array<Record<string, unknown>>)[0]));
});

test("la lecture publique ne demande jamais les dépôts ni les coordonnées privées", () => {
  const colonnes = PUBLIC_CAMPAIGN_SELECT.replace(/\s+/g, " ");
  for (const interdit of ["campaign_depots", "depots", "address", "quartier", "complement", "commune", "phone", "email", "reserved_quantity", "available_quantity"]) {
    assert.ok(!new RegExp(`\\b${interdit}\\b`).test(colonnes), `colonne ${interdit} interdite`);
  }
  assert.match(colonnes, /companies!inner/);
  assert.match(colonnes, /products!inner/);
  assert.match(colonnes, /productions!inner/);
  assert.deepEqual([...PUBLIC_PRODUCTION_STATUSES], ["planned", "growing", "harvested"]);
});

test("photo de la production prioritaire, sinon image du produit, sinon aucune", () => {
  const avecPhoto = toPublicCampaign({ ...LIGNE, production: { ...LIGNE.production, main_image_url: "https://img.exemple/prod.jpg" } });
  assert.equal(avecPhoto.image_url, "https://img.exemple/prod.jpg");
  const sansImage = toPublicCampaign({ ...LIGNE, product: { ...LIGNE.product, image_url: null } });
  assert.equal(sansImage.image_url, null);
});

test("valeurs absentes ou illisibles : repli sûr", () => {
  const c = toPublicCampaign({ id: "x" });
  assert.equal(c.title, "");
  assert.equal(c.unit_price, 0);
  assert.equal(c.min_order_quantity, 1);
  assert.deepEqual(c.destinations, []);
  assert.deepEqual(c.provinces, []);
  assert.equal(c.image_url, null);
});

test("résumé d'aperçu : description aplatie, sinon phrase par défaut, longueur bornée", () => {
  assert.equal(publicCampaignSummary(toPublicCampaign(LIGNE)), "Maïs séché, conditionné en sacs.");
  const sansDescription = toPublicCampaign({ ...LIGNE, description: null });
  assert.equal(publicCampaignSummary(sansDescription), "Maïs proposé par Ferme Kivu sur Radiza.");
  const long = publicCampaignSummary(toPublicCampaign({ ...LIGNE, description: "a".repeat(500) }), 50);
  assert.equal(long.length, 50);
  assert.ok(long.endsWith("…"));
});

test("adresse publique encodée", () => {
  assert.equal(publicCampaignPath("c1"), "/campaigns/c1");
  assert.equal(publicCampaignPath("a/b?c"), "/campaigns/a%2Fb%3Fc");
});
