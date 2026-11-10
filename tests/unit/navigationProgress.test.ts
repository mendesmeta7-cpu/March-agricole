// RET-04 : la barre de progression ne démarre que pour une vraie navigation interne.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isInternalNavigation } from "../../src/lib/utils/navigationProgress.ts";

const CURRENT = "https://radiza.test/dashboard/company/orders?statut=pending";
const click = (href: string | null, overrides = {}) => ({
  href,
  target: null,
  hasDownload: false,
  button: 0,
  hasModifierKey: false,
  ...overrides,
});

test("lien interne vers une autre page ou d'autres paramètres : barre affichée", () => {
  assert.equal(isInternalNavigation(click("/dashboard/company/demands"), CURRENT), true);
  assert.equal(isInternalNavigation(click("/dashboard/company/orders?statut=ready"), CURRENT), true);
  assert.equal(isInternalNavigation(click("/dashboard/company/orders"), CURRENT), true);
  assert.equal(isInternalNavigation(click("../demands"), CURRENT), true);
  assert.equal(isInternalNavigation(click("https://radiza.test/login"), CURRENT), true);
  assert.equal(isInternalNavigation(click("/login", { target: "_self" }), CURRENT), true);
});

test("même page ou simple ancre : pas de barre", () => {
  assert.equal(isInternalNavigation(click("/dashboard/company/orders?statut=pending"), CURRENT), false);
  assert.equal(isInternalNavigation(click("/dashboard/company/orders?statut=pending#haut"), CURRENT), false);
  assert.equal(isInternalNavigation(click("#haut"), CURRENT), false);
});

test("lien externe, courriel ou téléphone : pas de barre", () => {
  assert.equal(isInternalNavigation(click("https://exemple.org/page"), CURRENT), false);
  assert.equal(isInternalNavigation(click("mailto:contact@radiza.test"), CURRENT), false);
  assert.equal(isInternalNavigation(click("tel:+243000000000"), CURRENT), false);
});

test("nouvel onglet, téléchargement, bouton secondaire ou touche de modification : pas de barre", () => {
  assert.equal(isInternalNavigation(click("/login", { target: "_blank" }), CURRENT), false);
  assert.equal(isInternalNavigation(click("/rapport.pdf", { hasDownload: true }), CURRENT), false);
  assert.equal(isInternalNavigation(click("/login", { button: 1 }), CURRENT), false);
  assert.equal(isInternalNavigation(click("/login", { hasModifierKey: true }), CURRENT), false);
});

test("lien sans adresse ou adresse courante invalide : pas de barre", () => {
  assert.equal(isInternalNavigation(click(null), CURRENT), false);
  assert.equal(isInternalNavigation(click(""), CURRENT), false);
  assert.equal(isInternalNavigation(click("/login"), "pas une url"), false);
});
