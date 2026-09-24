"use client";

import { useState } from "react";
import Link from "next/link";
import { FeedProductionItem } from "@/lib/queries/feed";
import ProductionStatusBadge from "@/components/productions/ProductionStatusBadge";
import {
  MapPin,
  Calendar,
  Building2,
  Tractor,
  ArrowRight,
  Sprout,
  ImageOff,
  Megaphone,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

interface FeedProductionCardProps {
  production: FeedProductionItem;
}

export default function FeedProductionCard({ production }: FeedProductionCardProps) {
  const [imgError, setImgError] = useState(false);

  // Formatage des dates du cycle
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formattedStart = formatDate(production.period_start);
  const formattedEnd = formatDate(production.period_end);

  const provinceName = (production.company as any)?.provinces?.name || "";
  const countryName = (production.company as any)?.countries?.name || "RDC";
  const locationDisplay = [production.location_name, provinceName, countryName]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="group bg-white rounded-2xl border border-gray-200/80 hover:border-forest-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* 1. Photo principale dominante */}
      <div className="relative w-full aspect-16/10 sm:aspect-16/9 bg-gray-100 overflow-hidden">
        {production.main_image_url && !imgError ? (
          <img
            src={production.main_image_url}
            alt={production.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-4 text-center">
            <ImageOff className="w-8 h-8 text-gray-300 mb-1.5" />
            <span className="text-xs font-medium text-gray-500">Aucune photo fournie</span>
          </div>
        )}

        {/* Badges en superposition */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          <ProductionStatusBadge status={production.status} size="sm" />
          {production.active_campaign && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
              <Megaphone className="w-3 h-3" />
              Campagne en cours
            </span>
          )}
        </div>

        {/* Catégorie de produit en superposition */}
        <div className="absolute top-3 left-3 z-10">
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium tracking-wide uppercase">
            {production.product.category}
          </span>
        </div>
      </div>

      {/* 2. Corps de la carte */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Identité Entreprise Productrice */}
          <Link
            href={`/dashboard/reseller/companies/${production.company.id}`}
            className="group/comp flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-forest-50 border border-forest-200/80 flex items-center justify-center text-forest-800 flex-shrink-0 overflow-hidden relative">
              {production.company.logo_url ? (
                <img
                  src={production.company.logo_url}
                  alt={production.company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4 text-forest-700" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-gray-900 truncate block group-hover/comp:text-forest-700 transition-colors">
                {production.company.name}
              </span>
            </div>
          </Link>

          {/* Titre et culture */}
          <div>
            <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-forest-800 transition-colors">
              {production.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-forest-800 font-semibold mt-0.5">
              <Sprout className="w-3.5 h-3.5 text-forest-600 flex-shrink-0" />
              <span className="truncate">Culture : {production.product.name}</span>
            </div>
          </div>

          {/* Localisation */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{locationDisplay}</span>
          </div>

          {/* Période prévisionnelle */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              Cycle : {formattedStart || "Date début non définie"}
              {formattedEnd ? ` → ${formattedEnd}` : " (en cours)"}
            </span>
          </div>
        </div>

        {/* 3. Pied de carte : Quantité planifiée / Offre + Action */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div>
            {production.active_campaign ? (
              <div>
                <span className="text-[10px] text-emerald-700 block uppercase font-bold tracking-wider">
                  Offre ferme disponible
                </span>
                <span className="text-sm font-extrabold text-emerald-950 flex items-center gap-1">
                  {production.active_campaign.unit_price} {production.active_campaign.currency} / {production.unit}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[11px] text-gray-500 block uppercase font-medium">
                  Quantité planifiée
                </span>
                <span className="text-sm font-extrabold text-forest-900 flex items-center gap-1">
                  <Tractor className="w-4 h-4 text-forest-600 inline-block" />
                  {production.expected_quantity.toLocaleString("fr-FR")} {production.unit}
                </span>
              </div>
            )}
          </div>

          <Link
            href={`/dashboard/reseller/productions/${production.id}`}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 shadow-2xs group/btn ${
              production.active_campaign
                ? production.active_campaign.is_eligible !== false
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                : "bg-forest-50 hover:bg-forest-700 text-forest-800 hover:text-white"
            }`}
          >
            {production.active_campaign ? (
              production.active_campaign.is_eligible !== false ? (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Commander</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>Indisponible dans votre région</span>
                </>
              )
            ) : (
              production.status === "growing" || production.status === "harvested" ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-forest-600 group-hover:text-white" />
                  <span>Faire une demande</span>
                </>
              ) : (
                <>
                  <span>Voir la production</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </>
              )
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
