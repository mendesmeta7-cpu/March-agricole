/**
 * Préparation d'une photo dans le navigateur, avant son envoi avec un formulaire.
 * Les actions serveur de Next refusent un corps de plus de 1 Mo : la photo envoyée
 * doit donc arriver sous MAX_UPLOAD_PHOTO_BYTES, en laissant une marge aux autres champs.
 *
 * Les fonctions de décision sont pures (importables par les tests node:test).
 */

/** Taille maximale d'une photo envoyée : 900 Ko. */
export const MAX_UPLOAD_PHOTO_BYTES = 900 * 1024;

/** Taille maximale de l'image choisie, avant préparation : règles existantes des formulaires. */
export const DEFAULT_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const BANNER_MAX_SOURCE_BYTES = 8 * 1024 * 1024;

/** Formats acceptés par toutes les actions serveur qui reçoivent une photo. */
export const ACCEPTED_PHOTO_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export const PHOTO_COMPRESSION_ERROR_MESSAGE =
  "Cette photo n'a pas pu être préparée pour l'envoi. Choisissez une autre photo au format JPG, PNG ou WebP.";

export const PHOTO_FORMAT_ERROR_MESSAGE =
  "Format non pris en charge. Choisissez une image JPG, PNG ou WebP.";

export function photoTooLargeMessage(maxSourceBytes: number): string {
  const megabytes = Math.round(maxSourceBytes / (1024 * 1024));
  return `Cette image dépasse ${megabytes} Mo. Choisissez une image plus légère.`;
}

/** Contrôle commun avant toute préparation : le format, puis la taille de l'image choisie. */
export function checkPhotoSource(
  file: { type: string; size: number },
  maxSourceBytes: number = DEFAULT_MAX_SOURCE_BYTES
): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return PHOTO_FORMAT_ERROR_MESSAGE;
  if (file.size > maxSourceBytes) return photoTooLargeMessage(maxSourceBytes);
  return null;
}

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

/** Repli d'une image transparente quand le navigateur ne produit pas de WebP (Safari). */
export const PNG_FALLBACK_SIDES: readonly number[] = [1600, 1280, 1024, 800, 640, 512];

/** Une photo déjà sous la limite part telle quelle. */
export function needsCompression(sizeInBytes: number): boolean {
  return sizeInBytes > MAX_UPLOAD_PHOTO_BYTES;
}

/** PNG et WebP peuvent porter de la transparence ; un JPEG, jamais. */
export function mayHaveTransparency(type: string): boolean {
  return type === "image/png" || type === "image/webp";
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

/** Le nom du fichier préparé porte l'extension de son format réel. */
export function compressedFileName(originalName: string, extension = "jpg"): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.${extension}`;
}

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  webp: "image/webp",
  png: "image/png",
};

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

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export interface CompressOptions {
  /** Conserve la transparence d'un PNG ou d'un WebP (logo, catégorie, produit du catalogue). */
  keepTransparency?: boolean;
}

/**
 * Renvoie une photo d'au plus MAX_UPLOAD_PHOTO_BYTES.
 * Sans option, une image lourde devient un JPEG sur fond blanc (comportement du Lot 2B).
 * Avec keepTransparency, une image réellement transparente devient un WebP, ou un PNG
 * réduit si le navigateur ne produit pas de WebP.
 * Lève une erreur si la photo est illisible ou si aucun essai n'atteint la limite.
 */
export async function compressPhotoForUpload(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  if (!needsCompression(file.size)) return file;

  const { image, release } = await loadImage(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible");

    const draw = (maxSide: number, background: string | null) => {
      const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, maxSide);
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      if (background) {
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
    };
    const toFile = (blob: Blob, extension: string) =>
      new File([blob], compressedFileName(file.name, extension), {
        type: EXTENSION_TYPES[extension],
        lastModified: Date.now(),
      });

    const transparent =
      Boolean(options.keepTransparency) &&
      mayHaveTransparency(file.type) &&
      hasTransparentPixel(() => draw(512, null), canvas, context);

    if (transparent) {
      let webpAvailable = true;
      for (const { maxSide, quality } of COMPRESSION_STEPS) {
        draw(maxSide, null);
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        if (!blob || blob.type !== "image/webp") {
          webpAvailable = false;
          break;
        }
        if (blob.size <= MAX_UPLOAD_PHOTO_BYTES) return toFile(blob, "webp");
      }
      if (!webpAvailable) {
        for (const maxSide of PNG_FALLBACK_SIDES) {
          draw(maxSide, null);
          const blob = await canvasToBlob(canvas, "image/png");
          if (blob && blob.size <= MAX_UPLOAD_PHOTO_BYTES) return toFile(blob, "png");
        }
      }
      throw new Error("Image transparente trop lourde après compression");
    }

    for (const { maxSide, quality } of COMPRESSION_STEPS) {
      // Fond blanc : le JPEG ne gère pas la transparence.
      draw(maxSide, "#ffffff");
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= MAX_UPLOAD_PHOTO_BYTES) return toFile(blob, "jpg");
    }
  } finally {
    release();
  }

  throw new Error("Photo trop lourde après compression");
}

/** Vrai si au moins un pixel n'est pas totalement opaque (lecture sur une copie réduite). */
function hasTransparentPixel(
  drawSample: () => void,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
): boolean {
  drawSample();
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}
