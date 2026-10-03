"use client";

import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
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
  Truck,
  Store,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface ResellerCampaignDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: ResellerCampaignItem | null;
  onOrderClick: (campaign: ResellerCampaignItem) => void;
}

export default function ResellerCampaignDetailDrawer({
  isOpen,
  onClose,
  campaign,
  onOrderClick,
}: ResellerCampaignDetailDrawerProps) {
  if (!campaign) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
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

  const imageUrl = campaign.production.main_image_url || campaign.product.image_url;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span className="truncate">{campaign.title}</span>
        </div>
      }
      description={
        <span>
          Offre commerciale publiée par <strong>{campaign.company.name}</strong>
        </span>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {campaign.is_eligible ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Votre région est éligible à la commande
              </span>
            ) : (
              <span className="text-amber-800 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Offre hors de votre zone de livraison
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fermer
            </Button>

            {campaign.is_eligible ? (
              <Button
                variant="primary"
                size="sm"
                disabled={isOutOfStock}
                onClick={() => {
                  onClose();
                  onOrderClick(campaign);
                }}
                leftIcon={<ShoppingBag className="w-4 h-4" />}
              >
                {isOutOfStock ? "Stock épuisé" : "Commander maintenant"}
              </Button>
            ) : (
              <Link
                href="/dashboard/reseller/demands"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-earth-600 hover:bg-earth-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Exprimer une demande
              </Link>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1. Visuel de production / produit */}
        <div className="relative h-56 sm:h-64 w-full rounded-2xl bg-gray-100 overflow-hidden border border-gray-100 shadow-2xs">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={campaign.title}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <ImageOff className="w-10 h-10 mb-2" />
              <span className="text-xs">Aucun visuel disponible</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badges superposés */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {campaign.is_eligible ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/95 backdrop-blur-xs text-white text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Province desservie
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-900/80 backdrop-blur-xs text-gray-200 text-xs font-medium shadow-xs">
                Non desservie
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-forest-900 text-xs font-bold shadow-2xs">
              {campaign.product.category}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            <CampaignStatusBadge status={campaign.status} size="sm" />
          </div>

          <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="text-xs font-medium text-forest-200">Culture de référence</p>
            <h3 className="text-lg font-bold truncate leading-tight">
              {campaign.product.name}
            </h3>
          </div>
        </div>

        {/* 2. Société productrice */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {campaign.company.logo_url ? (
                <Image
                  src={campaign.company.logo_url}
                  alt={campaign.company.name}
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 text-forest-700" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {campaign.company.name}
              </h4>
              <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                <span>
                  {campaign.company.city ? `${campaign.company.city}, ` : ""}
                  {(campaign.company.provinces as any)?.name || "RDC"}
                </span>
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/reseller/companies/${campaign.company_id}`}
            className="text-xs font-bold text-forest-700 hover:text-forest-800 hover:underline shrink-0"
          >
            Voir profil
          </Link>
        </div>

        {/* 3. Chiffres clés : Prix & Volumes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-forest-700 block">
              Prix unitaire ferme
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-forest-950 mt-1 flex items-baseline gap-1">
              <Tag className="w-5 h-5 text-forest-700 shrink-0 inline" />
              <span>{campaign.unit_price.toLocaleString("fr-FR")}</span>
              <span className="text-xs font-bold text-forest-800 uppercase">
                {campaign.currency} / {campaign.unit}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-earth-50/70 border border-earth-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-earth-700 block">
              Stock restant réel
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-earth-950 mt-1 flex items-baseline gap-1">
              <Layers className="w-5 h-5 text-earth-700 shrink-0 inline" />
              <span>{availableQty.toLocaleString("fr-FR")}</span>
              <span className="text-xs font-bold text-earth-800 uppercase">
                {campaign.unit}
              </span>
            </div>
            {campaign.min_order_quantity > 1 && (
              <span className="text-[10px] text-earth-700 block mt-1">
                Minimum par commande : {campaign.min_order_quantity} {campaign.unit}
              </span>
            )}
          </div>
        </div>

        {/* 4. Description détaillée si renseignée */}
        {campaign.description && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Conditions et détails de l&apos;offre
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
              {campaign.description}
            </p>
          </div>
        )}

        {/* 5. Calendrier et Période */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-forest-700" />
            Période de disponibilité commerciale
          </h4>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              Du <strong>{formattedStart}</strong> au{" "}
              <strong>{formattedEnd || "épuisement des stocks"}</strong>
            </span>
          </div>
        </div>

        {/* 6. Villes de destination et Dépôts d'arrivée */}
        {campaign.destinations && campaign.destinations.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-forest-700" />
              Villes d&apos;arrivée &amp; Dépôts de retrait
            </h4>
            <div className="space-y-2">
              {campaign.destinations.map((dest) => (
                <div
                  key={dest.id}
                  className="p-3.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-forest-700" />
                      {dest.city_name} ({(dest.provinces as any)?.name || "Province"})
                    </span>
                    {dest.expected_arrival_date && (
                      <span className="text-[11px] font-semibold text-forest-800 bg-forest-50 px-2 py-0.5 rounded-md border border-forest-100">
                        Arrivée : {formatDate(dest.expected_arrival_date)}
                      </span>
                    )}
                  </div>

                  {dest.depots && dest.depots.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                        Points de retrait :
                      </span>
                      {dest.depots.map((dep) => (
                        <div
                          key={dep.id}
                          className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100"
                        >
                          <strong className="text-gray-900">{dep.name}</strong>
                          <span className="block text-gray-500">
                            {dep.commune}, {dep.address}
                            {dep.quartier ? ` (${dep.quartier})` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Provinces couvertes */}
        {campaign.delivery_zones && campaign.delivery_zones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-forest-700" />
              Provinces desservies par l&apos;exploitation
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {campaign.delivery_zones.map((zone) => (
                <span
                  key={zone.id}
                  className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium"
                >
                  {(zone.provinces as any)?.name || "Province"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
