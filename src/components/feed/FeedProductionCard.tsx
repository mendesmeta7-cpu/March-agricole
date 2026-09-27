"use client";

import { useState } from "react";
import Link from "next/link";
import { FeedProductionItem } from "@/lib/queries/feed";
import ProductionStatusBadge from "@/components/productions/ProductionStatusBadge";
import {
  MapPin,
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

export default function FeedProductionCard({ production, index = 0 }: FeedProductionCardProps) {
  const [imgError, setImgError] = useState(false);

  // Localisation courte : Ville ou Province principale
  const provinceName = (production.company as any)?.provinces?.name || "";
  const shortLocation = production.location_name
    ? provinceName && !production.location_name.includes(provinceName)
      ? `${production.location_name}, ${provinceName}`
      : production.location_name
    : provinceName || "RDC";

  const hasActiveCampaign = !!production.active_campaign;
  const isEligible = production.active_campaign?.is_eligible ?? false;
  const canOrder = production.active_campaign?.can_order !== false;
  const availableStock =
    production.active_campaign?.available_quantity ??
    production.active_campaign?.marketable_quantity ??
    0;

  // Délai en cascade pour le scroll-reveal fluide (section 22)
  const staggerDelay = `${Math.min(index * 60, 360)}ms`;

  return (
    <article
      style={{ animationDelay: staggerDelay }}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 hover:border-forest-400/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden motion-safe:hover:-translate-y-0.5 active:scale-[0.99] animate-fade-in-up"
    >
      {/* 1. IMAGE COMPACTE AVEC BADGES FLOTTANTS (aspect 16/10 compact) */}
      <Link
        href={`/dashboard/reseller/productions/${production.id}`}
        className="relative w-full aspect-16/10 sm:aspect-16/10 bg-gray-100 overflow-hidden block"
      >
        {production.main_image_url && !imgError ? (
          <img
            src={production.main_image_url}
            alt={production.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-3 text-center">
            <ImageOff className="w-6 h-6 text-gray-300 mb-0.5" />
            <span className="text-[10px] font-medium text-gray-400">Visuel en cours</span>
          </div>
        )}

        {/* Badge catégorie en haut à gauche */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-md text-gray-800 text-[10px] font-bold tracking-tight shadow-2xs uppercase">
            {production.product.category}
          </span>
        </div>

        {/* Badge statut / campagne en haut à droite */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {hasActiveCampaign ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
              <Megaphone className="w-2.5 h-2.5" />
              <span>Campagne</span>
            </span>
          ) : (
            <ProductionStatusBadge status={production.status} size="sm" />
          )}
        </div>
      </Link>

      {/* 2. CORPS COMPACT DE LA CARTE */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-1.5">
          {/* Entreprise productrice avec badge vérifié */}
          <Link
            href={`/dashboard/reseller/companies/${production.company.id}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 hover:text-forest-700 transition-colors truncate max-w-full"
          >
            <div className="w-4 h-4 rounded-md bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-800 overflow-hidden flex-shrink-0">
              {production.company.logo_url ? (
                <img
                  src={production.company.logo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-2.5 h-2.5 text-forest-700" />
              )}
            </div>
            <span className="truncate">{production.company.name}</span>
            <ShieldCheck className="w-3 h-3 text-forest-600 flex-shrink-0" />
          </Link>

          {/* Dénomination claire de la production */}
          <Link
            href={`/dashboard/reseller/productions/${production.id}`}
            className="block group/title"
          >
            <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover/title:text-forest-700 transition-colors line-clamp-1 leading-snug">
              {production.product.name}
            </h3>
            {production.title !== production.product.name && (
              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                {production.title}
              </p>
            )}
          </Link>

          {/* Localisation courte */}
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3 text-forest-600 flex-shrink-0" />
            <span className="truncate">{shortLocation}</span>
          </div>
        </div>

        {/* 3. PRIX, STOCK ET ACTION PRINCIPALE */}
        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
          {hasActiveCampaign ? (
            <div className="flex items-baseline justify-between gap-1">
              <div>
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Prix ferme
                </span>
                <div className="flex items-baseline gap-0.5 text-forest-900">
                  <span className="text-base sm:text-lg font-black tracking-tight leading-none">
                    {production.active_campaign!.unit_price.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-[10px] font-bold text-forest-700">
                    {production.active_campaign!.currency}/{production.unit}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider block">
                  Dispo
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {availableStock.toLocaleString("fr-FR")} {production.unit}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-1">
              <div>
                <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Volume planifié
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-forest-900">
                  {production.expected_quantity.toLocaleString("fr-FR")} {production.unit}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider block">
                  Statut
                </span>
                <span className="text-[11px] font-bold text-forest-800">
                  {production.status === "growing"
                    ? "En champ"
                    : production.status === "harvested"
                    ? "En stock"
                    : "Planifié"}
                </span>
              </div>
            </div>
          )}

          {/* Bouton d'action avec respect absolu de l'éligibilité régionale */}
          {hasActiveCampaign ? (
            isEligible ? (
              canOrder ? (
                <Link
                  href={`/dashboard/reseller/productions/${production.id}?order=true`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 active:scale-98 text-white font-bold text-xs shadow-2xs transition-all"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Commander</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-400 font-semibold text-xs border border-gray-200 cursor-not-allowed"
                >
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span>Stock épuisé</span>
                </button>
              )
            ) : (
              <div className="space-y-0.5">
                <Link
                  href={`/dashboard/reseller/productions/${production.id}`}
                  className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-[11px] transition-colors"
                >
                  <AlertCircle className="w-3 h-3 text-amber-700 flex-shrink-0" />
                  <span className="truncate">Non dispo dans votre région</span>
                </Link>
                {production.active_campaign?.eligibility_message && (
                  <p className="text-[9px] text-amber-800 text-center truncate px-0.5">
                    {production.active_campaign.eligibility_message}
                  </p>
                )}
              </div>
            )
          ) : production.status === "growing" || production.status === "harvested" ? (
            <Link
              href={`/dashboard/reseller/productions/${production.id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 font-bold text-xs border border-forest-200/90 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-forest-700" />
              <span>Faire une demande</span>
            </Link>
          ) : (
            <Link
              href={`/dashboard/reseller/productions/${production.id}`}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-200 transition-colors group/btn"
            >
              <span>Voir le détail</span>
              <ArrowRight className="w-3 h-3 text-gray-400 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
