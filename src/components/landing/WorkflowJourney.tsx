"use client";

import { useState } from "react";
import {
  Sprout,
  Tag,
  Store,
  ShoppingBag,
  Truck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  stepNumber: string;
  label: string;
  role: string;
  icon: typeof Sprout;
  badge: string;
  title: string;
  description: string;
  actionSnippet: string;
  color: string;
  bgColor: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "producteur",
    stepNumber: "01",
    label: "Producteur",
    role: "Origine agricole",
    icon: Sprout,
    badge: "Récolte & Capacité",
    title: "L'exploitant agricole",
    description:
      "L'entreprise agricole enregistre ses parcelles, déclare ses productions récoltées ou à venir avec leurs caractéristiques de qualité.",
    actionSnippet: "Mise à disposition des tonnages",
    color: "#2f563d",
    bgColor: "#e1efe6",
  },
  {
    id: "offre",
    stepNumber: "02",
    label: "Offre",
    role: "Visibilité marché",
    icon: Tag,
    badge: "Transparence",
    title: "La publication de l'offre",
    description:
      "La production devient visible pour le marché : prix de référence, localisation, conditionnement et calendrier d'enlèvement.",
    actionSnippet: "Ouverture des réservations",
    color: "#3b6d4b",
    bgColor: "#c4decb",
  },
  {
    id: "revendeur",
    stepNumber: "03",
    label: "Revendeur",
    role: "Acheteurs professionnels",
    icon: Store,
    badge: "Demande & Sélection",
    title: "L'acheteur ou grossiste",
    description:
      "Grossistes, commerçants et transformateurs consultent le catalogue, évaluent les disponibilités et expriment leurs besoins.",
    actionSnippet: "Sélection des volumes nécessaires",
    color: "#4f8961",
    bgColor: "#f2f8f4",
  },
  {
    id: "commande",
    stepNumber: "04",
    label: "Commande",
    role: "Sécurité contractuelle",
    icon: ShoppingBag,
    badge: "Validation ferme",
    title: "La contractualisation",
    description:
      "La commande est émise avec blocage transactionnel du stock réel. Fin des fausses promesses et des doubles ventes.",
    actionSnippet: "Réservation de stock garantie",
    color: "#b5874f",
    bgColor: "#f3ebde",
  },
  {
    id: "livraison",
    stepNumber: "05",
    label: "Livraison",
    role: "Aboutissement direct",
    icon: Truck,
    badge: "Traçabilité finale",
    title: "L'acheminement & réception",
    description:
      "Départ des marchandises depuis l'exploitation vers le point de vente ou dépôt, clôturé par une confirmation sécurisée.",
    actionSnippet: "Validation de conformité reçue",
    color: "#7e5435",
    bgColor: "#e6d5bd",
  },
];

export default function WorkflowJourney() {
  const [activeStepId, setActiveStepId] = useState<string>("producteur");

  const activeStep =
    WORKFLOW_STEPS.find((s) => s.id === activeStepId) || WORKFLOW_STEPS[0];
  const ActiveIcon = activeStep.icon;

  return (
    <section
      aria-label="Parcours de la production à la livraison"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <div className="bg-gradient-to-b from-[#f9fcf9] via-white to-white rounded-3xl border border-forest-100 shadow-md shadow-forest-900/5 p-6 sm:p-8 lg:p-10 transition-all">
        {/* En-tête de section */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-100/90 text-forest-800 text-xs font-bold uppercase tracking-wider mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-forest-600" />
            <span>Fluidité & Confiance Commerciale</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-forest-950 tracking-tight">
            De la production à la livraison.
          </h2>
          <p className="text-sm sm:text-base text-forest-900/75 mt-2.5 leading-relaxed">
            Un fil conducteur limpide qui remplace les intermédiaires informels par une relation directe, transparente et sécurisée.
          </p>
        </div>

        {/* Parcours horizontal connecté sur desktop & tablette */}
        <div className="relative mb-10">
          {/* Ligne de connexion végétale en fond */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-7 left-12 right-12 h-1 bg-gradient-to-r from-forest-600 via-forest-400 to-earth-500 rounded-full z-0 opacity-40"
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 relative z-10">
            {WORKFLOW_STEPS.map((step) => {
              const Icon = step.icon;
              const isCurrent = step.id === activeStepId;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  aria-pressed={isCurrent}
                  className={`flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 ${
                    isCurrent
                      ? "bg-white border-forest-400 shadow-md shadow-forest-900/10 scale-[1.03]"
                      : "bg-white/80 hover:bg-forest-50/60 border-forest-100"
                  }`}
                >
                  {/* Pastille Icône avec badge numéro */}
                  <div className="relative mb-2.5">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-forest-700 text-white shadow-sm ring-4 ring-forest-100"
                          : "bg-forest-50 text-forest-700"
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span
                      className={`absolute -top-1.5 -right-1.5 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border ${
                        isCurrent
                          ? "bg-emerald-500 text-white border-white"
                          : "bg-forest-100 text-forest-700 border-forest-200"
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                  </div>

                  <span className="text-xs sm:text-sm font-extrabold text-forest-950 tracking-tight">
                    {step.label}
                  </span>
                  <span className="text-[11px] text-forest-600 font-medium">
                    {step.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fiche d'immersion interactive pour l'étape active */}
        <div className="bg-forest-50/60 border border-forest-200/70 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
              <ActiveIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-forest-700 uppercase tracking-wider">
                  Étape {activeStep.stepNumber} — {activeStep.badge}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-forest-950 mb-1.5">
                {activeStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-forest-900/80 max-w-2xl leading-relaxed">
                {activeStep.description}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 w-full md:w-auto bg-white border border-forest-100 rounded-xl px-4 py-3 shadow-2xs text-center md:text-left">
            <span className="text-[11px] text-forest-600 font-semibold uppercase tracking-wider block">
              Action clé de l&apos;étape
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-forest-950 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{activeStep.actionSnippet}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
