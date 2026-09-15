"use client";

import { useState } from "react";
import Link from "next/link";
import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import CampaignStatusBadge from "./CampaignStatusBadge";
import {
  Calendar,
  MapPin,
  Tag,
  Building2,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ImageOff,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface ResellerCampaignCardProps {
  campaign: ResellerCampaignItem;
}

export default function ResellerCampaignCard({ campaign }: ResellerCampaignCardProps) {
  const [imgError, setImgError] = useState(false);

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

  const mainImage = campaign.production.main_image_url || campaign.product.image_url;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div>
        {/* 1. Visuel réel de la production adossée */}
        <div className="relative w-full aspect-16/10 sm:aspect-16/9 bg-gray-100 overflow-hidden">
          {mainImage && !imgError ? (
            <img
              src={mainImage}
              alt={campaign.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-4 text-center">
              <ImageOff className="w-8 h-8 text-gray-300 mb-1.5" />
              <span className="text-xs font-medium text-gray-500">Aucune photo</span>
            </div>
          )}

          {/* Catégorie */}
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium tracking-wide uppercase">
              {campaign.product.category}
            </span>
          </div>

          {/* Badge d'éligibilité territoriale en superposition */}
          <div className="absolute top-3 right-3 z-10">
            {campaign.is_eligible ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-xs text-white text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Province desservie
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/90 backdrop-blur-xs text-white text-xs font-medium shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Hors territoire
              </span>
            )}
          </div>
        </div>

        {/* 2. Contenu commercial */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Exploitation productrice */}
          <Link
            href={`/dashboard/reseller/companies/${campaign.company_id}`}
            className="group/comp flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-800 flex-shrink-0 overflow-hidden relative">
              {campaign.company.logo_url ? (
                <img
                  src={campaign.company.logo_url}
                  alt={campaign.company.name}
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

          {/* Données financières et volumiques */}
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
                Quantité Offerte
              </span>
              <span className="text-base font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
                <Layers className="w-4 h-4 text-earth-600 inline" />
                {campaign.marketable_quantity.toLocaleString("fr-FR")} {campaign.unit}
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

      {/* 3. Pied de carte & Action éligibilité */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-100 space-y-2">
        {campaign.is_eligible ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Offre ouverte à votre province
            </span>
            <span className="text-[11px] text-gray-400">Commandes en Phase 10</span>
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
