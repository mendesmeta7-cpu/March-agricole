"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { ProductionItem } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import {
  deleteProductionAction,
  archiveProductionAction,
} from "@/lib/actions/productions";
import ProductionCard from "./ProductionCard";
import ProductionDrawer from "./ProductionDrawer";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import {
  Tractor,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sprout,
  Package,
  Megaphone,
  X,
  RefreshCw,
  Scale,
} from "lucide-react";

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
  const { toast } = useToast();

  const [productions, setProductions] = useState<ProductionItem[]>(initialProductions);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "growing" | "harvested" | "with_campaign">("all");

  // Tiroir de création / modification
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<ProductionItem | null>(null);

  // Dialog de suppression sécurisée
  const [deletingProduction, setDeletingProduction] = useState<ProductionItem | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Dialog d'archivage doux
  const [archivingProduction, setArchivingProduction] = useState<ProductionItem | null>(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Synchronisation avec les données serveur si initialProductions évolue
  if (initialProductions !== productions && !isDrawerOpen && !isDeleteLoading && !isArchiveLoading) {
    setProductions(initialProductions);
  }

  const activeCompanyProducts = useMemo(
    () => companyProducts.filter((p) => p.is_active),
    [companyProducts]
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "all", label: "Tous les statuts" },
      { value: "growing", label: "En culture" },
      { value: "harvested", label: "Récoltée" },
      { value: "planned", label: "Planifiée" },
      { value: "draft", label: "Brouillon" },
      { value: "cancelled", label: "Annulée" },
    ],
    []
  );

  const productFilterOptions = useMemo(
    () => [
      { value: "all", label: "Toutes les cultures" },
      ...activeCompanyProducts.map((cp) => ({
        value: cp.product.id,
        label: cp.custom_name || cp.product.name,
        badge: cp.product.category,
      })),
    ],
    [activeCompanyProducts]
  );

  // Filtrage combiné réactif
  const filteredProductions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return productions.filter((prod) => {
      const matchesSearch =
        !q ||
        prod.title.toLowerCase().includes(q) ||
        prod.product.name.toLowerCase().includes(q) ||
        (prod.company_product?.custom_name &&
          prod.company_product.custom_name.toLowerCase().includes(q)) ||
        prod.location_name.toLowerCase().includes(q) ||
        (prod.description && prod.description.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || prod.status === statusFilter;
      const matchesProduct = productFilter === "all" || prod.product_id === productFilter;

      // Filtre rapide segmenté
      let matchesQuick = true;
      if (quickFilter === "growing") {
        matchesQuick = prod.status === "growing";
      } else if (quickFilter === "harvested") {
        matchesQuick = prod.status === "harvested";
      } else if (quickFilter === "with_campaign") {
        matchesQuick = Boolean(prod.has_active_campaign);
      }

      return matchesSearch && matchesStatus && matchesProduct && matchesQuick;
    });
  }, [productions, searchQuery, statusFilter, productFilter, quickFilter]);

  // Statistiques calculées exclusivement sur les données réelles (0 mock data)
  const stats = useMemo(() => {
    return {
      total: productions.length,
      growing: productions.filter((p) => p.status === "growing").length,
      harvested: productions.filter((p) => p.status === "harvested").length,
      withCampaign: productions.filter((p) => p.has_active_campaign).length,
    };
  }, [productions]);

  const handleOpenCreate = () => {
    setEditingProduction(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (production: ProductionItem) => {
    setEditingProduction(production);
    setIsDrawerOpen(true);
  };

  // Suppression physique sécurisée (rejetée si historique transactionnel)
  const confirmDelete = async () => {
    if (!deletingProduction) return;
    setIsDeleteLoading(true);

    try {
      const res = await deleteProductionAction(deletingProduction.id);
      if (res.error) {
        toast.error("Suppression impossible", res.error);
      } else {
        toast.success("Production supprimée", "Le cycle de production a été retiré avec succès.");
        setProductions((prev) => prev.filter((p) => p.id !== deletingProduction.id));
      }
    } catch {
      toast.error("Erreur", "Une erreur inattendue est survenue lors de la suppression.");
    } finally {
      setIsDeleteLoading(false);
      setDeletingProduction(null);
    }
  };

  // Archivage doux (retire du flux public sans altérer les commandes)
  const confirmArchive = async () => {
    if (!archivingProduction) return;
    setIsArchiveLoading(true);

    try {
      const res = await archiveProductionAction(archivingProduction.id);
      if (res.error) {
        toast.error("Erreur d'archivage", res.error);
      } else {
        toast.success("Production archivée", "La production est passée en statut annulé et retirée du flux public.");
        setProductions((prev) =>
          prev.map((p) =>
            p.id === archivingProduction.id
              ? { ...p, status: "cancelled", is_public: false }
              : p
          )
        );
      }
    } catch {
      toast.error("Erreur", "Une erreur inattendue est survenue lors de l'archivage.");
    } finally {
      setIsArchiveLoading(false);
      setArchivingProduction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/company"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tableau de bord</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Productions & Récoltes</span>
      </div>

      {/* En-tête de section moderne */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest-50 text-forest-700 flex items-center justify-center shadow-2xs">
              <Tractor className="w-5 h-5 text-forest-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-950">
                  Productions & Récoltes
                </h1>
                <span className="text-[11px] font-bold text-forest-800 bg-forest-50 px-2.5 py-0.5 rounded-full border border-forest-100">
                  {productions.length} enregistrée(s)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                Suivez vos cycles culturaux réels pour l&apos;exploitation « {companyName} ».
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="shadow-xs"
        >
          Nouvelle production
        </Button>
      </div>

      {/* Cartouches de statistiques réelles (0 mock data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            <Tractor className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total des cycles</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">En culture</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">{stats.growing}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Récoltées</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">{stats.harvested}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-earth-50 text-earth-800 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-earth-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Campagnes actives</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">{stats.withCampaign}</p>
          </div>
        </Card>
      </div>

      {/* Barre de Recherche, Filtres & Segmented Control */}
      {productions.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Recherche textuelle */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Rechercher par titre, culture, variété, localisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600 transition-all bg-gray-50/50 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtre par statut */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusFilterOptions}
                  leftIcon={<Filter className="w-3.5 h-3.5 text-gray-400" />}
                  selectSize="sm"
                />
              </div>

              {/* Filtre par produit d'exploitation */}
              <div className="w-full sm:w-56">
                <Select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  options={productFilterOptions}
                  searchable
                  selectSize="sm"
                />
              </div>
            </div>
          </div>

          {/* Filtres rapides segmentés */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-gray-400 mr-1 shrink-0">Accès rapide :</span>
            <button
              type="button"
              onClick={() => setQuickFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                quickFilter === "all"
                  ? "bg-forest-800 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Toutes ({productions.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("growing")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                quickFilter === "growing"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              🌱 En champ ({stats.growing})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("harvested")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                quickFilter === "harvested"
                  ? "bg-amber-700 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
            >
              🌾 Récoltées ({stats.harvested})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("with_campaign")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                quickFilter === "with_campaign"
                  ? "bg-earth-800 text-white shadow-2xs"
                  : "bg-earth-50 text-earth-800 hover:bg-earth-100"
              }`}
            >
              📢 Avec offre ({stats.withCampaign})
            </button>
          </div>
        </div>
      )}

      {/* Grille des Productions ou États Vides */}
      {productions.length === 0 ? (
        activeCompanyProducts.length === 0 ? (
          <EmptyState
            title="Configurez d'abord votre catalogue produits"
            description="Avant de déclarer une récolte ou un cycle cultural, votre exploitation doit enregistrer les produits qu'elle cultive dans son catalogue."
            icon={<Package className="w-8 h-8 text-amber-600" />}
            action={
              <Link
                href="/dashboard/company/products"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 text-white font-semibold text-xs sm:text-sm hover:bg-forest-800 transition-all shadow-xs"
              >
                <Package className="w-4 h-4" />
                Accéder au catalogue produits
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Aucune production enregistrée pour le moment."
            description="Déclarez votre première récolte pour suivre l'avancement de vos cultures en champ et préparer vos futures campagnes de vente."
            icon={<Tractor className="w-8 h-8 text-forest-700" />}
            action={
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreate}
              >
                Déclarer une production
              </Button>
            }
          />
        )
      ) : filteredProductions.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-2xs space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Aucun cycle de production ne correspond à vos critères de recherche.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setProductFilter("all");
              setQuickFilter("all");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900 underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réinitialiser tous les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredProductions.map((production) => (
            <ProductionCard
              key={production.id}
              production={production}
              onEdit={handleOpenEdit}
              onDelete={(prod) => setDeletingProduction(prod)}
              onArchive={(prod) => setArchivingProduction(prod)}
            />
          ))}
        </div>
      )}

      {/* Tiroir Moderne de Création / Modification (R1) */}
      <ProductionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        companyProducts={companyProducts}
        editingProduction={editingProduction}
        onSuccess={() => {
          // Rechargement doux
          window.location.reload();
        }}
      />

      {/* Dialogue de Confirmation de Suppression Sécurisée */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduction)}
        onClose={() => setDeletingProduction(null)}
        onConfirm={confirmDelete}
        title="Supprimer ce cycle de production ?"
        description={`Êtes-vous certain de vouloir supprimer définitivement « ${deletingProduction?.title} » ? Cette action est irréversible. Si des offres, commandes ou demandes y sont rattachées, la suppression sera automatiquement rejetée pour préserver l'historique.`}
        confirmText="Supprimer définitivement"
        cancelText="Conserver la production"
        variant="destructive"
        isLoading={isDeleteLoading}
      />

      {/* Dialogue de Confirmation d'Archivage Doux */}
      <ConfirmDialog
        isOpen={Boolean(archivingProduction)}
        onClose={() => setArchivingProduction(null)}
        onConfirm={confirmArchive}
        title="Archiver cette production ?"
        description={`La production « ${archivingProduction?.title} » sera retirée du flux public des revendeurs et son statut passera à annulé. L'historique des commandes et demandes antérieures restera intact.`}
        confirmText="Archiver la production"
        cancelText="Annuler"
        variant="warning"
        isLoading={isArchiveLoading}
      />
    </div>
  );
}
