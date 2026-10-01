"use client";

import { useState } from "react";
import { PieChart, Info, Wheat, Carrot, Apple, Sparkles } from "lucide-react";

interface CategoryDistribution {
  id: string;
  name: string;
  percentage: number;
  indicativeTonnage: number;
  color: string;
  accentColor: string;
  icon: typeof Wheat;
  description: string;
}

const CATEGORIES_DATA: CategoryDistribution[] = [
  {
    id: "cereales",
    name: "Céréales",
    percentage: 38,
    indicativeTonnage: 460,
    color: "#2f563d", // forest-700
    accentColor: "#3b6d4b",
    icon: Wheat,
    description: "Maïs, riz local et sorgho — piliers de la consommation urbaine et animale.",
  },
  {
    id: "legumes",
    name: "Légumes",
    percentage: 27,
    indicativeTonnage: 325,
    color: "#4f8961", // forest-500
    accentColor: "#74a784",
    icon: Carrot,
    description: "Tomates, oignons, piments et feuilles maraîchères à rotation quotidienne.",
  },
  {
    id: "tubercules",
    name: "Tubercules",
    percentage: 23,
    indicativeTonnage: 275,
    color: "#b5874f", // earth-500
    accentColor: "#c59f6d",
    icon: Sparkles,
    description: "Manioc, ignames et patates douces transformés et commercialisés en masse.",
  },
  {
    id: "fruits",
    name: "Fruits",
    percentage: 12,
    indicativeTonnage: 145,
    color: "#7e5435", // earth-700
    accentColor: "#9e6f40",
    icon: Apple,
    description: "Bananes plantains, agrumes, ananas et mangues de saison pour les marchés frais.",
  },
];

export default function MarketDistributionChart() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalTonnage = CATEGORIES_DATA.reduce((acc, c) => acc + c.indicativeTonnage, 0);
  const activeCategory = CATEGORIES_DATA.find((c) => c.id === selectedId);

  // Géométrie SVG du Donut
  const size = 260;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calcul des décalages d'arc (dashoffset)
  let accumulatedPercent = 0;
  const segments = CATEGORIES_DATA.map((cat) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += cat.percentage;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <section
      aria-label="Section de compréhension du marché par filière"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <div className="bg-white rounded-3xl border border-forest-100 shadow-md shadow-forest-900/5 p-6 sm:p-8 lg:p-10 transition-all">
        {/* En-tête de section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-forest-100/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200/60 text-forest-700 text-xs font-semibold uppercase tracking-wider mb-3">
              <PieChart className="w-3.5 h-3.5 text-forest-600" />
              <span>Vision Sectorielle</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-forest-950 tracking-tight">
              Comprendre le marché.
            </h2>
            <p className="text-sm sm:text-base text-forest-900/75 mt-2 max-w-2xl leading-relaxed">
              Observez la structure des besoins par filière pour planifier vos productions ou vos approvisionnements en toute sérénité.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-700 bg-forest-50/90 px-3 py-1 rounded-full border border-forest-200/60 flex-shrink-0">
            <Info className="w-3.5 h-3.5 text-forest-500" />
            Données illustratives
          </span>
        </div>

        {/* Corps principal : Donut Chart SVG + Légende interactive */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Donut Chart SVG compact et centré */}
          <div className="md:col-span-6 flex flex-col items-center justify-center relative">
            <div className="relative w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] flex items-center justify-center">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full -rotate-90 transform overflow-visible"
              >
                {/* Cercle de fond */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#f2f8f4"
                  strokeWidth={strokeWidth}
                />

                {/* Segments de catégories */}
                {segments.map((seg) => {
                  const isSelected = selectedId === seg.id;
                  const isDimmed = selectedId !== null && !isSelected;

                  return (
                    <circle
                      key={seg.id}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isSelected ? strokeWidth + 6 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        opacity: isDimmed ? 0.35 : 1,
                        filter: isSelected ? "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" : "none",
                      }}
                      onMouseEnter={() => setSelectedId(seg.id)}
                      onClick={() =>
                        setSelectedId((prev) => (prev === seg.id ? null : seg.id))
                      }
                    />
                  );
                })}
              </svg>

              {/* Centre du Donut avec informations dynamiques */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none transition-all duration-200"
              >
                {activeCategory ? (
                  <>
                    <p className="text-[11px] font-bold text-forest-600 uppercase tracking-wider">
                      {activeCategory.name}
                    </p>
                    <p className="text-3xl font-black text-forest-950 my-0.5">
                      {activeCategory.percentage}%
                    </p>
                    <p className="text-xs text-forest-700/80 font-medium">
                      ~{activeCategory.indicativeTonnage} tonnes
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-forest-600 uppercase tracking-wide">
                      Total Observé
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-forest-950 my-0.5">
                      1 200 t
                    </p>
                    <p className="text-[11px] text-forest-700/75">
                      4 filières majeures
                    </p>
                  </>
                )}
              </div>
            </div>

            <p className="text-[11px] text-forest-600 mt-3 text-center">
              Survolez ou touchez un secteur pour détailler la filière.
            </p>
          </div>

          {/* Légende interactive et fiches filières */}
          <div className="md:col-span-6 space-y-3">
            {CATEGORIES_DATA.map((cat) => {
              const isSelected = selectedId === cat.id;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedId((prev) => (prev === cat.id ? null : cat.id))
                  }
                  onMouseEnter={() => setSelectedId(cat.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-1 ${
                    isSelected
                      ? "bg-forest-50/90 border-forest-300 shadow-sm"
                      : "bg-white hover:bg-forest-50/40 border-forest-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-forest-950">
                          {cat.name}
                        </p>
                        <p className="text-xs text-forest-700/80 line-clamp-1">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-extrabold text-forest-950 block">
                        {cat.percentage}%
                      </span>
                      <span className="text-[11px] text-forest-600 font-medium">
                        {cat.indicativeTonnage} t
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
