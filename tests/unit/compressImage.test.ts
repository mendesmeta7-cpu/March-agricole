// RET-06 : décisions de compression avant envoi (cible : 900 Ko).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_UPLOAD_PHOTO_BYTES,
  DEFAULT_MAX_SOURCE_BYTES,
  BANNER_MAX_SOURCE_BYTES,
  ACCEPTED_PHOTO_TYPES,
  COMPRESSION_STEPS,
  PNG_FALLBACK_SIDES,
  PHOTO_FORMAT_ERROR_MESSAGE,
  needsCompression,
  mayHaveTransparency,
  fitWithin,
  compressedFileName,
  checkPhotoSource,
  photoTooLargeMessage,
} from "../../src/lib/utils/compressImage.ts";

test("la cible maximale est de 900 Ko", () => {
  assert.equal(MAX_UPLOAD_PHOTO_BYTES, 921600);
});

test("needsCompression : seule une photo au-dessus de la limite est compressée", () => {
  assert.equal(needsCompression(MAX_UPLOAD_PHOTO_BYTES - 1), false);
  assert.equal(needsCompression(MAX_UPLOAD_PHOTO_BYTES), false);
  assert.equal(needsCompression(MAX_UPLOAD_PHOTO_BYTES + 1), true);
  assert.equal(needsCompression(5 * 1024 * 1024), true);
});

test("fitWithin : proportions conservées, jamais d'agrandissement", () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
  assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(5000, 1, 800), { width: 800, height: 1 });
});

test("les essais vont du plus fidèle au plus léger", () => {
  for (let i = 1; i < COMPRESSION_STEPS.length; i++) {
    const previous = COMPRESSION_STEPS[i - 1];
    const current = COMPRESSION_STEPS[i];
    assert.ok(current.maxSide <= previous.maxSide, `dimension de l'essai ${i}`);
    assert.ok(current.quality <= previous.quality, `qualité de l'essai ${i}`);
    assert.ok(
      current.maxSide < previous.maxSide || current.quality < previous.quality,
      `l'essai ${i} doit alléger la photo`
    );
  }
});

test("compressedFileName : extension JPEG, nom conservé", () => {
  assert.equal(compressedFileName("champ de maïs.png"), "champ de maïs.jpg");
  assert.equal(compressedFileName("photo.final.webp"), "photo.final.jpg");
  assert.equal(compressedFileName("sans-extension"), "sans-extension.jpg");
  assert.equal(compressedFileName(".png"), "photo.jpg");
});

// Lot 2D : contrôles communs et transparence
const MO = 1024 * 1024;

test("limites source : 5 Mo par défaut, 8 Mo pour une bannière", () => {
  assert.equal(DEFAULT_MAX_SOURCE_BYTES, 5 * MO);
  assert.equal(BANNER_MAX_SOURCE_BYTES, 8 * MO);
});

test("checkPhotoSource : JPEG, PNG et WebP acceptés jusqu'à la limite", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(checkPhotoSource({ type, size: 5 * MO }), null, type);
  }
  assert.equal(checkPhotoSource({ type: "image/jpeg", size: 8 * MO }, BANNER_MAX_SOURCE_BYTES), null);
  assert.deepEqual([...ACCEPTED_PHOTO_TYPES], ["image/jpeg", "image/png", "image/webp"]);
});

test("checkPhotoSource : formats non pris en charge refusés avant l'envoi", () => {
  for (const type of ["image/gif", "image/heic", "image/bmp", "image/svg+xml", "application/pdf", ""]) {
    assert.equal(checkPhotoSource({ type, size: 1000 }), PHOTO_FORMAT_ERROR_MESSAGE, type || "type vide");
  }
});

test("checkPhotoSource : source trop lourde refusée avec la bonne limite", () => {
  assert.equal(
    checkPhotoSource({ type: "image/png", size: 5 * MO + 1 }),
    "Cette image dépasse 5 Mo. Choisissez une image plus légère."
  );
  assert.equal(
    checkPhotoSource({ type: "image/jpeg", size: 8 * MO + 1 }, BANNER_MAX_SOURCE_BYTES),
    "Cette image dépasse 8 Mo. Choisissez une image plus légère."
  );
  // Le format est contrôlé avant la taille : un message, le plus utile.
  assert.equal(checkPhotoSource({ type: "image/gif", size: 9 * MO }), PHOTO_FORMAT_ERROR_MESSAGE);
  assert.equal(photoTooLargeMessage(8 * MO), "Cette image dépasse 8 Mo. Choisissez une image plus légère.");
});

test("transparence : seuls PNG et WebP peuvent en porter", () => {
  assert.equal(mayHaveTransparency("image/png"), true);
  assert.equal(mayHaveTransparency("image/webp"), true);
  assert.equal(mayHaveTransparency("image/jpeg"), false);
});

test("compressedFileName : extension du format réel", () => {
  assert.equal(compressedFileName("logo.png", "webp"), "logo.webp");
  assert.equal(compressedFileName("logo.png", "png"), "logo.png");
  assert.equal(compressedFileName("photo.jpeg"), "photo.jpg");
});

test("repli PNG sans WebP : dimensions strictement décroissantes", () => {
  for (let i = 1; i < PNG_FALLBACK_SIDES.length; i++) {
    assert.ok(PNG_FALLBACK_SIDES[i] < PNG_FALLBACK_SIDES[i - 1], `essai ${i}`);
  }
  assert.ok(MAX_UPLOAD_PHOTO_BYTES < 1024 * 1024, "marge sous la limite de 1 Mo des actions serveur");
});
