// Lot UX/UI 5B : quels clics de lien quittent une page de saisie modifiée (confirmation requise) ?
import { test } from "node:test";
import assert from "node:assert/strict";
import { estSortieProtegee } from "../../src/components/ui/unsavedChanges.ts";

const PAGE = "https://radiza.example/dashboard/company/campaigns/new?production_id=p1";

test("un lien interne vers une autre page est intercepté (chemin, requête et ancre conservés)", () => {
  assert.equal(estSortieProtegee("/dashboard/company/campaigns", PAGE), "/dashboard/company/campaigns");
  assert.equal(
    estSortieProtegee("https://radiza.example/dashboard/company?onglet=a#b", PAGE),
    "/dashboard/company?onglet=a#b"
  );
  assert.equal(estSortieProtegee("../productions", PAGE), "/dashboard/company/productions");
});

test("même page avec une autre requête : c'est une autre page", () => {
  assert.equal(
    estSortieProtegee("/dashboard/company/campaigns/new?production_id=p2", PAGE),
    "/dashboard/company/campaigns/new?production_id=p2"
  );
});

test("ancre interne ou même adresse : pas d'interception", () => {
  assert.equal(estSortieProtegee("#etape-calendrier", PAGE), null);
  assert.equal(estSortieProtegee("/dashboard/company/campaigns/new?production_id=p1#etape-destinations", PAGE), null);
  assert.equal(estSortieProtegee(PAGE, PAGE), null);
});

test("lien externe ou autre protocole : laissé au navigateur", () => {
  assert.equal(estSortieProtegee("https://autre.example/page", PAGE), null);
  assert.equal(estSortieProtegee("mailto:contact@radiza.example", PAGE), null);
  assert.equal(estSortieProtegee("tel:+243000000", PAGE), null);
});

test("adresse illisible : pas d'interception", () => {
  assert.equal(estSortieProtegee("/x", "pas une adresse"), null);
});
