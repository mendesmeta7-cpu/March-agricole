"use client";

import { useState } from "react";
import Link from "next/link";
import { FeedProductionItem } from "@/lib/queries/feed";
import {
  Building2,
  ImageOff,
  Megaphone,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Layers,
  ArrowRight,
} from "lucide-react";

interface FeedProductionCardProps {
  production: FeedProductionItem;
  index?: number;
}

function getStatusInfo(status: string): { emoji: string; label: string; color: string } {
  switch (status) {
    case "growing":
      return { emoji: "🌱", label: "En culture", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "harvested":
      return { emoji: "✓", label: "Récoltée", color: "bg-blue-50 text-blue-800 border-blue-200" };
    case "planned":
      return { emoji: "📅", label: "Planifiée", color: "bg-gray-50 text-gray-700 border-gray-200" };
    default:
      return { emoji: "•", label: status, color: "bg-gray-50 text-gray-600 border-gray-200" };
  }
}

export default function FeedProductionCard({ production, index = 0 }: FeedProductionCardProps) {
  const [imgError, setImgError] = useState(false);

  const hasActiveCampaign = !!production.active_campaign;
  const isEligible = production.active_campaign?.is_eligible ?? false;
  const canOrder = production.active_campaign?.can_order !== false;
  const availableStock =
    production.active_campaign?.available_quantity ??
    production.active_campaign?.marketable_quantity ??
    0;

  const statusInfo = getStatusInfo(production.status);
  const staggerDelay = `${Math.min(index * 55, 330)}ms`;

  return (
    <article
      style={{ animationDelay: staggerDelay }}
      className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 hover:border-forest-400/70 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden motion-safe:hover:-translate-y-0.5 active:scale-[0.985] animate-fade-in-up"
    >
      {/* IMAGE aspect-ratio 4/3 RESPONSIVE */}
      <Link
        href={`/dashboard/reseller/productions/${production.id}`}
        className="relative w-full overflow-hidden block flex-shrink-0"
        style={{ aspectRatio: "4/3" }}
        tabIndex={-1}
        aria-hidden="true"
      >
        {production.main_image_url && !imgError ? (
          <img
            src={production.main_image_url}
            alt={production.title}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover motion-safe:group-hover:scale-[1.04] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-300">
            <ImageOff className="w-5 h-5 sm:w-7 sm:h-7 mb-1" />
            <span className="text-[9px] sm:text-[10px] font-medium text-gray-400">Visuel en cours</span>
          </div>
        )}

        {production.product.category && (
          <div className="absolute top-1.5 left-1.5 z-10 max-w-[80px] sm:max-w-[100px]">
            <span className="block px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-gray-800 text-[8px] sm:text-[10px] font-bold tracking-tight shadow-sm uppercase truncate">
              {production.product.category}
            </span>
          </div>
        )}

        <div className="absolute top-1.5 right-1.5 z-10">
          {hasActiveCampaign ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white shadow-sm">
              <Megaphone className="w-2 h-2 flex-shrink-0" />
              <span>Campagne</span>
            </span>
          ) : (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${statusInfo.color}`}>
              {statusInfo.emoji}
            </span>
          )}
        </div>
      </Link>

      {/* CORPS COMPACT */}
      <div className="p-2 sm:p-3 flex-1 flex flex-col gap-1.5 sm:gap-2">

        {/* Société */}
        <Link
          href={`/dashboard/reseller/companies/${production.company.id}`}
          className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-gray-500 hover:text-forest-700 transition-colors max-w-full"
        >
          <div className="w-3.5 h-3.5 rounded-md bg-forest-50 border border-forest-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {production.company.logo_url ? (
              <img src={production.company.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-2 h-2 text-forest-700" />
            )}
          </div>
          <span className="truncate leading-none">{production.company.name}</span>
          <ShieldCheck className="w-2.5 h-2.5 text-forest-600 flex-shrink-0" />
        </Link>

        {/* Nom du produit */}
        <Link href={`/dashboard/reseller/productions/${production.id}`} className="block min-w-0 flex-1">
          <h3 className="text-[11px] sm:text-sm font-bold text-gray-900 group-hover:text-forest-700 transition-colors line-clamp-2 leading-tight">
            {production.product.name}
          </h3>
          {production.title !== production.product.name && (
            <p className="text-[9px] sm:text-[10px] text-gray-400 line-clamp-1 mt-0.5 leading-none">
              {production.title}
            </p>
          )}
        </Link>

        {/* PRIX + STOCK + ACTION */}
        <div className="pt-1.5 border-t border-gray-100 flex flex-col gap-1.5 mt-auto">

          {hasActiveCampaign ? (
            <div className="flex items-end justify-between gap-1 min-w-0">
              <div className="min-w-0">
                <div className="flex items-baseline gap-0.5 text-forest-900 min-w-0">
                  <span className="text-xs sm:text-sm font-black tracking-tight leading-none">
                    {production.active_campaign!.unit_price.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-forest-600 truncate">
                    {production.active_campaign!.currency}/{production.unit}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[9px] sm:text-[10px] font-semibold text-gray-600">
                  {availableStock.toLocaleString("fr-FR")}{" "}
                  <span className="font-normal text-gray-400">{production.unit}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-forest-900 truncate">
                {production.expected_quantity.toLocaleString("fr-FR")}{" "}
                <span className="font-medium text-gray-400">{production.unit}</span>
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold border flex-shrink-0 ${statusInfo.color}`}>
                {statusInfo.emoji}
              </span>
            </div>
          )}

          {hasActiveCampaign ? (
            isEligible ? (
              canOrder ? (
                <Link
                  href={`/dashboard/reseller/productions/${production.id}?order=true`}
                  className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-800 active:scale-95 text-white font-bold text-[9px] sm:text-[10px] shadow-sm transition-all"
                >
                  <ShoppingCart className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>Commander</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 text-gray-400 font-semibold text-[9px] sm:text-[10px] border border-gray-200 cursor-not-allowed"
                >
                  <Layers className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>Stock épuisé</span>
                </button>
              )
            ) : (
              <Link
                href={`/dashboard/reseller/productions/${production.id}`}
                className="w-full inline-flex items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-[9px] sm:text-[10px] transition-colors"
              >
                <AlertCircle className="w-2.5 h-2.5 text-amber-700 flex-shrink-0" />
                <span>Hors zone</span>
              </Link>
            )
          ) : production.status === "growing" || production.status === "harvested" ? (
            <Link
              href={`/dashboard/reseller/productions/${production.id}`}
              className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest-800 font-bold text-[9px] sm:text-[10px] border border-forest-200/90 transition-colors"
            >
              <TrendingUp className="w-2.5 h-2.5 text-forest-700 flex-shrink-0" />
              <span>Faire une demande</span>
            </Link>
          ) : (
            <Link
              href={`/dashboard/reseller/productions/${production.id}`}
              className="w-full inline-flex items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-[9px] sm:text-[10px] border border-gray-200 transition-colors group/btn"
            >
              <span>Voir le détail</span>
              <ArrowRight className="w-2.5 h-2.5 text-gray-400 motion-safe:group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
