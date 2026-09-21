"use client";

import { useState, useTransition } from "react";
import { CatalogProduct } from "@/lib/queries/products";
import { toggleAdminCatalogProductStatusAction } from "@/lib/actions/admin/products";
import AdminProductModal from "@/components/admin/AdminProductModal";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  Package,
  Plus,
  Search,
  Tag,
  Edit3,
  Power,
  PowerOff,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface AdminProductsViewProps {
  initialProducts: CatalogProduct[];
}

export default function AdminProductsView({ initialProducts }: AdminProductsViewProps) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Synchronisation si initialProducts change
  if (initialProducts !== products && !togglingId) {
    setProducts(initialProducts);
  }

  // Catégories distinctes
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ).sort();

  // Filtrage combiné
  const filteredProducts = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term));

    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.is_active) ||
      (statusFilter === "inactive" && !p.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleToggleStatus = (product: CatalogProduct) => {
    setTogglingId(product.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await toggleAdminCatalogProductStatusAction(product.id, product.is_active);
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === product.id ? { ...p, is_active: !p.is_active } : p
            )
          );
          setFeedback({ type: "success", text: res.message || "Statut mis à jour." });
        } else {
          setFeedback({ type: "error", text: res.error || "Erreur lors du changement de statut." });
        }
      } catch (err: any) {
        setFeedback({ type: "error", text: err.message || "Une erreur est survenue." });
      } finally {
        setTogglingId(null);
      }
    });
  };

  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <PageHeader
        title="Catalogue Officiel des Produits"
        description="Gérez le référentiel centralisé des denrées agricoles mis à disposition des exploitations pour leurs cultures."
        badge={
          <Badge variant="neutral">
            {products.length} {products.length > 1 ? "références officielles" : "référence officielle"}
          </Badge>
        }
        action={
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une référence</span>
          </button>
        }
      />

      {/* Messages de feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
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
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Barre de filtres et recherche */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Recherche textuelle */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une référence par nom, catégorie..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filtre par catégorie */}
          <div className="relative w-full md:w-56">
            <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par statut */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-white text-gray-950 shadow-2xs"
                  : "text-gray-600 hover:text-gray-950"
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-gray-600 hover:text-gray-950"
              }`}
            >
              Actifs ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "inactive"
                  ? "bg-white text-gray-700 shadow-2xs"
                  : "text-gray-600 hover:text-gray-950"
              }`}
            >
              Inactifs ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* Grille des produits du catalogue officiel */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title={
            products.length === 0
              ? "Aucun produit dans le catalogue global"
              : "Aucune référence ne correspond à votre recherche"
          }
          description={
            products.length === 0
              ? "Le catalogue officiel est actuellement vide. Vous pouvez ajouter la première référence officielle dès maintenant."
              : "Essayez de modifier vos termes de recherche ou de réinitialiser vos filtres de catégorie."
          }
          icon={<Package className="w-8 h-8 text-slate-700" />}
          action={
            products.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-all shadow-xs"
              >
                Ajouter le premier produit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setStatusFilter("all");
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const isToggling = togglingId === product.id;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                  product.is_active
                    ? "border-gray-200/90 hover:border-slate-300"
                    : "border-gray-200 bg-gray-50/50 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  {/* Visuel officiel et badges */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate max-w-[120px]">
                          {product.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                            product.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {product.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-950 mt-1 truncate">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 truncate">
                        Unité par défaut : <span className="font-medium">{product.default_unit}</span>
                      </p>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Actions Administrateur */}
                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(product);
                      setIsModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-950 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>

                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggleStatus(product)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      product.is_active
                        ? "text-red-700 hover:bg-red-50 border border-red-200"
                        : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                    } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                  >
                    {product.is_active ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Désactiver</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5" />
                        <span>Activer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout ou de modification */}
      <AdminProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
        categories={categories}
      />
    </div>
  );
}
