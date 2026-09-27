"use client";

import { MapPin, Activity, RotateCcw } from "lucide-react";

interface ProvinceOption {
  id: string;
  name: string;
}

interface FeedFiltersProps {
  status: string;
  onStatusChange: (value: string) => void;
  provinceId: string;
  onProvinceChange: (value: string) => void;
  onReset: () => void;
  provinces: ProvinceOption[];
}

export default function FeedFilters({
  status,
  onStatusChange,
  provinceId,
  onProvinceChange,
  onReset,
  provinces,
}: FeedFiltersProps) {
  const hasActiveFilters = status !== "all" || provinceId !== "all";

  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
        <span>Filtrer par territoire ou cycle cultural :</span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-forest-700 hover:text-forest-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Filtre par Province */}
        <div className="relative">
          <MapPin className="w-4 h-4 text-forest-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={provinceId}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">Toutes les provinces</option>
            {provinces.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre par Statut du cycle */}
        <div className="relative">
          <Activity className="w-4 h-4 text-forest-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">Tous les cycles de culture</option>
            <option value="growing">En cours de culture</option>
            <option value="harvested">Récoltée</option>
            <option value="planned">Planifiée</option>
          </select>
        </div>
      </div>
    </div>
  );
}
