"use client";

import { useMemo } from "react";
import { MapPin, Activity, RotateCcw } from "lucide-react";
import Select from "@/components/ui/Select";

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

  const provinceOptions = useMemo(
    () => [
      { value: "all", label: "Toutes les provinces" },
      ...provinces.map((prov) => ({ value: prov.id, label: prov.name })),
    ],
    [provinces]
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Tous les cycles de culture" },
      { value: "growing", label: "En cours de culture" },
      { value: "harvested", label: "Récoltée" },
      { value: "planned", label: "Planifiée" },
    ],
    []
  );

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
        <div>
          <Select
            value={provinceId}
            onChange={(e) => onProvinceChange(e.target.value)}
            options={provinceOptions}
            leftIcon={<MapPin className="w-4 h-4 text-forest-600" />}
            searchable
            selectSize="sm"
          />
        </div>

        {/* Filtre par Statut du cycle */}
        <div>
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            options={statusOptions}
            leftIcon={<Activity className="w-4 h-4 text-forest-600" />}
            selectSize="sm"
          />
        </div>
      </div>
    </div>
  );
}
