"use client";

import { useState } from "react";
import {
  CompanyCampaignItem,
} from "@/lib/queries/campaigns";
import {
  getEffectiveCampaignStatus,
  getCampaignDestinationsSummary,
} from "@/lib/utils/campaignStatus";

import CampaignStatusBadge from "./CampaignStatusBadge";
import {
  Calendar,
  MapPin,
  Tag,
  Tractor,
  Layers,
  Edit,
  Eye,
  AlertCircle,
  CheckCircle2,
  Building,
} from "lucide-react";

interface CompanyCampaignCardProps {
  campaign: CompanyCampaignItem;
  onEdit: (campaign: CompanyCampaignItem) => void;
  onViewDetail: (campaign: CompanyCampaignItem) => void;
}

export default function CompanyCampaignCard({
  campaign,
  onEdit,
  onViewDetail,
}: CompanyCampaignCardProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const effectiveStatus = getEffectiveCampaignStatus(campaign);
  const isEffectivelyCompleted = effectiveStatus === "completed" && campaign.status === "active";
  const destSummary = getCampaignDestinationsSummary(campaign.destinations);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const stockPercent =
    campaign.marketable_quantity > 0
      ? Math.round((campaign.reserved_quantity / campaign.marketable_quantity) * 100)
      : 0;

  const borderClass =
    effectiveStatus === "active"
      ? "border-emerald-200/60"
      : effectiveStatus === "completed"
      ? "border-blue-200/60"
      : effectiveStatus === "paused"
      ? "border-amber-200/60"
      : effectiveStatus === "cancelled"
      ? "border-rose-200/60"
      : "border-gray-200/80";

  return (
    <div
      className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${borderClass}`}
    >
      {/* Bande supérieure colorée selon statut effectif */}
      <div
        className={`h-1 w-full ${
          effectiveStatus === "active"
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
            : effectiveStatus === "completed"
            ? "bg-gradient-to-r from-blue-400 to-blue-500"
            : effectiveStatus === "paused"
            ? "bg-gradient-to-r from-amber-400 to-amber-500"
            : effectiveStatus === "cancelled"
            ? "bg-gradient-to-r from-rose-400 to-rose-500"
            : "bg-gradient-to-r from-gray-300 to-gray-400"
        }`}
      />

      <div className="flex flex-col flex-1 p-4 sm:p-5 space-y-4">
        {/* 1. En-tête : Catégorie, produit, titre & statut */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-forest-50 text-forest-800 text-[11px] font-semibold border border-forest-200/60 uppercase tracking-wide">
                {campaign.product.category}
              </span>
              <span className="text-xs text-gray-500">{campaign.product.name}</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
              {campaign.title}
            </h3>
          </div>
          <CampaignStatusBadge status={effectiveStatus} size="sm" />
        </div>

        {/* 2. Prix & Volume */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-medium">Prix unitaire</span>
            <span className="text-sm font-extrabold text-forest-900 flex items-center gap-1 mt-0.5">
              <Tag className="w-3.5 h-3.5 text-forest-600" />
              {campaign.unit_price.toLocaleString("fr-FR")}
              <span className="text-[10px] font-normal text-gray-500">
                {campaign.currency}/{campaign.unit}
              </span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-medium">Volume total</span>
            <span className="text-sm font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
              <Layers className="w-3.5 h-3.5 text-earth-600" />
              {campaign.marketable_quantity.toLocaleString("fr-FR")}
              <span className="text-[10px] font-normal text-gray-500">{campaign.unit}</span>
            </span>
          </div>
        </div>

        {/* 3. Barre de réservation */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-500">
              Réservé :{" "}
              <strong className="text-amber-700">
                {campaign.reserved_quantity.toLocaleString("fr-FR")} {campaign.unit}
              </strong>
            </span>
            <span className="text-gray-400">{stockPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(stockPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* 4. Production adossée */}
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-forest-50/30 p-2 rounded-lg border border-forest-100/60">
          <Tractor className="w-3.5 h-3.5 text-forest-700 shrink-0" />
          <span className="truncate">
            <span className="font-semibold text-gray-800">{campaign.production.title}</span>
          </span>
        </div>

        {/* 5. Destinations avec état */}
        {campaign.destinations && campaign.destinations.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1">
              <Building className="w-3 h-3" />
              Villes d&apos;arrivée ({campaign.destinations.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {campaign.destinations.slice(0, 3).map((dest) => {
                const isExpired =
                  !!dest.order_deadline_date && dest.order_deadline_date < todayStr;
                return (
                  <span
                    key={dest.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                      isExpired
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {isExpired ? (
                      <AlertCircle className="w-2.5 h-2.5" />
                    ) : (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    )}
                    {dest.city_name}
                  </span>
                );
              })}
              {campaign.destinations.length > 3 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] text-gray-400 border border-gray-200 bg-white">
                  +{campaign.destinations.length - 3}
                </span>
              )}
            </div>

            {/* Compteur active/expirée */}
            {destSummary.total > 0 && (
              <div className="flex items-center gap-2 text-[10px]">
                {destSummary.active > 0 && (
                  <span className="text-emerald-600">
                    {destSummary.active} active{destSummary.active > 1 ? "s" : ""}
                  </span>
                )}
                {destSummary.expired > 0 && (
                  <span className="text-rose-600">
                    {destSummary.expired} terminée{destSummary.expired > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : campaign.delivery_zones.length > 0 ? (
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3" />
              Provinces desservies
            </span>
            <div className="flex flex-wrap gap-1">
              {campaign.delivery_zones.slice(0, 3).map((zone) => (
                <span
                  key={zone.id}
                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[11px] font-medium"
                >
                  {zone.provinces?.name || "Province"}
                </span>
              ))}
              {campaign.delivery_zones.length > 3 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] text-gray-400 border border-gray-200">
                  +{campaign.delivery_zones.length - 3}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* 6. Dates */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>
            Du {formatDate(campaign.start_date)}
            {campaign.end_date ? ` → ${formatDate(campaign.end_date)}` : " (illimitée)"}
          </span>
        </div>

        {/* 7. Alerte expiration automatique */}
        {isEffectivelyCompleted && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Toutes les destinations ont expiré — campagne automatiquement terminée.
            </span>
          </div>
        )}
      </div>

      {/* 8. Footer : Actions */}
      <div className="p-3 sm:p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onViewDetail(campaign)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          Voir le détail
        </button>

        <button
          onClick={() => onEdit(campaign)}
          disabled={effectiveStatus === "completed" || effectiveStatus === "cancelled"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shadow-xs disabled:opacity-40"
        >
          <Edit className="w-3.5 h-3.5 text-gray-500" />
          Modifier
        </button>
      </div>
    </div>
  );
}
