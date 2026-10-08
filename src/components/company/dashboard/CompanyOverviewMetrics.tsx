"use client";

import Link from "next/link";
import {
  Tractor,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Sprout,
  Package,
} from "lucide-react";

export interface CompanyOverviewMetricsProps {
  productionsStats: {
    total: number;
    growing: number;
    harvested: number;
    planned: number;
    draft: number;
  };
  demandsStats: {
    totalActive: number;
    needingResponse: number;
    totalDemandedQuantity: number;
    unit: string;
  };
  campaignsStats: {
    activeCount: number;
    totalCount: number;
    totalMarketable: number;
    totalReserved: number;
    totalAvailable: number;
    unit: string;
  };
  ordersStats: {
    total: number;
    toProcess: number;
    delivered: number;
    totalRevenue: number;
    currency: string;
  };
}

interface KpiCardProps {
  title: string;
  value: number | string;
  valueLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  href: string;
  details: { label: string; value: string | number; highlight?: boolean }[];
  footer?: string;
}

function KpiCard({
  title,
  value,
  valueLabel,
  icon,
  iconBg,
  accentColor,
  href,
  details,
  footer,
}: KpiCardProps) {
  return (
    <Link href={href} className="group block">
      <div
        className={`relative bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden h-full flex flex-col justify-between`}
      >
        {/* Accent coloré en haut */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentColor} rounded-t-2xl`} />

        <div>
          {/* En-tête carte */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight pt-0.5">
              {title}
            </span>
            <div
              className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
            >
              {icon}
            </div>
          </div>

          {/* Valeur principale */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
              {value}
            </span>
            {valueLabel && (
              <span className="text-sm text-gray-400 font-medium">
                {valueLabel}
              </span>
            )}
          </div>

          {/* Détails secondaires */}
          {details.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-100">
              {details.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{d.label}</span>
                  <span
                    className={`font-bold ${d.highlight ? "text-amber-600" : "text-gray-900"}`}
                  >
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {footer && (
          <p className="mt-4 text-[11px] text-gray-400 border-t border-gray-50 pt-3">
            {footer}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function CompanyOverviewMetrics({
  productionsStats,
  demandsStats,
  campaignsStats,
  ordersStats,
}: CompanyOverviewMetricsProps) {
  const formattedRevenue = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: ordersStats.currency || "USD",
    maximumFractionDigits: 0,
  }).format(ordersStats.totalRevenue);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          Vue d&apos;ensemble
        </h2>
        <span className="text-xs text-gray-400 font-medium">
          Mis à jour en temps réel
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Productions */}
        <KpiCard
          title="Productions"
          value={productionsStats.total}
          valueLabel="cycle(s)"
          icon={<Tractor className="w-5 h-5 stroke-[2]" />}
          iconBg="bg-forest-100 text-forest-800"
          accentColor="bg-forest-500"
          href="/dashboard/company/productions"
          details={[
            {
              label: "En culture",
              value: productionsStats.growing,
              highlight: false,
            },
            {
              label: "Récoltées",
              value: productionsStats.harvested,
              highlight: false,
            },
          ]}
          footer="Volume déclaré — hors réservations"
        />

        {/* 2. Demandes du marché */}
        <KpiCard
          title="Demandes reçues"
          value={demandsStats.totalActive}
          valueLabel="active(s)"
          icon={<TrendingUp className="w-5 h-5 stroke-[2]" />}
          iconBg="bg-blue-100 text-blue-800"
          accentColor="bg-blue-500"
          href="/dashboard/company/demands"
          details={[
            {
              label: "Sans proposition",
              value: demandsStats.needingResponse,
              highlight: demandsStats.needingResponse > 0,
            },
            {
              label: "Volume exprimé",
              value:
                demandsStats.totalDemandedQuantity > 0
                  ? `${demandsStats.totalDemandedQuantity} ${demandsStats.unit}`
                  : "0 t",
              highlight: false,
            },
          ]}
          footer="Intentions d'achat des revendeurs"
        />

        {/* 3. Campagnes */}
        <KpiCard
          title="Campagnes actives"
          value={campaignsStats.activeCount}
          valueLabel="en cours"
          icon={<Megaphone className="w-5 h-5 stroke-[2]" />}
          iconBg="bg-amber-100 text-amber-800"
          accentColor="bg-amber-500"
          href="/dashboard/company/campaigns"
          details={[
            {
              label: "Réservé par acheteurs",
              value: `${campaignsStats.totalReserved} ${campaignsStats.unit}`,
              highlight: campaignsStats.totalReserved > 0,
            },
            {
              label: "Encore disponible",
              value:
                campaignsStats.totalAvailable > 0
                  ? `${campaignsStats.totalAvailable} ${campaignsStats.unit}`
                  : "Complet",
              highlight: false,
            },
          ]}
          footer={`${campaignsStats.totalCount} campagne(s) au total`}
        />

        {/* 4. Commandes */}
        <KpiCard
          title="Commandes reçues"
          value={ordersStats.total}
          valueLabel="au total"
          icon={<ShoppingBag className="w-5 h-5 stroke-[2]" />}
          iconBg="bg-purple-100 text-purple-800"
          accentColor="bg-purple-500"
          href="/dashboard/company/orders"
          details={[
            {
              label: "À traiter",
              value: ordersStats.toProcess,
              highlight: ordersStats.toProcess > 0,
            },
            {
              label: "Livrées",
              value: ordersStats.delivered,
              highlight: false,
            },
          ]}
          footer={`Engagement total : ${formattedRevenue}`}
        />
      </div>
    </div>
  );
}
