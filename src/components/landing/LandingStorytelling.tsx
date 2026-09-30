"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Sprout,
  Truck,
  Store,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Pause,
  Play,
  CheckCircle2,
  Boxes,
} from "lucide-react";

interface StoryStep {
  id: string;
  shortLabel: string;
  title: string;
  description: string;
  tagline: string;
  icon: typeof Sprout;
  imageSrc: string;
  imageAlt: string;
  badge: string;
  roleHighlight: string;
  keyPoints: string[];
}

const STEPS: StoryStep[] = [
  {
    id: "production",
    shortLabel: "Sociétés de production",
    title: "Les sociétés de production agricole",
    description:
      "Valorisez vos productions et présentez-les directement aux acteurs du marché.",
    tagline: "Fermes, coopératives & exploitations",
    icon: Sprout,
    imageSrc: "/images/landing/screen-1-production.jpg",
    imageAlt: "Producteur agricole souriant tenant une cagette de légumes frais récoltés au champ",
    badge: "Origine & Récoltes",
    roleHighlight: "De la terre à l'offre",
    keyPoints: [
      "Publication en temps réel des récoltes disponibles",
      "Visibilité directe auprès des acheteurs qualifiés",
      "Sécurisation des campagnes et des enlèvements",
    ],
  },
  {
    id: "grossistes",
    shortLabel: "Grossistes",
    title: "Les grossistes",
    description:
      "Identifiez les opportunités d’approvisionnement et développez votre réseau.",
    tagline: "Centralisation des volumes & logistique",
    icon: Truck,
    imageSrc: "/images/landing/screen-2-grossistes.jpg",
    imageAlt: "Gestionnaire logistique grossiste inspectant les stocks de grains dans un entrepôt moderne",
    badge: "Volumes & Massification",
    roleHighlight: "Régulation des flux",
    keyPoints: [
      "Visibilité sur les tonnages et prévisions de récoltes",
      "Réservation directe sans intermédiaires informels",
      "Optimisation des dépôts et des coûts logistiques",
    ],
  },
  {
    id: "detaillants",
    shortLabel: "Détaillants",
    title: "Les détaillants",
    description:
      "Découvrez les productions disponibles et préparez vos approvisionnements.",
    tagline: "Commerces de proximité & marchés locaux",
    icon: Store,
    imageSrc: "/images/landing/screen-3-detaillants.jpg",
    imageAlt: "Commerçante de marché devant un étal soigné et abondant de légumes frais et fruits",
    badge: "Fraîcheur & Distribution",
    roleHighlight: "Au contact des consommateurs",
    keyPoints: [
      "Accès à des produits frais récoltés localement",
      "Planification des commandes selon les arrivages",
      "Transparence sur les prix et l'origine",
    ],
  },
  {
    id: "revendeurs",
    shortLabel: "Revendeurs",
    title: "Les revendeurs",
    description:
      "Accédez aux productions, exprimez vos besoins et passez vos commandes.",
    tagline: "Acheteurs professionnels & transformateurs",
    icon: ShoppingBag,
    imageSrc: "/images/landing/screen-4-revendeurs.jpg",
    imageAlt: "Revendeur professionnel réceptionnant et vérifiant des caisses de produits agricoles",
    badge: "Transactions & Commandes",
    roleHighlight: "Sécurité commerciale",
    keyPoints: [
      "Expression des besoins d'achat par territoire",
      "Commandes fermes avec réservation de stock vérifiée",
      "Confirmation de livraison sécurisée par QR code",
    ],
  },
  {
    id: "chaine",
    shortLabel: "De la production au marché",
    title: "De la production au marché",
    description:
      "Une même plateforme pour rapprocher les producteurs et les acteurs commerciaux.",
    tagline: "Production → Distribution → Marché",
    icon: Boxes,
    imageSrc: "/images/landing/screen-5-chaine.jpg",
    imageAlt: "Chaîne d'approvisionnement agricole reliant les champs aux camions et aux marchés",
    badge: "Écosystème Intégré",
    roleHighlight: "Circuit direct et fluide",
    keyPoints: [
      "Lien direct entre l'offre rurale et la demande urbaine",
      "Réduction drastique des pertes post-récolte",
      "Développement concerté et partagé de l'agriculture",
    ],
  },
];

export default function LandingStorytelling() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Détecter prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setIsPlaying(false);
    }

    const handler = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
      if (e.matches) setIsPlaying(false);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % STEPS.length);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev - 1 + STEPS.length) % STEPS.length);
  }, []);

  // Défilement automatique doux (5.5s)
  useEffect(() => {
    if (!isPlaying || isReducedMotion) return;

    const timer = setInterval(() => {
      nextStep();
    }, 5500);

    return () => clearInterval(timer);
  }, [isPlaying, isReducedMotion, nextStep]);

  // Support des gestes tactiles
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;

    if (isLeftSwipe) {
      nextStep();
    } else if (isRightSwipe) {
      prevStep();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Gestion clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextStep();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevStep();
    }
  };

  const active = STEPS[currentStep];
  const ActiveIcon = active.icon;

  return (
    <section
      aria-label="Storytelling interactif de la chaîne agricole"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => {
        if (!isReducedMotion) setIsPlaying(true);
      }}
    >
      {/* 1. Sélecteur de parcours / Pills connectés (style visuel inspiré du schéma de référence) */}
      <div className="relative mb-6 sm:mb-8">
        {/* Ligne pointillée décorative sur desktop */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 border-t-2 border-dashed border-forest-200 -translate-y-1/2 z-0"
        />

        <div className="relative z-10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-2 px-1">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = idx === currentStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-pressed={isSelected}
                aria-label={`Étape ${idx + 1} : ${step.title}`}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 ${
                  isSelected
                    ? "bg-forest-700 text-white shadow-md shadow-forest-900/15 scale-[1.02]"
                    : "bg-white text-forest-900/80 hover:text-forest-950 hover:bg-forest-50/80 border border-forest-200/80 shadow-2xs"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-forest-100 text-forest-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="whitespace-nowrap">{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Carte Vitrine Principale (Visuel + Storytelling fluide) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white rounded-2xl sm:rounded-3xl border border-forest-200/70 shadow-lg shadow-forest-900/5 overflow-hidden transition-all duration-300"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] lg:min-h-[500px]">
          {/* Colonne Gauche : Storytelling & Texte explicatif */}
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between order-2 lg:order-1 bg-gradient-to-br from-white via-white to-forest-50/40">
            <div>
              {/* Badge Étape / Rôle */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-100/90 text-forest-800 text-xs font-bold tracking-wide uppercase">
                  <ActiveIcon className="w-3.5 h-3.5 text-forest-700" />
                  {active.badge}
                </span>

                <span className="text-xs font-medium text-forest-700/80">
                  Étape {currentStep + 1} sur {STEPS.length}
                </span>
              </div>

              {/* Titre & Description avec transition fluide */}
              <div
                key={active.id}
                className={isReducedMotion ? "" : "animate-fade-in-up"}
              >
                <p className="text-xs font-semibold text-forest-600 mb-1 tracking-wider uppercase">
                  {active.roleHighlight}
                </p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-forest-950 tracking-tight mb-3 leading-snug">
                  {active.title}
                </h3>
                <p className="text-sm sm:text-base text-forest-900/80 leading-relaxed mb-6 font-normal">
                  {active.description}
                </p>

                {/* Points clés concrets */}
                <div className="space-y-2.5 pt-4 border-t border-forest-100">
                  {active.keyPoints.map((point, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-forest-900/90"
                    >
                      <CheckCircle2 className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contrôles de navigation inférieurs */}
            <div className="pt-6 mt-6 border-t border-forest-100 flex items-center justify-between gap-4">
              {/* Indicateurs de progression (dots) */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Sélection rapide">
                {STEPS.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    role="tab"
                    aria-selected={dotIdx === currentStep}
                    aria-label={`Aller à l'écran ${dotIdx + 1}`}
                    onClick={() => setCurrentStep(dotIdx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      dotIdx === currentStep
                        ? "w-8 bg-forest-700"
                        : "w-2 bg-forest-200 hover:bg-forest-300"
                    }`}
                  />
                ))}
              </div>

              {/* Boutons Précédent / Pause / Suivant */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? "Mettre en pause le défilement" : "Reprendre le défilement"}
                  title={isPlaying ? "Mettre en pause" : "Reprendre"}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-forest-700 hover:bg-forest-100/80 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={prevStep}
                  aria-label="Écran précédent"
                  className="w-9 h-9 rounded-full bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-800 flex items-center justify-center transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={nextStep}
                  aria-label="Écran suivant"
                  className="w-9 h-9 rounded-full bg-forest-700 hover:bg-forest-800 text-white flex items-center justify-center transition-colors shadow-2xs"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Visuel photographique immersif */}
          <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[340px] lg:min-h-[500px] order-1 lg:order-2 bg-forest-900/10">
            {STEPS.map((step, idx) => {
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={step.id}
                  aria-hidden={!isCurrent}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isCurrent
                      ? "opacity-100 z-10"
                      : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    priority={idx === 0}
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="object-cover"
                  />
                  {/* Voile dégradé subtil pour la lisibilité et l'harmonie */}
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-forest-950/30 lg:via-transparent lg:to-transparent" />

                  {/* Cartouche d'information flottant sur l'image */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium border border-white/15 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{step.tagline}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Schéma de synthèse horizontal : Production → Distribution → Marché */}
      <div className="mt-6 sm:mt-8 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-forest-50/80 border border-forest-200/60 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-forest-900 font-medium">
        <span className="font-semibold text-forest-800">
          Circuit intégré de la valeur :
        </span>
        <div className="inline-flex items-center gap-2 flex-wrap justify-center">
          <span className="px-2.5 py-1 rounded-md bg-white border border-forest-200 text-forest-900 shadow-2xs font-semibold">
            1. Production agricole
          </span>
          <span className="text-forest-500 font-bold" aria-hidden="true">→</span>
          <span className="px-2.5 py-1 rounded-md bg-white border border-forest-200 text-forest-900 shadow-2xs font-semibold">
            2. Distribution & Logistique
          </span>
          <span className="text-forest-500 font-bold" aria-hidden="true">→</span>
          <span className="px-2.5 py-1 rounded-md bg-white border border-forest-200 text-forest-900 shadow-2xs font-semibold">
            3. Marchés & Revendeurs
          </span>
        </div>
      </div>
    </section>
  );
}
