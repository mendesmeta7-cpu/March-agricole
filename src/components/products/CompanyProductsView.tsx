"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { CompanyProductItem, CatalogProduct } from "@/lib/queries/products";
import {
  toggleCompanyProductStatusAction,
  deleteCompanyProductAction,
} from "@/lib/actions/products";
import CompanyProductCard from "@/components/products/CompanyProductCard";
import AddProductDrawer from "@/components/products/AddProductDrawer";
import EditProductDrawer from "@/components/products/EditProductDrawer";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Scale,
  Layers,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";

interface CompanyProductsViewProps {
  initialItems: CompanyProductItem[];
  catalogProducts: CatalogProduct[];
  companyName: string;
}

export default function CompanyProductsView({
  initialItems,
  catalogProducts,
  companyName,
}: CompanyProductsViewProps) {
  const { toast } = useToast();

  const [items, setItems] = useState<CompanyProductItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Tiroirs / Modales
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CompanyProductItem | null>(null);

  // Boîte de dialogue de confirmation de suppression
  const [deletingProduct, setDeletingProduct] = useState<CompanyProductItem | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // État de bascule statut (actif / archivé)
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Synchronisation avec les données serveur si initialItems évolue
  if (initialItems !== items && !togglingId && !isDeleteLoading) {
    setItems(initialItems);
  }

  // Catégories agronomiques distinctes présentes dans le catalogue de l'entreprise
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.product.category))).filter(Boolean);
    return cats.sort();
  }, [items]);

  // Filtrage combiné réactif
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !q ||
        item.product.name.toLowerCase().includes(q) ||
        (item.custom_name && item.custom_name.toLowerCase().includes(q)) ||
        item.product.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.unit && item.unit.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "all" || item.product.category === selectedCategory;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, selectedCategory, statusFilter]);

  // Métriques réelles agrégées (0 mock data)
  const totalCount = items.length;
  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const totalProductionsCount = items.reduce(
    (sum, i) => sum + (i.productions_count || 0),
    0
  );
  const totalDeclaredVolume = items.reduce(
    (sum, i) => sum + (i.total_declared_volume || 0),
    0
  );

  // Bascule activation / archivage
  function handleToggleStatus(item: CompanyProductItem) {
    setTogglingId(item.id);
    const targetStatus = !item.is_active;

    startTransition(async () => {
      try {
        const res = await toggleCompanyProductStatusAction(item.id, item.is_active);
        if (res.success) {
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, is_active: targetStatus } : p))
          );
          toast.success(
            targetStatus
              ? `« ${item.custom_name || item.product.name} » a été réactivé dans votre exploitation.`
              : `« ${item.custom_name || item.product.name} » a été archivé.`
          );
        } else {
          toast.error(res.error || "Impossible de mettre à jour le statut du produit.");
        }
      } catch (err: any) {
        toast.error(err.message || "Une erreur est survenue lors de l'archivage.");
      } finally {
        setTogglingId(null);
      }
    });
  }

  // Déclenchement de la suppression via ConfirmDialog
  function handleRequestDelete(item: CompanyProductItem) {
    setDeletingProduct(item);
  }

  // Confirmation de suppression
  async function handleConfirmDelete() {
    if (!deletingProduct) return;
    setIsDeleteLoading(true);

    try {
      const res = await deleteCompanyProductAction(deletingProduct.id);
      if (res.success) {
        setItems((prev) => prev.filter((p) => p.id !== deletingProduct.id));
        toast.success(
          res.message ||
            `« ${deletingProduct.custom_name || deletingProduct.product.name} » a été retiré de votre exploitation.`
        );
        setDeletingProduct(null);
      } else {
        toast.error(res.error || "Impossible de supprimer ce produit.");
      }
    } catch (err: any) {
      toast.error(err.message || "Une erreur inattendue est survenue lors de la suppression.");
    } finally {
      setIsDeleteLoading(false);
    }
  }

  // Réinitialisation des filtres
  function handleResetFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Fil d'Ariane de navigation */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/company"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest-700" />
          <span>Retour au tableau de bord</span>
        </Link>
      </div>

      {/* En-tête principal moderne */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Catalogue Produits
            </h1>
            <Badge variant="forest" size="md">
              {activeCount} active{activeCount > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
            Configurez les denrées et variétés cultivées par{" "}
            <strong className="text-gray-900 font-semibold">{companyName}</strong>. Ce catalogue sert de base obligatoire pour déclarer vos parcelles et publier vos campagnes de vente.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsAddDrawerOpen(true)}
            className="w-full sm:w-auto gap-2 shadow-xs min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Associer un produit</span>
          </Button>
        </div>
      </div>

      {/* Bandeau de statistiques réelles (0 mock data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1.5">
            <span className="text-xs font-semibold text-gray-600">Total Références</span>
            <Package className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {totalCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Denrées configurées dans l'exploitation
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 bg-linear-to-br from-white to-emerald-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1.5">
            <span className="text-xs font-semibold text-emerald-900">Denrées Actives</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-950">
            {activeCount}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">
            Prêtes pour déclaration de récoltes
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1.5">
            <span className="text-xs font-semibold text-gray-600">Productions Liées</span>
            <Layers className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {totalProductionsCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Cycle(s) cultural(aux) rattaché(s)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-forest-100 bg-linear-to-br from-white to-forest-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-forest-800 mb-1.5">
            <span className="text-xs font-semibold text-forest-900">Volume Total Déclaré</span>
            <Scale className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-forest-950">
            {totalDeclaredVolume.toLocaleString("fr-FR")}
          </div>
          <div className="text-[11px] text-forest-700/80 mt-0.5">
            Quantités cumulées des productions
          </div>
        </div>
      </div>

      {/* Contenu principal : État vide initial OU Barre de filtres + Grille */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-10 shadow-xs">
          <EmptyState
            title="Votre exploitation n'a configuré aucun produit"
            description="Associez vos premières denrées depuis le référentiel national commun ou créez une référence personnalisée. Vos produits configurés serviront de point de départ obligatoire pour déclarer vos récoltes (Phase S4) et publier vos campagnes de vente."
            icon={<Package className="w-12 h-12 text-forest-700" />}
            action={
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsAddDrawerOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Associer mon premier produit</span>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* Barre de recherche et filtres responsive */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Recherche textuelle multi-champs */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par culture, variété, catégorie, unité ou notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-gray-400 hover:text-gray-600 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtre par catégorie agronomique */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {availableCategories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 min-h-[38px] shrink-0"
                >
                  <option value="all">Toutes les catégories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Segmented Control pour le statut */}
              <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "all"
                      ? "bg-white text-gray-900 shadow-2xs font-semibold"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Tous ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "active"
                      ? "bg-white text-forest-800 shadow-2xs font-semibold"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Actifs ({activeCount})
                </button>
                {inactiveCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("inactive")}
                    className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === "inactive"
                        ? "bg-white text-gray-900 shadow-2xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Archivés ({inactiveCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grille des cartes produits */}
          {filteredItems.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-gray-900">
                  Aucun produit ne correspond à vos filtres
                </p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Essayez de modifier votre mot-clé de recherche ou réinitialisez les critères de catégorie et de statut.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Réinitialiser les filtres</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredItems.map((item) => (
                <CompanyProductCard
                  key={item.id}
                  item={item}
                  onEdit={(prod) => setEditingProduct(prod)}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleRequestDelete}
                  isToggling={isPending && togglingId === item.id}
                  isDeleting={isDeleteLoading && deletingProduct?.id === item.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tiroir d'Ajout d'un produit */}
      <AddProductDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        catalogProducts={catalogProducts}
      />

      {/* Tiroir de Modification d'un produit */}
      <EditProductDrawer
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        productItem={editingProduct}
        onToggleStatus={handleToggleStatus}
        onDelete={handleRequestDelete}
        isToggling={isPending && togglingId === editingProduct?.id}
        isDeleting={isDeleteLoading && deletingProduct?.id === editingProduct?.id}
      />

      {/* Boîte de dialogue accessible de confirmation de suppression */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        title="Retirer ce produit de votre exploitation ?"
        description={
          deletingProduct?.productions_count && deletingProduct.productions_count > 0
            ? `Attention : « ${deletingProduct?.custom_name || deletingProduct?.product.name} » est rattaché à ${deletingProduct.productions_count} cycle(s) cultural(aux). Sa suppression physique sera bloquée par le système pour protéger votre historique agronomique. Nous vous recommandons de l'archiver.`
            : `Êtes-vous certain de vouloir supprimer « ${deletingProduct?.custom_name || deletingProduct?.product.name} » de votre catalogue d'exploitation ? Cette action ne supprime jamais le produit officiel du catalogue commun.`
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        isLoading={isDeleteLoading}
      />
    </div>
  );
}
