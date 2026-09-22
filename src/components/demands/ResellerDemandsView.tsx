"use client";

import { useState, useTransition } from "react";
import { DemandItem, DemandStatus } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province, Country } from "@/lib/queries/geography";
import { cancelDemandAction } from "@/lib/actions/demands";
import ResellerDemandCard from "./ResellerDemandCard";
import DemandFormModal from "./DemandFormModal";
import DemandResponsesModal from "./DemandResponsesModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
} from "lucide-react";
import Link from "next/link";

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
  const [demands, setDemands] = useState<DemandItem[]>(initialDemands);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<DemandItem | null>(null);
  const [selectedDemandForResponses, setSelectedDemandForResponses] = useState<DemandItem | null>(null);
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Synchronisation en cas de revalidation serveur
  if (initialDemands !== demands && !isModalOpen && !cancellingId && !isResponsesModalOpen) {
    setDemands(initialDemands);
  }

  // Filtrage combiné
  const filteredDemands = demands.filter((dem) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      dem.product.name.toLowerCase().includes(q) ||
      dem.province.name.toLowerCase().includes(q) ||
      (dem.city && dem.city.toLowerCase().includes(q)) ||
      (dem.notes && dem.notes.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || dem.status === statusFilter;
    const matchesType = typeFilter === "all" || dem.demand_type === typeFilter;
    const matchesProduct = productFilter === "all" || dem.product_id === productFilter;

    return matchesSearch && matchesStatus && matchesType && matchesProduct;
  });

  // Statistiques réelles
  const stats = {
    total: demands.length,
    active: demands.filter((d) => d.status === "active").length,
    converted: demands.filter((d) => d.status === "converted").length,
  };

  const handleOpenCreate = () => {
    setEditingDemand(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (demand: DemandItem) => {
    setEditingDemand(demand);
    setIsModalOpen(true);
  };

  const handleViewResponses = (demand: DemandItem) => {
    setSelectedDemandForResponses(demand);
    setIsResponsesModalOpen(true);
  };

  const handleCancel = (demandId: string) => {
    if (!confirm("Êtes-vous certain de vouloir retirer cette expression de besoin ?")) {
      return;
    }
    setCancellingId(demandId);
    startTransition(async () => {
      const res = await cancelDemandAction(demandId);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setDemands((prev) =>
          prev.map((d) => (d.id === demandId ? { ...d, status: "cancelled" } : d))
        );
        setFeedback({ type: "success", text: res.message || "Demande annulée." });
        setTimeout(() => setFeedback(null), 4000);
      }
      setCancellingId(null);
    });
  };

  const handleSuccess = (message: string) => {
    setFeedback({ type: "success", text: message });
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Navigation fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/reseller"
          className="hover:text-earth-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Demandes d&apos;approvisionnement</span>
      </div>

      {/* En-tête de page */}
      <PageHeader
        title="Mes Demandes d'Approvisionnement"
        description="Exprimez vos besoins prévisionnels en denrées agricoles ou faites des demandes directes sur des productions en cours."
        action={
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-earth-700 text-white font-medium text-sm hover:bg-earth-800 transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Exprimer un besoin général
          </button>
        }
      />

      {/* Feedback Toast */}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-earth-50 text-earth-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total exprimé</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Besoins actifs</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Converties en commande</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.converted}</p>
          </div>
        </Card>
      </div>

      {/* Barre de Recherche et Filtres */}
      {demands.length > 0 && (
        <div className="p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Rechercher par denrée, province, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-earth-600 transition-all bg-gray-50/50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block" />
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-earth-600 bg-white"
              >
                <option value="all">Tous les types</option>
                <option value="general">Demandes générales</option>
                <option value="production">Demandes sur production</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-earth-600 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Active</option>
                <option value="converted">Convertie</option>
                <option value="cancelled">Annulée</option>
                <option value="expired">Expirée</option>
              </select>

              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-earth-600 bg-white"
              >
                <option value="all">Toutes les denrées</option>
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Grille des Demandes ou États Vides */}
      {demands.length === 0 ? (
        <EmptyState
          title="Vous n'avez encore exprimé aucune demande d'approvisionnement."
          description="Publiez les volumes et denrées que vous recherchez ou naviguez dans les productions publiques pour transmettre vos besoins aux producteurs."
          icon={<TrendingUp className="w-8 h-8 text-earth-700" />}
          action={
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-earth-700 text-white font-medium text-xs sm:text-sm hover:bg-earth-800 transition-all shadow-xs hover:shadow-md cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              + Exprimer un besoin général
            </button>
          }
        />
      ) : filteredDemands.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <p className="text-sm text-gray-600">
            Aucune demande ne correspond à vos critères de recherche.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
              setProductFilter("all");
            }}
            className="text-xs font-semibold text-earth-700 hover:text-earth-800 underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDemands.map((demand) => (
            <ResellerDemandCard
              key={demand.id}
              demand={demand}
              onEdit={handleOpenEdit}
              onCancel={handleCancel}
              onViewResponses={handleViewResponses}
              isCancelling={cancellingId === demand.id}
            />
          ))}
        </div>
      )}

      {/* Modale de Création / Modification de besoin général */}
      <DemandFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        catalogProducts={catalogProducts}
        provinces={provinces}
        countries={countries}
        companies={companies}
        editingDemand={editingDemand}
        defaultProvinceId={resellerProvinceId}
        defaultCountryId={resellerCountryId}
        onSuccess={handleSuccess}
      />

      {/* Modale des propositions reçues */}
      <DemandResponsesModal
        isOpen={isResponsesModalOpen}
        onClose={() => setIsResponsesModalOpen(false)}
        demand={selectedDemandForResponses}
        provinces={provinces}
      />
    </div>
  );
}
