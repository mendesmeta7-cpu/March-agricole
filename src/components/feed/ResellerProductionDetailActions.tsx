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
  resellerInfo?: {
    provinceId?: string;
    provinceName?: string;
    city?: string;
    address?: string;
  };
}

export default function ResellerProductionDetailActions({
  production,
  provinces,
  defaultProvinceId,
  activeCampaign,
  resellerInfo,
}: ResellerProductionDetailActionsProps) {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
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

          {activeCampaign.is_eligible ? (
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl bg-forest-800 text-white hover:bg-forest-900 active:scale-98 transition-all shadow-sm cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Commander sur cette production
            </button>
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
              {activeCampaign.is_eligible ? "Ou formuler une demande spécifique" : "Formuler une demande sur cette denrée"}
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
          defaultAddress={resellerInfo?.address || ""}
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

