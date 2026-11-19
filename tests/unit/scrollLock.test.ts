// Lot UX/UI 5B : verrou de défilement compté (fenêtres imbriquées, restauration des styles).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createScrollLocker, type ScrollLockEnv } from "../../src/components/ui/scrollLock.ts";

function environnement(largeurBarre = 0, overflow = "", paddingRight = "") {
  const env: ScrollLockEnv = {
    body: { style: { overflow, paddingRight } },
    scrollbarWidth: () => largeurBarre,
  };
  return env;
}

test("une surface ouverte verrouille la page, sa fermeture la libère", () => {
  const env = environnement();
  const verrou = createScrollLocker(() => env);
  verrou.lock();
  assert.equal(env.body.style.overflow, "hidden");
  assert.equal(verrou.count(), 1);
  verrou.unlock();
  assert.equal(env.body.style.overflow, "");
  assert.equal(verrou.count(), 0);
});

test("fenêtre imbriquée : la fermeture du Dialog ne libère pas la page tant que le Drawer reste ouvert", () => {
  const env = environnement();
  const verrou = createScrollLocker(() => env);
  verrou.lock(); // Drawer
  verrou.lock(); // Dialog au-dessus
  verrou.unlock(); // fermeture du Dialog
  assert.equal(env.body.style.overflow, "hidden", "la page doit rester verrouillée");
  assert.equal(verrou.count(), 1);
  verrou.unlock(); // fermeture du Drawer
  assert.equal(env.body.style.overflow, "");
});

test("les styles d'origine sont restaurés, barre de défilement compensée pendant le verrou", () => {
  const env = environnement(15, "auto", "4px");
  const verrou = createScrollLocker(() => env);
  verrou.lock();
  assert.equal(env.body.style.overflow, "hidden");
  assert.equal(env.body.style.paddingRight, "15px");
  verrou.lock();
  verrou.unlock();
  verrou.unlock();
  assert.equal(env.body.style.overflow, "auto");
  assert.equal(env.body.style.paddingRight, "4px");
});

test("sans barre de défilement, aucune marge ajoutée", () => {
  const env = environnement(0, "", "");
  const verrou = createScrollLocker(() => env);
  verrou.lock();
  assert.equal(env.body.style.paddingRight, "");
  verrou.unlock();
});

test("un déverrouillage en trop ne rend pas le compteur négatif", () => {
  const env = environnement();
  const verrou = createScrollLocker(() => env);
  verrou.unlock();
  assert.equal(verrou.count(), 0);
  verrou.lock();
  assert.equal(env.body.style.overflow, "hidden");
  verrou.unlock();
  verrou.unlock();
  assert.equal(verrou.count(), 0);
  assert.equal(env.body.style.overflow, "");
});

test("hors navigateur (rendu serveur), le verrou ne fait rien", () => {
  const verrou = createScrollLocker(() => null);
  verrou.lock();
  assert.equal(verrou.count(), 0);
  verrou.unlock();
  assert.equal(verrou.count(), 0);
});
