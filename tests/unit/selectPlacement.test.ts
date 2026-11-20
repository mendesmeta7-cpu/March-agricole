// Lot UX/UI 5B, MOB-08 : sens d'ouverture et hauteur du menu de Select.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  choisirPlacement,
  hauteurListeMaximale,
  HAUTEUR_LISTE_MINIMALE,
  MARGE_MENU,
} from "../../src/components/ui/selectPlacement.ts";

test("assez de place en dessous : ouverture vers le bas (comportement d'origine)", () => {
  assert.equal(choisirPlacement(400, 50, 300), "bas");
  assert.equal(choisirPlacement(300 + MARGE_MENU, 900, 300), "bas");
});

test("place insuffisante en dessous et plus grande au-dessus : ouverture vers le haut", () => {
  assert.equal(choisirPlacement(120, 500, 300), "haut");
  assert.equal(choisirPlacement(300 + MARGE_MENU - 1, 600, 300), "haut");
});

test("place insuffisante des deux côtés : le côté le plus grand, à égalité vers le bas", () => {
  assert.equal(choisirPlacement(150, 100, 300), "bas");
  assert.equal(choisirPlacement(150, 150, 300), "bas");
  assert.equal(choisirPlacement(100, 150, 300), "haut");
});

test("hauteur de liste : inchangée si le menu tient, réduite sinon, jamais sous le minimum", () => {
  assert.equal(hauteurListeMaximale(400, 300, 50), null);
  assert.equal(hauteurListeMaximale(260, 300, 50), 260 - 50 - MARGE_MENU);
  assert.equal(hauteurListeMaximale(100, 300, 50), HAUTEUR_LISTE_MINIMALE);
});
