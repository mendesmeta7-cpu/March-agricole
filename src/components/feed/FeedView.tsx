"use client";

import { useState, useTransition, useMemo } from "react";
import { FeedProductionItem } from "@/lib/queries/feed";
import FeedProductionCard from "@/components/feed/FeedProductionCard";
import FeedFilters from "@/components/feed/FeedFilters";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Sprout, Compass, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProvinceOption {
  id: string;
  name: string;
}

interface FeedViewProps {
  initialItems: FeedProductionItem[];
  totalCount: number;
  categories: string[];
  provinces: ProvinceOption[];
}

export default function FeedView({
  initialItems,
  totalCount,
  categories,
  provinces,
}: FeedViewProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [provinceId, setProvinceId] = useState("all");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filtrage réactif côté client sur les données chargées
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // 1. Filtre par recherche textuelle
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
      {/* 1. Barre de filtres réactive */}
      <FeedFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        status={status}
        onStatusChange={setStatus}
        provinceId={provinceId}
        onProvinceChange={setProvinceId}
        onReset={handleResetFilters}
        categories={categories}
        provinces={provinces}
      />

      {/* 2. Bandeau d'information et compteur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            {filteredItems.length}{" "}
            {filteredItems.length > 1 ? "productions publiées" : "production publiée"}
          </span>
          {(search || category !== "all" || status !== "all" || provinceId !== "all") && (
            <span className="text-xs text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200 font-medium">
              Filtres actifs
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">
            Données réelles issues des exploitations agricoles
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="text-xs text-gray-500 hover:text-forest-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 3. Contenu principal : Grille de publications / Skeletons / Empty state */}
      {isPending ? (
        <FeedSkeleton count={6} />
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((production) => (
            <FeedProductionCard key={production.id} production={production} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            search || category !== "all" || status !== "all" || provinceId !== "all"
              ? "Aucune production ne correspond à vos filtres"
              : "Aucune production publiée pour le moment"
          }
          description={
            search || category !== "all" || status !== "all" || provinceId !== "all"
              ? "Essayez d'élargir vos critères de recherche géographique ou de sélectionner une autre catégorie de denrée."
              : "Les exploitations agricoles partenaires n'ont pas encore publié de cycle de culture public. Revenez régulièrement pour découvrir les prochaines récoltes."
          }
          icon={<Compass className="w-8 h-8 text-forest-700" />}
          action={
            search || category !== "all" || status !== "all" || provinceId !== "all" ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-forest-700 text-white text-xs sm:text-sm font-semibold hover:bg-forest-800 transition-all shadow-xs cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            ) : undefined
          }
        />
      )}

      {/* 4. Note de clarté métier (Règles d'Or V1) */}
      <div className="p-4 rounded-2xl bg-forest-50/60 border border-forest-100 flex items-start gap-3 text-xs text-forest-900">
        <Sparkles className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block">Découverte anticipée des cultures :</span>
          <p className="text-forest-800 leading-relaxed">
            Ce fil d&apos;actualité présente les productions réelles en cours ou planifiées par les exploitants. Les engagements fermes d&apos;achat et les réservations de stocks s&apos;effectueront lors du lancement des campagnes commerciales dédiées.
          </p>
        </div>
      </div>
    </div>
  );
}
