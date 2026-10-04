"use client";

import React from "react";
import { CompanyProductItem } from "@/lib/queries/products";
import Badge from "@/components/ui/Badge";
import {
  Package,
  Edit3,
  Power,
  PowerOff,
  Trash2,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  Tag,
  Loader2,
} from "lucide-react";

interface CompanyProductCardProps {
  item: CompanyProductItem;
  onEdit: (item: CompanyProductItem) => void;
  onToggleStatus: (item: CompanyProductItem) => void;
  onDelete: (item: CompanyProductItem) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
}

export default function CompanyProductCard({
  item,
  onEdit,
  onToggleStatus,
  onDelete,
  isToggling = false,
  isDeleting = false,
}: CompanyProductCardProps) {
  const displayImage = item.image_url || item.product.image_url;
  const displayUnit = item.unit || item.product.default_unit || "tonne";
  const isCustomProduct = !item.product.is_global;
  const hasCustomImage = Boolean(item.image_url);
  const productionsCount = item.productions_count ?? 0;
  const totalDeclaredVolume = item.total_declared_volume ?? 0;

  return (
    <div
      className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
        item.is_active
          ? "border-gray-200/90 hover:border-forest-300"
          : "border-gray-200/60 bg-gray-50/60 opacity-80 hover:opacity-100"
      }`}
    >
      <div>
        {/* Zone Visuelle */}
        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden border-b border-gray-100">
          {displayImage ? (
            <img
              src={displayImage}
              alt={item.custom_name || item.product.name}
              className="w-full h-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-forest-50/80 to-emerald-50/40 text-forest-700">
              <Package className="w-12 h-12 text-forest-600/70 mb-1" />
              <span className="text-[11px] font-medium text-forest-800/80">Visuel non spécifié</span>
            </div>
          )}

          {/* Dégradé de lisibilité en haut */}
          <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />

          {/* Badges supérieurs */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 z-10">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md shadow-xs">
              <Tag className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[130px]">{item.product.category}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md shadow-xs ${
                item.is_active
                  ? "bg-emerald-600/90 text-white"
                  : "bg-amber-600/90 text-white"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.is_active ? "bg-white animate-pulse" : "bg-amber-200"
                }`}
              />
              <span>{item.is_active ? "Actif" : "Archivé"}</span>
            </span>
          </div>

          {/* Badges inférieurs sur image */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 z-10">
            {hasCustomImage && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-forest-900/85 text-emerald-300 backdrop-blur-xs shadow-xs">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Photo propre</span>
              </span>
            )}

            {isCustomProduct && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-900/85 text-amber-200 backdrop-blur-xs ml-auto shadow-xs">
                <span>Produit privé</span>
              </span>
            )}
          </div>
        </div>

        {/* Contenu textuel */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Titre et référence catalogue */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-gray-900 leading-snug group-hover:text-forest-800 transition-colors">
                {item.custom_name || item.product.name}
              </h3>
            </div>

            {item.custom_name && item.custom_name !== item.product.name && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <span>Réf. catalogue :</span>
                <span className="font-medium text-gray-700">{item.product.name}</span>
              </p>
            )}
          </div>

          {/* Puces métriques : Unité & Productions / Volume déclaré */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-forest-700 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Unité
                </span>
                <span className="text-xs font-bold text-gray-800 truncate block">
                  {displayUnit}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-forest-50/50 border border-forest-100/70 flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest-700 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-semibold text-forest-700/70 tracking-wider">
                  Productions
                </span>
                <span className="text-xs font-bold text-forest-900 truncate block">
                  {productionsCount} cycle{productionsCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Volume total déclaré rattaché */}
          {productionsCount > 0 ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs flex items-center justify-between text-emerald-900 font-medium">
              <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Volume déclaré cumulé :
              </span>
              <span className="font-bold text-emerald-950">
                {totalDeclaredVolume.toLocaleString("fr-FR")} {displayUnit}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-xs flex items-center justify-between text-gray-500">
              <span className="text-[11px]">Aucun cycle cultural rattaché</span>
              <span className="text-[10px] text-forest-700 font-medium">Prêt pour S4</span>
            </div>
          )}

          {/* Description ou notes */}
          {(item.description || item.notes || item.product.description) && (
            <div className="space-y-1.5 pt-1 text-xs text-gray-600">
              {(item.description || item.product.description) && (
                <p className="line-clamp-2 leading-relaxed text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                  {item.description || item.product.description}
                </p>
              )}
              {item.notes && (
                <p className="text-[11px] text-gray-500 italic line-clamp-1 px-1">
                  <span className="font-medium text-gray-700">Notes d'exploitation :</span> {item.notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Barre d'actions en pied de carte */}
      <div className="p-3 sm:px-4 sm:py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-2xs min-h-[38px] cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-forest-700" />
          <span>Modifier</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleStatus(item)}
          disabled={isToggling}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 min-h-[38px] border shadow-2xs cursor-pointer ${
            item.is_active
              ? "bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100"
              : "bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
          }`}
          title={item.is_active ? "Archiver ce produit" : "Réactiver ce produit"}
        >
          {isToggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : item.is_active ? (
            <>
              <PowerOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Archiver</span>
            </>
          ) : (
            <>
              <Power className="w-3.5 h-3.5 text-emerald-600" />
              <span>Réactiver</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={isDeleting}
          className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
          title="Supprimer ce produit de l'exploitation"
          aria-label="Supprimer"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
