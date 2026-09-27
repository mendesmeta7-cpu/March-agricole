"use client";

import { useState, useTransition, useMemo } from "react";
import { FeedProductionItem } from "@/lib/queries/feed";
import FeedProductionCard from "@/components/feed/FeedProductionCard";
import FeedSearchBar from "@/components/feed/FeedSearchBar";
import CategoryScroller from "@/components/feed/CategoryScroller";
import FeedHighlightBanner from "@/components/feed/FeedHighlightBanner";
import FeedFilters from "@/components/feed/FeedFilters";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Compass, RefreshCw, Sparkles, FilterX } from "lucide-react";
import { useRouter } from "next/navigation";

import { FeedCategoryItem } from "@/lib/queries/feedCategories";
import { FeedBannerItem } from "@/lib/queries/feedBanners";

interface ProvinceOption {
  id: string;
  name: string;
}

interface FeedViewProps {
  initialItems: FeedProductionItem[];
  totalCount: number;
  categories: (FeedCategoryItem | string)[];
  provinces: ProvinceOption[];
  campaignsCount?: number;
  banners?: FeedBannerItem[];
}

export default function FeedView({
  initialItems,
  totalCount,
  categories,
  provinces,
  campaignsCount = 0,
  banners = [],
}: FeedViewProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [provinceId, setProvinceId] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filtrage réactif côté client sur les données réelles chargées
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // 1. Filtre par recherche textuelle (titre, produit, société, localisation)
      if (search.trim() !== "") {
        const term = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(term);
        const matchesProduct = item.product.name.toLowerCase().includes(term);
        const matchesCompany = item.company.name.toLowerCase().includes(term);
        const matchesLocation = item.location_name.toLowerCase().includes(term);
        if (!matchesTitle && !matchesProduct && !matchesCompany && !matchesLocation) {
          return false;
        }
      }

      // 2. Filtre par catégorie
      if (category !== "all" && item.product.category !== category) {
        return false;
      }

      // 3. Filtre par statut
      if (status !== "all" && item.status !== status) {
        return false;
      }

      // 4. Filtre par province
      if (provinceId !== "all" && item.company.province_id !== provinceId) {
        return false;
      }

      return true;
    });
  }, [initialItems, search, category, status, provinceId]);

  const hasActiveFilters =
    search !== "" || category !== "all" || status !== "all" || provinceId !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setProvinceId("all");
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Barre de recherche principale positionnée en haut */}
      <div className="pt-1">
        <FeedSearchBar
          search={search}
          onSearchChange={setSearch}
          hasSecondaryFilters={status !== "all" || provinceId !== "all"}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen(!filtersOpen)}
        />
      </div>

      {/* 2. Filtres secondaires rétractables (Province & Statut) */}
      {filtersOpen && (
        <FeedFilters
          status={status}
          onStatusChange={setStatus}
          provinceId={provinceId}
          onProvinceChange={setProvinceId}
          onReset={() => {
            setStatus("all");
            setProvinceId("all");
          }}
          provinces={provinces}
        />
      )}

      {/* 3. Carrousel horizontal de catégories avec icônes illustrées */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
          <span>Catégories</span>
          {category !== "all" && (
            <button
              type="button"
              onClick={() => setCategory("all")}
              className="text-forest-700 hover:underline cursor-pointer lowercase"
            >
              tout voir
            </button>
          )}
        </div>
        <CategoryScroller
          categories={categories}
          selectedCategory={category}
          onSelectCategory={setCategory}
        />
      </div>

      {/* 4. Carrousel dynamique de bannières avec visuels Cloudinary */}
      {!hasActiveFilters && (
        <FeedHighlightBanner campaignsCount={campaignsCount} banners={banners} />
      )}

      {/* 5. En-tête de section "Productions disponibles" / "À découvrir" */}
      <div className="flex items-center justify-between gap-3 pt-2 px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
            {hasActiveFilters ? "Résultats de recherche" : "Productions disponibles"}
          </h2>
          <span className="text-xs text-gray-500 block mt-0.5">
            {filteredItems.length}{" "}
            {filteredItems.length > 1 ? "productions réelles trouvées" : "production réelle trouvée"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:text-forest-700 hover:bg-forest-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          title="Actualiser les productions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-forest-700" : ""}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* 6. Grille des cartes de production compactes */}
      {isPending ? (
        <FeedSkeleton count={6} />
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((production, index) => (
            <FeedProductionCard
              key={production.id}
              production={production}
              index={index}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            hasActiveFilters
              ? "Aucune production ne correspond à vos filtres"
              : "Aucune production disponible pour le moment"
          }
          description={
            hasActiveFilters
              ? "Essayez de modifier votre recherche textuelle ou d'élargir la catégorie de produit."
              : "Les exploitations agricoles partenaires n'ont pas encore publié de nouvelles productions. Revenez régulièrement pour découvrir les prochaines récoltes."
          }
          icon={
            hasActiveFilters ? (
              <FilterX className="w-8 h-8 text-forest-700" />
            ) : (
              <Compass className="w-8 h-8 text-forest-700" />
            )
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
              >
                Réinitialiser les filtres
              </button>
            ) : undefined
          }
        />
      )}

      {/* 7. Note d'information & transparence (Règle d'or V1) */}
      <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100 flex items-start gap-3 text-xs text-forest-900">
        <Sparkles className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block">Transparence des données réelles :</span>
          <p className="text-forest-800/90 leading-relaxed">
            Toutes les productions affichées proviennent d&apos;enregistrements authentiques effectués par les exploitations agricoles partenaires. Les réservations fermes s&apos;effectuent lors du passage de commande sur les campagnes ouvertes.
          </p>
        </div>
      </div>
    </div>
  );
}
