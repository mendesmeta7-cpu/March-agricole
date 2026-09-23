"use client";

import { useState } from "react";
import { Province } from "@/lib/queries/geography";
import ResellerLocationEditModal from "./ResellerLocationEditModal";
import Card from "@/components/ui/Card";
import { MapPin, Edit3 } from "lucide-react";

interface ResellerProfileTerritoryCardProps {
  provinces: Province[];
  currentProvinceId?: string;
  currentProvinceName?: string;
  currentCountryName?: string;
  currentCountryCode?: string;
  currentCity?: string;
  currentAddress?: string;
}

export default function ResellerProfileTerritoryCard({
  provinces,
  currentProvinceId,
  currentProvinceName,
  currentCountryName = "RDC",
  currentCountryCode = "COD",
  currentCity,
  currentAddress,
}: ResellerProfileTerritoryCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <Card padding="md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-earth-700" />
            Territoire d&apos;Opération Pivot (Éligibilité aux Campagnes)
          </h2>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-earth-50 hover:bg-earth-100 text-earth-800 text-xs font-bold border border-earth-200 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modifier
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Ce territoire détermine automatiquement votre éligibilité à la commande sur les campagnes de vente publiées par les producteurs agricoles.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block uppercase font-medium">Pays</span>
            <span className="font-bold text-gray-900 mt-0.5 block">
              {currentCountryName} ({currentCountryCode})
            </span>
          </div>
          <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
            <span className="text-xs text-earth-700 block uppercase font-medium">Province Clé</span>
            <span className="font-bold text-earth-900 mt-0.5 block">
              {currentProvinceName || "Province non renseignée"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block uppercase font-medium">Ville / Siège</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {currentCity || "Non spécifiée"}
            </span>
          </div>
        </div>

        {currentAddress && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-sm">
            <span className="text-xs text-gray-500 block uppercase font-medium">Adresse habituelle de livraison</span>
            <span className="text-gray-800">{currentAddress}</span>
          </div>
        )}
      </Card>

      <ResellerLocationEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        provinces={provinces}
        currentProvinceId={currentProvinceId}
        currentCity={currentCity}
        currentAddress={currentAddress}
      />
    </>
  );
}
