/** @type {import('next').NextConfig} */

// Optimiseur d'images restreint aux seules sources de Radiza (audit SEC-05) :
// le projet Supabase configuré et le compte Cloudinary configuré, au lieu de
// « tout *.supabase.co » et « tout res.cloudinary.com ».
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname || "gonerlgkdnbdewjbebvq.supabase.co";
  } catch {
    return "gonerlgkdnbdewjbebvq.supabase.co";
  }
})();
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();

// En-têtes de sécurité HTTP (audit SEC-16). CSP volontairement limitée aux
// directives sans risque de régression (pas de script-src : Next.js injecte des
// scripts inline ; un durcissement par nonce est à planifier séparément).
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // La caméra n'est utilisée que par le scanner QR de l'application elle-même.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  reactStrictMode: true,
  // Désactiver le Router Cache client pour les segments dynamiques.
  // Ceci est critique pour les pages privées : le navigateur ne doit jamais
  // afficher une page en cache d'un utilisateur différent ou d'une session expirée.
  experimental: {
    staleTimes: {
      dynamic: 0,  // Les pages force-dynamic ne sont jamais mises en cache côté client
      static: 180, // Les pages statiques restent cachées 3 minutes (comportement par défaut)
    },
    // cpus supprimé — experimental.cpus cause une race condition (PageNotFoundError) sur Next.js 14
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: cloudinaryCloudName ? `/${cloudinaryCloudName}/**` : '/**',
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
