"use client";

import { useState } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import ProductionCard from "./ProductionCard";
import ProductionFormModal from "./ProductionFormModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import {
  Tractor,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sprout,
  AlertCircle,
  Package,
} from "lucide-react";
import Link from "next/link";

interface CompanyProductionsViewProps {
  initialProductions: ProductionItem[];
  companyProducts: CompanyProductItem[];
  companyName: string;
}

export default function CompanyProductionsView({
  initialProductions,
  companyProducts,
  companyName,
}: CompanyProductionsViewProps) {
  const [productions, setProductions] = useState<ProductionItem[]>(initialProductions);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<ProductionItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Synchronisation en cas de revalidation
  if (initialProductions !== productions && !isModalOpen) {
    setProductions(initialProductions);
  }

  // Filtrage combiné
  const filteredProductions = productions.filter((prod) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      prod.title.toLowerCase().includes(q) ||
      prod.product.name.toLowerCase().includes(q) ||
      prod.location_name.toLowerCase().includes(q) ||
      (prod.description && prod.description.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || prod.status === statusFilter;
    const matchesProduct = productFilter === "all" || prod.product_id === productFilter;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  // Statistiques calculées en temps réel sur les données authentiques
  const stats = {
    total: productions.length,
    planned: productions.filter((p) => p.status === "planned").length,
    growing: productions.filter((p) => p.status === "growing").length,
    harvested: productions.filter((p) => p.status === "harvested").length,
  };

  const handleOpenCreate = () => {
    setEditingProduction(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (production: ProductionItem) => {
    setEditingProduction(production);
    setIsModalOpen(true);
  };

  const handleSuccess = (message: string) => {
    setFeedback({ type: "success", text: message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const activeCompanyProducts = companyProducts.filter((p) => p.is_active);

  return (
    <div className="space-y-6">
      {/* Navigation fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/company"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Productions</span>
      </div>

      {/* En-tête de page */}
      <PageHeader
        title="Productions & Prévisions Culturales"
        description={`Déclarez et gérez vos cycles de production agricole pour l'exploitation « ${companyName} ».`}
        action={
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 text-white font-medium text-sm hover:bg-forest-800 transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouvelle production
          </button>
        }
      />

      {/* Feedback Toast / Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-1"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Cartouches de statistiques réelles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            <Tractor className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total cycles</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Planifiées</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.planned}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">En culture</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.growing}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Récoltées</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.harvested}</p>
          </div>
        </Card>
      </div>

      {/* Barre de Recherche et Filtres */}
      {productions.length > 0 && (
        <div className="p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Barre de recherche textuelle */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Rechercher par titre, produit, localisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600 transition-all bg-gray-50/50 focus:bg-white"
              />
            </div>

            {/* Filtre par statut */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-600 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="planned">Planifiée</option>
                <option value="growing">En culture</option>
                <option value="harvested">Récoltée</option>
                <option value="draft">Brouillon</option>
                <option value="cancelled">Annulée</option>
              </select>

              {/* Filtre par produit */}
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-600 bg-white"
              >
                <option value="all">Tous les produits</option>
                {activeCompanyProducts.map((cp) => (
                  <option key={cp.product.id} value={cp.product.id}>
                    {cp.custom_name || cp.product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Grille des Productions ou États Vides */}
      {productions.length === 0 ? (
        activeCompanyProducts.length === 0 ? (
          <EmptyState
            title="Configurez d'abord vos produits"
            description="Avant de déclarer une production agricole, vous devez associer les produits cultivés par votre exploitation à votre catalogue."
            icon={<Package className="w-8 h-8 text-amber-600" />}
            action={
              <Link
                href="/dashboard/company/products"
                className="px-4 py-2.5 rounded-xl bg-forest-700 text-white font-medium text-xs sm:text-sm hover:bg-forest-800 transition-all shadow-xs"
              >
                Accéder à la gestion des produits
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Vous n'avez encore enregistré aucune production."
            description="Enregistrez votre première récolte planifiée pour suivre vos cycles de culture et préparer vos offres futures."
            icon={<Tractor className="w-8 h-8 text-forest-700" />}
            action={
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 rounded-xl bg-forest-700 text-white font-medium text-xs sm:text-sm hover:bg-forest-800 transition-all shadow-xs hover:shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                + Nouvelle production
              </button>
            }
          />
        )
      ) : filteredProductions.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <p className="text-sm text-gray-600">
            Aucune production ne correspond à vos critères de recherche.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setProductFilter("all");
            }}
            className="text-xs font-semibold text-forest-700 hover:text-forest-800 underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProductions.map((production) => (
            <ProductionCard
              key={production.id}
              production={production}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {/* Modale de Création / Modification */}
      <ProductionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyProducts={companyProducts}
        editingProduction={editingProduction}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
