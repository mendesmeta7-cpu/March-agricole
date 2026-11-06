"use client";

import { useState, useMemo, useId } from "react";
import { TrendingUp, Calendar } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import {
  buildMonthlySeriesByUnit,
  countByMonth,
  formatQuantity,
  formatUnitTotals,
  groupQuantitiesByUnit,
  lastMonthKeys,
} from "@/lib/utils/unitSeries";

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

/**
 * Palette des séries (une par unité de mesure), issue de l'identité Radiza :
 * forêt en premier (rendu identique à l'ancien graphique mono-unité), puis terre,
 * puis teintes déjà utilisées sur le tableau de bord. Chaque série a aussi son
 * propre motif de trait pour rester distinguable sans la couleur.
 */
const SERIES_STYLES = [
  { stroke: "#2f563d", activeFill: "#22392b", dash: undefined },
  { stroke: "#9e6f40", activeFill: "#674530", dash: "7 4" },
  { stroke: "#0369a1", activeFill: "#0c4a6e", dash: "2 4" },
  { stroke: "#be123c", activeFill: "#881337", dash: "10 4 2 4" },
  { stroke: "#7e22ce", activeFill: "#581c87", dash: "4 3" },
  { stroke: "#475569", activeFill: "#1e293b", dash: "1 3" },
] as const;

const MONTHS_WINDOW = 6;

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(
    new Date(year, month - 1, 1)
  );
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

export default function CompanyDemandTrendChart({
  demands,
  availableProducts,
}: CompanyDemandTrendChartProps) {
  const gradientId = useId();
  const summaryId = useId();
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<"volume" | "count">("volume");
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const [hiddenUnits, setHiddenUnits] = useState<string[]>([]);

  const productOptions = useMemo(
    () => [
      { value: "all", label: "Toutes les denrées" },
      ...availableProducts.map((p) => ({ value: p.id, label: p.name })),
    ],
    [availableProducts]
  );

  // Couleur stable par unité (calculée sur toutes les demandes, indépendamment du filtre)
  const styleByUnit = useMemo(() => {
    const map = new Map<string, (typeof SERIES_STYLES)[number]>();
    groupQuantitiesByUnit(demands, (d) => d.quantity, (d) => d.unit).forEach((u, i) => {
      map.set(u.unitKey, SERIES_STYLES[i % SERIES_STYLES.length]);
    });
    return map;
  }, [demands]);

  // 1. Filtrage selon le produit sélectionné
  const filteredDemands = useMemo(() => {
    if (selectedProductId === "all") return demands;
    return demands.filter((d) => d.productId === selectedProductId);
  }, [demands, selectedProductId]);

  // 2. Les 6 derniers mois calendaires (axe X)
  const monthKeys = useMemo(() => lastMonthKeys(new Date(), MONTHS_WINDOW), []);
  const monthLabels = useMemo(() => monthKeys.map(monthLabel), [monthKeys]);

  // 3. Une série par unité (BR-FIN-04 : aucune conversion, aucune addition entre unités)
  const unitSeries = useMemo(
    () => buildMonthlySeriesByUnit(filteredDemands, monthKeys),
    [filteredDemands, monthKeys]
  );
  const monthlyCounts = useMemo(
    () => countByMonth(filteredDemands, monthKeys),
    [filteredDemands, monthKeys]
  );

  // Séries affichées ; si un changement de filtre masquerait tout, on réaffiche tout.
  const visibleSeries = useMemo(() => {
    const visible = unitSeries.filter((s) => !hiddenUnits.includes(s.unitKey));
    return visible.length > 0 ? visible : unitSeries;
  }, [unitSeries, hiddenUnits]);
  const isMultiUnit = unitSeries.length > 1;

  // Séries tracées : une par unité visible (volume) ou le décompte des demandes (count)
  const plotted = useMemo(() => {
    if (displayMode === "count") {
      return [
        {
          key: "__count__",
          label: "demande(s)",
          values: monthlyCounts,
          style: SERIES_STYLES[0],
        },
      ];
    }
    return visibleSeries.map((s) => ({
      key: s.unitKey,
      label: s.unitLabel,
      values: s.values,
      style: styleByUnit.get(s.unitKey) ?? SERIES_STYLES[0],
    }));
  }, [displayMode, monthlyCounts, visibleSeries, styleByUnit]);

  const maxVal = useMemo(() => {
    const max = Math.max(0, ...plotted.flatMap((s) => s.values));
    return max === 0 ? (displayMode === "volume" ? 10 : 5) : Math.ceil(max * 1.25);
  }, [plotted, displayMode]);

  const totalCount = monthlyCounts.reduce((acc, c) => acc + c, 0);
  const hasData = totalCount > 0;

  // Dimensions SVG adaptatives
  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const step = innerWidth / (monthKeys.length - 1);
  const bottomY = paddingY + innerHeight;

  const xAt = (i: number) => paddingX + i * step;
  const yAt = (val: number) => paddingY + innerHeight - (val / maxVal) * innerHeight;

  // Chemins SVG lissés, un par série tracée
  const paths = plotted.map((s) => {
    const pts = s.values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const area = `${d} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;
    return { ...s, pts, d, area };
  });

  // Le dégradé n'est conservé que pour une série unique (rendu identique à l'existant)
  const singlePath = paths.length === 1 ? paths[0] : null;

  const volumeTotalsLabel = formatUnitTotals(
    visibleSeries.map((s) => ({ unitLabel: s.unitLabel, total: s.total }))
  );

  const toggleUnit = (unitKey: string) => {
    setHiddenUnits((prev) => {
      if (prev.includes(unitKey)) return prev.filter((u) => u !== unitKey);
      // Au moins une série reste visible
      const visibleCount = unitSeries.filter((s) => !prev.includes(s.unitKey)).length;
      if (visibleCount <= 1) return prev;
      return [...prev, unitKey];
    });
  };

  const hoverTopY =
    activeHoverIndex !== null && paths.length > 0
      ? Math.min(...paths.map((p) => p.pts[activeHoverIndex].y))
      : 0;

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
              aria-pressed={displayMode === "volume"}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                displayMode === "volume"
                  ? "bg-white text-forest-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {unitSeries.length === 1 ? `Volume (${unitSeries[0].unitLabel})` : "Volume"}
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("count")}
              aria-pressed={displayMode === "count"}
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
          {/* Légende : une entrée par unité (aucune conversion entre unités) */}
          {displayMode === "volume" && isMultiUnit && (
            <div className="mb-3 space-y-1.5">
              <ul className="flex flex-wrap gap-2" aria-label="Séries par unité de mesure">
                {unitSeries.map((s) => {
                  const style = styleByUnit.get(s.unitKey) ?? SERIES_STYLES[0];
                  const isVisible = visibleSeries.some((v) => v.unitKey === s.unitKey);
                  return (
                    <li key={s.unitKey}>
                      <button
                        type="button"
                        onClick={() => toggleUnit(s.unitKey)}
                        aria-pressed={isVisible}
                        aria-label={`Série ${s.unitLabel} : ${formatQuantity(s.total)} ${s.unitLabel} sur 6 mois. ${isVisible ? "Masquer" : "Afficher"} la série`}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                          isVisible
                            ? "bg-white border-gray-200 text-gray-800"
                            : "bg-gray-50 border-gray-100 text-gray-400 line-through"
                        }`}
                      >
                        <svg width="18" height="6" aria-hidden="true">
                          <line
                            x1="1"
                            y1="3"
                            x2="17"
                            y2="3"
                            stroke={isVisible ? style.stroke : "#d1d5db"}
                            strokeWidth="2.5"
                            strokeDasharray={style.dash}
                            strokeLinecap="round"
                          />
                        </svg>
                        {s.unitLabel}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] text-gray-400">
                Une courbe par unité de mesure — les quantités ne sont ni converties ni additionnées entre unités.
              </p>
            </div>
          )}

          {/* Tooltip flottant au survol */}
          {activeHoverIndex !== null && paths.length > 0 && (
            <div
              className="absolute z-20 pointer-events-none transform -translate-x-1/2 bg-gray-950 text-white rounded-xl px-3 py-2 text-xs shadow-xl transition-all"
              style={{
                left: `${(xAt(activeHoverIndex) / width) * 100}%`,
                top: `${(hoverTopY / height) * 100 - 32}%`,
              }}
            >
              <p className="font-extrabold text-[11px] text-forest-200">
                {monthLabels[activeHoverIndex]}
              </p>
              {displayMode === "volume" ? (
                <>
                  {visibleSeries.map((s) => (
                    <p key={s.unitKey} className="font-bold text-sm whitespace-nowrap">
                      {formatQuantity(s.values[activeHoverIndex])} {s.unitLabel}
                    </p>
                  ))}
                  <p className="text-[10px] text-gray-400">
                    {monthlyCounts[activeHoverIndex]} demande(s) enregistrée(s)
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm">
                    {monthlyCounts[activeHoverIndex]} demande(s)
                  </p>
                  {visibleSeries.map((s) => (
                    <p key={s.unitKey} className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatQuantity(s.values[activeHoverIndex])} {s.unitLabel} demandé(s)
                    </p>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Canevas SVG responsive */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-48 sm:h-56 select-none"
              preserveAspectRatio="none"
              role="img"
              aria-describedby={summaryId}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={singlePath?.style.stroke ?? "#3b6d4b"} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={singlePath?.style.stroke ?? "#3b6d4b"} stopOpacity="0.0" />
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

              {/* Remplissage dégradé sous la courbe (série unique uniquement) */}
              {singlePath && <path d={singlePath.area} fill={`url(#${gradientId})`} />}

              {/* Une ligne de tendance par série */}
              {paths.map((p) => (
                <path
                  key={p.key}
                  d={p.d}
                  fill="none"
                  stroke={p.style.stroke}
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={p.style.dash}
                />
              ))}

              {/* Points de chaque série */}
              {paths.map((p) =>
                p.pts.map((pt, i) => (
                  <circle
                    key={`${p.key}-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={activeHoverIndex === i ? 6 : 4}
                    fill={activeHoverIndex === i ? p.style.activeFill : "#ffffff"}
                    stroke={p.style.stroke}
                    strokeWidth="2.5"
                    className="transition-all duration-150 pointer-events-none"
                  />
                ))
              )}

              {/* Zones de survol par mois + labels de l'axe X */}
              {monthKeys.map((key, i) => (
                <g key={key}>
                  <rect
                    x={xAt(i) - step / 2}
                    y={paddingY - 10}
                    width={step}
                    height={innerHeight + 20}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveHoverIndex(i)}
                    onMouseLeave={() => setActiveHoverIndex(null)}
                  />
                  <text
                    x={xAt(i)}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill={activeHoverIndex === i ? "#111827" : "#6b7280"}
                    fontWeight={activeHoverIndex === i ? "bold" : "600"}
                  >
                    {monthLabels[i]}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Résumé accessible des séries (lecteurs d'écran) */}
          <div id={summaryId} className="sr-only">
            {displayMode === "volume"
              ? visibleSeries
                  .map(
                    (s) =>
                      `Série ${s.unitLabel} : ${monthKeys
                        .map((_, i) => `${monthLabels[i]} ${formatQuantity(s.values[i])} ${s.unitLabel}`)
                        .join(", ")}.`
                  )
                  .join(" ")
              : `Nombre de demandes : ${monthKeys
                  .map((_, i) => `${monthLabels[i]} ${monthlyCounts[i]}`)
                  .join(", ")}.`}
          </div>

          {/* Résumé textuel sous le graphique */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap gap-2">
            <span>
              Total cumulé sur 6 mois :{" "}
              <strong className="text-gray-900 font-bold">
                {displayMode === "volume"
                  ? volumeTotalsLabel || "0"
                  : `${totalCount} demandes`}
              </strong>
            </span>
            <span className="italic text-[11px] text-gray-400">
              Survolez le graphique pour consulter le détail mensuel
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
