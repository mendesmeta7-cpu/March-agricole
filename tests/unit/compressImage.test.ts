// RET-06 : décisions de compression avant envoi (cible : 900 Ko).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_UPLOAD_PHOTO_BYTES,
  COMPRESSION_STEPS,
  needsCompression,
  fitWithin,
  compressedFileName,
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
