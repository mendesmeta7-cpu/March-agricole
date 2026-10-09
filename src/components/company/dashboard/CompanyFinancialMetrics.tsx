"use client";

import { useState, useMemo } from "react";
import { OrderFinancialRecord } from "@/lib/queries/orders";
import {
  calculateCompanyFinancialMetrics,
  TimeFilterType,
} from "@/lib/utils/realizedSales";
import {
  Calendar,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Clock,
  Filter,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface CompanyFinancialMetricsProps {
  /** Données légères (uniquement les champs financiers) issues de getCompanyOrdersForFinancials */
  orders?: OrderFinancialRecord[];
  /** Message d'erreur éventuel lors de la récupération paginée (Prompt 4.2) */
  error?: string | null;
}

export default function CompanyFinancialMetrics({
  orders = [],
  error = null,
}: CompanyFinancialMetricsProps) {
  const [selectedFilter, setSelectedFilter] = useState<TimeFilterType>("this_month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(false);

  // Calcul instantané des métriques financières réelles
  const metrics = useMemo(() => {
    return calculateCompanyFinancialMetrics(
      orders || [],
      selectedFilter,
      customStart || undefined,
      customEnd || undefined
    );
  }, [orders, selectedFilter, customStart, customEnd]);

  const handleFilterSelect = (filter: TimeFilterType) => {
    setSelectedFilter(filter);
    if (filter === "custom") {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === "CDF") {
      return (
        new Intl.NumberFormat("fr-FR", {
          maximumFractionDigits: 0,
        }).format(amount) + " CDF"
      );
    }
    return (
      new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + " USD"
    );
  };

  const filterOptions: { id: TimeFilterType; label: string }[] = [
    { id: "today", label: "Aujourd'hui" },
    { id: "this_week", label: "Cette semaine" },
    { id: "this_month", label: "Ce mois" },
    { id: "all", label: "Historique complet" },
    { id: "custom", label: "Personnalisé" },
  ];

  const orderCdf = metrics.orderValue.byCurrency["CDF"]?.amount || 0;
  const orderUsd = metrics.orderValue.byCurrency["USD"]?.amount || 0;
  const orderCount = metrics.orderValue.totalOrdersCount;

  const deliveredCdf = metrics.deliveredSales.byCurrency["CDF"]?.amount || 0;
  const deliveredUsd = metrics.deliveredSales.byCurrency["USD"]?.amount || 0;
  const deliveredCount = metrics.deliveredSales.totalOrdersCount;

  return (
    <div className="space-y-4">
      {/* ─── Barre de Contrôle Temporelle & Titre ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-950 tracking-tight font-display">
                Statistiques Financières & Commandes
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200/60">
                <ShieldCheck className="w-3 h-3 text-forest-700" />
                Données Réelles
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Période : {metrics.period.label}</span>
            </p>
          </div>

          {/* Boutons Pills de Période */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {filterOptions.map((opt) => {
              const isActive = selectedFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleFilterSelect(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? "bg-forest-900 text-white shadow-xs font-bold"
                      : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs de Date Personnalisée (si actif) */}
        {showCustomInputs && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs bg-gray-50/60 p-3 rounded-2xl animate-in fade-in duration-150">
            <span className="font-bold text-gray-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-forest-700" />
              Définir la plage de dates :
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="custom-start-date" className="text-gray-500">Du</label>
              <input
                id="custom-start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-forest-600 text-gray-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="custom-end-date" className="text-gray-500">Au</label>
              <input
                id="custom-end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-forest-600 text-gray-800"
              />
            </div>
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStart("");
                  setCustomEnd("");
                }}
                className="text-[11px] text-gray-500 hover:text-rose-600 underline"
              >
                Réinitialiser les dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Affichage en cas d'erreur ou Grille de Cartes Financières ── */}
      {error ? (
        <div className="bg-amber-50 border border-amber-200/90 rounded-3xl p-5 sm:p-6 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <h3 className="font-bold text-amber-950">
              Statistiques financières temporairement indisponibles
            </h3>
            <p className="text-amber-800 text-xs sm:text-sm">
              Une anomalie s'est produite lors de la synchronisation de l'historique complet des commandes ({error}). Afin de garantir la rigueur de vos comptes, aucun total approximatif n'est affiché. Veuillez rafraîchir la page.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CARTE 1 — VALEUR DES COMMANDES */}
          <div className="relative bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-forest-600 to-forest-800" />

          <div>
            {/* En-tête de carte */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Engagements Enregistrés
                </span>
                <h3 className="text-base sm:text-lg font-black text-gray-950 mt-0.5">
                  Valeur des Commandes
                </h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-forest-50 text-forest-800 flex items-center justify-center shrink-0 border border-forest-100">
                <Receipt className="w-5 h-5 text-forest-700" />
              </div>
            </div>

            {/* Total Commandes */}
            <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-gray-100">
              <span className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                {orderCount.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                commande{orderCount > 1 ? "s" : ""} passée{orderCount > 1 ? "s" : ""}
              </span>
            </div>

            {/* Séparation stricte des devises */}
            <div className="space-y-2.5">
              {/* Ligne CDF */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-forest-50/50 border border-forest-100/60">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-forest-900 text-white font-mono text-[10px] font-bold">
                    CDF
                  </span>
                  <span className="text-xs font-semibold text-gray-700">Total Franc Congolais</span>
                </div>
                <span className="text-sm sm:text-base font-black text-forest-950 font-mono">
                  {formatAmount(orderCdf, "CDF")}
                </span>
              </div>

              {/* Ligne USD */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-white font-mono text-[10px] font-bold">
                    USD
                  </span>
                  <span className="text-xs font-semibold text-gray-700">Total Dollar US</span>
                </div>
                <span className="text-sm sm:text-base font-black text-gray-900 font-mono">
                  {formatAmount(orderUsd, "USD")}
                </span>
              </div>
            </div>
          </div>

          {/* Pied de carte explicatif */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span>
              Comptabilisé selon la <strong>date de passation</strong> de chaque commande sur la période (exclut les commandes annulées).
            </span>
          </div>
        </div>

        {/* CARTE 2 — VENTES LIVRÉES (CONFIRMATIONS OFFICIELLES) */}
        <div className="relative bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-700" />

          <div>
            {/* En-tête de carte */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Confirmations Officielles
                </span>
                <h3 className="text-base sm:text-lg font-black text-gray-950 mt-0.5">
                  Ventes Livrées
                </h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            {/* Total Livrées */}
            <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-gray-100">
              <span className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                {deliveredCount.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                commande{deliveredCount > 1 ? "s" : ""} réceptionnée{deliveredCount > 1 ? "s" : ""}
              </span>
            </div>

            {/* Séparation stricte des devises */}
            <div className="space-y-2.5">
              {/* Ligne CDF */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-white font-mono text-[10px] font-bold">
                    CDF
                  </span>
                  <span className="text-xs font-semibold text-gray-700">Livrées Franc Congolais</span>
                </div>
                <span className="text-sm sm:text-base font-black text-emerald-950 font-mono">
                  {formatAmount(deliveredCdf, "CDF")}
                </span>
              </div>

              {/* Ligne USD */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-white font-mono text-[10px] font-bold">
                    USD
                  </span>
                  <span className="text-xs font-semibold text-gray-700">Livrées Dollar US</span>
                </div>
                <span className="text-sm sm:text-base font-black text-gray-900 font-mono">
                  {formatAmount(deliveredUsd, "USD")}
                </span>
              </div>
            </div>
          </div>

          {/* Pied de carte protecteur */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Comptabilisé selon la <strong>date de livraison confirmée</strong>. Exclut commandes en attente, confirmées, prêtes ou annulées. Aucun encaissement en ligne.
            </span>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
