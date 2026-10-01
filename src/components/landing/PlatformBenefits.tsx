"use client";

import { Leaf, ShieldCheck, Truck, TrendingUp, Sparkles } from "lucide-react";

interface BenefitItem {
  id: string;
  icon: typeof Leaf;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

const BENEFITS: BenefitItem[] = [
  {
    id: "qualite",
    icon: Leaf,
    title: "Des produits de qualité",
    subtitle: "Fraîcheur & authenticité",
    description: "Productions locales rigoureusement déclarées avec origine, variété et caractéristiques vérifiables.",
    badge: "Traçabilité",
  },
  {
    id: "securite",
    icon: ShieldCheck,
    title: "Des échanges sécurisés",
    subtitle: "Règles claires & fiabilité",
    description: "Réservation de stock transactionnelle et validation formelle pour éliminer les litiges et intermédiaires occultes.",
    badge: "Intégrité",
  },
  {
    id: "logistique",
    icon: Truck,
    title: "Une logistique optimisée",
    subtitle: "Circuits fluides",
    description: "Planification des enlèvements et suivi direct du départ champignonnière jusqu'au point de vente ou dépôt.",
    badge: "Efficacité",
  },
  {
    id: "croissance",
    icon: TrendingUp,
    title: "Une croissance partagée",
    subtitle: "Valeur pérenne",
    description: "Un écosystème équitable qui rémunère le producteur à sa juste valeur tout en sécurisant la marge des commerçants.",
    badge: "Filière",
  },
];

export default function PlatformBenefits() {
  return (
    <section
      aria-label="Piliers et bénéfices de la plateforme"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      {/* En-tête compact */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-100/90 text-forest-800 text-xs font-bold uppercase tracking-wider mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-forest-600" />
          <span>Nos Engagements Fondateurs</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-950 tracking-tight">
          Pourquoi choisir cette plateforme ?
        </h2>
        <p className="text-xs sm:text-sm text-forest-900/75 mt-2">
          Quatre engagements fondamentaux pour bâtir un commerce agricole moderne, transparent et performant.
        </p>
      </div>

      {/* Grille responsive compacte & élégante (4 colonnes desktop, 2 tablette, 1 mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {BENEFITS.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="group relative bg-white rounded-2xl border border-forest-100/90 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-forest-300 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Icône avec halo subtil */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-forest-50 group-hover:bg-forest-700 text-forest-700 group-hover:text-white flex items-center justify-center transition-colors duration-300 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200/50">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-forest-950 mb-1 group-hover:text-forest-800 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs font-semibold text-forest-600 mb-2.5">
                  {item.subtitle}
                </p>
                <p className="text-xs text-forest-900/75 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Ligne d'accent végétale discrète en bas de carte */}
              <div className="mt-5 pt-3 border-t border-forest-50 flex items-center gap-1.5 text-[11px] font-semibold text-forest-700/70 group-hover:text-forest-800">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-400 group-hover:bg-forest-600 transition-colors" />
                <span>Garantie plateforme</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slogan en signature élégante */}
      <div className="mt-10 sm:mt-12 text-center">
        <p className="text-sm sm:text-base font-semibold italic text-forest-800 tracking-wide">
          « Ensemble, cultivons de meilleures opportunités »
        </p>
      </div>
    </section>
  );
}
