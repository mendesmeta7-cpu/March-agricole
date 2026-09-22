"use client";

import { useState, useTransition } from "react";
import { AggregatedDemandItem, DemandItem } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province } from "@/lib/queries/geography";
import { refuseDemandAction } from "@/lib/actions/demands";
import CompanyDemandProposalModal from "./CompanyDemandProposalModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  TrendingUp,
  MapPin,
  Scale,
  Search,
  Filter,
  ArrowLeft,
  Info,
  Package,
  Layers,
  Sparkles,
  BarChart3,
  Globe2,
  Send,
  XCircle,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface MarketDemandsAnalysisViewProps {
  initialGeneralDemands?: DemandItem[];
  initialAggregates: AggregatedDemandItem[];
  catalogProducts: CatalogProduct[];
  provinces: Province[];
  companyProductions?: {
    id: string;
    title: string;
    expected_quantity: number;
    unit: string;
    status: string;
    product_id: string;
  }[];
  companyName: string;
}

export default function MarketDemandsAnalysisView({
  initialGeneralDemands = [],
  initialAggregates,
  catalogProducts,
  provinces,
  companyProductions = [],
  companyName,
}: MarketDemandsAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<"general_demands" | "territorial_analysis">("general_demands");
  const [generalDemands, setGeneralDemands] = useState<DemandItem[]>(initialGeneralDemands);
  const [aggregates, setAggregates] = useState<AggregatedDemandItem[]>(initialAggregates);

  // Filtres
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modale de proposition
  const [selectedDemandForProposal, setSelectedDemandForProposal] = useState<DemandItem | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Transitions & Toasts
  const [isPending, startTransition] = useTransition();
  const [refusingId, setRefusingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtrage des demandes générales
  const filteredGeneralDemands = generalDemands.filter((dem) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      dem.product.name.toLowerCase().includes(q) ||
      dem.province.name.toLowerCase().includes(q) ||
      (dem.city && dem.city.toLowerCase().includes(q)) ||
      (dem.notes && dem.notes.toLowerCase().includes(q));

    const matchesProduct = selectedProductId === "all" || dem.product_id === selectedProductId;
    const matchesProvince = selectedProvinceId === "all" || dem.province_id === selectedProvinceId;

    return matchesSearch && matchesProduct && matchesProvince;
  });

  // Filtrage des agrégats territoriaux
  const filteredAggregates = aggregates.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.product_name.toLowerCase().includes(q) ||
      item.province_name.toLowerCase().includes(q) ||
      item.product_category.toLowerCase().includes(q);

    const matchesProduct =
      selectedProductId === "all" || item.product_id === selectedProductId;
    const matchesProvince =
      selectedProvinceId === "all" || item.province_id === selectedProvinceId;

    return matchesSearch && matchesProduct && matchesProvince;
  });

  // Calcul des statistiques globales sur les données réelles
  const totalVolume = filteredAggregates.reduce(
    (acc, curr) => acc + curr.total_demanded_quantity,
    0
  );
  const totalDemands = filteredAggregates.reduce(
    (acc, curr) => acc + curr.total_demands_count,
    0
  );
  const distinctProvinces = new Set(filteredAggregates.map((i) => i.province_id)).size;
  const distinctProducts = new Set(filteredAggregates.map((i) => i.product_id)).size;

  const handleOpenProposal = (demand: DemandItem) => {
    setSelectedDemandForProposal(demand);
    setIsProposalModalOpen(true);
  };

  const handleRefuse = (demandId: string) => {
    setRefusingId(demandId);
    startTransition(async () => {
      const res = await refuseDemandAction(demandId);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setGeneralDemands((prev) => prev.filter((d) => d.id !== demandId));
        setFeedback({ type: "success", text: "Demande écartée de votre tableau de bord." });
        setTimeout(() => setFeedback(null), 4000);
      }
      setRefusingId(null);
    });
  };

  const handleProposalSuccess = (message: string) => {
    setFeedback({ type: "success", text: message });
    setTimeout(() => setFeedback(null), 5000);
  };

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
        <span className="text-gray-900 font-medium">Demandes du marché</span>
      </div>

      {/* En-tête de page */}
      <PageHeader
        title="Opportunités & Demandes du Marché"
        description={`Consultez les expressions de besoin exprimées par les revendeurs et répondez-y directement avec vos productions réelles pour l'exploitation « ${companyName} ».`}
        badge={<Badge variant="forest">Flux Commercial V1</Badge>}
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

      {/* Onglets de navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general_demands")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "general_demands"
              ? "bg-earth-800 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Send className="w-4 h-4" />
          Demandes générales des revendeurs ({generalDemands.length})
        </button>

        <button
          onClick={() => setActiveTab("territorial_analysis")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "territorial_analysis"
              ? "bg-earth-800 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analyse territoriale & cartographie macro
        </button>
      </div>

      {/* Barre de Recherche et Filtres communs */}
      <div className="p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filtrer par denrée, province, localité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600 transition-all bg-gray-50/50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block" />
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-600 bg-white"
            >
              <option value="all">Toutes les denrées</option>
              {catalogProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedProvinceId}
              onChange={(e) => setSelectedProvinceId(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-600 bg-white"
            >
              <option value="all">Toutes les provinces</option>
              {provinces.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CONTENU ONGLET 1 : Demandes générales */}
      {activeTab === "general_demands" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-earth-50/70 border border-earth-100/80 text-earth-950 text-xs sm:text-sm flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 text-earth-700 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-earth-900">
                Comment répondre à une demande générale ?
              </p>
              <p className="text-xs text-earth-800/90 leading-relaxed">
                Ces demandes émanent de revendeurs en quête de denrées agricoles. Cliquez sur <strong>[ Proposer / Répondre ]</strong> pour associer l&apos;une de vos productions réelles (en culture ou récoltée) et lui soumettre un volume et un prix ferme. Le revendeur pourra ensuite transformer votre proposition en commande.
              </p>
            </div>
          </div>

          {generalDemands.length === 0 ? (
            <EmptyState
              title="Aucune demande générale en attente"
              description="Dès qu'un acheteur publiera une expression de besoin nationale ou régionale, elle apparaîtra ici pour vous permettre d'y répondre."
              icon={<TrendingUp className="w-8 h-8 text-earth-700" />}
              phaseBadge="Demandes à jour"
            />
          ) : filteredGeneralDemands.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
              <p className="text-sm text-gray-600">
                Aucune demande générale ne correspond à vos filtres.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProductId("all");
                  setSelectedProvinceId("all");
                }}
                className="text-xs font-semibold text-earth-700 hover:text-earth-800 underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGeneralDemands.map((dem) => (
                <Card
                  key={dem.id}
                  className="overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-5 space-y-3.5">
                    {/* Top : Produit & Volume */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-11 h-11 rounded-2xl bg-earth-50 border border-earth-100 overflow-hidden flex items-center justify-center shrink-0">
                          {dem.product.image_url ? (
                            <Image
                              src={dem.product.image_url}
                              alt={dem.product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-earth-700" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-earth-700 bg-earth-100/70 px-2 py-0.5 rounded-md inline-block mb-1">
                            {dem.product.category}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                            {dem.product.name}
                          </h3>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                        Besoin exprimé
                      </span>
                    </div>

                    {/* Volume demandé */}
                    <div className="p-3 rounded-xl bg-earth-50/60 border border-earth-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-earth-700 shrink-0" />
                        <div>
                          <p className="text-[10px] font-medium text-earth-700">Volume recherché</p>
                          <p className="text-sm sm:text-base font-bold text-earth-950">
                            {dem.quantity.toLocaleString("fr-FR")}{" "}
                            <span className="text-xs font-normal text-earth-800">{dem.unit}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Destination & Informations */}
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate font-medium text-gray-800">
                          Destination : {dem.province.name} {dem.city ? `(${dem.city})` : ""}
                        </span>
                      </div>

                      {dem.notes && (
                        <p className="text-xs text-gray-500 line-clamp-2 pt-1 italic bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                          « {dem.notes} »
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'action : Refuser ou Proposer */}
                  <div className="p-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleRefuse(dem.id)}
                      disabled={refusingId === dem.id}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Refuser
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenProposal(dem)}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-earth-800 hover:bg-earth-900 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Proposer / Répondre
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENU ONGLET 2 : Analyse macroscopique */}
      {activeTab === "territorial_analysis" && (
        <div className="space-y-4">
          {/* Cartouches de statistiques réelles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Volume total recherché</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {totalVolume.toLocaleString("fr-FR")}{" "}
                  <span className="text-xs font-normal text-gray-500">tonnes/u</span>
                </p>
              </div>
            </Card>

            <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-earth-50 text-earth-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Demandes exprimées</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totalDemands}</p>
              </div>
            </Card>

            <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Provinces en demande</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{distinctProvinces}</p>
              </div>
            </Card>

            <Card className="p-3.5 sm:p-4 border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Denrées ciblées</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{distinctProducts}</p>
              </div>
            </Card>
          </div>

          {/* Tableau Territorial des Agrégats */}
          {aggregates.length === 0 ? (
            <EmptyState
              title="Aucun besoin exprimé sur le marché pour le moment"
              description="Dès que les acheteurs et revendeurs formuleront des expressions de besoin dans leurs provinces, les volumes agrégés apparaîtront automatiquement ici pour orienter vos futures campagnes."
              icon={<Globe2 className="w-8 h-8 text-forest-700" />}
              phaseBadge="Marché en attente d'expressions"
            />
          ) : filteredAggregates.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
              <p className="text-sm text-gray-600">
                Aucun agrégat ne correspond à vos critères de filtrage.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProductId("all");
                  setSelectedProvinceId("all");
                }}
                className="text-xs font-semibold text-forest-700 hover:text-forest-800 underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-forest-700" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Cartographie des Besoins par Territoire ({filteredAggregates.length} ligne(s))
                  </h3>
                </div>
                <span className="text-xs text-gray-500">Données réelles groupées</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Province / Territoire</th>
                      <th className="py-3 px-4 sm:px-6">Denrée Agricole</th>
                      <th className="py-3 px-4 sm:px-6">Catégorie</th>
                      <th className="py-3 px-4 sm:px-6 text-center">Nombre de Demandes</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Volume Total Recherché</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Opportunité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredAggregates.map((row) => (
                      <tr key={`${row.province_id}-${row.product_id}`} className="hover:bg-forest-50/30 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-gray-900 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                          <span>{row.province_name}</span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-medium text-gray-800">
                          {row.product_name}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-gray-500">
                          <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                            {row.product_category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-center font-bold text-gray-900">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
                            {row.total_demands_count} acheteur(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-black text-forest-950 text-sm">
                          {row.total_demanded_quantity.toLocaleString("fr-FR")}{" "}
                          <span className="text-xs font-normal text-forest-700">{row.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 bg-forest-100/70 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3" />
                            Bassin solvable
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale de formulation de proposition */}
      <CompanyDemandProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        demand={selectedDemandForProposal}
        companyProductions={companyProductions}
        onSuccess={handleProposalSuccess}
      />
    </div>
  );
}
