"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { FeedProductionItem } from "@/lib/queries/feed";
import { loadResellerFeedPageAction } from "@/app/dashboard/reseller/feedActions";
import FeedProductionCard from "@/components/feed/FeedProductionCard";
import FeedSearchBar from "@/components/feed/FeedSearchBar";
import CategoryScroller from "@/components/feed/CategoryScroller";
import FeedHighlightBanner from "@/components/feed/FeedHighlightBanner";
import FeedFilters from "@/components/feed/FeedFilters";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Compass, RefreshCw, Sparkles, FilterX, AlertTriangle, ChevronDown } from "lucide-react";
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
  /** Vrai si le chargement initial du flux a échoué côté serveur */
  initialError?: boolean;
  categories: (FeedCategoryItem | string)[];
  provinces: ProvinceOption[];
  campaignsCount?: number;
  banners?: FeedBannerItem[];
}

interface FeedFiltersState {
  search: string;
  category: string;
  status: string;
  provinceId: string;
}

const filtersKey = (f: FeedFiltersState) =>
  JSON.stringify([f.search.trim(), f.category, f.status, f.provinceId]);

export default function FeedView({
  initialItems,
  totalCount,
  initialError = false,
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

  // FUN-06 : les productions sont filtrées et paginées côté serveur.
  const [items, setItems] = useState<FeedProductionItem[]>(initialItems);
  const [total, setTotal] = useState(totalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState(initialError);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Recherche différée pour éviter une requête à chaque frappe
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const appliedFilters: FeedFiltersState = {
    search: debouncedSearch,
    category,
    status,
    provinceId,
  };
  const appliedKey = filtersKey(appliedFilters);

  // Identifiant de requête : seules les réponses de la dernière requête sont appliquées
  const requestIdRef = useRef(0);
  const lastLoadedKeyRef = useRef(
    filtersKey({ search: "", category: "all", status: "all", provinceId: "all" })
  );

  const fetchFeedPage = useCallback(
    async (filters: FeedFiltersState, page: number, mode: "replace" | "append") => {
      const requestId = ++requestIdRef.current;
      if (mode === "replace") {
        setIsFiltering(true);
        setLoadMoreError(false);
      } else {
        setIsLoadingMore(true);
        setLoadMoreError(false);
      }

      try {
        const res = await loadResellerFeedPageAction({
          search: filters.search.trim(),
          category: filters.category,
          status: filters.status,
          provinceId: filters.provinceId,
          page,
        });
        if (requestId !== requestIdRef.current) return;

        if (res.error) {
          if (mode === "replace") setLoadError(true);
          else setLoadMoreError(true);
          return;
        }

        lastLoadedKeyRef.current = filtersKey(filters);
        setLoadError(false);
        setTotal(res.totalCount);
        setCurrentPage(res.page);
        setItems((prev) => {
          if (mode === "replace") return res.items;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
        });
      } catch (err) {
        console.error("Erreur chargement du flux:", err);
        if (requestId !== requestIdRef.current) return;
        if (mode === "replace") setLoadError(true);
        else setLoadMoreError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsFiltering(false);
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  // Rechargement de la première page à chaque changement de filtre appliqué
  useEffect(() => {
    if (appliedKey === lastLoadedKeyRef.current) return;
    fetchFeedPage(appliedFilters, 1, "replace");
    // appliedFilters est entièrement décrit par appliedKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey, fetchFeedPage]);

  const hasMore = !loadError && items.length < total;

  const handleLoadMore = () => {
    if (isLoadingMore || isFiltering) return;
    fetchFeedPage(appliedFilters, currentPage + 1, "append");
  };

  const handleRetry = () => {
    fetchFeedPage(appliedFilters, 1, "replace");
  };

  const hasActiveFilters =
    search !== "" || category !== "all" || status !== "all" || provinceId !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setProvinceId("all");
  };

  const handleRefresh = () => {
    // Bannières et compteurs (serveur) + première page du flux avec les filtres courants
    startTransition(() => {
      router.refresh();
    });
    fetchFeedPage(appliedFilters, 1, "replace");
  };

  const isBusy = isPending || isFiltering;

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
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-2.5 sm:px-3">
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
          <span className="text-xs text-gray-500 block mt-0.5" aria-live="polite">
            {loadError
              ? "Chargement impossible"
              : `${total} ${total > 1 ? "productions réelles trouvées" : "production réelle trouvée"}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:text-forest-700 hover:bg-forest-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          title="Actualiser les productions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? "animate-spin text-forest-700" : ""}`} aria-hidden="true" />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* 6. Grille des cartes de production compactes */}
      {isBusy ? (
        <FeedSkeleton count={6} />
      ) : loadError ? (
        <EmptyState
          title="Impossible de charger les productions"
          description="Le flux n'a pas pu être récupéré. Vérifiez votre connexion puis réessayez."
          icon={<AlertTriangle className="w-8 h-8 text-earth-700" />}
          action={
            <button
              type="button"
              onClick={handleRetry}
              className="px-5 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
            >
              Réessayer
            </button>
          }
        />
      ) : items.length > 0 ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {items.map((production, index) => (
              <FeedProductionCard
                key={production.id}
                production={production}
                index={index}
              />
            ))}
          </div>

          {/* Chargement progressif (FUN-06) */}
          {(hasMore || loadMoreError) && (
            <div className="flex flex-col items-center gap-2">
              {loadMoreError && (
                <p role="alert" className="text-xs text-rose-700">
                  Le chargement des productions suivantes a échoué. Veuillez réessayer.
                </p>
              )}
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-2xl border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-700 hover:text-forest-700 hover:bg-forest-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-forest-700" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{isLoadingMore ? "Chargement…" : "Charger plus de productions"}</span>
              </button>
              <span className="text-[11px] text-gray-500">
                {items.length} sur {total} affichées
              </span>
            </div>
          )}
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
