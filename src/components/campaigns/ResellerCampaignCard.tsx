"use client";

import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import CampaignStatusBadge from "./CampaignStatusBadge";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Calendar,
  MapPin,
  Tag,
  Layers,
  Sparkles,
  TrendingUp,
  ImageOff,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ResellerCampaignCardProps {
  campaign: ResellerCampaignItem;
  onOrderClick?: (campaign: ResellerCampaignItem) => void;
}

export default function ResellerCampaignCard({
  campaign,
  onOrderClick,
}: ResellerCampaignCardProps) {
  // Formatage des dates de disponibilité
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

  const formattedStart = formatDate(campaign.start_date);
  const formattedEnd = formatDate(campaign.end_date);

  const availableQty = campaign.available_quantity ?? campaign.marketable_quantity;
  const isOutOfStock = availableQty <= 0;

  return (
    <div
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
        campaign.is_eligible
          ? "border-forest-200/90 hover:border-forest-400"
          : "border-gray-200/80 hover:border-gray-300 opacity-90"
      }`}
    >
      {/* 1. Visuel de production & Badges */}
      <div>
        <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
          {campaign.production.main_image_url ? (
            <Image
              src={campaign.production.main_image_url}
              alt={campaign.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <ImageOff className="w-8 h-8 mb-1" />
              <span className="text-[11px]">Visuel non disponible</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badge d'éligibilité territorial en superposition */}
          <div className="absolute top-3 left-3">
            {campaign.is_eligible ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs">
                <Sparkles className="w-3 h-3" />
                Votre province est desservie
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800/80 backdrop-blur-xs text-gray-200 text-[11px] font-medium shadow-xs">
                Non desservie
              </span>
            )}
          </div>

          {/* Statut de l'offre */}
          <div className="absolute top-3 right-3">
            <CampaignStatusBadge status={campaign.status} size="sm" />
          </div>

          {/* Catégorie du produit */}
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-forest-900 text-[11px] font-bold shadow-2xs">
              {campaign.product.category}
            </span>
          </div>
        </div>

        {/* 2. Corps de la carte */}
        <div className="p-4 space-y-3.5">
          {/* Exploitation productrice */}
          <Link
            href={`/dashboard/reseller/companies/${campaign.company_id}`}
            className="flex items-center gap-2 group/comp hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-md bg-forest-50 border border-forest-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {campaign.company.logo_url ? (
                <Image
                  src={campaign.company.logo_url}
                  alt={campaign.company.name}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4 text-forest-700" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-gray-900 truncate block group-hover/comp:text-forest-700 transition-colors">
                {campaign.company.name}
              </span>
            </div>
          </Link>

          {/* Titre et culture */}
          <div>
            <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-forest-800 transition-colors">
              {campaign.title}
            </h3>
            <span className="text-xs text-forest-800 font-semibold block mt-0.5">
              Culture : {campaign.product.name}
            </span>
          </div>

          {/* Données financières et volumiques réelles */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-forest-50/50 border border-forest-100">
            <div>
              <span className="text-[11px] text-forest-700 block uppercase font-medium">
                Prix Unitaire
              </span>
              <span className="text-base font-extrabold text-forest-950 flex items-center gap-1 mt-0.5">
                <Tag className="w-4 h-4 text-forest-700 inline" />
                {campaign.unit_price.toLocaleString("fr-FR")} {campaign.currency}
                <span className="text-[11px] font-normal text-forest-700">/{campaign.unit}</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-forest-700 block uppercase font-medium">
                Stock Restant Réel
              </span>
              <span className="text-base font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
                <Layers className="w-4 h-4 text-earth-600 inline" />
                {availableQty.toLocaleString("fr-FR")} {campaign.unit}
              </span>
            </div>
          </div>

          {/* Période */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>
              Période : {formattedStart} {formattedEnd ? `→ ${formattedEnd}` : "(en continu)"}
            </span>
          </div>

          {/* Villes d'arrivée et dates prévues (Nouveau fonctionnement) */}
          {campaign.destinations && campaign.destinations.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[11px] text-gray-500 block uppercase font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-forest-700" />
                Villes &amp; Arrivages Prévus :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {campaign.destinations.map((dest) => (
                  <span
                    key={dest.id}
                    className="px-2 py-0.5 rounded-lg bg-forest-50 border border-forest-200 text-forest-900 text-[11px] font-medium flex items-center gap-1"
                  >
                    <strong>{dest.city_name}</strong>
                    <span className="text-forest-700 text-[10px]">
                      ({formatDate(dest.expected_arrival_date)})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Provinces desservies */}
          <div>
            <span className="text-[11px] text-gray-500 block uppercase font-medium mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Provinces desservies :
            </span>
            <div className="flex flex-wrap gap-1">
              {campaign.delivery_zones.map((zone) => (
                <span
                  key={zone.id}
                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[10px] font-medium"
                >
                  {zone.provinces?.name || "Province"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pied de carte & Action Commande */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-100 space-y-2">
        {campaign.is_eligible ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Offre ouverte
            </span>

            {onOrderClick && (
              <button
                type="button"
                onClick={() => onOrderClick(campaign)}
                disabled={isOutOfStock}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-700 text-white font-bold text-xs hover:bg-forest-800 transition-all shadow-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {isOutOfStock ? "Stock épuisé" : "Commander"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Cette offre ne dessert pas votre province. Vous pouvez formuler une demande pour cette denrée.
            </p>
            <Link
              href="/dashboard/reseller/demands"
              className="inline-flex items-center gap-1 text-xs font-semibold text-earth-800 hover:text-earth-950 underline underline-offset-2"
            >
              <TrendingUp className="w-3.5 h-3.5 text-earth-700" />
              Exprimer une demande d&apos;achat &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
