/** @type {import('next').NextConfig} */
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
        hostname: 'gonerlgkdnbdewjbebvq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
