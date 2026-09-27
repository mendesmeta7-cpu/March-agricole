import { v2 as cloudinary } from "cloudinary";

// Garde de sécurité stricte : ce module ne doit JAMAIS s'exécuter côté client
if (typeof window !== "undefined") {
  throw new Error("Le module Cloudinary ne peut être exécuté que côté serveur (Node.js).");
}

/**
 * Initialise et configure le client Cloudinary avec les variables d'environnement serveur.
 */
function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Configuration Cloudinary manquante. Veuillez renseigner CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans vos variables d'environnement serveur (.env.local)."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export type CloudinaryFolder = "categories" | "banners" | "profiles";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Téléverse un fichier image vers Cloudinary dans le dossier logique approprié.
 * 
 * Dossiers :
 * - categories -> synapta/categories
 * - banners    -> synapta/banners
 * - profiles   -> synapta/profiles
 */
export async function uploadImageToCloudinary(
  file: File | Blob | Buffer,
  folder: CloudinaryFolder,
  options?: {
    customFilename?: string;
    transformation?: any[];
  }
): Promise<CloudinaryUploadResult> {
  const client = getCloudinary();
  const targetFolder = `synapta/${folder}`;

  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error("Format de fichier non pris en charge pour l'upload Cloudinary.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: targetFolder,
        public_id: options?.customFilename,
        resource_type: "image",
        overwrite: true,
        transformation: options?.transformation || [
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new Error(
              `Erreur lors du téléversement Cloudinary : ${error?.message || "Résultat vide"}`
            )
          );
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Supprime réellement une image de Cloudinary à partir de son public_id.
 * Retourne true si la suppression a réussi ou si l'image n'existait pas (not found).
 */
export async function deleteImageFromCloudinary(publicId?: string | null): Promise<boolean> {
  if (!publicId || publicId.trim() === "") {
    return true;
  }

  try {
    const client = getCloudinary();
    const result = await client.uploader.destroy(publicId.trim(), {
      resource_type: "image",
      invalidate: true,
    });

    // Cloudinary retourne { result: 'ok' } ou { result: 'not found' }
    return result.result === "ok" || result.result === "not found";
  } catch (error: any) {
    console.error(`[Cloudinary] Échec suppression image ${publicId} :`, error?.message);
    // On ne bloque pas silencieusement, on logue l'erreur
    return false;
  }
}

/**
 * Construit une URL Cloudinary optimisée avec transformations dynamiques
 * (redimensionnement, rognage intelligent, compression auto, format webp/avif auto).
 */
export function getOptimizedCloudinaryUrl(
  urlOrPublicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: "fill" | "limit" | "fit" | "thumb" | "scale";
    quality?: "auto" | "auto:good" | "auto:eco" | "auto:low" | number;
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
  }
): string {
  if (!urlOrPublicId) return "";

  // Si c'est déjà une URL Cloudinary, on peut insérer les transformations
  if (urlOrPublicId.includes("res.cloudinary.com")) {
    const parts = urlOrPublicId.split("/upload/");
    if (parts.length === 2) {
      const transformParams: string[] = ["f_auto", "q_auto"];

      if (options?.width) transformParams.push(`w_${options.width}`);
      if (options?.height) transformParams.push(`h_${options.height}`);
      if (options?.crop) transformParams.push(`c_${options.crop}`);

      const transformStr = transformParams.join(",");
      return `${parts[0]}/upload/${transformStr}/${parts[1]}`;
    }
    return urlOrPublicId;
  }

  // Si c'est un public_id brut
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return urlOrPublicId;

  const transformParams: string[] = ["f_auto", "q_auto"];
  if (options?.width) transformParams.push(`w_${options.width}`);
  if (options?.height) transformParams.push(`h_${options.height}`);
  if (options?.crop) transformParams.push(`c_${options.crop}`);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformParams.join(",")}/${urlOrPublicId}`;
}
