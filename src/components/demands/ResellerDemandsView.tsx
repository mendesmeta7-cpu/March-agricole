"use client";

import { useState, useTransition, useMemo } from "react";
import Select from "@/components/ui/Select";
import { DemandItem } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province, Country } from "@/lib/queries/geography";
import { cancelDemandAction } from "@/lib/actions/demands";
import ResellerDemandCard from "./ResellerDemandCard";
import ResellerDemandDetailDrawer from "./ResellerDemandDetailDrawer";
import DemandFormModal from "./DemandFormModal";
import DemandResponsesModal from "./DemandResponsesModal";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import InfoRepliable from "@/components/ui/InfoRepliable";
import FiltresActifs, { type CritereActif } from "@/components/ui/FiltresActifs";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Package,
  Layers,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface ResellerDemandsViewProps {
  initialDemands: DemandItem[];
  catalogProducts: CatalogProduct[];
  provinces: Province[];
  countries: Country[];
  companies?: { id: string; name: string }[];
  resellerProvinceId?: string;
  resellerCountryId?: string;
  businessName?: string;
}

export default function ResellerDemandsView({
  initialDemands,
  catalogProducts,
  provinces,
  countries,
  companies = [],
  resellerProvinceId,
  resellerCountryId,
  businessName,
}: ResellerDemandsViewProps) {
  const { toast } = useToast();

  const [demands, setDemands] = useState<DemandItem[]>(initialDemands);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [onlyWithResponses, setOnlyWithResponses] = useState(false);

  // Tiroir de filtres mobile
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Modales et Drawers de consultation/action
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<DemandItem | null>(null);

  const [selectedDemandForResponses, setSelectedDemandForResponses] = useState<DemandItem | null>(null);
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);

  const [selectedDemandForDetail, setSelectedDemandForDetail] = useState<DemandItem | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Annulation sécurisée avec ConfirmDialog
  const [demandToCancelId, setDemandToCancelId] = useState<string | null>(null);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Synchronisation en cas de revalidation serveur
  if (initialDemands !== demands && !isFormModalOpen && !isResponsesModalOpen && !isDetailDrawerOpen) {
    setDemands(initialDemands);
  }

  // Filtrage multi-critères
  const filteredDemands = useMemo(() => {
    return demands.filter((dem) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        dem.product.name.toLowerCase().includes(q) ||
        dem.province.name.toLowerCase().includes(q) ||
        (dem.city && dem.city.toLowerCase().includes(q)) ||
        (dem.notes && dem.notes.toLowerCase().includes(q)) ||
        (dem.target_company && dem.target_company.name.toLowerCase().includes(q)) ||
        (dem.production && dem.production.title.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || dem.status === statusFilter;
      const matchesType = typeFilter === "all" || dem.demand_type === typeFilter;
      const matchesProduct = productFilter === "all" || dem.product_id === productFilter;
      const matchesResponses = !onlyWithResponses || (dem.responses && dem.responses.length > 0);

      return matchesSearch && matchesStatus && matchesType && matchesProduct && matchesResponses;
    });
  }, [demands, searchQuery, statusFilter, typeFilter, productFilter, onlyWithResponses]);

  // Statistiques authentiques
  const stats = useMemo(() => {
    const total = demands.length;
    const active = demands.filter((d) => d.status === "active").length;
    const converted = demands.filter((d) => d.status === "converted").length;
    const totalResponses = demands.reduce((acc, d) => acc + (d.responses?.length || 0), 0);
    return { total, active, converted, totalResponses };
  }, [demands]);

  // Options du filtre Produit, partagées par les filtres d'ordinateur et le tiroir. Calculées ici, au niveau
  // du composant : un useMemo placé dans un bloc conditionnel ({demands.length > 0 && …}) changeait le
  // nombre de hooks quand la liste passait de vide à non vide sans rechargement (Lot 7, règle des hooks).
  const productOptions = useMemo(
    () => [
      { value: "all", label: "Tous les produits" },
      ...catalogProducts.map((p) => ({ value: p.id, label: p.name })),
    ],
    [catalogProducts]
  );

  // Nombre de filtres actifs
  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (productFilter !== "all" ? 1 : 0) +
    (onlyWithResponses ? 1 : 0) +
    (searchQuery.trim().length > 0 ? 1 : 0);

  // Critères du tiroir de filtres rappelés sous 1 024 px (NAV-06, arbitrage C), mêmes libellés que les filtres
  const LIBELLES_TYPE: Record<string, string> = { general: "Demandes générales", production: "Demandes sur production" };
  const LIBELLES_STATUT: Record<string, string> = { active: "Active", converted: "Convertie en commande", cancelled: "Annulée", expired: "Expirée" };
  const filtresActifs: CritereActif[] = [
    ...(typeFilter !== "all"
      ? [{ cle: "type", libelle: "Type", valeur: LIBELLES_TYPE[typeFilter] ?? typeFilter, retirer: () => setTypeFilter("all") }]
      : []),
    ...(statusFilter !== "all"
      ? [{ cle: "statut", libelle: "Statut", valeur: LIBELLES_STATUT[statusFilter] ?? statusFilter, retirer: () => setStatusFilter("all") }]
      : []),
    ...(productFilter !== "all"
      ? [{ cle: "produit", libelle: "Produit", valeur: catalogProducts.find((p) => p.id === productFilter)?.name ?? "Produit", retirer: () => setProductFilter("all") }]
      : []),
    ...(onlyWithResponses
      ? [{ cle: "propositions", libelle: "Propositions", valeur: "Avec propositions", retirer: () => setOnlyWithResponses(false) }]
      : []),
  ];

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setProductFilter("all");
    setOnlyWithResponses(false);
  };

  const handleOpenCreate = () => {
    setEditingDemand(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (demand: DemandItem) => {
    setEditingDemand(demand);
    setIsFormModalOpen(true);
  };

  const handleViewResponses = (demand: DemandItem) => {
    setSelectedDemandForResponses(demand);
    setIsResponsesModalOpen(true);
  };

  const handleViewDetail = (demand: DemandItem) => {
    setSelectedDemandForDetail(demand);
    setIsDetailDrawerOpen(true);
  };

  const handleRequestCancel = (demandId: string) => {
    setDemandToCancelId(demandId);
    setIsConfirmCancelOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!demandToCancelId) return;
    setIsCancelling(true);

    startTransition(async () => {
      try {
        const res = await cancelDemandAction(demandToCancelId);
        if (res.error) {
          toast.error("Impossible d'annuler", { description: res.error });
        } else {
          setDemands((prev) =>
            prev.map((d) => (d.id === demandToCancelId ? { ...d, status: "cancelled" } : d))
          );
          toast.success("Demande annulée", {
            description: res.message || "Votre demande a été retirée du marché.",
          });
        }
      } catch (err) {
        console.error("Erreur annulation demande:", err);
        toast.error("Impossible d'annuler", { description: "La requête n'a pas pu aboutir. Vérifiez votre connexion puis réessayez." });
      } finally {
        // LOAD-03 : état toujours réinitialisé
        setIsCancelling(false);
        setIsConfirmCancelOpen(false);
        setDemandToCancelId(null);
      }
    });
  };

  const handleFormSuccess = (message: string) => {
    toast.success("Demande enregistrée", { description: message });
  };

  const handleOrderSuccess = (orderNumber: string) => {
    toast.success("Commande enregistrée !", {
      description: `Votre commande n° ${orderNumber} a été créée avec réservation ferme de stock.`,
    });
    // Marquer localement la demande comme convertie si applicable
    if (selectedDemandForResponses) {
      setDemands((prev) =>
        prev.map((d) =>
          d.id === selectedDemandForResponses.id ? { ...d, status: "converted" } : d
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête commun (Lot 6B, NAV-02) */}
      <PageHeader
        breadcrumb={[{ href: "/dashboard/reseller", label: "Tableau de bord" }]}
        title="Mes demandes"
        badge={
          businessName ? (
            <span className="text-xs text-gray-500 font-medium hidden sm:inline-block">
              Établissement : <strong className="text-gray-800">{businessName}</strong>
            </span>
          ) : undefined
        }
        description="Exprimez vos besoins d'approvisionnement auprès des sociétés de vos bassins cibles. Une demande ne réserve aucun stock : elle permet aux sociétés de vous soumettre des propositions."
        action={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-sm"
          >
            Exprimer une demande générale
          </Button>
        }
      />

      {/* Cartouches de Statistiques Réelles (0 Mock Data).
          Lot 6B (MOB-07) : libellés lisibles en entier, sur deux lignes au besoin (plus de troncature).
          Correctif NAV-06 (arbitrage B) : sous 640 px, cartes basses, libellé à gauche et valeur à droite,
          icône masquée ; mêmes intitulés et mêmes valeurs. Présentation inchangée au-delà. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-earth-50 text-earth-800 items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2 sm:block">
            <p className="text-xs text-gray-500 font-semibold leading-tight">Total exprimé</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-950 shrink-0">{stats.total}</p>
          </div>
        </div>

        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2 sm:block">
            <p className="text-xs text-gray-500 font-semibold leading-tight">Demandes actives</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-950 shrink-0">{stats.active}</p>
          </div>
        </div>

        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2 sm:block">
            <p className="text-xs text-gray-500 font-semibold leading-tight">Propositions reçues</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-950 shrink-0">{stats.totalResponses}</p>
          </div>
        </div>

        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-forest-50 text-forest-800 items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2 sm:block">
            <p className="text-xs text-gray-500 font-semibold leading-tight">Converties en commande</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-950 shrink-0">{stats.converted}</p>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres. Correctif NAV-06 (arbitrage C) : sans cadre sous 640 px ;
          les critères choisis dans le tiroir (sous 1 024 px) restent rappelés et retirables. */}
      {demands.length > 0 && (
        <div className="sm:p-4 sm:bg-white sm:rounded-2xl sm:border sm:border-gray-200/90 sm:shadow-2xs space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2.5">
            {/* Recherche textuelle */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                aria-label="Rechercher par produit, province, ville, notes"
                type="text"
                placeholder="Rechercher par produit, province, ville, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-earth-600 transition-all bg-gray-50/60 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bouton Filtres Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 max-sm:min-h-11 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span>Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-earth-800 text-white text-[11px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Filtres Desktop */}
            <div className="hidden lg:flex items-center gap-2 flex-wrap">
              {/* Type */}
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "all", label: "Tous les types" },
                  { value: "general", label: "Demandes générales" },
                  { value: "production", label: "Demandes sur production" },
                ]}
              />

              {/* Statut */}
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "Tous les statuts" },
                  { value: "active", label: "Active" },
                  { value: "converted", label: "Convertie en commande" },
                  { value: "cancelled", label: "Annulée" },
                  { value: "expired", label: "Expirée" },
                ]}
              />

              {/* Denrée */}
              <Select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                searchable
                options={productOptions}
              />

              {/* Toggle offres reçues */}
              <button
                type="button"
                onClick={() => setOnlyWithResponses(!onlyWithResponses)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  onlyWithResponses
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Avec propositions ({stats.totalResponses})</span>
              </button>

              {/* Bouton reset filtres */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-2 text-gray-400 hover:text-earth-800 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Réinitialiser les filtres"
                  aria-label="Réinitialiser les filtres"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Critères du tiroir rappelés sous 1 024 px (NAV-06, arbitrage C) */}
          <FiltresActifs criteres={filtresActifs} className="lg:hidden" />
        </div>
      )}

      {/* Tiroir de Filtres Mobile (Drawer R1 side="bottom") */}
      <Drawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        size="md"
        side="bottom"
        title="Filtres de recherche"
        description="Ajustez vos critères pour filtrer vos demandes d'achat"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              disabled={activeFiltersCount === 0}
            >
              Réinitialiser
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsMobileFiltersOpen(false)}
            >
              Voir les résultats ({filteredDemands.length})
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">Type de demande</label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "all", label: "Tous les types" },
                { value: "general", label: "Demandes générales" },
                { value: "production", label: "Demandes sur production" },
              ]}
            />
          </div>

          {/* Statut */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">Statut du cycle de vie</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "Tous les statuts" },
                { value: "active", label: "Active" },
                { value: "converted", label: "Convertie en commande" },
                { value: "cancelled", label: "Annulée" },
                { value: "expired", label: "Expirée" },
              ]}
            />
          </div>

          {/* Denrée */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">Produit</label>
            <Select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              searchable
              options={productOptions}
            />
          </div>

          {/* Checkbox offres */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithResponses}
                onChange={(e) => setOnlyWithResponses(e.target.checked)}
                className="w-4 h-4 rounded text-earth-800 focus:ring-earth-600 border-gray-300"
              />
              <span className="text-xs font-medium text-gray-800">
                Afficher uniquement les demandes ayant reçu des propositions
              </span>
            </label>
          </div>
        </div>
      </Drawer>

      {/* Grille des Demandes ou États Vides */}
      {demands.length === 0 ? (
        <EmptyState
          title="Vous n'avez encore exprimé aucune demande d'achat."
          description="Publiez vos prévisions d'approvisionnement en produits agricoles auprès des sociétés ou parcourez les productions publiques pour formuler une demande directe."
          icon={<TrendingUp className="w-8 h-8 text-earth-800" />}
          action={
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Exprimer une demande générale
            </Button>
          }
        />
      ) : filteredDemands.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-gray-200/90 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">
              Aucune demande ne correspond à vos filtres
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Essayez de modifier votre mot-clé de recherche ou de réinitialiser vos critères de filtrage.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {filteredDemands.map((demand) => (
            <ResellerDemandCard
              key={demand.id}
              demand={demand}
              onEdit={handleOpenEdit}
              onCancel={handleRequestCancel}
              onViewResponses={handleViewResponses}
              onViewDetail={handleViewDetail}
              isCancelling={isCancelling && demandToCancelId === demand.id}
            />
          ))}
        </div>
      )}

      {/* Cartouche d'aide, replié par défaut (Lot 6B, TXT-04), placé après la liste
          (correctif NAV-06, arbitrage D) : texte inchangé, toujours consultable. */}
      <InfoRepliable summary="Cycle de vie transparent" tone="earth">
        <p>
          1. Vous publiez une demande générale ou ciblez une production.
          2. Les sociétés qualifiées vous soumettent des propositions chiffrées (quantité, prix ferme).
          3. Vous choisissez la proposition idéale pour passer commande, avec réservation du stock.
        </p>
      </InfoRepliable>

      {/* Drawer de Consultation Détaillée */}
      <ResellerDemandDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedDemandForDetail(null);
        }}
        demand={selectedDemandForDetail}
        onEdit={handleOpenEdit}
        onCancel={handleRequestCancel}
        onViewResponses={handleViewResponses}
        isCancelling={isCancelling && demandToCancelId === selectedDemandForDetail?.id}
      />

      {/* Modale de Création / Modification de besoin général */}
      <DemandFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingDemand(null);
        }}
        catalogProducts={catalogProducts}
        provinces={provinces}
        countries={countries}
        companies={companies}
        editingDemand={editingDemand}
        defaultProvinceId={resellerProvinceId}
        defaultCountryId={resellerCountryId}
        onSuccess={handleFormSuccess}
      />

      {/* Modale des propositions reçues */}
      <DemandResponsesModal
        isOpen={isResponsesModalOpen}
        onClose={() => {
          setIsResponsesModalOpen(false);
          setSelectedDemandForResponses(null);
        }}
        demand={selectedDemandForResponses}
        provinces={provinces}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Modale de Confirmation d'Annulation Sécurisée (ConfirmDialog R1) */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        onClose={() => {
          if (!isCancelling) {
            setIsConfirmCancelOpen(false);
            setDemandToCancelId(null);
          }
        }}
        onConfirm={handleConfirmCancel}
        title="Retirer cette demande ?"
        description="Cette demande ne sera plus visible par les sociétés et ne pourra plus recevoir de nouvelles propositions. Cette action est irréversible."
        confirmText="Confirmer l'annulation"
        cancelText="Conserver la demande"
        variant="destructive"
        isLoading={isCancelling}
      />
    </div>
  );
}
