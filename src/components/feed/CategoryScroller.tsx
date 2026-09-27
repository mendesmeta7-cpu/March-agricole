"use client";

import {
  LayoutGrid,
  Apple,
  Carrot,
  Wheat,
  Sprout,
  Bean,
  Droplets,
  Coffee,
  Package,
} from "lucide-react";

interface CategoryScrollerProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryScroller({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryScrollerProps) {
  // Fonction utilitaire associant une icône adaptée à chaque catégorie
  const getCategoryIcon = (cat: string) => {
    const normalized = cat.toLowerCase();
    if (normalized.includes("fruit")) {
      return <Apple className="w-5 h-5 text-emerald-600" />;
    }
    if (normalized.includes("légume") || normalized.includes("legume")) {
      return <Carrot className="w-5 h-5 text-orange-500" />;
    }
    if (normalized.includes("céréale") || normalized.includes("cereale") || normalized.includes("maïs")) {
      return <Wheat className="w-5 h-5 text-amber-500" />;
    }
    if (normalized.includes("tubercule") || normalized.includes("manioc")) {
      return <Sprout className="w-5 h-5 text-amber-700" />;
    }
    if (normalized.includes("légumineuse") || normalized.includes("legumineuse") || normalized.includes("haricot")) {
      return <Bean className="w-5 h-5 text-emerald-700" />;
    }
    if (normalized.includes("oléagineux") || normalized.includes("oleagineux") || normalized.includes("huile")) {
      return <Droplets className="w-5 h-5 text-yellow-600" />;
    }
    if (normalized.includes("rente") || normalized.includes("café") || normalized.includes("cacao")) {
      return <Coffee className="w-5 h-5 text-amber-900" />;
    }
    return <Package className="w-5 h-5 text-forest-600" />;
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        {/* Option : Toutes les catégories */}
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={`flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer transition-all duration-200 select-none ${
            selectedCategory === "all" ? "scale-102" : "opacity-80 hover:opacity-100"
          }`}
          aria-pressed={selectedCategory === "all"}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-2xs ${
              selectedCategory === "all"
                ? "bg-forest-700 text-white ring-2 ring-forest-700 ring-offset-2 shadow-sm"
                : "bg-white text-gray-700 border border-gray-200/90 group-hover:border-forest-300 group-hover:bg-forest-50/50"
            }`}
          >
            <LayoutGrid
              className={`w-5 h-5 ${
                selectedCategory === "all" ? "text-white stroke-[2.2]" : "text-forest-700 stroke-[1.8]"
              }`}
            />
          </div>
          <span
            className={`text-xs font-semibold tracking-tight transition-colors text-center ${
              selectedCategory === "all" ? "text-forest-900 font-bold" : "text-gray-600 group-hover:text-gray-900"
            }`}
          >
            Toutes
          </span>
        </button>

        {/* Liste des catégories réelles issues de la base */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer transition-all duration-200 select-none ${
                isSelected ? "scale-102" : "opacity-85 hover:opacity-100"
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-2xs ${
                  isSelected
                    ? "bg-forest-50 border-2 border-forest-600 shadow-xs ring-2 ring-forest-600/20 ring-offset-1"
                    : "bg-white border border-gray-200/90 group-hover:border-forest-300 group-hover:bg-forest-50/30"
                }`}
              >
                {getCategoryIcon(cat)}
              </div>
              <span
                className={`text-xs tracking-tight transition-colors text-center max-w-[76px] truncate ${
                  isSelected ? "text-forest-900 font-bold" : "text-gray-600 group-hover:text-gray-900 font-medium"
                }`}
                title={cat}
              >
                {cat}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
