"use client";

import {
  Tractor,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  Info,
  Clock,
  CheckCircle2,
  Box,
} from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

export interface CompanyOverviewMetricsProps {
  productionsStats: {
    total: number;
    growing: number;
    harvested: number;
    planned: number;
  };
  demandsStats: {
    totalActive: number;
    needingResponse: number;
    totalDemandedQuantity: number;
    unit: string;
  };
  campaignsStats: {
    activeCount: number;
    totalMarketable: number;
    totalReserved: number;
    totalAvailable: number;
    unit: string;
  };
  ordersStats: {
    total: number;
    toProcess: number; // pending, confirmed, preparing, ready
    delivered: number;
    totalRevenue: number;
    currency: string;
  };
}

export default function CompanyOverviewMetrics({
  productionsStats,
  demandsStats,
  campaignsStats,
  ordersStats,
}: CompanyOverviewMetricsProps) {
  // Formatage des montants monétaires réels
  const formattedRevenue = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: ordersStats.currency || "USD",
    maximumFractionDigits: 0,
  }).format(ordersStats.totalRevenue);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-gray-950 tracking-tight">
            Vue d&apos;ensemble de l&apos;Activité
          </h2>
          <Tooltip content="Indicateurs calculés exclusivement depuis vos enregistrements réels Supabase. Aucune donnée simulée.">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
          </Tooltip>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Source de vérité : transactions réelles Supabase
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Productions Agricoles */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-forest-200 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Productions Déclarées
              </span>
              <div className="w-10 h-10 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                <Tractor className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-950 tracking-tight">
                {productionsStats.total}
              </span>
              <span className="text-xs text-gray-500 font-semibold">
                cycle(s)
              </span>
            </div>

            <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  En culture active
                </span>
                <span className="font-bold text-gray-900">
                  {productionsStats.growing}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Récoltées disponibles
                </span>
                <span className="font-bold text-gray-900">
                  {productionsStats.harvested}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-gray-400 italic">
            Distinction : volume déclaré ≠ stock vendu
          </p>
        </div>

        {/* 2. Demandes du Marché */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-forest-200 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Demandes du Marché
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-950 tracking-tight">
                {demandsStats.totalActive}
              </span>
              <span className="text-xs text-gray-500 font-semibold">
                active(s)
              </span>
            </div>

            <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Sans proposition ferme
                </span>
                <span className={`font-bold ${demandsStats.needingResponse > 0 ? "text-amber-600" : "text-gray-900"}`}>
                  {demandsStats.needingResponse}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-gray-400" />
                  Volume exprimé total
                </span>
                <span className="font-bold text-gray-900">
                  {demandsStats.totalDemandedQuantity > 0
                    ? `${demandsStats.totalDemandedQuantity} ${demandsStats.unit}`
                    : "0 tonne"}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-gray-400 italic">
            Intention d&apos;achat ≠ vente réalisée
          </p>
        </div>

        {/* 3. Campagnes de Vente */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-forest-200 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Campagnes Actives
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-950 tracking-tight">
                {campaignsStats.activeCount}
              </span>
              <span className="text-xs text-gray-500 font-semibold">
                en cours
              </span>
            </div>

            <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Stock réservé revendeurs</span>
                <span className="font-bold text-amber-600">
                  {campaignsStats.totalReserved} {campaignsStats.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Stock restant disponible</span>
                <span className="font-bold text-forest-700">
                  {campaignsStats.totalAvailable} {campaignsStats.unit}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-gray-400 italic">
            Réservations atomiques anti-surréservation
          </p>
        </div>

        {/* 4. Commandes Reçues */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-forest-200 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Commandes Reçues
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-950 tracking-tight">
                {ordersStats.total}
              </span>
              <span className="text-xs text-gray-500 font-semibold">
                au total
              </span>
            </div>

            <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-500" />
                  À traiter / En cours
                </span>
                <span className="font-bold text-gray-900">
                  {ordersStats.toProcess}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Livrées & confirmées
                </span>
                <span className="font-bold text-emerald-700">
                  {ordersStats.delivered}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-gray-100/60 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Engagements réels :</span>
            <span className="font-extrabold text-gray-950">{formattedRevenue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
