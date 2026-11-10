"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import DashboardChartCard, { ChartUnitSelect } from "./DashboardChartCard";
import {
  buildMonthlySeriesByUnit,
  countByMonth,
  formatQuantity,
  formatUnitTotals,
  lastMonthKeys,
  niceAxisScale,
  resolveSelectedUnit,
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
  /** La lecture a échoué : à distinguer d'une absence réelle de demande. */
  unavailable?: boolean;
}

const LINE_COLOR = "#2f563d"; // forest-700
const ACTIVE_POINT_COLOR = "#22392b"; // forest-900
const AXIS_TEXT_COLOR = "#4b5563"; // gray-600
const ACTIVE_AXIS_TEXT_COLOR = "#111827"; // gray-900

const MONTHS_WINDOW = 6;
const CHART_HEIGHT = 220;
const PADDING_TOP = 30;
const PADDING_RIGHT = 18;
const PADDING_BOTTOM = 28;
const AXIS_FONT_SIZE = 11;
const TOOLTIP_GAP = 12;
const TOOLTIP_MARGIN = 4;

const TITLE = "Évolution de la demande exprimée";

function monthLabel(monthKey: string, format: "short" | "long" = "short"): string {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", { month: format }).format(
    new Date(year, month - 1, 1)
  );
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

/** Largeur de la carte en pixels réels, pour dessiner sans aucune déformation. */
function useElementWidth() {
  const [width, setWidth] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(node);
    }
  }, []);

  return [ref, width] as const;
}

/** Place l'infobulle au-dessus du point, entière dans le graphique et dans la carte. */
function placeTooltip(node: HTMLDivElement, pointX: number, pointY: number, chartWidth: number) {
  const { offsetWidth: tooltipWidth, offsetHeight: tooltipHeight } = node;
  const left = Math.min(
    Math.max(TOOLTIP_MARGIN, pointX - tooltipWidth / 2),
    chartWidth - tooltipWidth - TOOLTIP_MARGIN
  );

  const card = node.closest("[data-chart-card]");
  const chart = node.parentElement;
  const spaceAbove =
    card && chart
      ? chart.getBoundingClientRect().top - card.getBoundingClientRect().top
      : 0;
  const above = pointY - tooltipHeight - TOOLTIP_GAP;
  const top = above >= TOOLTIP_MARGIN - spaceAbove ? above : pointY + TOOLTIP_GAP;

  node.style.left = `${left}px`;
  node.style.top = `${top}px`;
}

export default function CompanyDemandTrendChart({
  demands,
  availableProducts,
  unavailable = false,
}: CompanyDemandTrendChartProps) {
  const gradientId = useId();
  const summaryId = useId();
  const [chartRef, chartWidth] = useElementWidth();
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<"volume" | "count">("volume");
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

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

  // 2. Les 6 derniers mois calendaires (axe X)
  const monthKeys = useMemo(() => lastMonthKeys(new Date(), MONTHS_WINDOW), []);
  const monthLabels = useMemo(() => monthKeys.map((key) => monthLabel(key)), [monthKeys]);
  const monthLongLabels = useMemo(
    () => monthKeys.map((key) => monthLabel(key, "long")),
    [monthKeys]
  );

  // 3. Une série par unité (BR-FIN-04 : aucune conversion, aucune addition entre unités)
  const unitSeries = useMemo(
    () => buildMonthlySeriesByUnit(filteredDemands, monthKeys),
    [filteredDemands, monthKeys]
  );
  const monthlyCounts = useMemo(
    () => countByMonth(filteredDemands, monthKeys),
    [filteredDemands, monthKeys]
  );

  // Une seule unité à la fois, sur sa propre échelle. Si le filtre retire l'unité
  // choisie, on affiche la première sans oublier le choix de l'utilisateur.
  const selectedSeries = resolveSelectedUnit(unitSeries, selectedUnitKey);
  const isMultiUnit = unitSeries.length > 1;
  const volumeSeries = displayMode === "volume" ? selectedSeries : null;
  const values = volumeSeries ? volumeSeries.values : monthlyCounts;

  const scale = useMemo(
    () => niceAxisScale(Math.max(0, ...values), { integerOnly: volumeSeries === null }),
    [values, volumeSeries]
  );
  const tickLabels = scale.ticks.map(formatQuantity);

  const totalCount = monthlyCounts.reduce((acc, c) => acc + c, 0);
  const hasData = totalCount > 0;

  // Géométrie en pixels réels : une unité du dessin vaut un pixel à l'écran.
  const width = chartWidth ?? 0;
  const longestTick = Math.max(...tickLabels.map((label) => label.length));
  const paddingLeft = Math.min(84, Math.max(34, Math.ceil(longestTick * 6.6) + 12));
  const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const bottomY = PADDING_TOP + innerHeight;
  const step = (width - paddingLeft - PADDING_RIGHT) / (monthKeys.length - 1);

  const xAt = (i: number) => paddingLeft + i * step;
  const yAt = (val: number) => bottomY - (val / scale.max) * innerHeight;

  // Courbe lissée
  const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    linePath += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;

  const describeMonth = (i: number) =>
    volumeSeries
      ? `${monthLongLabels[i]} : ${formatQuantity(volumeSeries.values[i])} ${volumeSeries.unitLabel}, ${plural(volumeSeries.counts[i], "demande")}`
      : `${monthLongLabels[i]} : ${plural(monthlyCounts[i], "demande")}`;

  if (unavailable) {
    return (
      <DashboardChartCard icon={TrendingUp} title={TITLE}>
        <DataUnavailableNotice title="Graphique temporairement indisponible">
          Les demandes n&apos;ont pas pu être chargées. Cela ne signifie pas qu&apos;il n&apos;y en a aucune.
        </DataUnavailableNotice>
      </DashboardChartCard>
    );
  }

  return (
    <DashboardChartCard
      icon={TrendingUp}
      title={TITLE}
      badge={
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-900 border border-forest-200">
          Données réelles
        </span>
      }
      description="Tendances d'achat exprimées par les revendeurs sur les 6 derniers mois."
      filters={
        <>
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
              Volume
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

          {/* Une unité à la fois (la vue « Nb demandes » reste toutes unités) */}
          {volumeSeries && isMultiUnit && (
            <ChartUnitSelect
              units={unitSeries}
              value={volumeSeries.unitKey}
              onChange={setSelectedUnitKey}
            />
          )}

          {/* Sélecteur de produit réel */}
          {availableProducts.length > 0 && (
            <div className="min-w-[9rem] flex-1 sm:flex-none sm:w-48">
              <Select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                options={productOptions}
                searchable
                selectSize="sm"
              />
            </div>
          )}
        </>
      }
    >
      {/* Affichage du graphique ou de l'état vide */}
      {!hasData ? (
        <EmptyState
          title="Aucune demande exprimée sur la période"
          description="Les intentions d'achat et les demandes d'approvisionnement des revendeurs sur le marché national s'afficheront ici chronologiquement."
          icon={<Calendar className="w-6 h-6 text-forest-600" />}
          className="py-10 bg-forest-50/20"
        />
      ) : (
        <div>
          {volumeSeries && isMultiUnit && (
            <p className="mb-3 text-[11px] text-gray-500">
              Une unité à la fois : les quantités ne sont ni converties ni additionnées entre unités.
            </p>
          )}

          <div ref={chartRef} className="relative w-full" style={{ height: CHART_HEIGHT }}>
            {chartWidth !== null && (
              <>
                <svg
                  viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
                  height={CHART_HEIGHT}
                  className="block w-full select-none"
                  role="img"
                  aria-describedby={summaryId}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.32" />
                      <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Unité de l'axe */}
                  <text x={0} y={12} fontSize={AXIS_FONT_SIZE} fill={AXIS_TEXT_COLOR} fontWeight="600">
                    {volumeSeries ? `En ${volumeSeries.unitLabel}` : "Nombre de demandes"}
                  </text>

                  {/* Graduations horizontales */}
                  {scale.ticks.map((tick, idx) => (
                    <g key={tick}>
                      <line
                        x1={paddingLeft}
                        y1={yAt(tick)}
                        x2={width - PADDING_RIGHT}
                        y2={yAt(tick)}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={yAt(tick) + 4}
                        textAnchor="end"
                        fontSize={AXIS_FONT_SIZE}
                        fill={AXIS_TEXT_COLOR}
                        fontWeight="600"
                      >
                        {tickLabels[idx]}
                      </text>
                    </g>
                  ))}

                  {/* Remplissage dégradé sous la courbe */}
                  <path d={areaPath} fill={`url(#${gradientId})`} />

                  {/* Ligne de tendance */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={LINE_COLOR}
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points et mois */}
                  {points.map((pt, i) => (
                    <g key={monthKeys[i]}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={activeMonth === i ? 6 : 4}
                        fill={activeMonth === i ? ACTIVE_POINT_COLOR : "#ffffff"}
                        stroke={LINE_COLOR}
                        strokeWidth="2.5"
                      />
                      <text
                        x={pt.x}
                        y={CHART_HEIGHT - 8}
                        textAnchor="middle"
                        fontSize={AXIS_FONT_SIZE}
                        fill={activeMonth === i ? ACTIVE_AXIS_TEXT_COLOR : AXIS_TEXT_COLOR}
                        fontWeight={activeMonth === i ? "bold" : "600"}
                      >
                        {monthLabels[i]}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Un bouton par mois : souris, toucher et clavier */}
                {points.map((pt, i) => {
                  const zoneLeft = i === 0 ? 0 : pt.x - step / 2;
                  const zoneRight = i === points.length - 1 ? width : pt.x + step / 2;
                  return (
                    <button
                      key={monthKeys[i]}
                      type="button"
                      aria-label={describeMonth(i)}
                      className="absolute top-0 bottom-0 z-10 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-600"
                      style={{ left: zoneLeft, width: zoneRight - zoneLeft }}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") setActiveMonth(i);
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType === "mouse") setActiveMonth(null);
                      }}
                      onFocus={() => setActiveMonth(i)}
                      onBlur={() => setActiveMonth(null)}
                      onClick={() => setActiveMonth(i)}
                    />
                  );
                })}

                {/* Infobulle */}
                {activeMonth !== null && (
                  <div
                    ref={(node) => {
                      if (node) placeTooltip(node, points[activeMonth].x, points[activeMonth].y, width);
                    }}
                    className="absolute left-0 top-0 z-20 pointer-events-none w-max bg-gray-950 text-white rounded-xl px-3 py-2 text-xs shadow-xl"
                    style={{ maxWidth: width - TOOLTIP_MARGIN * 2 }}
                  >
                    <p className="font-extrabold text-[11px] text-forest-200">
                      {monthLabels[activeMonth]}
                    </p>
                    {volumeSeries ? (
                      <>
                        <p className="font-bold text-sm">
                          {formatQuantity(volumeSeries.values[activeMonth])} {volumeSeries.unitLabel}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {volumeSeries.counts[activeMonth]} demande(s) enregistrée(s)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-sm">{monthlyCounts[activeMonth]} demande(s)</p>
                        {unitSeries
                          .filter((s) => s.counts[activeMonth] > 0)
                          .map((s) => (
                            <p key={s.unitKey} className="text-[11px] text-gray-400">
                              {formatQuantity(s.values[activeMonth])} {s.unitLabel} demandé(s)
                            </p>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Résumé accessible (lecteurs d'écran) */}
          <div id={summaryId} className="sr-only">
            {volumeSeries
              ? `Série ${volumeSeries.unitLabel} : ${monthKeys
                  .map((_, i) => `${monthLabels[i]} ${formatQuantity(volumeSeries.values[i])} ${volumeSeries.unitLabel}`)
                  .join(", ")}.`
              : `Nombre de demandes : ${monthKeys
                  .map((_, i) => `${monthLabels[i]} ${monthlyCounts[i]}`)
                  .join(", ")}.`}
          </div>

          {/* Résumé textuel sous le graphique */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap gap-2">
            <span>
              Total cumulé sur 6 mois :{" "}
              <strong className="text-gray-900 font-bold">
                {volumeSeries
                  ? formatUnitTotals([volumeSeries]) || "0"
                  : `${totalCount} demandes`}
              </strong>
            </span>
            <span className="italic text-[11px] text-gray-400">
              Touchez ou survolez un mois pour voir le détail
            </span>
          </div>
        </div>
      )}
    </DashboardChartCard>
  );
}
