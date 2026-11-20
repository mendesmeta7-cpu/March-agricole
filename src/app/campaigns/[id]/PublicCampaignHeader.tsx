import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

interface PublicCampaignHeaderProps {
  /** Utilisateur connecté : lien vers son espace au lieu de « Connexion / S'inscrire ». */
  connecte: boolean;
  /** Page à retrouver après la connexion. */
  retour?: string;
}

/** En-tête des pages publiques de campagne, sur le modèle du profil public `/companies/[id]`. */
export default function PublicCampaignHeader({ connecte, retour }: PublicCampaignHeaderProps) {
  const lienConnexion = retour ? `/login?redirect=${encodeURIComponent(retour)}` : "/login";
  return (
    <header className="flex items-center justify-between gap-3 pb-4 border-b border-gray-200/80">
      <Link
        href="/"
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-lg"
        aria-label="Accueil Radiza"
      >
        <BrandLogo variant="horizontal" height={32} priority />
      </Link>

      <nav aria-label="Compte" className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        {connecte ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center min-h-[44px] px-3.5 rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors font-semibold"
          >
            Mon espace
          </Link>
        ) : (
          <>
            <Link
              href={lienConnexion}
              className="inline-flex items-center min-h-[44px] px-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-white transition-colors font-medium"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center min-h-[44px] px-3.5 rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors font-semibold"
            >
              S&apos;inscrire
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
