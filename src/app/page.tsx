import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  LogIn,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import LandingStorytelling from "@/components/landing/LandingStorytelling";
import DemandTrendChart from "@/components/landing/DemandTrendChart";
import DemandGeoChart from "@/components/landing/DemandGeoChart";
import MarketDistributionChart from "@/components/landing/MarketDistributionChart";
import WorkflowJourney from "@/components/landing/WorkflowJourney";
import PlatformBenefits from "@/components/landing/PlatformBenefits";
import ScrollRevealObserver from "@/components/landing/ScrollRevealObserver";
import StickyHeader from "@/components/landing/StickyHeader";

export const metadata: Metadata = {
  title: "Bienvenue — Plateforme Agricole B2B",
  description:
    "La plateforme qui rapproche la production agricole des marchés. Connectez les sociétés de production agricole, grossistes, détaillants et revendeurs.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f8fbf9] via-[#f2f7f4] to-white text-forest-950 overflow-x-hidden pt-16 sm:pt-20">
      {/* Observateur d'animation au scroll (IntersectionObserver) — composant léger sans rendu visuel */}
      <ScrollRevealObserver />
      {/* 1. Header Fixe avec comportement scroll intelligent */}
      <StickyHeader />

      {/* 2. Section HERO — Titre « Bienvenue », Vocation & 2 Boutons Exclusifs */}
      <section className="relative pt-8 pb-10 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Titre Principal STRICTEMENT « Bienvenue » */}
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

        {/* Deux actions principales exclusives */}
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

      {/* 3. Section STORYTELLING VISUEL — Découvrir la plateforme avec slider photo existant */}
      <section className="relative pb-12 sm:pb-20">
        <LandingStorytelling />
      </section>

      {/* 4. Transition Graphique en Vague Organique */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mb-1">
        <svg
          viewBox="0 0 1440 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-10 sm:h-14 lg:h-20 text-white preserve-3d"
          preserveAspectRatio="none"
        >
          <path
            d="M0,45 C280,85 540,15 800,55 C1080,95 1300,30 1440,50 L1440,90 L0,90 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* 5. Section interactive : « LA DEMANDE ÉVOLUE » (Line / Area Chart animé avec sélecteur de produit) */}
      <section className="bg-gradient-to-b from-white via-forest-50/20 to-white reveal">
        <DemandTrendChart />
      </section>

      {/* 6. Section interactive : « OÙ SE TROUVE LA DEMANDE ? » (Horizontal Bar Chart géographique) */}
      <section className="bg-gradient-to-b from-white via-[#f4f8f5] to-white reveal reveal-delay-1">
        <DemandGeoChart />
      </section>

      {/* 7. Section interactive : « COMPRENDRE LE MARCHÉ » (Ring Chart / Donut compact sectoriel) */}
      <section className="bg-gradient-to-b from-white via-forest-50/20 to-white reveal reveal-delay-2">
        <MarketDistributionChart />
      </section>

      {/* 8. Section interactive : « DE LA PRODUCTION À LA LIVRAISON » (Parcours visuel humain & étapes connectées) */}
      <section className="bg-white reveal">
        <WorkflowJourney />
      </section>

      {/* 9. Section : « LES BÉNÉFICES DE LA PLATEFORME » (Repensée de façon compacte et responsive) */}
      <section className="bg-gradient-to-b from-white via-forest-50/30 to-white border-t border-forest-100/50 reveal">
        <PlatformBenefits />
      </section>

      {/* 10. Bannière d'Appel à l'Action de Pied de Page */}
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

      {/* 11. Footer Minimaliste & Discret — Signature « Développé par Synapta » */}
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
