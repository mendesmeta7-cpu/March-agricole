/**
 * Compression d'une photo dans le navigateur, avant son envoi avec le formulaire.
 * Une photo plus lourde que la limite d'envoi des actions serveur serait refusée :
 * elle doit donc arriver sous MAX_UPLOAD_PHOTO_BYTES.
 *
 * Les fonctions de décision sont pures (importables par les tests node:test).
 */

/** Taille maximale d'une photo envoyée : 900 Ko. */
export const MAX_UPLOAD_PHOTO_BYTES = 900 * 1024;

export const PHOTO_COMPRESSION_ERROR_MESSAGE =
  "Cette photo n'a pas pu être préparée pour l'envoi. Choisissez une autre photo au format JPG, PNG ou WebP.";

/** Essais successifs, du plus fidèle au plus léger. */
export const COMPRESSION_STEPS: readonly { maxSide: number; quality: number }[] = [
  { maxSide: 2000, quality: 0.82 },
  { maxSide: 2000, quality: 0.7 },
  { maxSide: 1600, quality: 0.7 },
  { maxSide: 1280, quality: 0.7 },
  { maxSide: 1280, quality: 0.55 },
  { maxSide: 1024, quality: 0.55 },
  { maxSide: 800, quality: 0.5 },
];

/** Une photo déjà sous la limite part telle quelle. */
export function needsCompression(sizeInBytes: number): boolean {
  return sizeInBytes > MAX_UPLOAD_PHOTO_BYTES;
}

/** Dimensions réduites pour tenir dans maxSide, proportions conservées, jamais agrandies. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** Le fichier compressé est toujours un JPEG : son nom doit le dire. */
export function compressedFileName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.jpg`;
}

function loadImage(file: File): Promise<{ image: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, release: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Photo illisible par le navigateur"));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Renvoie une photo d'au plus MAX_UPLOAD_PHOTO_BYTES.
 * Lève une erreur si la photo est illisible ou si aucun essai n'atteint la limite.
 */
export async function compressPhotoForUpload(file: File): Promise<File> {
  if (!needsCompression(file.size)) return file;

  const { image, release } = await loadImage(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible");

    for (const { maxSide, quality } of COMPRESSION_STEPS) {
      const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, maxSide);
      canvas.width = width;
      canvas.height = height;
      // Fond blanc : le JPEG ne gère pas la transparence d'un PNG.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const blob = await canvasToJpeg(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_PHOTO_BYTES) {
        return new File([blob], compressedFileName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  } finally {
    release();
  }

  throw new Error("Photo trop lourde après compression");
}
