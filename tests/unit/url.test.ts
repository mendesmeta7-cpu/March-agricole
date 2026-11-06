// Tests anti open-redirect (sanitizeRedirectPath).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRedirectPath } from "../../src/lib/utils/url.ts";

test("accepte les chemins internes autorisés", () => {
  assert.equal(sanitizeRedirectPath("/dashboard/company"), "/dashboard/company");
  assert.equal(sanitizeRedirectPath("/dashboard/reseller/orders/abc"), "/dashboard/reseller/orders/abc");
});

test("rejette les redirections externes et dangereuses", () => {
  for (const evil of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/dashboard/../\\evil",
    "/dashboard?next=https://evil.example",
    "data:text/html,abc",
  ]) {
    assert.equal(sanitizeRedirectPath(evil, "/login"), "/login", `devrait rejeter ${evil}`);
  }
});

test("rejette les chemins hors liste blanche et les valeurs vides", () => {
  assert.equal(sanitizeRedirectPath("/inconnu", "/"), "/");
  assert.equal(sanitizeRedirectPath(null, "/login"), "/login");
  assert.equal(sanitizeRedirectPath("", "/login"), "/login");
});
