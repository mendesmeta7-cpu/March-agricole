"use client";

import { useState } from "react";
import { Province } from "@/lib/queries/geography";
import ProductionDemandModal from "@/components/demands/ProductionDemandModal";
import { TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

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
}

export default function ResellerProductionDetailActions({
  production,
  provinces,
  defaultProvinceId,
}: ResellerProductionDetailActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      {canRequest ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-98 transition-all shadow-sm cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          Faire une demande sur cette production
        </button>
      ) : (
        <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center border border-gray-100">
          Cette production n&apos;est pas encore ouverte aux expressions de besoin (statut : {production.status}).
        </div>
      )}

      <ProductionDemandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
