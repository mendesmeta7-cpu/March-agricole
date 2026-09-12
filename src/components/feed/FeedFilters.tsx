"use client";

import { Search, Filter, RotateCcw, MapPin, Tag } from "lucide-react";

interface ProvinceOption {
  id: string;
  name: string;
}

interface FeedFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
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
  provinceId,
  onProvinceChange,
  onReset,
  categories,
  provinces,
}: FeedFiltersProps) {
  const hasActiveFilters = search !== "" || category !== "all" || provinceId !== "all";

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        {/* 1. Recherche par mot-clé */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une culture, une production, une exploitation..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* 2. Filtre par Catégorie */}
        <div className="relative min-w-[180px]">
          <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">Toutes catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filtre par Province */}
        <div className="relative min-w-[180px]">
          <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={provinceId}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">Toutes provinces</option>
            {provinces.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Bouton Réinitialisation */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        )}
      </div>
    </div>
  );
}
