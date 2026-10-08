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
import { DemandItem } from "@/lib/queries/demands";

export interface ProvinceDemandData {
  provinceId: string;
  provinceName: string;
  demandsCount: number;
  totalQuantity: number;
  unit: string;
  percentage: number;
  demands: DemandItem[];
}

export interface CompanyDemandGeoChartProps {
  provincesData: ProvinceDemandData[];
}

/**
 * Palette de couleurs selon le rang (classement des demandes décroissant).
 * La couleur est attachée au RANG, pas à la région.
 */
const RANK_PALETTE = [
  {
    bar: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    label: "1er",
  },
  {
    bar: "bg-amber-400",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    label: "2e",
  },
  {
    bar: "bg-yellow-400",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    label: "3e",
  },
  {
    bar: "bg-rose-400",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    label: "4e",
  },
  {
    bar: "bg-purple-400",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    label: "5e",
  },
  {
    bar: "bg-sky-400",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    label: "6e",
  },
  {
    bar: "bg-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    label: "+",
  },
];

function getRankStyle(index: number) {
  return RANK_PALETTE[Math.min(index, RANK_PALETTE.length - 1)];
}

export default function CompanyDemandGeoChart({
  provincesData,
}: CompanyDemandGeoChartProps) {
  const [selectedProvince, setSelectedProvince] =
    useState<ProvinceDemandData | null>(null);

  const hasData = provincesData.length > 0;
  const totalQuantityAll = provincesData.reduce(
    (acc, curr) => acc + curr.totalQuantity,
    0
  );

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm flex flex-col space-y-5">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-forest-700 shrink-0" />
              Demandes par région
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Volume d&apos;achat exprimé selon les bassins de consommation
            </p>
          </div>
          {hasData && (
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
              {provincesData.length} région{provincesData.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Liste ou état vide */}
        {!hasData ? (
          <EmptyState
            title="Aucune demande localisée"
            description="Les besoins déclarés par les acheteurs apparaîtront ici ventilés par région."
            icon={<MapPin className="w-6 h-6 text-forest-600" />}
            className="py-10"
          />
        ) : (
          <div className="space-y-3 flex-1">
            {provincesData.map((item, index) => {
              const rank = getRankStyle(index);
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
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${rank.bg} ${rank.text} ${rank.border} border shrink-0`}
                      >
                        {rank.label}
                      </span>
                      <span className="font-bold text-sm text-gray-950 truncate group-hover:text-forest-900 transition-colors">
                        {item.provinceName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-gray-950">
                          {item.demandsCount}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          demande{item.demandsCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-forest-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Barre de progression colorée selon le rang */}
                  <div className="w-full bg-gray-200/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${rank.bar} h-full rounded-full transition-all duration-700 ease-out motion-safe:animate-none`}
                      style={{
                        width: `${Math.max(4, Math.min(100, item.percentage))}%`,
                      }}
                    />
                  </div>

                  {/* Volume et % */}
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400">
                    <span>
                      {item.totalQuantity} {item.unit}
                    </span>
                    <span className="font-semibold">{item.percentage}% du total</span>
                  </div>
                </div>
              );
            })}

            {/* Total global */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
              <span>Total marché exprimé</span>
              <span className="font-bold text-gray-900">
                {totalQuantityAll} {provincesData[0]?.unit || "t"}
              </span>
            </div>
          </div>
        )}
      </div>

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
