"use client";

import { DemandItem } from "@/lib/queries/demands";
import DemandStatusBadge from "./DemandStatusBadge";
import {
  Calendar,
  MapPin,
  Scale,
  Edit3,
  XCircle,
  Building2,
  Package,
  MessageSquare,
  Sprout,
  Globe,
  Eye,
  FileText,
} from "lucide-react";
import Image from "next/image";

interface ResellerDemandCardProps {
  demand: DemandItem;
  onEdit: (demand: DemandItem) => void;
  onCancel: (demandId: string) => void;
  onViewResponses?: (demand: DemandItem) => void;
  onViewDetail?: (demand: DemandItem) => void;
  isCancelling?: boolean;
}

export default function ResellerDemandCard({
  demand,
  onEdit,
  onCancel,
  onViewResponses,
  onViewDetail,
  isCancelling = false,
}: ResellerDemandCardProps) {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const hasPeriod = demand.target_period_start || demand.target_period_end;
  const isProductionDemand = demand.demand_type === "production";
  const responsesCount = demand.responses?.length || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-earth-300">
      <div className="p-4 sm:p-5 space-y-4">
        {/* Header : Denrée, Catégorie, Type & Statut */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-earth-50 border border-earth-200/70 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200">
              {demand.product.image_url ? (
                <Image
                  src={demand.product.image_url}
                  alt={demand.product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Package className="w-6 h-6 text-earth-700" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-earth-800 bg-earth-100/80 px-2 py-0.5 rounded-md inline-block">
                  {demand.product.category}
                </span>
                {isProductionDemand ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Sprout className="w-2.5 h-2.5" /> Sur production
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> Demande générale
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-950 truncate tracking-tight">
                {demand.product.name}
              </h3>
            </div>
          </div>

          <div className="shrink-0">
            <DemandStatusBadge status={demand.status} size="sm" />
          </div>
        </div>

        {/* Bloc Volume & Badge Propositions */}
        <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-earth-100/90 text-earth-800 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-earth-700 uppercase tracking-wider">Volume recherché</p>
              <p className="text-base sm:text-lg font-extrabold text-earth-950 truncate">
                {demand.quantity.toLocaleString("fr-FR")}{" "}
                <span className="text-xs font-semibold text-earth-800">{demand.unit}</span>
              </p>
            </div>
          </div>

          {/* Badge / Action Propositions Reçues */}
          {responsesCount > 0 ? (
            <button
              type="button"
              onClick={() => onViewResponses?.(demand)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{responsesCount} offre{responsesCount > 1 ? "s" : ""}</span>
            </button>
          ) : (
            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg shrink-0">
              En attente
            </span>
          )}
        </div>

        {/* Informations Territoire, Période & Spécificités */}
        <div className="space-y-2 text-xs text-gray-600 pt-0.5">
          <div className="flex items-center gap-2 text-gray-800 font-medium">
            <MapPin className="w-3.5 h-3.5 text-earth-700 shrink-0" />
            <span className="truncate">
              {demand.province.name}
              {demand.city && `, ${demand.city}`} <span className="text-gray-500 font-normal">({demand.country.code})</span>
            </span>
          </div>

          {hasPeriod && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">
                {demand.target_period_start && `Du ${formatDate(demand.target_period_start)}`}
                {demand.target_period_end && ` au ${formatDate(demand.target_period_end)}`}
              </span>
            </div>
          )}

          {demand.production && (
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <Sprout className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">Prod : {demand.production.title}</span>
            </div>
          )}

          {demand.target_company && (
            <div className="flex items-center gap-2 text-forest-700">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-forest-600" />
              <span className="truncate">Cible : {demand.target_company.name}</span>
            </div>
          )}

          {demand.notes && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-600 italic line-clamp-2">
              <FileText className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
              <span className="truncate">« {demand.notes} »</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 sm:px-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-gray-400 font-medium truncate">
          {formatDate(demand.created_at)}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bouton Détails */}
          <button
            type="button"
            onClick={() => onViewDetail?.(demand)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-earth-900 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
            title="Consulter les détails"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Détails</span>
          </button>

          {/* Bouton Offres (si des propositions existent) */}
          {responsesCount > 0 && (
            <button
              type="button"
              onClick={() => onViewResponses?.(demand)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Offres ({responsesCount})</span>
            </button>
          )}

          {/* Bouton Modifier (si active et générale) */}
          {demand.status === "active" && !isProductionDemand && (
            <button
              type="button"
              onClick={() => onEdit(demand)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-earth-800 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Modifier</span>
            </button>
          )}

          {/* Bouton Annuler (si active) */}
          {demand.status === "active" && (
            <button
              type="button"
              onClick={() => onCancel(demand.id)}
              disabled={isCancelling}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <XCircle className="w-3 h-3" />
              <span>Annuler</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
