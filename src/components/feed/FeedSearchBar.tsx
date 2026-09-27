"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";

interface FeedSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  hasSecondaryFilters?: boolean;
  onToggleFilters?: () => void;
  filtersOpen?: boolean;
}

export default function FeedSearchBar({
  search,
  onSearchChange,
  hasSecondaryFilters = false,
  onToggleFilters,
  filtersOpen = false,
}: FeedSearchBarProps) {
  return (
    <div className="relative flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher une production, un produit..."
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-gray-200/90 bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all shadow-xs hover:border-gray-300"
          aria-label="Rechercher une production, un produit"
        />
        {search.trim().length > 0 && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {onToggleFilters && (
        <button
          type="button"
          onClick={onToggleFilters}
          className={`h-12 px-3.5 rounded-2xl border flex items-center justify-center gap-1.5 transition-all text-xs font-semibold flex-shrink-0 cursor-pointer shadow-xs ${
            hasSecondaryFilters || filtersOpen
              ? "bg-forest-50 border-forest-300 text-forest-800"
              : "bg-white border-gray-200/90 text-gray-700 hover:bg-gray-50"
          }`}
          aria-label="Afficher ou masquer les filtres avancés"
          title="Filtres avancés (Province, Statut)"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtres</span>
          {hasSecondaryFilters && (
            <span className="w-2 h-2 rounded-full bg-forest-600" />
          )}
        </button>
      )}
    </div>
  );
}
