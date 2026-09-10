"use client";

import { ProductionItem } from "@/lib/queries/productions";
import ProductionStatusBadge from "./ProductionStatusBadge";
import Card from "@/components/ui/Card";
import {
  Calendar,
  MapPin,
  Scale,
  Eye,
  EyeOff,
  ChevronRight,
  Edit3,
  Tractor,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ProductionCardProps {
  production: ProductionItem;
  onEdit: (production: ProductionItem) => void;
}

export default function ProductionCard({ production, onEdit }: ProductionCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("fr-FR", {
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group">
      {/* Image & Badges */}
      <div className="relative h-48 w-full bg-forest-900/10 overflow-hidden">
        {production.main_image_url ? (
          <Image
            src={production.main_image_url}
            alt={production.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-forest-50 text-forest-700">
            <Tractor className="w-12 h-12 stroke-[1.5] mb-1" />
            <span className="text-xs font-medium">Cycle cultural</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Badge de statut */}
        <div className="absolute top-3 left-3 z-10">
          <ProductionStatusBadge status={production.status} size="sm" />
        </div>

        {/* Indicateur de visibilité */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
              production.is_public
                ? "bg-white/90 text-forest-800"
                : "bg-black/60 text-white"
            }`}
          >
            {production.is_public ? (
              <>
                <Eye className="w-3 h-3 text-forest-600" />
                Visible revendeurs
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-gray-300" />
                Privé (interne)
              </>
            )}
          </span>
        </div>

        {/* Titre & Produit en surimpression */}
        <div className="absolute bottom-3 left-3 right-3 text-white z-10">
          <p className="text-xs font-medium text-forest-200 tracking-wide uppercase">
            {production.product.name}
            {production.company_product?.custom_name &&
              ` (${production.company_product.custom_name})`}
          </p>
          <h3 className="text-base font-bold leading-tight line-clamp-1">
            {production.title}
          </h3>
        </div>
      </div>

      {/* Contenu Métier */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Bloc Quantité Planifiée (Mise en garde stricte : PAS UN STOCK) */}
          <div className="p-2.5 rounded-xl bg-forest-50/60 border border-forest-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-forest-700 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-forest-700">
                  Volume prévisionnel
                </p>
                <p className="text-sm font-bold text-forest-950">
                  {production.expected_quantity.toLocaleString("fr-FR")}{" "}
                  <span className="text-xs font-normal text-forest-800">
                    {production.unit}
                  </span>
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-forest-600/90 bg-forest-100/80 px-2 py-0.5 rounded-md">
              Planifiée
            </span>
          </div>

          {/* Localisation & Période */}
          <div className="grid grid-cols-1 gap-1.5 text-xs text-gray-600 pt-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate" title={production.location_name}>
                {production.location_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                Début : {formatDate(production.period_start)}
                {production.period_end && ` → Récolte : ${formatDate(production.period_end)}`}
              </span>
            </div>
          </div>

          {production.description && (
            <p className="text-xs text-gray-500 line-clamp-2 pt-1 border-t border-gray-100">
              {production.description}
            </p>
          )}
        </div>

        {/* Barre d'action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            onClick={() => onEdit(production)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-forest-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modifier
          </button>

          <Link
            href={`/dashboard/company/productions/${production.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-800 px-3 py-1.5 rounded-lg hover:bg-forest-50 transition-colors"
          >
            Consulter
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
