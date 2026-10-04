"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  TrendingUp,
  ChevronRight,
  Info,
  Calendar,
  Package,
  ArrowRight,
  Clock,
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

export default function CompanyDemandGeoChart({
  provincesData,
}: CompanyDemandGeoChartProps) {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceDemandData | null>(null);

  const hasData = provincesData.length > 0;
  const totalQuantityAll = provincesData.reduce((acc, curr) => acc + curr.totalQuantity, 0);

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-5">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-forest-700" />
                Répartition Géographique de la Demande
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-900 border border-forest-200">
                Par Province
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Volumes d&apos;achat exprimés par les revendeurs selon les bassins de consommation.
            </p>
          </div>

          <span className="text-xs font-semibold text-forest-800 bg-forest-50 px-3 py-1.5 rounded-xl border border-forest-100/80 self-start sm:self-auto">
            {provincesData.length} province(s) active(s)
          </span>
        </div>

        {/* Liste ou État vide */}
        {!hasData ? (
          <EmptyState
            title="Aucune demande localisée"
            description="Les besoins déclarés par les acheteurs et distributeurs apparaîtront ventilés par province dès leur enregistrement."
            icon={<MapPin className="w-6 h-6 text-forest-600" />}
            className="py-10 bg-forest-50/20"
          />
        ) : (
          <div className="space-y-3.5">
            {provincesData.map((item) => (
              <div
                key={item.provinceId}
                onClick={() => setSelectedProvince(item)}
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-forest-50/40 hover:border-forest-200/80 transition-all cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedProvince(item);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-gray-950 group-hover:text-forest-900 transition-colors truncate">
                      {item.provinceName}
                    </span>
                    <Badge variant="forest" size="sm">
                      {item.demandsCount} demande(s)
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-right shrink-0">
                    <span className="text-sm font-extrabold text-gray-950">
                      {item.totalQuantity} {item.unit}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      ({item.percentage}%)
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-forest-700 group-hover:translate-x-0.5 transition-all ml-1" />
                  </div>
                </div>

                {/* Jauge horizontale de proportion */}
                <div className="w-full bg-gray-200/70 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-forest-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(4, Math.min(100, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
              <span className="italic">
                Cliquez sur une province pour inspecter la liste détaillée des demandes.
              </span>
              <span className="font-bold text-gray-900">
                Total marché : {totalQuantityAll} {provincesData[0]?.unit || "tonnes"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tiroir d'approfondissement (Drawer R1) sur la province cliquée */}
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
        description={`Consultez les ${selectedProvince?.demandsCount || 0} demande(s) réelles enregistrées pour cette province.`}
      >
        <div className="space-y-4 py-2">
          {selectedProvince?.demands && selectedProvince.demands.length > 0 ? (
            selectedProvince.demands.map((demand) => (
              <div
                key={demand.id}
                className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3"
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
                        {demand.product?.category || "Catégorie"}
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

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Volume requis</span>
                    <span className="font-extrabold text-gray-900">
                      {demand.quantity} {demand.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Date d&apos;émission</span>
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
                  <p className="text-xs text-gray-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                    &laquo; {demand.notes} &raquo;
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <Link
                    href={`/dashboard/company/demands/${demand.id}`}
                    onClick={() => setSelectedProvince(null)}
                  >
                    <Button variant="outline" size="sm" className="text-xs">
                      <span>Examiner & Proposer</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-8">
              Aucun détail supplémentaire pour cette province.
            </p>
          )}
        </div>
      </Drawer>
    </>
  );
}
