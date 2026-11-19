"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import Button from "@/components/ui/Button";
import OrderFormModal from "@/components/orders/OrderFormModal";
import type { ResellerCampaignItem } from "@/lib/queries/campaigns";
import { formatQuantityWithUnit } from "@/lib/utils/numberFormat";

interface PublicCampaignOrderActionProps {
  campaign: ResellerCampaignItem;
  resellerProvinceId?: string;
  resellerProvinceName?: string;
  defaultCity?: string;
  defaultAddress?: string;
}

/**
 * Commande depuis la page de consultation d'une campagne (Lot UX/UI 5B), réservée au revendeur
 * connecté et éligible. Mêmes règles que le tiroir de détail de l'espace revendeur : éligibilité
 * territoriale, date limite de la destination et stock vérifiés côté serveur (getResellerCampaignById),
 * puis commande par le même formulaire (OrderFormModal), dont l'action serveur revérifie tout.
 */
export default function PublicCampaignOrderAction({
  campaign,
  resellerProvinceId,
  resellerProvinceName,
  defaultCity,
  defaultAddress,
}: PublicCampaignOrderActionProps) {
  const [commandeOuverte, setCommandeOuverte] = useState(false);

  // Stock revendeur (migration 32) : aucun repli sur le volume commercialisable.
  const availableQty = campaign.available_quantity;
  const isAvailabilityUnknown = availableQty === null || campaign.availability_unavailable === true;
  const isOutOfStock = !isAvailabilityUnknown && (availableQty ?? 0) <= 0;
  const canOrder =
    !isAvailabilityUnknown && (campaign.can_order ?? (campaign.is_eligible && !isOutOfStock));
  const orderBlockedMessage = !canOrder ? campaign.eligibility_message || null : null;

  if (!campaign.is_eligible) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
          <span>
            Campagne hors de votre zone de livraison
            {resellerProvinceName ? ` (${resellerProvinceName})` : ""}. Vous pouvez exprimer une demande.
          </span>
        </p>
        <Link
          href="/dashboard/reseller/demands"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-earth-700 hover:bg-earth-800 text-white text-sm font-semibold transition-colors"
        >
          <TrendingUp className="w-4 h-4" aria-hidden="true" />
          Exprimer une demande
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700 flex flex-col gap-1">
        <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          Votre région est éligible à la commande
        </span>
        <span>
          Disponible pour commande :{" "}
          <strong className="text-gray-900 whitespace-nowrap">
            {isAvailabilityUnknown
              ? "momentanément indisponible"
              : formatQuantityWithUnit(availableQty ?? 0, campaign.unit)}
          </strong>
        </span>
      </div>

      {orderBlockedMessage && (
        <p role="status" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
          <span>{orderBlockedMessage}</span>
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        disabled={!canOrder}
        onClick={() => setCommandeOuverte(true)}
        leftIcon={<ShoppingBag className="w-4 h-4" aria-hidden="true" />}
        className="w-full sm:w-auto min-h-[44px]"
      >
        {canOrder
          ? "Commander maintenant"
          : isAvailabilityUnknown
          ? "Commande indisponible"
          : isOutOfStock
          ? "Stock épuisé"
          : "Commande fermée"}
      </Button>

      <OrderFormModal
        isOpen={commandeOuverte}
        onClose={() => setCommandeOuverte(false)}
        campaign={campaign}
        resellerProvinceId={resellerProvinceId}
        resellerProvinceName={resellerProvinceName}
        defaultCity={defaultCity}
        defaultAddress={defaultAddress}
      />
    </div>
  );
}
