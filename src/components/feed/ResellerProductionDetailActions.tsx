"use client";

import { useState } from "react";
import { Province } from "@/lib/queries/geography";
import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import ProductionDemandModal from "@/components/demands/ProductionDemandModal";
import OrderFormModal from "@/components/orders/OrderFormModal";
import { TrendingUp, CheckCircle2, ShoppingCart } from "lucide-react";

interface ResellerProductionDetailActionsProps {
  production: {
    id: string;
    title: string;
    unit: string;
    expected_quantity: number;
    status: string;
    company_name?: string;
    product_name?: string;
    main_image_url?: string;
  };
  provinces: Province[];
  defaultProvinceId?: string;
  activeCampaign?: ResellerCampaignItem | null;
  autoOpenOrder?: boolean;
  resellerInfo?: {
    id?: string;
    countryId?: string;
    countryName?: string;
    provinceId?: string;
    provinceName?: string;
    city?: string;
    address?: string;
    deliveryAddress?: string;
  };
}

export default function ResellerProductionDetailActions({
  production,
  provinces,
  defaultProvinceId,
  activeCampaign,
  autoOpenOrder = false,
  resellerInfo,
}: ResellerProductionDetailActionsProps) {
  const isEligible = Boolean(activeCampaign?.is_eligible);
  const canOrder = activeCampaign ? activeCampaign.can_order !== false && isEligible : false;
  const eligibilityReason = activeCampaign?.eligibility_reason;
  const eligibilityMessage = activeCampaign?.eligibility_message;
  const isDeadlineExpired = eligibilityReason === "DESTINATION_DEADLINE_EXPIRED";
  const isOutOfStock = Boolean(
    activeCampaign &&
    (activeCampaign.available_quantity <= 0 || eligibilityReason === "OUT_OF_STOCK")
  );

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(Boolean(autoOpenOrder && canOrder));
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canRequest = production.status === "growing" || production.status === "harvested";

  return (
    <div className="space-y-3">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {activeCampaign ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900">Prix unitaire</span>
              <span className="font-extrabold text-emerald-950 text-sm">
                {activeCampaign.unit_price} {activeCampaign.currency} / {activeCampaign.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Stock disponible</span>
              <span className="font-bold text-gray-900">
                {activeCampaign.available_quantity.toLocaleString("fr-FR")} {activeCampaign.unit}
              </span>
            </div>
            {activeCampaign.min_order_quantity > 1 && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Commande minimum</span>
                <span>{activeCampaign.min_order_quantity} {activeCampaign.unit}</span>
              </div>
            )}
          </div>

          {canOrder ? (
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl bg-forest-800 text-white hover:bg-forest-900 active:scale-98 transition-all shadow-sm cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Commander sur cette production
            </button>
          ) : isDeadlineExpired ? (
            <div className="p-3 bg-orange-50 border border-orange-200 text-orange-900 text-xs rounded-xl space-y-1">
              <span className="font-bold block">
                ⚠️ Période de commande terminée pour {resellerInfo?.provinceName || "votre région"}
              </span>
              <p className="text-[11px] text-orange-800 leading-relaxed">
                {eligibilityMessage || "La date limite de commande pour votre destination est dépassée. Vos commandes existantes restent valides. Vous pouvez formuler une demande ci-dessous."}
              </p>
            </div>
          ) : isOutOfStock ? (
            <div className="p-3 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl space-y-1">
              <span className="font-bold block">
                Stock disponible épuisé sur cette offre
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Le volume commercialisable de cette offre a été entièrement réservé. Vous pouvez toutefois formuler une demande spécifique ci-dessous.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-1.5">
              <span className="font-bold block">
                Non disponible dans votre région ({resellerInfo?.provinceName || "votre province"})
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Cette offre commerciale dessert d&apos;autres destinations. Vous pouvez toutefois formuler une demande spécifique ci-dessous.
              </p>
            </div>
          )}

          {canRequest && (
            <button
              type="button"
              onClick={() => setIsDemandModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-forest-700 hover:text-forest-900 hover:bg-forest-50/50 rounded-lg transition-colors cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {isEligible ? "Ou formuler une demande spécifique" : "Formuler une demande sur cette denrée"}
            </button>
          )}
        </div>
      ) : (
        canRequest ? (
          <button
            type="button"
            onClick={() => setIsDemandModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-98 transition-all shadow-sm cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            Faire une demande sur cette production
          </button>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center border border-gray-100">
            Cette production n&apos;est pas encore ouverte aux expressions de besoin (statut : {production.status}).
          </div>
        )
      )}

      {/* Modale de commande ferme */}
      {activeCampaign && (
        <OrderFormModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          campaign={activeCampaign}
          resellerProvinceId={resellerInfo?.provinceId || defaultProvinceId}
          resellerProvinceName={resellerInfo?.provinceName}
          defaultCity={resellerInfo?.city || ""}
          defaultAddress={resellerInfo?.deliveryAddress || resellerInfo?.address || ""}
        />
      )}

      {/* Modale d'expression de besoin */}
      <ProductionDemandModal
        isOpen={isDemandModalOpen}
        onClose={() => setIsDemandModalOpen(false)}
        production={production}
        provinces={provinces}
        defaultProvinceId={defaultProvinceId}
        onSuccess={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />
    </div>
  );
}

