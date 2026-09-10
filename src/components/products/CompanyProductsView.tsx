"use client";

import { useState, useTransition } from "react";
import { CompanyProductItem, CatalogProduct } from "@/lib/queries/products";
import { toggleCompanyProductStatusAction } from "@/lib/actions/products";
import AddProductModal from "@/components/products/AddProductModal";
import EditProductModal from "@/components/products/EditProductModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit3,
  Power,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  Tag,
  Scale,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  const [items, setItems] = useState<CompanyProductItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CompanyProductItem | null>(null);

  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mise à jour de l'état local si initialItems change via revalidation
  if (initialItems !== items && !togglingId) {
    setItems(initialItems);
  }

  // Filtrage combiné
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      item.product.name.toLowerCase().includes(q) ||
      (item.custom_name && item.custom_name.toLowerCase().includes(q)) ||
      item.product.category.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === "all" || item.product.category === selectedCategory;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && item.is_active) ||
      (statusFilter === "inactive" && !item.is_active);

    return matchesQuery && matchesCategory && matchesStatus;
  });

  // Liste des catégories distinctes présentes
  const categories = Array.from(new Set(items.map((i) => i.product.category)));

  // Toggle activation / désactivation
  function handleToggleStatus(item: CompanyProductItem) {
    setTogglingId(item.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await toggleCompanyProductStatusAction(item.id, item.is_active);
        if (res.success) {
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p))
          );
          setFeedback({ type: "success", text: res.message || "Statut mis à jour." });
        } else {
          setFeedback({ type: "error", text: res.error || "Erreur de mise à jour." });
        }
      } catch (err: any) {
        setFeedback({ type: "error", text: err.message || "Une erreur est survenue." });
      } finally {
        setTogglingId(null);
      }
    });
  }

  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = items.length - activeCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Navigation fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link href="/dashboard/company" className="hover:text-forest-800 flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Retour au tableau de bord</span>
        </Link>
      </div>

      {/* En-tête de page */}
      <PageHeader
        title="Catalogue des Produits"
        description={`Gérez les denrées et semences agricoles cultivées et commercialisées par ${companyName}.`}
        badge={
          <Badge variant="forest">
            {activeCount} produit{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
          </Badge>
        }
        action={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 text-white font-semibold text-sm hover:bg-forest-800 transition-all shadow-xs min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Associer un produit</span>
          </button>
        }
      />

      {/* Message de notification d'action */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline opacity-70 p-1"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Vue principale : État vide OU Liste de produits */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-8 shadow-xs">
          <EmptyState
            title="Vous n'avez encore configuré aucun produit"
            description="Votre exploitation n'est associée à aucune denrée agricole pour le moment. Associez des produits du catalogue national ou enregistrez vos cultures pour pouvoir ultérieurement déclarer vos parcelles de production et publier vos offres de vente."
            icon={<Package className="w-10 h-10 text-forest-700" />}
            action={
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-forest-700 text-white font-semibold text-sm hover:bg-forest-800 transition-all shadow-xs min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Associer mon premier produit</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Barre de recherche et filtres */}
          <Card padding="sm" className="bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Recherche textuelle */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, variété ou catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
                />
              </div>

              {/* Filtres par catégorie et par statut */}
              <div className="flex items-center gap-2 flex-wrap">
                {categories.length > 0 && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 text-gray-700 min-h-[38px]"
                  >
                    <option value="all">Toutes catégories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`flex-1 sm:flex-initial text-center px-2.5 py-1.5 rounded-lg transition-all ${
                      statusFilter === "all"
                        ? "bg-white text-gray-900 shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Tous ({items.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`flex-1 sm:flex-initial text-center px-2.5 py-1.5 rounded-lg transition-all ${
                      statusFilter === "active"
                        ? "bg-white text-forest-800 shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Actifs ({activeCount})
                  </button>
                  {inactiveCount > 0 && (
                    <button
                      onClick={() => setStatusFilter("inactive")}
                      className={`flex-1 sm:flex-initial text-center px-2.5 py-1.5 rounded-lg transition-all ${
                        statusFilter === "inactive"
                          ? "bg-white text-gray-900 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Archivés ({inactiveCount})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Grille des cartes produits */}
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 bg-white rounded-2xl border border-gray-200">
              Aucun produit ne correspond aux filtres appliqués.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
                    item.is_active
                      ? "border-gray-200 hover:border-forest-200 hover:shadow-sm"
                      : "border-gray-200/60 bg-gray-50/50 opacity-75"
                  }`}
                >
                  <div>
                    {/* En-tête de la carte */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge variant="neutral" size="sm">
                        {item.product.category}
                      </Badge>
                      <Badge
                        variant={item.is_active ? "success" : "warning"}
                        size="sm"
                      >
                        {item.is_active ? "Actif" : "Archivé"}
                      </Badge>
                    </div>

                    {/* Visuel + Titres */}
                    <div className="flex items-start gap-3 mb-3">
                      {item.product.image_url ? (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden relative flex-shrink-0 border border-gray-200">
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 text-forest-700 flex items-center justify-center flex-shrink-0 font-bold">
                          <Package className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          {item.custom_name || item.product.name}
                        </h3>
                        {item.custom_name && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            Réf. catalogue : <span className="font-medium text-gray-700">{item.product.name}</span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1 text-xs text-forest-800 font-medium mt-1">
                          <Scale className="w-3 h-3 text-forest-600" />
                          Unité : {item.product.default_unit}
                        </div>
                      </div>
                    </div>

                    {/* Description ou notes */}
                    {(item.description || item.product.description) && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        {item.description || item.product.description}
                      </p>
                    )}
                  </div>

                  {/* Actions en pied de carte */}
                  <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEditingProduct(item)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[38px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifier
                    </button>

                    <button
                      onClick={() => handleToggleStatus(item)}
                      disabled={isPending && togglingId === item.id}
                      className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 min-h-[38px] ${
                        item.is_active
                          ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                          : "text-forest-800 bg-forest-50 hover:bg-forest-100"
                      }`}
                      title={item.is_active ? "Désactiver ce produit" : "Réactiver ce produit"}
                    >
                      {item.is_active ? (
                        <>
                          <PowerOff className="w-3.5 h-3.5" />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <Power className="w-3.5 h-3.5" />
                          Réactiver
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals interactifs */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        catalogProducts={catalogProducts}
      />

      <EditProductModal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        productItem={editingProduct}
      />
    </div>
  );
}
