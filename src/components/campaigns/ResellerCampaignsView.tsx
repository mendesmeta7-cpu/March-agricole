"use client";

import { useState, useMemo } from "react";
import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import ResellerCampaignCard from "./ResellerCampaignCard";
import ResellerCampaignDetailDrawer from "./ResellerCampaignDetailDrawer";
import ResellerCampaignSkeleton from "./ResellerCampaignSkeleton";
import OrderFormModal from "@/components/orders/OrderFormModal";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Link from "next/link";
import {
  Megaphone,
  Search,
  Filter,
  CheckCircle2,
  PackageOpen,
  Info,
  TrendingUp,
  ArrowLeft,
  ShoppingBag,
  SlidersHorizontal,
  X,
  Sparkles,
  MapPin,
  RefreshCw,
} from "lucide-react";

interface ResellerCampaignsViewProps {
  initialCampaigns: ResellerCampaignItem[];
  resellerProvinceId?: string;
  resellerProvinceName?: string;
  resellerCity?: string;
  resellerAddress?: string;
}

export default function ResellerCampaignsView({
  initialCampaigns,
  resellerProvinceId,
  resellerProvinceName,
  resellerCity = "",
  resellerAddress = "",
}: ResellerCampaignsViewProps) {
  const [campaigns] = useState<ResellerCampaignItem[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // État du modal de commande
  const [orderingCampaign, setOrderingCampaign] = useState<ResellerCampaignItem | null>(null);

  // État du drawer de consultation détaillée
  const [viewingCampaign, setViewingCampaign] = useState<ResellerCampaignItem | null>(null);

  // État du drawer de filtres sur mobile
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Catégories uniques issues des données réelles
  const categories = useMemo(() => {
    return Array.from(
      new Set(campaigns.map((c) => c.product.category))
    ).filter(Boolean);
  }, [campaigns]);

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "Toutes les catégories" },
      ...categories.map((cat) => ({ value: cat, label: cat, badge: cat })),
    ],
    [categories]
  );

  // Filtrage réactif côté client
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesCategory =
        selectedCategory === "all" || camp.product.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.company.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEligibility = !eligibleOnly || camp.is_eligible;

      return matchesCategory && matchesSearch && matchesEligibility;
    });
  }, [campaigns, selectedCategory, searchQuery, eligibleOnly]);

  const eligibleCount = useMemo(() => {
    return campaigns.filter((c) => c.is_eligible).length;
  }, [campaigns]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedCategory !== "all" || eligibleOnly;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setEligibleOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Fil d'Ariane & Navigation contextuelle */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/reseller"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-forest-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-lg py-1 px-1.5 -ml-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l&apos;accueil revendeur</span>
        </Link>

        {/* Badges d'état temps réel */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-forest-50 border border-forest-200/80 text-forest-800 text-xs font-bold shadow-2xs">
            <Megaphone className="w-3.5 h-3.5 text-forest-700" />
            <span>{campaigns.length} offres ouvertes</span>
          </span>
          {resellerProvinceName && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{eligibleCount} dans ma région</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. En-tête de section moderne */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-950">
                Offres Commerciales
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Consultez les productions agricoles mises en vente active par les exploitations partenaires avec prix fermes, volumes garantis et contrôle d&apos;éligibilité territoriale.
            </p>
          </div>

          {/* Raccourci vers Demandes d'Achat */}
          <Link
            href="/dashboard/reseller/demands"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-forest-50 text-gray-700 hover:text-forest-800 border border-gray-200 hover:border-forest-200 text-xs font-bold transition-all shadow-2xs shrink-0 self-start md:self-auto"
          >
            <TrendingUp className="w-4 h-4 text-forest-700" />
            <span>Mes demandes d&apos;achat</span>
          </Link>
        </div>

        {/* Cartouches d'aide et transparence territoriale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-5 mt-5 border-t border-gray-100">
          <div className="p-3.5 rounded-2xl bg-forest-50/50 border border-forest-100 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="text-xs text-forest-900 leading-relaxed">
              <strong>Éligibilité ({resellerProvinceName || "Votre province"}) :</strong> Les offres sont réservées selon les zones de livraison déclarées par les producteurs. Cliquez sur <strong>Commander</strong> pour bloquer un stock ferme si votre province est couverte.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-earth-50/50 border border-earth-100 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-earth-700 shrink-0 mt-0.5" />
            <div className="text-xs text-earth-900 leading-relaxed">
              <strong>Offre non disponible ?</strong> Si une production vous intéresse mais ne dessert pas votre province, exprimez un besoin d&apos;approvisionnement pour signaler votre intérêt solvable au producteur.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barre de Recherche et Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Recherche textuelle */}
        <div className="relative flex-1 min-w-0 max-w-lg">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par culture, variété, exploitation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-forest-600 focus:border-forest-600 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Contrôles Desktop : Catégories + Toggle Éligibilité */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Menu déroulant des catégories */}
          <div className="w-52">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={categoryOptions}
              searchable
              selectSize="sm"
            />
          </div>

          {/* Toggle Éligibilité */}
          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-forest-50 border border-gray-200 text-xs sm:text-sm font-medium text-gray-800 cursor-pointer select-none transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
              className="w-4 h-4 rounded text-forest-700 focus:ring-forest-500 border-gray-300 cursor-pointer"
            />
            <span>Desservant ma région ({eligibleCount})</span>
          </label>

          {/* Bouton réinitialiser si filtres actifs */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bouton Filtres Mobile */}
        <div className="sm:hidden flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 active:bg-gray-100"
          >
            <SlidersHorizontal className="w-4 h-4 text-forest-700" />
            <span>
              Filtres {hasActiveFilters && "• Actifs"}
            </span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-100"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* 4. Grille des Offres ou État Vide */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 mb-4 shadow-2xs">
            <PackageOpen className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-gray-950 mb-1">
            {hasActiveFilters
              ? "Aucune offre ne correspond à vos filtres"
              : "Aucune offre commerciale ouverte pour le moment"}
          </h3>

          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
            {hasActiveFilters
              ? "Essayez de modifier votre recherche textuelle, d'élargir la catégorie ou de désactiver le filtre régional."
              : "Les exploitations agricoles partenaires n'ont pas de campagnes de vente active actuellement. Vous pouvez exprimer un besoin d'approvisionnement pour solliciter les producteurs."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Réinitialiser les filtres
              </Button>
            )}

            <Link
              href="/dashboard/reseller/demands"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs sm:text-sm transition-all shadow-xs"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Exprimer un besoin d&apos;approvisionnement</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {filteredCampaigns.map((camp) => (
            <ResellerCampaignCard
              key={camp.id}
              campaign={camp}
              onOrderClick={(c) => setOrderingCampaign(c)}
              onViewDetails={(c) => setViewingCampaign(c)}
            />
          ))}
        </div>
      )}

      {/* 5. Tiroir Drawer de filtres sur Mobile */}
      <Drawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        side="bottom"
        title="Filtres des Offres Commerciales"
        description="Affinez les campagnes selon vos critères d'approvisionnement."
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                handleResetFilters();
                setMobileFiltersOpen(false);
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              Réinitialiser
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Appliquer les filtres
            </Button>
          </div>
        }
      >
        <div className="space-y-5 py-2">
          {/* Catégories */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Catégorie de produit
            </label>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={categoryOptions}
              searchable
              selectSize="sm"
            />
          </div>

          {/* Éligibilité territoriale */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Éligibilité régionale
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(e) => setEligibleOnly(e.target.checked)}
                className="w-4 h-4 rounded text-forest-700 focus:ring-forest-500 border-gray-300"
              />
              <div className="text-xs">
                <span className="font-bold text-gray-900 block">
                  Desservant ma province ({resellerProvinceName || "Ma région"})
                </span>
                <span className="text-gray-500 text-[11px]">
                  Afficher uniquement les {eligibleCount} offre(s) livrables sur mon territoire.
                </span>
              </div>
            </label>
          </div>
        </div>
      </Drawer>

      {/* 6. Drawer de consultation détaillée d'une offre */}
      <ResellerCampaignDetailDrawer
        isOpen={!!viewingCampaign}
        onClose={() => setViewingCampaign(null)}
        campaign={viewingCampaign}
        onOrderClick={(c) => {
          setViewingCampaign(null);
          setOrderingCampaign(c);
        }}
      />

      {/* 7. Modal de passation de commande ferme (préservé à 100%) */}
      {orderingCampaign && (
        <OrderFormModal
          isOpen={!!orderingCampaign}
          onClose={() => setOrderingCampaign(null)}
          campaign={orderingCampaign}
          resellerProvinceId={resellerProvinceId}
          resellerProvinceName={resellerProvinceName}
          defaultCity={resellerCity}
          defaultAddress={resellerAddress}
        />
      )}
    </div>
  );
}
