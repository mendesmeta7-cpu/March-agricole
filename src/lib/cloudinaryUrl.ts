/**
 * Utilitaire pur côté client et serveur pour formater et optimiser les URLs Cloudinary.
 * Ne dépend d'aucun module Node.js (fs, path, etc.) pour être utilisé en toute sécurité dans les composants client.
 */
export function getOptimizedCloudinaryUrl(
  urlOrPublicId?: string | null,
  options?: {
    width?: number;
    height?: number;
    crop?: "fill" | "limit" | "fit" | "thumb" | "scale";
    quality?: "auto" | "auto:good" | "auto:eco" | "auto:low" | number;
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
  }
): string {
  if (!urlOrPublicId) return "";

  // Si c'est déjà une URL Cloudinary complète (res.cloudinary.com/.../upload/...)
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
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    "";
  if (!cloudName) return urlOrPublicId;

  const transformParams: string[] = ["f_auto", "q_auto"];
  if (options?.width) transformParams.push(`w_${options.width}`);
  if (options?.height) transformParams.push(`h_${options.height}`);
  if (options?.crop) transformParams.push(`c_${options.crop}`);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformParams.join(",")}/${urlOrPublicId}`;
}
