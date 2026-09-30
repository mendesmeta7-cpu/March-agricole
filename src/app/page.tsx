import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Sprout,
  LogIn,
  UserPlus,
  ShieldCheck,
  Truck,
  TrendingUp,
  Leaf,
  ArrowRight,
} from "lucide-react";
import LandingStorytelling from "@/components/landing/LandingStorytelling";

export const metadata: Metadata = {
  title: "Bienvenue — Plateforme Agricole B2B",
  description:
    "La plateforme qui rapproche la production agricole des marchés. Connectez les sociétés de production agricole, grossistes, détaillants et revendeurs.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f8fbf9] via-[#f2f7f4] to-white text-forest-950 overflow-x-hidden">
      {/* 1. Header Minimaliste & Professionnel (sans nom commercial fictif) */}
      <header className="w-full border-b border-forest-100/80 bg-white/70 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo / Sceau de la Plateforme */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-forest-700 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-forest-900 tracking-tight leading-tight">
                Plateforme Agricole B2B
              </p>
              <p className="hidden xs:block text-[11px] sm:text-xs text-forest-700/80">
                Pour une meilleure distribution agricole
              </p>
            </div>
          </div>

          {/* Deux CTA principaux accessibles dans la barre de navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-forest-900 hover:text-forest-950 hover:bg-forest-100/70 border border-transparent transition-all min-h-[40px] sm:min-h-[44px]"
            >
              <LogIn className="w-4 h-4 text-forest-700" />
              <span>Se connecter</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all min-h-[40px] sm:min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Créer un compte</span>
              <span className="sm:hidden">Créer</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Section HERO — Titre « Bienvenue », Vocation & 2 Boutons Exclusifs */}
      <section className="relative pt-8 pb-10 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Titre Principal STRICTEMENT « Bienvenue » (aucun nom de marque inventé) */}
        <h1 className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-forest-950 mb-4 sm:mb-6 leading-[1.08]">
          Bienvenue
        </h1>

        {/* Message expliquant simplement la vocation de la plateforme */}
        <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-forest-900 mb-3 sm:mb-5 max-w-3xl mx-auto leading-snug">
          La plateforme qui rapproche la production agricole des marchés.
        </p>

        {/* Description courte et limpide */}
        <p className="text-sm sm:text-base lg:text-lg text-forest-900/75 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 font-normal">
          Connectez les sociétés de production agricole, grossistes, détaillants et revendeurs autour d’une même plateforme.
        </p>

        {/* LES SEULEMENT DEUX ACTIONS PRINCIPALES (Règle d'or de la page d'accueil) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5 max-w-md mx-auto w-full">
          {/* Action 1 : Se connecter */}
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-forest-700 hover:bg-forest-800 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md shadow-forest-900/15 hover:shadow-lg transition-all min-h-[48px] focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2"
          >
            <LogIn className="w-5 h-5 flex-shrink-0" />
            <span>Se connecter</span>
            <ArrowRight className="w-4 h-4 ml-0.5 opacity-80" />
          </Link>

          {/* Action 2 : Créer un compte */}
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white hover:bg-forest-50/90 active:scale-[0.99] border-2 border-forest-600/90 hover:border-forest-700 text-forest-900 font-bold text-sm sm:text-base shadow-2xs hover:shadow-sm transition-all min-h-[48px] focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2"
          >
            <UserPlus className="w-5 h-5 text-forest-700 flex-shrink-0" />
            <span>Créer un compte</span>
            <ArrowRight className="w-4 h-4 ml-0.5 opacity-70" />
          </Link>
        </div>

        {/* Reassurance text */}
        <p className="text-[11px] sm:text-xs text-forest-700/70 mt-4">
          Accès dédié et sécurisé pour les professionnels de l&apos;agriculture et du commerce
        </p>
      </section>

      {/* 3. Section STORYTELLING VISUEL — Évolution douce en 5 écrans & photos réelles */}
      <section className="relative pb-12 sm:pb-20">
        <LandingStorytelling />
      </section>

      {/* 4. Transition Graphique en Vague Organique (inspirée du design de référence) */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mb-1">
        <svg
          viewBox="0 0 1440 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12 sm:h-16 lg:h-24 text-white preserve-3d"
          preserveAspectRatio="none"
        >
          <path
            d="M0,45 C280,85 540,15 800,55 C1080,95 1300,30 1440,50 L1440,90 L0,90 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* 5. Section LES 4 VALEURS CLÉS (Piliers fondateurs de la plateforme) */}
      <section className="bg-white py-12 sm:py-16 lg:py-20 border-t border-forest-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Pilier 1 */}
            <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-forest-50/40 border border-forest-100/70 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center mb-4">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-forest-950 mb-1.5">
                Des produits de qualité
              </h3>
              <p className="text-xs sm:text-sm text-forest-900/70 leading-relaxed">
                Des productions locales, fraîches et rigoureusement traçables.
              </p>
            </div>

            {/* Pilier 2 */}
            <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-forest-50/40 border border-forest-100/70 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-forest-950 mb-1.5">
                Des échanges sécurisés
              </h3>
              <p className="text-xs sm:text-sm text-forest-900/70 leading-relaxed">
                Une plateforme fiable, transparente et vérifiée à chaque étape.
              </p>
            </div>

            {/* Pilier 3 */}
            <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-forest-50/40 border border-forest-100/70 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-forest-950 mb-1.5">
                Une logistique optimisée
              </h3>
              <p className="text-xs sm:text-sm text-forest-900/70 leading-relaxed">
                De la production agricole directement à votre point de vente.
              </p>
            </div>

            {/* Pilier 4 */}
            <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-forest-50/40 border border-forest-100/70 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-forest-950 mb-1.5">
                Une croissance partagée
              </h3>
              <p className="text-xs sm:text-sm text-forest-900/70 leading-relaxed">
                Ensemble pour une filière agricole plus performante et équitable.
              </p>
            </div>
          </div>

          {/* Slogan Final en Signature */}
          <div className="mt-12 sm:mt-16 text-center">
            <p className="text-base sm:text-lg font-semibold italic text-forest-800 tracking-wide">
              « Ensemble, cultivons de meilleures opportunités »
            </p>
          </div>
        </div>
      </section>

      {/* 6. Bannière d'Appel à l'Action de Pied de Page (Rappel épuré des 2 CTA) */}
      <section className="bg-forest-900 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Rejoignez la nouvelle dynamique agricole
          </h2>
          <p className="text-forest-100/80 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            Que vous soyez producteur, grossiste, détaillant ou revendeur, commencez dès aujourd&apos;hui vos échanges.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-semibold text-sm sm:text-base transition-colors min-h-[48px]"
            >
              <LogIn className="w-4 h-4" />
              <span>Se connecter</span>
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-forest-950 hover:bg-forest-50 font-semibold text-sm sm:text-base transition-colors min-h-[48px]"
            >
              <UserPlus className="w-4 h-4 text-forest-700" />
              <span>Créer un compte</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer Minimaliste & Discret — Signature « Développé par Synapta » intégrée à la bande verte */}
      <footer className="w-full py-5 sm:py-6 px-4 border-t border-forest-800/80 bg-forest-950 text-white">
        <div className="max-w-4xl mx-auto flex flex-col xs:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-center">
          <span className="text-forest-200/90 font-medium">Développé par</span>
          <div className="inline-flex items-center gap-2">
            <Image
              src="/images/synapta-logo-white.png"
              alt="Logo Synapta"
              width={20}
              height={32}
              className="h-4 sm:h-5 w-auto object-contain"
            />
            <span className="font-bold text-white tracking-tight text-xs sm:text-sm">
              Synapta
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
