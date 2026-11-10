"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ChevronRight,
  Package,
  ArrowRight,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import DashboardChartCard, { ChartUnitSelect } from "./DashboardChartCard";
import { DemandItem } from "@/lib/queries/demands";
import {
  formatQuantity,
  rankProvincesByUnit,
  resolveSelectedUnit,
  type ProvinceUnitShare,
  type UnitTotal,
} from "@/lib/utils/unitSeries";

/**
 * Données d'une province, ventilées par unité (BR-FIN-04) : aucune addition entre
 * unités différentes, aucune conversion ; chaque pourcentage est calculé à
 * l'intérieur de son unité.
 */
export interface ProvinceDemandData {
  provinceId: string;
  provinceName: string;
  demandsCount: number;
  quantitiesByUnit: ProvinceUnitShare[];
  demands: DemandItem[];
}

export interface CompanyDemandGeoChartProps {
  provincesData: ProvinceDemandData[];
  /** Totaux du marché par unité (une ligne par unité, jamais additionnées). */
  unitTotals: UnitTotal[];
  /** La lecture a échoué : à distinguer d'une absence réelle de demande. */
  unavailable?: boolean;
}

/** Une seule teinte, plus claire à chaque rang : la couleur ne désigne que le rang. */
const RANK_BARS = [
  "bg-forest-900",
  "bg-forest-800",
  "bg-forest-700",
  "bg-forest-600",
  "bg-forest-500",
];

const COLLAPSED_REGIONS = 5;
const TITLE = "Demandes par région";

function getRankBar(index: number): string {
  return RANK_BARS[Math.min(index, RANK_BARS.length - 1)];
}

function getRankLabel(index: number): string {
  return index === 0 ? "1er" : `${index + 1}e`;
}

export default function CompanyDemandGeoChart({
  provincesData,
  unitTotals,
  unavailable = false,
}: CompanyDemandGeoChartProps) {
  const [selectedProvince, setSelectedProvince] =
    useState<ProvinceDemandData | null>(null);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const isMultiUnit = unitTotals.length > 1;
  const selectedUnit = resolveSelectedUnit(unitTotals, selectedUnitKey);
  const ranking = selectedUnit
    ? rankProvincesByUnit(provincesData, selectedUnit.unitKey)
    : [];
  const hasData = ranking.length > 0;
  const visibleRanking = showAll ? ranking : ranking.slice(0, COLLAPSED_REGIONS);

  if (unavailable) {
    return (
      <DashboardChartCard icon={MapPin} title={TITLE}>
        <DataUnavailableNotice title="Graphique temporairement indisponible">
          Les demandes n&apos;ont pas pu être chargées. Cela ne signifie pas qu&apos;il n&apos;y en a aucune.
        </DataUnavailableNotice>
      </DashboardChartCard>
    );
  }

  return (
    <>
      <DashboardChartCard
        icon={MapPin}
        title={TITLE}
        description={
          <>
            Volume d&apos;achat exprimé selon les bassins de consommation
            {isMultiUnit && " — classement et part dans l'unité choisie, sans conversion"}
          </>
        }
        aside={
          hasData ? (
            <span className="block text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              {ranking.length} région{ranking.length > 1 ? "s" : ""}
            </span>
          ) : undefined
        }
        filters={
          isMultiUnit && selectedUnit ? (
            <ChartUnitSelect
              units={unitTotals}
              value={selectedUnit.unitKey}
              onChange={setSelectedUnitKey}
            />
          ) : undefined
        }
      >
        {/* Liste ou état vide */}
        {!hasData || !selectedUnit ? (
          <EmptyState
            title="Aucune demande localisée"
            description="Les besoins déclarés par les acheteurs apparaîtront ici ventilés par région."
            icon={<MapPin className="w-6 h-6 text-forest-600" />}
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {visibleRanking.map(({ province: item, share }, index) => {
              return (
                <div
                  key={item.provinceId}
                  onClick={() => setSelectedProvince(item)}
                  className="group cursor-pointer p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-all duration-150"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setSelectedProvince(item);
                  }}
                >
                  {/* Ligne supérieure */}
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Indicateur de rang */}
                      <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-forest-50 text-forest-900 border-forest-200 border shrink-0">
                        {getRankLabel(index)}
                      </span>
                      <span className="font-bold text-sm text-gray-950 truncate group-hover:text-forest-900 transition-colors">
                        {item.provinceName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-gray-950">
                          {share.demandsCount}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          demande{share.demandsCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-forest-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Part de la province dans le total de l'unité affichée */}
                  <div>
                    <div
                      className="w-full bg-gray-200/60 h-1.5 rounded-full overflow-hidden"
                      role="img"
                      aria-label={`${item.provinceName} : ${formatQuantity(share.quantity)} ${share.unitLabel}, soit ${share.percentage} % du total exprimé en ${share.unitLabel}`}
                    >
                      <div
                        className={`${getRankBar(index)} h-full rounded-full transition-all duration-700 ease-out motion-safe:animate-none`}
                        style={{
                          width: `${Math.max(4, Math.min(100, share.percentage))}%`,
                        }}
                      />
                    </div>

                    {/* Volume et % (dans l'unité) */}
                    <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] text-gray-400">
                      <span className="min-w-0 break-words">
                        {formatQuantity(share.quantity)} {share.unitLabel}
                      </span>
                      <span className="font-semibold shrink-0">{share.percentage}% du total</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Liste complète, dépliée dans la carte */}
            {ranking.length > COLLAPSED_REGIONS && (
              <Button
                variant="outline"
                size="sm"
                fullWidth
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? "Réduire" : `Voir tout (${ranking.length})`}
              </Button>
            )}

            {/* Total du marché dans l'unité affichée : jamais d'addition entre unités */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
              <span className="shrink-0">Total marché exprimé</span>
              <span className="min-w-0 break-words font-bold text-gray-900 text-right">
                {formatQuantity(selectedUnit.total)} {selectedUnit.unitLabel}
              </span>
            </div>
          </div>
        )}
      </DashboardChartCard>

      {/* Tiroir de détail par province (Drawer R1) */}
      <Drawer
        isOpen={selectedProvince !== null}
        onClose={() => setSelectedProvince(null)}
        side="right"
        size="md"
        title={
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-forest-700" />
            <span>Demandes — {selectedProvince?.provinceName}</span>
          </div>
        }
        description={`${selectedProvince?.demandsCount || 0} demande(s) enregistrée(s) dans cette région.`}
      >
        <div className="space-y-3 py-2">
          {selectedProvince?.demands && selectedProvince.demands.length > 0 ? (
            selectedProvince.demands.map((demand) => (
              <div
                key={demand.id}
                className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-950">
                        {demand.product?.name || "Produit"}
                      </h4>
                      <span className="text-[11px] text-gray-500">
                        {demand.product?.category || ""}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={demand.status === "active" ? "forest" : "neutral"}
                    size="sm"
                  >
                    {demand.status === "active" ? "Active" : demand.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wider mb-0.5">Volume</span>
                    <span className="font-extrabold text-gray-900">
                      {demand.quantity} {demand.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wider mb-0.5">Date</span>
                    <span className="font-semibold text-gray-700">
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(demand.created_at))}
                    </span>
                  </div>
                </div>

                {demand.notes && (
                  <p className="text-xs text-gray-600 italic bg-amber-50 p-2 rounded-lg border border-amber-100">
                    &laquo; {demand.notes} &raquo;
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <Link
                    href={`/dashboard/company/demands/${demand.id}`}
                    onClick={() => setSelectedProvince(null)}
                  >
                    <Button variant="outline" size="sm" className="text-xs">
                      Répondre
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-8">
              Aucun détail disponible pour cette région.
            </p>
          )}
        </div>
      </Drawer>
    </>
  );
}
