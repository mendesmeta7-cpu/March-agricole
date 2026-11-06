"use client";

import Link from "next/link";
import { nonZeroCurrencies, type CurrencyTotals } from "@/lib/utils/currencyTotals";
import {
  AlertCircle,
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
    /** Erreur de chargement : aucun chiffre n'est affiché (anti faux zéro). */
    error?: string | null;
  };
  demandsStats: {
    totalActive: number;
    needingResponse: number;
    /** Volumes exprimés, ventilés par unité (jamais additionnés entre unités). */
    demandedByUnit: Record<string, number>;
  };
  campaignsStats: {
    activeCount: number;
    totalCount: number;
    /** Volumes réservés (réservations actives), ventilés par unité. */
    reservedByUnit: Record<string, number>;
    /** Volumes encore disponibles, ventilés par unité. */
    availableByUnit: Record<string, number>;
    error?: string | null;
  };
  ordersStats: {
    total: number;
    toProcess: number;
    delivered: number;
    /** Engagement hors commandes annulées, ventilé par devise (CDF et USD jamais additionnés). */
    revenueByCurrency: CurrencyTotals;
    error?: string | null;
  };
}

function formatUnitTotals(totals: Record<string, number>): string | null {
  const entries = Object.entries(totals).filter(([, qty]) => qty !== 0);
  if (entries.length === 0) return null;
  return entries
    .map(([unit, qty]) => `${qty.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unit}`)
    .join(" · ");
}

function formatCurrencyTotals(totals: CurrencyTotals): string | null {
  const currencies = nonZeroCurrencies(totals);
  if (currencies.length === 0) return null;
  return currencies
    .map((currency) =>
      currency === "CDF"
        ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(totals.CDF)} CDF`
        : `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totals.USD)} USD`
    )
    .join(" · ");
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
  /** Message d'erreur : remplace les chiffres pour ne jamais afficher de faux zéro. */
  error?: string | null;
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
  error,
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

          {error ? (
            <div
              role="alert"
              className="mb-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Données temporairement indisponibles ({error}). Aucun chiffre approximatif
                n&apos;est affiché. Veuillez rafraîchir la page.
              </span>
            </div>
          ) : (
          <>
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
          </>
          )}
        </div>

        {footer && !error && (
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
  const formattedRevenue = formatCurrencyTotals(ordersStats.revenueByCurrency);
  const formattedDemanded = formatUnitTotals(demandsStats.demandedByUnit);
  const formattedReserved = formatUnitTotals(campaignsStats.reservedByUnit);
  const formattedAvailable = formatUnitTotals(campaignsStats.availableByUnit);

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
          error={productionsStats.error}
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
              value: formattedDemanded ?? "Aucun volume",
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
              value: formattedReserved ?? "Aucune réservation",
              highlight: formattedReserved !== null,
            },
            {
              label: "Encore disponible",
              value:
                formattedAvailable ??
                (campaignsStats.activeCount > 0 ? "Complet" : "Aucune campagne active"),
              highlight: false,
            },
          ]}
          footer={`${campaignsStats.totalCount} campagne(s) au total`}
          error={campaignsStats.error}
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
          footer={`Engagement total : ${formattedRevenue ?? "aucun engagement en cours"}`}
          error={ordersStats.error}
        />
      </div>
    </div>
  );
}
