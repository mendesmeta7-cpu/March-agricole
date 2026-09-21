"use client";

import { Search, Filter, RotateCcw, MapPin, Tag, Activity } from "lucide-react";

interface ProvinceOption {
  id: string;
  name: string;
}

interface FeedFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  provinceId: string;
  onProvinceChange: (value: string) => void;
  onReset: () => void;
  categories: string[];
  provinces: ProvinceOption[];
}

export default function FeedFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  provinceId,
  onProvinceChange,
  onReset,
  categories,
  provinces,
}: FeedFiltersProps) {
  const hasActiveFilters = search !== "" || category !== "all" || status !== "all" || provinceId !== "all";

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
      {/* 1. Recherche par mot-clé */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher une culture, une denrée, une exploitation..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* 2. Pills de catégories horizontaux et scrollables */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Tag className="w-3.5 h-3.5" />
          <span>Catégories :</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
              category === "all"
                ? "bg-forest-700 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Toutes les catégories
          </button>
          {categories.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-forest-700 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Filtres secondaires : Province, Statut et Réinitialisation */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
        {/* Filtre par Province */}
        <div className="relative flex-1">
          <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={provinceId}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">Toutes provinces</option>
            {provinces.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre par Statut du cycle */}
        <div className="relative flex-1">
          <Activity className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">Tous les statuts de culture</option>
            <option value="planned">Planifiée</option>
            <option value="growing">En cours de culture</option>
            <option value="harvested">Récoltée</option>
          </select>
        </div>

        {/* Bouton Réinitialisation */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>
    </div>
  );
}
