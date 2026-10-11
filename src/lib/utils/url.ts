/**
 * Utilitaires de gestion des URLs et de sécurisation des redirections pour Radiza.
 * Conforme aux exigences de la Phase AUTH-2.
 */

/**
 * Construit l'URL absolue de l'application Radiza.
 * 
 * Stratégie de résolution :
 * 1. Variable d'environnement NEXT_PUBLIC_APP_URL (ou NEXT_PUBLIC_SITE_URL).
 * 2. Variables de déploiement Vercel (NEXT_PUBLIC_VERCEL_URL ou VERCEL_URL).
 * 3. En développement local uniquement (NODE_ENV === "development") : http://localhost:3000.
 * 4. Fallback sécurisé en production si aucune variable n'est définie :
 *    évite formellement d'injecter localhost en production.
 */
export function getAppUrl(path: string = ""): string {
  let baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.trim()}` : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "");

  // Si aucune variable n'est définie
  if (!baseUrl) {
    if (process.env.NODE_ENV === "development") {
      baseUrl = "http://localhost:3000";
    } else {
      // En production, ne jamais utiliser localhost par défaut.
      // Si aucune variable n'est fournie, on s'appuie sur une chaîne vide ou le chemin relatif.
      baseUrl = "";
    }
  }

  // Normaliser le protocole si manquant
  if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `https://${baseUrl}`;
  }

  // Retirer les slashes terminaux
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Normaliser le chemin relatif
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

  return `${baseUrl}${cleanPath}`;
}

/**
 * Liste blanche des préfixes de chemins autorisés pour les redirections internes Radiza.
 */
const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/unauthorized",
  "/"
];

/**
 * Assainit et valide un chemin de redirection pour prévenir toute faille d'Open Redirect.
 * 
 * Rejette catégoriquement :
 * - Les URLs absolues externes (http://..., https://...)
 * - Les URLs protocol-relative (//evil.com)
 * - Les tentatives avec backslash (/\evil.com)
 * - Les protocoles d'exécution de script (javascript:, data:)
 * - Tout chemin qui n'appartient pas à l'arborescence Radiza
 * 
 * @param path Le chemin cible fourni dans l'URL (ex: query param "next")
 * @param defaultPath Le chemin de repli par défaut en cas de rejet (défaut: "/")
 */
export function sanitizeRedirectPath(
  path: string | null | undefined,
  defaultPath: string = "/"
): string {
  if (!path || typeof path !== "string") {
    return defaultPath;
  }

  const trimmed = path.trim();

  // Doit commencer par un slash unique et ne pas être protocol-relative
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return defaultPath;
  }

  // Interdire les caractères d'évasion d'URL et protocoles
  if (
    trimmed.includes("://") ||
    trimmed.toLowerCase().includes("javascript:") ||
    trimmed.toLowerCase().includes("data:") ||
    trimmed.includes("\\")
  ) {
    return defaultPath;
  }

  // Vérifier la conformité avec la liste blanche des préfixes Radiza
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some((prefix) => {
    if (prefix === "/") {
      return trimmed === "/" || trimmed.startsWith("/?");
    }
    return (
      trimmed === prefix ||
      trimmed.startsWith(`${prefix}/`) ||
      trimmed.startsWith(`${prefix}?`)
    );
  });

  return isAllowed ? trimmed : defaultPath;
}
