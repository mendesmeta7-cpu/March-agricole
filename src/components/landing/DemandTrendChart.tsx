"use client";

import { useState, useId, useMemo } from "react";
import { TrendingUp, Info, Calendar, ArrowUpRight } from "lucide-react";

interface DataPoint {
  month: string;
  volume: number; // Volume indicatif en tonnes
  trend: string;  // Évolution en %
}

interface ProductTrend {
  id: string;
  name: string;
  unit: string;
  badge: string;
  color: string;
  lightColor: string;
  gradientFrom: string;
  gradientTo: string;
  insight: string;
  data: DataPoint[];
}

const PRODUCTS_DATA: Record<string, ProductTrend> = {
  mais: {
    id: "mais",
    name: "Maïs",
    unit: "tonnes",
    badge: "Forte dynamique saisonnière",
    color: "#2f563d",
    lightColor: "#74a784",
    gradientFrom: "#3b6d4b",
    gradientTo: "#2f563d",
    insight: "Les intentions d'achat progressent régulièrement de janvier à juin, avec un pic marqué lors des approvisionnements urbains.",
    data: [
      { month: "Janv", volume: 42, trend: "+8%" },
      { month: "Févr", volume: 55, trend: "+12%" },
      { month: "Mars", volume: 68, trend: "+15%" },
      { month: "Avr", volume: 84, trend: "+20%" },
      { month: "Mai", volume: 102, trend: "+26%" },
      { month: "Juin", volume: 118, trend: "+31%" },
    ],
  },
  tomates: {
    id: "tomates",
    name: "Tomates",
    unit: "tonnes",
    badge: "Demande continue & circuits courts",
    color: "#b5874f",
    lightColor: "#d6bc95",
    gradientFrom: "#c59f6d",
    gradientTo: "#b5874f",
    insight: "Consommation urbaine soutenue tout au long de l'année, nécessitant des livraisons fréquentes et des rotations rapides.",
    data: [
      { month: "Janv", volume: 30, trend: "+5%" },
      { month: "Févr", volume: 45, trend: "+14%" },
      { month: "Mars", volume: 60, trend: "+18%" },
      { month: "Avr", volume: 72, trend: "+22%" },
      { month: "Mai", volume: 85, trend: "+28%" },
      { month: "Juin", volume: 94, trend: "+30%" },
    ],
  },
  manioc: {
    id: "manioc",
    name: "Manioc",
    unit: "tonnes",
    badge: "Base alimentaire majeure",
    color: "#284532",
    lightColor: "#4f8961",
    gradientFrom: "#4f8961",
    gradientTo: "#284532",
    insight: "Demande très stable et volumineuse des transformateurs et commerçants de gros garantissant des débouchés réguliers.",
    data: [
      { month: "Janv", volume: 65, trend: "+10%" },
      { month: "Févr", volume: 78, trend: "+14%" },
      { month: "Mars", volume: 92, trend: "+18%" },
      { month: "Avr", volume: 110, trend: "+24%" },
      { month: "Mai", volume: 130, trend: "+32%" },
      { month: "Juin", volume: 148, trend: "+38%" },
    ],
  },
};

export default function DemandTrendChart() {
  const [selectedProductId, setSelectedProductId] = useState<string>("mais");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartId = useId();

  const product = PRODUCTS_DATA[selectedProductId] || PRODUCTS_DATA.mais;
  const data = product.data;

  // Calculs géométriques SVG pour une courbe parfaite
  const width = 640;
  const height = 280;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 32;
  const paddingBottom = 44;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const maxVolume = useMemo(() => {
    const max = Math.max(...data.map((d) => d.volume));
    return Math.ceil(max / 20) * 20; // Arrondi à la tranche supérieure de 20
  }, [data]);

  // Points (x, y)
  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * innerWidth;
      const y = paddingTop + innerHeight - (d.volume / maxVolume) * innerHeight;
      return { x, y, ...d };
    });
  }, [data, innerWidth, innerHeight, maxVolume, paddingLeft, paddingTop]);

  // Génération d'une courbe lisse (smooth cubic bezier)
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, point, i, arr) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = arr[i - 1];
      const cpX = (prev.x + point.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
    }, "");
  }, [points]);

  // Remplissage sous la courbe (Area)
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = paddingTop + innerHeight;
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [linePath, points, paddingTop, innerHeight]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <section
      aria-label="Section d'observation de la demande"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <div className="bg-white rounded-3xl border border-forest-100 shadow-md shadow-forest-900/5 p-6 sm:p-8 lg:p-10 transition-all">
        {/* En-tête de section avec Titre, vocation et Sélecteur */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-forest-100/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200/60 text-forest-700 text-xs font-semibold uppercase tracking-wider mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-forest-600" />
              <span>Visibilité Commerciale</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-forest-950 tracking-tight">
              La demande évolue.
            </h2>
            <p className="text-sm sm:text-base text-forest-900/75 mt-2 max-w-2xl leading-relaxed">
              Comprenez ce que recherchent les acheteurs et observez l’évolution de la demande avant de prendre vos décisions commerciales.
            </p>
          </div>

          {/* Sélecteur de produit interactif [ Maïs ] [ Tomates ] [ Manioc ] */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-shrink-0">
            <span className="text-xs font-semibold text-forest-700/80">Exemple de produit :</span>
            <div
              role="radiogroup"
              aria-label="Sélectionnez un produit à visualiser"
              className="inline-flex p-1 rounded-xl bg-forest-50/90 border border-forest-200/70 shadow-2xs"
            >
              {(Object.keys(PRODUCTS_DATA) as (keyof typeof PRODUCTS_DATA)[]).map((key) => {
                const prod = PRODUCTS_DATA[key];
                const isSelected = selectedProductId === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedProductId(prod.id);
                      setHoveredIndex(null);
                    }}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-1 ${
                      isSelected
                        ? "bg-forest-700 text-white shadow-xs"
                        : "text-forest-800 hover:text-forest-950 hover:bg-white/70"
                    }`}
                  >
                    {prod.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Corps principal : Graphique Area Chart interactif */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Visualisation SVG réactive */}
          <div className="lg:col-span-8 relative">
            {/* Tag Données Illustratives discret */}
            <div className="flex items-center justify-between gap-3 mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-forest-900 tracking-tight">
                  Tendance des intentions d&apos;achat — {product.name}
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-forest-400" />
                <span className="hidden sm:inline-block text-[11px] text-forest-600 font-medium">
                  {product.badge}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-600/80 bg-forest-50/80 px-2 py-0.5 rounded-md border border-forest-200/50">
                <Info className="w-3 h-3 text-forest-500" />
                Données illustratives
              </span>
            </div>

            {/* Conteneur SVG avec ratio d'aspect préservé */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-gradient-to-b from-forest-50/30 via-white to-white rounded-2xl border border-forest-100 p-2 sm:p-4 overflow-hidden">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Dégradé de la zone sous la courbe */}
                  <linearGradient id={`area-grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b6d4b" stopOpacity="0.28" />
                    <stop offset="70%" stopColor="#74a784" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Lueur subtile pour le trait */}
                  <filter id={`glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2f563d" floodOpacity="0.25" />
                  </filter>
                </defs>

                {/* Grille horizontale douce */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingTop + innerHeight * (1 - ratio);
                  const labelValue = Math.round(maxVolume * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={width - paddingRight}
                        y2={y}
                        stroke="#e1efe6"
                        strokeWidth="1"
                        strokeDasharray={ratio === 0 ? "none" : "3 3"}
                      />
                      <text
                        x={paddingLeft - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="500"
                        fill="#74a784"
                      >
                        {labelValue} t
                      </text>
                    </g>
                  );
                })}

                {/* Axe X (Mois) */}
                {points.map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y={height - 14}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill={hoveredIndex === idx ? "#0f1f16" : "#4f8961"}
                  >
                    {p.month}
                  </text>
                ))}

                {/* Remplissage de la zone */}
                <path
                  d={areaPath}
                  fill={`url(#area-grad-${chartId})`}
                  className="transition-all duration-500 ease-out"
                />

                {/* Ligne principale de tendance */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2f563d"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#glow-${chartId})`}
                  className="transition-all duration-500 ease-out"
                />

                {/* Ligne verticale indicatrice au survol */}
                {hoveredIndex !== null && (
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={paddingTop + innerHeight}
                    stroke="#3b6d4b"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.7"
                  />
                )}

                {/* Points interactifs cliquables / survolables */}
                {points.map((p, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onClick={() => setHoveredIndex(idx)}
                    >
                      {/* Zone tactile élargie invisible pour mobile */}
                      <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

                      {/* Halo extérieur au survol */}
                      {isHovered && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="9"
                          fill="#c4decb"
                          opacity="0.6"
                          className="animate-pulse"
                        />
                      )}

                      {/* Point visible */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? "5" : "3.5"}
                        fill="#ffffff"
                        stroke="#2f563d"
                        strokeWidth="2.5"
                        className="transition-all duration-200"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip flottant moderne */}
              {activePoint && (
                <div
                  className="absolute pointer-events-none transition-all duration-200 z-20"
                  style={{
                    left: `${(activePoint.x / width) * 100}%`,
                    top: `${(activePoint.y / height) * 100}%`,
                    transform: "translate(-50%, -125%)",
                  }}
                >
                  <div className="bg-forest-950/95 text-white backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-forest-700/50 flex items-center gap-2 whitespace-nowrap text-xs">
                    <span className="font-semibold text-emerald-300">
                      {activePoint.volume} t
                    </span>
                    <span className="text-forest-200/80">({activePoint.month})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-forest-800 text-emerald-200 font-bold">
                      {activePoint.trend}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Colonne latérale : Cartouche d'explication de la valeur pour l'acteur agricole */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
            <div className="bg-forest-50/70 border border-forest-100 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 text-forest-700 text-xs font-bold uppercase tracking-wider mb-2">
                <Calendar className="w-4 h-4 text-forest-600" />
                <span>Lecture du signal marché</span>
              </div>
              <p className="text-xs sm:text-sm text-forest-900 leading-relaxed">
                {product.insight}
              </p>

              <div className="mt-4 pt-4 border-t border-forest-200/60 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-forest-600 font-medium">Point d&apos;intérêt</p>
                  <p className="text-base sm:text-lg font-bold text-forest-950">
                    {activePoint.volume} {product.unit}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-forest-600 font-medium">Variation estimée</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-700 inline-flex items-center">
                    {activePoint.trend}
                    <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-forest-100/90 text-xs text-forest-800/85">
              <span className="font-semibold text-forest-950 block mb-1">
                Pourquoi cette information compte :
              </span>
              En visualisant ces courbes, les sociétés de production calibrent leurs récoltes et leurs prix, tandis que les revendeurs anticipent leurs contrats d&apos;approvisionnement.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
