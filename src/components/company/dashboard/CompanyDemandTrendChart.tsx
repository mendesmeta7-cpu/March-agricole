"use client";

import { useState, useMemo, useId } from "react";
import { TrendingUp, Filter, Info, Calendar } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";

export interface DemandTrendPoint {
  date: string; // ISO date string
  quantity: number;
  unit: string;
  productId: string;
  productName: string;
}

export interface CompanyDemandTrendChartProps {
  demands: DemandTrendPoint[];
  availableProducts: { id: string; name: string }[];
}

export default function CompanyDemandTrendChart({
  demands,
  availableProducts,
}: CompanyDemandTrendChartProps) {
  const gradientId = useId();
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<"volume" | "count">("volume");
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  const productOptions = useMemo(
    () => [
      { value: "all", label: "Toutes les denrées" },
      ...availableProducts.map((p) => ({ value: p.id, label: p.name })),
    ],
    [availableProducts]
  );

  // 1. Filtrage selon le produit sélectionné
  const filteredDemands = useMemo(() => {
    if (selectedProductId === "all") return demands;
    return demands.filter((d) => d.productId === selectedProductId);
  }, [demands, selectedProductId]);

  // 2. Construction déterministe des 6 derniers mois calendaires pour l'axe X
  const monthlyData = useMemo(() => {
    const monthsMap = new Map<string, { label: string; monthKey: string; volume: number; count: number }>();
    const now = new Date();

    // Générer les 6 mois récents dans l'ordre chronologique
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      const label = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d);
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");

      monthsMap.set(monthKey, {
        label: capitalized,
        monthKey,
        volume: 0,
        count: 0,
      });
    }

    // Agréger les demandes réelles dans ces créneaux
    filteredDemands.forEach((d) => {
      const demandDate = new Date(d.date);
      const year = demandDate.getFullYear();
      const month = String(demandDate.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;

      const entry = monthsMap.get(monthKey);
      if (entry) {
        entry.count += 1;
        // Normaliser les volumes exprimés (ex: tonnes)
        const qty = d.unit.toLowerCase().includes("kg") ? d.quantity / 1000 : d.quantity;
        entry.volume += qty;
      }
    });

    return Array.from(monthsMap.values());
  }, [filteredDemands]);

  const maxVal = useMemo(() => {
    const values = monthlyData.map((d) => (displayMode === "volume" ? d.volume : d.count));
    const max = Math.max(...values, 0);
    return max === 0 ? (displayMode === "volume" ? 10 : 5) : Math.ceil(max * 1.25);
  }, [monthlyData, displayMode]);

  const totalSum = useMemo(() => {
    if (displayMode === "volume") {
      return monthlyData.reduce((acc, curr) => acc + curr.volume, 0);
    }
    return monthlyData.reduce((acc, curr) => acc + curr.count, 0);
  }, [monthlyData, displayMode]);

  // Dimensions SVG adaptatives
  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  // Calcul des coordonnées des points de la courbe
  const points = useMemo(() => {
    if (monthlyData.length === 0) return [];
    const step = innerWidth / (monthlyData.length - 1);

    return monthlyData.map((d, i) => {
      const val = displayMode === "volume" ? d.volume : d.count;
      const x = paddingX + i * step;
      const y = paddingY + innerHeight - (val / maxVal) * innerHeight;
      return { x, y, ...d };
    });
  }, [monthlyData, innerWidth, innerHeight, maxVal, displayMode]);

  // Construction du chemin SVG lissé
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  // Zone fermée sous la courbe pour le dégradé
  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const bottomY = paddingY + innerHeight;
    return `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [pathD, points, innerHeight]);

  const hasData = totalSum > 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-5">
      {/* En-tête du graphique avec titre, métriques et filtres réels */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-forest-700" />
              Évolution de la Demande Exprimée
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-900 border border-forest-200">
              Données réelles
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tendances d&apos;achat exprimées par les revendeurs sur les 6 derniers mois.
          </p>
        </div>

        {/* Sélecteurs dynamiques (Mode & Produit) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bascule Volume / Nombre */}
          <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200/70 text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode("volume")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                displayMode === "volume"
                  ? "bg-white text-forest-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Volume (t)
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("count")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                displayMode === "count"
                  ? "bg-white text-forest-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Nb demandes
            </button>
          </div>

          {/* Sélecteur de produit réel */}
          {availableProducts.length > 0 && (
            <div className="w-48">
              <Select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                options={productOptions}
                searchable
                selectSize="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Affichage du graphique ou de l'état vide */}
      {!hasData ? (
        <EmptyState
          title="Aucune demande exprimée sur la période"
          description="Les intentions d'achat et les demandes d'approvisionnement des revendeurs sur le marché national s'afficheront ici chronologiquement."
          icon={<Calendar className="w-6 h-6 text-forest-600" />}
          className="py-10 bg-forest-50/20"
        />
      ) : (
        <div className="relative">
          {/* Tooltip flottant au survol */}
          {activeHoverIndex !== null && points[activeHoverIndex] && (
            <div
              className="absolute z-20 pointer-events-none transform -translate-x-1/2 bg-gray-950 text-white rounded-xl px-3 py-2 text-xs shadow-xl transition-all"
              style={{
                left: `${(points[activeHoverIndex].x / width) * 100}%`,
                top: `${(points[activeHoverIndex].y / height) * 100 - 32}%`,
              }}
            >
              <p className="font-extrabold text-[11px] text-forest-200">
                {points[activeHoverIndex].label}
              </p>
              <p className="font-bold text-sm">
                {displayMode === "volume"
                  ? `${points[activeHoverIndex].volume.toFixed(1)} t`
                  : `${points[activeHoverIndex].count} demande(s)`}
              </p>
              <p className="text-[10px] text-gray-400">
                {displayMode === "volume"
                  ? `${points[activeHoverIndex].count} demande(s) enregistrée(s)`
                  : `${points[activeHoverIndex].volume.toFixed(1)} t demandée(s)`}
              </p>
            </div>
          )}

          {/* Canevas SVG responsive */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-48 sm:h-56 select-none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b6d4b" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#3b6d4b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Lignes de grille horizontales */}
              {[0, 0.5, 1].map((pct, idx) => {
                const y = paddingY + innerHeight * (1 - pct);
                const labelVal = Math.round(maxVal * pct);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="#f3f4f6"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#9ca3af"
                      fontWeight="600"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Remplissage dégradé sous la courbe */}
              <path d={areaD} fill={`url(#${gradientId})`} />

              {/* Ligne principale de tendance */}
              <path
                d={pathD}
                fill="none"
                stroke="#2f563d"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points interactifs cliquables et survols */}
              {points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeHoverIndex === i ? 6 : 4}
                    fill={activeHoverIndex === i ? "#22392b" : "#ffffff"}
                    stroke="#2f563d"
                    strokeWidth="2.5"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setActiveHoverIndex(i)}
                    onMouseLeave={() => setActiveHoverIndex(null)}
                  />
                  {/* Label sous l'axe X */}
                  <text
                    x={pt.x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill={activeHoverIndex === i ? "#111827" : "#6b7280"}
                    fontWeight={activeHoverIndex === i ? "bold" : "600"}
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Résumé textuel sous le graphique */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap gap-2">
            <span>
              Total cumulé sur 6 mois :{" "}
              <strong className="text-gray-900 font-bold">
                {displayMode === "volume" ? `${totalSum.toFixed(1)} t` : `${totalSum} demandes`}
              </strong>
            </span>
            <span className="italic text-[11px] text-gray-400">
              Survolez les points pour consulter le détail mensuel
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
