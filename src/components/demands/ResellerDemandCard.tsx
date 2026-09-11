"use client";

import { DemandItem } from "@/lib/queries/demands";
import DemandStatusBadge from "./DemandStatusBadge";
import Card from "@/components/ui/Card";
import {
  Calendar,
  MapPin,
  Scale,
  Edit3,
  XCircle,
  Building2,
  Package,
  FileText,
} from "lucide-react";
import Image from "next/image";

interface ResellerDemandCardProps {
  demand: DemandItem;
  onEdit: (demand: DemandItem) => void;
  onCancel: (demandId: string) => void;
  isCancelling?: boolean;
}

export default function ResellerDemandCard({
  demand,
  onEdit,
  onCancel,
  isCancelling,
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

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div className="p-4 sm:p-5 space-y-4">
        {/* Header : Produit, Catégorie & Statut */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-earth-50 border border-earth-100 overflow-hidden flex items-center justify-center shrink-0">
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-earth-700 bg-earth-100/70 px-2 py-0.5 rounded-md inline-block mb-1">
                {demand.product.category}
              </span>
              <h3 className="text-base font-bold text-gray-900 truncate">
                {demand.product.name}
              </h3>
            </div>
          </div>

          <DemandStatusBadge status={demand.status} size="sm" />
        </div>

        {/* Quantité recherchée */}
        <div className="p-3 rounded-xl bg-earth-50/60 border border-earth-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-earth-700 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-earth-700">Volume recherché</p>
              <p className="text-base font-bold text-earth-950">
                {demand.quantity.toLocaleString("fr-FR")}{" "}
                <span className="text-xs font-normal text-earth-800">{demand.unit}</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-semibold text-earth-600 bg-earth-100/80 px-2 py-0.5 rounded-md">
            Besoin exprimé
          </span>
        </div>

        {/* Territoire & Période */}
        <div className="space-y-1.5 text-xs text-gray-600 pt-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate font-medium text-gray-800">
              {demand.province.name}
              {demand.city && `, ${demand.city}`} ({demand.country.code})
            </span>
          </div>

          {hasPeriod && (
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                {demand.target_period_start && `Du ${formatDate(demand.target_period_start)}`}
                {demand.target_period_end && ` au ${formatDate(demand.target_period_end)}`}
              </span>
            </div>
          )}

          {demand.target_company && (
            <div className="flex items-center gap-2 text-forest-700">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Cible : {demand.target_company.name}</span>
            </div>
          )}

          {demand.notes && (
            <p className="text-xs text-gray-500 line-clamp-2 pt-2 border-t border-gray-100 italic bg-gray-50/50 p-2 rounded-lg">
              « {demand.notes} »
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Publié le {formatDate(demand.created_at)}</span>

        {demand.status === "active" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(demand)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-earth-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Modifier
            </button>
            <button
              onClick={() => onCancel(demand.id)}
              disabled={isCancelling}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3 h-3" />
              Annuler
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
