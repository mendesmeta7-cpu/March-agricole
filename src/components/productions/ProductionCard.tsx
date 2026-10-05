"use client";

import React from "react";
import { ProductionItem } from "@/lib/queries/productions";
import ProductionStatusBadge, { CampaignActiveBadge } from "./ProductionStatusBadge";
import { formatProductionSeasonCalendar } from "@/lib/utils/seasonalMonths";
import {
  Calendar,
  MapPin,
  Scale,
  Eye,
  EyeOff,
  ChevronRight,
  Edit3,
  Tractor,
  Megaphone,
  MessageSquareQuote,
  Trash2,
  Archive,
  MoreVertical,
  Plus,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ProductionCardProps {
  production: ProductionItem;
  onEdit: (production: ProductionItem) => void;
  onArchive?: (production: ProductionItem) => void;
  onDelete?: (production: ProductionItem) => void;
  isArchiving?: boolean;
  isDeleting?: boolean;
}

export default function ProductionCard({
  production,
  onEdit,
  onArchive,
  onDelete,
  isArchiving = false,
  isDeleting = false,
}: ProductionCardProps) {
  const { plantingPeriod, harvestPeriod, hasPlanting, hasHarvest } =
    formatProductionSeasonCalendar(production);

  const isHarvested = production.status === "harvested";
  const hasActiveCampaign = Boolean(production.has_active_campaign);
  const campaignsCount = production.campaigns_count ?? 0;
  const demandsCount = production.demands_count ?? 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200/80 hover:border-forest-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      <div>
        {/* Zone Visuelle & Badges */}
        <div className="relative aspect-[16/10] w-full bg-forest-950/10 overflow-hidden border-b border-gray-100">
          {production.main_image_url ? (
            <Image
              src={production.main_image_url}
              alt={production.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-forest-50 to-emerald-50/40 text-forest-700">
              <Tractor className="w-12 h-12 text-forest-600/70 mb-1" />
              <span className="text-[11px] font-medium text-forest-800/80">Cycle cultural</span>
            </div>
          )}

          {/* Dégradés protecteurs */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* Badges supérieurs */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <ProductionStatusBadge status={production.status} size="sm" />
              {hasActiveCampaign && <CampaignActiveBadge size="sm" />}
            </div>

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                production.is_public
                  ? "bg-white/90 text-forest-800"
                  : "bg-black/65 text-gray-200"
              }`}
              title={
                production.is_public
                  ? "Visible par les revendeurs dans le flux d'approvisionnement"
                  : "Privé (usage interne de l'exploitation)"
              }
            >
              {production.is_public ? (
                <>
                  <Eye className="w-3 h-3 text-forest-600" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 text-gray-300" />
                  <span>Privé</span>
                </>
              )}
            </span>
          </div>

          {/* Titre & Produit en bas d'image */}
          <div className="absolute bottom-2.5 inset-x-2.5 text-white z-10">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-forest-200 tracking-wide uppercase drop-shadow-xs">
              <span>{production.product.name}</span>
              {production.company_product?.custom_name && (
                <span className="text-gray-200">
                  · {production.company_product.custom_name}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold leading-tight line-clamp-1 drop-shadow-xs text-white">
              {production.title}
            </h3>
          </div>
        </div>

        {/* Corps Métier */}
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Bloc Volume Prévisionnel (Mise en garde stricte : PAS UN STOCK) */}
          <div className="p-2.5 rounded-xl bg-forest-50/70 border border-forest-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-forest-700 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-forest-700 tracking-wider">
                  Volume prévisionnel
                </p>
                <p className="text-sm font-extrabold text-forest-950">
                  {production.expected_quantity.toLocaleString("fr-FR")}{" "}
                  <span className="text-xs font-medium text-forest-800">
                    {production.unit}
                  </span>
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-forest-700 bg-forest-100/90 px-2 py-0.5 rounded-md">
              Déclaré
            </span>
          </div>

          {/* Localisation & Calendrier saisonnier */}
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate font-medium text-gray-700" title={production.location_name}>
                {production.location_name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">
                {hasPlanting && (
                  <span>
                    🌱 Semis : <strong className="text-forest-800">{plantingPeriod}</strong>
                  </span>
                )}
                {hasPlanting && hasHarvest && <span className="text-gray-300 mx-1">·</span>}
                {hasHarvest && (
                  <span>
                    🌾 Récolte : <strong className="text-amber-800">{harvestPeriod}</strong>
                  </span>
                )}
                {!hasPlanting && !hasHarvest && (
                  <span className="text-gray-400 italic">Calendrier saisonnier non renseigné</span>
                )}
              </span>
            </div>
          </div>

          {/* Description courte si présente */}
          {production.description && (
            <p className="text-xs text-gray-500 line-clamp-2 pt-1 border-t border-gray-100">
              {production.description}
            </p>
          )}

          {/* Puces de suivi réel (Campagnes & Demandes) */}
          <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
            {campaignsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-earth-50 text-earth-800 border border-earth-200 font-medium">
                <Megaphone className="w-3 h-3 text-earth-600" />
                <span>{campaignsCount} offre(s)</span>
              </span>
            )}
            {demandsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                <MessageSquareQuote className="w-3 h-3 text-blue-600" />
                <span>{demandsCount} demande(s)</span>
              </span>
            )}
            {isHarvested && !hasActiveCampaign && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[10px]">
                🌾 Prête pour commercialisation
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barre d'Actions Inférieure */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(production)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-forest-800 hover:bg-white border border-transparent hover:border-gray-200 transition-all cursor-pointer"
            title="Modifier les caractéristiques du cycle"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
            <span>Modifier</span>
          </button>

          {isHarvested && (
            <Link
              href={`/dashboard/company/campaigns/new?production_id=${production.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all"
              title="Lancer une offre commerciale sur cette récolte"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Campagne</span>
            </Link>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(production)}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
              title="Supprimer la production (autorisé si aucun historique)"
              aria-label="Supprimer la production"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Link
          href={`/dashboard/company/productions/${production.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 hover:text-forest-900 px-3 py-1.5 rounded-lg hover:bg-forest-50 transition-colors"
        >
          <span>Détail</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
