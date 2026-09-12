"use client";

import { useState } from "react";
import Link from "next/link";
import { CompanyPublicProductionItem } from "@/lib/queries/companies";
import ProductionStatusBadge from "@/components/productions/ProductionStatusBadge";
import {
  MapPin,
  Calendar,
  Tractor,
  ArrowRight,
  Sprout,
  ImageOff,
  PackageOpen,
} from "lucide-react";

interface CompanyPublicProductionsListProps {
  productions: CompanyPublicProductionItem[];
}

export default function CompanyPublicProductionsList({
  productions,
}: CompanyPublicProductionsListProps) {
  if (productions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4">
          <PackageOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">
          Aucune production publique disponible
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Cette entreprise n&apos;a encore aucune production publique.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {productions.map((prod) => (
        <ProductionItemCard key={prod.id} production={prod} />
      ))}
    </div>
  );
}

function ProductionItemCard({ production }: { production: CompanyPublicProductionItem }) {
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

  return (
    <div className="group bg-white rounded-2xl border border-gray-200/80 hover:border-forest-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* 1. Photo principale */}
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

        {/* Statut cultural */}
        <div className="absolute top-3 right-3 z-10">
          <ProductionStatusBadge status={production.status} size="sm" />
        </div>

        {/* Catégorie */}
        <div className="absolute top-3 left-3 z-10">
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium tracking-wide uppercase">
            {production.product.category}
          </span>
        </div>
      </div>

      {/* 2. Contenu */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Titre & culture */}
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
          {production.location_name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{production.location_name}</span>
            </div>
          )}

          {/* Période prévisionnelle */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              Cycle : {formattedStart || "Date début non définie"}
              {formattedEnd ? ` → ${formattedEnd}` : " (en cours)"}
            </span>
          </div>
        </div>

        {/* 3. Pied de carte : Quantité planifiée (Règle d'Or 3) + Bouton consultation */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-gray-500 block uppercase font-medium">
              Quantité planifiée
            </span>
            <span className="text-sm font-extrabold text-forest-900 flex items-center gap-1">
              <Tractor className="w-4 h-4 text-forest-600 inline-block" />
              {production.expected_quantity.toLocaleString("fr-FR")} {production.unit}
            </span>
          </div>

          <Link
            href={`/dashboard/reseller/productions/${production.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-forest-50 hover:bg-forest-700 text-forest-800 hover:text-white text-xs font-semibold transition-all duration-150 shadow-2xs group/btn"
          >
            <span>Détail</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
