"use client";

import { useState } from "react";
import { MapPin, Info, Compass, Building2, Store } from "lucide-react";

interface GeoRegionDemand {
  id: string;
  name: string;
  subRegion: string;
  indicativeVolume: number; // en tonnes
  percentage: number;       // part relative
  primaryNeed: string;
  buyerType: string;
}

const REGIONS_DATA: GeoRegionDemand[] = [
  {
    id: "kinshasa",
    name: "Kinshasa",
    subRegion: "Zone métropolitaine & marchés centraux",
    indicativeVolume: 520,
    percentage: 42,
    primaryNeed: "Forte concentration pour céréales, tubercules et légumes frais",
    buyerType: "Grossistes, supermarchés & détaillants de marché",
  },
  {
    id: "kongo-central",
    name: "Kongo-Central",
    subRegion: "Couloir d'approvisionnement & transformation",
    indicativeVolume: 290,
    percentage: 24,
    primaryNeed: "Demande soutenue en manioc, fruits et produits maraîchers",
    buyerType: "Coopératives de distribution & demi-grossistes",
  },
  {
    id: "haut-katanga",
    name: "Haut-Katanga",
    subRegion: "Pôle urbain & minier (Lubumbashi)",
    indicativeVolume: 240,
    percentage: 20,
    primaryNeed: "Besoins massifs en maïs grain, farine et légumes",
    buyerType: "Centrales d'achats, cantines industrielles & revendeurs",
  },
  {
    id: "kasai-central",
    name: "Kasaï-Central",
    subRegion: "Centre de redistribution régional (Kananga)",
    indicativeVolume: 170,
    percentage: 14,
    primaryNeed: "Approvisionnement régulier en maïs, légumineuses et huiles",
    buyerType: "Réseau de commerçants indépendants & dépôts",
  },
];

export default function DemandGeoChart() {
  const [activeRegionId, setActiveRegionId] = useState<string>("kinshasa");

  const activeRegion =
    REGIONS_DATA.find((r) => r.id === activeRegionId) || REGIONS_DATA[0];

  return (
    <section
      aria-label="Section de localisation géographique de la demande"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <div className="bg-white rounded-3xl border border-forest-100 shadow-md shadow-forest-900/5 p-6 sm:p-8 lg:p-10 transition-all">
        {/* En-tête de section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-forest-100/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200/60 text-forest-700 text-xs font-semibold uppercase tracking-wider mb-3">
              <Compass className="w-3.5 h-3.5 text-forest-600" />
              <span>Cartographie Territoriale</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-forest-950 tracking-tight">
              Où se trouve la demande ?
            </h2>
            <p className="text-sm sm:text-base text-forest-900/75 mt-2 max-w-2xl leading-relaxed">
              Identifiez les zones où les besoins sont les plus importants pour mieux orienter vos offres.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-700 bg-forest-50/90 px-3 py-1 rounded-full border border-forest-200/60">
              <Info className="w-3.5 h-3.5 text-forest-500" />
              Données illustratives
            </span>
          </div>
        </div>

        {/* Grille : Bar Chart horizontal + Fiche territoire contextuelle */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Horizontal Bar Chart responsive */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs text-forest-700 font-semibold px-1 pb-1">
              <span>Régions observées</span>
              <span>Intensité relative du besoin</span>
            </div>

            <div className="space-y-3.5">
              {REGIONS_DATA.map((region) => {
                const isActive = region.id === activeRegionId;

                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setActiveRegionId(region.id)}
                    aria-pressed={isActive}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-1 ${
                      isActive
                        ? "bg-forest-50/80 border-forest-300 shadow-sm"
                        : "bg-white hover:bg-forest-50/40 border-forest-100/90"
                    }`}
                  >
                    {/* Ligne Région & Chiffres indicatifs */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isActive
                              ? "bg-forest-700 text-white"
                              : "bg-forest-100 text-forest-700"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-forest-950 truncate">
                            {region.name}
                          </p>
                          <p className="text-[11px] text-forest-600 truncate">
                            {region.subRegion}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold text-forest-950">
                          {region.indicativeVolume} t
                        </span>
                        <span className="text-[11px] text-forest-600 font-semibold ml-1.5">
                          ({region.percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Barre de progression horizontale responsive */}
                    <div className="w-full h-3 bg-forest-100/80 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isActive
                            ? "bg-gradient-to-r from-forest-600 to-forest-800 shadow-2xs"
                            : "bg-gradient-to-r from-forest-400 to-forest-500 opacity-75"
                        }`}
                        style={{ width: `${region.percentage * 2.2}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-forest-600/80 italic pt-1">
              * Cliquez sur une région pour consulter le type d&apos;acheteurs et de besoins identifiés.
            </p>
          </div>

          {/* Fiche territoire détaillée interactive */}
          <div className="lg:col-span-5 bg-gradient-to-br from-forest-50/70 via-white to-forest-50/40 rounded-2xl border border-forest-200/70 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-forest-200/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest-700 text-white flex items-center justify-center shadow-xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-forest-950">
                      {activeRegion.name}
                    </h3>
                    <p className="text-xs text-forest-700">
                      Part de marché simulée : {activeRegion.percentage}%
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-forest-600 block">Volume indicatif</span>
                  <span className="text-lg font-extrabold text-forest-950">
                    {activeRegion.indicativeVolume} t
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-white border border-forest-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-forest-800 uppercase tracking-wide mb-1">
                    <Store className="w-4 h-4 text-forest-600" />
                    <span>Besoins prioritaires</span>
                  </div>
                  <p className="text-xs sm:text-sm text-forest-900/85 leading-relaxed">
                    {activeRegion.primaryNeed}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-forest-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-forest-800 uppercase tracking-wide mb-1">
                    <Building2 className="w-4 h-4 text-forest-600" />
                    <span>Profil des acheteurs cibles</span>
                  </div>
                  <p className="text-xs sm:text-sm text-forest-900/85 leading-relaxed">
                    {activeRegion.buyerType}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-forest-200/50 text-[11px] text-forest-700/80 leading-relaxed">
              En rapprochant les producteurs des bassins de consommation précis, la plateforme réduit les coûts logistiques d&apos;intermédiation et limite les invendus.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
