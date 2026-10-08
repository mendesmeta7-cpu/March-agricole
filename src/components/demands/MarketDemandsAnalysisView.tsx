"use client";

import { useState, useTransition, useMemo } from "react";
import Select from "@/components/ui/Select";
import { AggregatedDemandItem, DemandItem } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province } from "@/lib/queries/geography";
import { refuseDemandAction } from "@/lib/actions/demands";
import CompanyDemandProposalModal from "./CompanyDemandProposalModal";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Dialog";
import {
  TrendingUp,
  MapPin,
  Scale,
  Search,
  Filter,
  ArrowLeft,
  Info,
  Package,
  Sparkles,
  BarChart3,
  Globe2,
  Send,
  XCircle,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Inbox,
  Target,
  Users,
  RefreshCw,
  X,
  ChevronDown,
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

type ActiveTab = "general_demands" | "territorial_analysis";

export default function MarketDemandsAnalysisView({
  initialGeneralDemands = [],
  initialAggregates,
  catalogProducts,
  provinces,
  companyProductions = [],
  companyName,
}: MarketDemandsAnalysisViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("general_demands");
  const [generalDemands, setGeneralDemands] = useState<DemandItem[]>(initialGeneralDemands);

  // Filtres
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modale de proposition
  const [selectedDemandForProposal, setSelectedDemandForProposal] = useState<DemandItem | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Confirmation de refus
  const [refusingDemand, setRefusingDemand] = useState<DemandItem | null>(null);
  const [isRefuseLoading, setIsRefuseLoading] = useState(false);

  const [isPending, startTransition] = useTransition();

  // ─── Filtrage réactif des demandes générales ─────────────────────────────
  const filteredGeneralDemands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return generalDemands.filter((dem) => {
      const matchesSearch =
        !q ||
        dem.product.name.toLowerCase().includes(q) ||
        dem.province.name.toLowerCase().includes(q) ||
        (dem.city && dem.city.toLowerCase().includes(q)) ||
        (dem.notes && dem.notes.toLowerCase().includes(q));
      const matchesProduct = selectedProductId === "all" || dem.product_id === selectedProductId;
      const matchesProvince = selectedProvinceId === "all" || dem.province_id === selectedProvinceId;
      return matchesSearch && matchesProduct && matchesProvince;
    });
  }, [generalDemands, searchQuery, selectedProductId, selectedProvinceId]);

  // ─── Filtrage réactif des agrégats territoriaux ───────────────────────────
  const filteredAggregates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialAggregates.filter((item) => {
      const matchesSearch =
        !q ||
        item.product_name.toLowerCase().includes(q) ||
        item.province_name.toLowerCase().includes(q) ||
        item.product_category.toLowerCase().includes(q);
      const matchesProduct = selectedProductId === "all" || item.product_id === selectedProductId;
      const matchesProvince = selectedProvinceId === "all" || item.province_id === selectedProvinceId;
      return matchesSearch && matchesProduct && matchesProvince;
    });
  }, [initialAggregates, searchQuery, selectedProductId, selectedProvinceId]);

  // ─── Statistiques réelles ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalVolume = initialAggregates.reduce((acc, curr) => acc + curr.total_demanded_quantity, 0);
    const totalDemands = initialAggregates.reduce((acc, curr) => acc + curr.total_demands_count, 0);
    const distinctProvinces = new Set(initialAggregates.map((i) => i.province_id)).size;
    const distinctProducts = new Set(initialAggregates.map((i) => i.product_id)).size;
    return { totalVolume, totalDemands, distinctProvinces, distinctProducts };
  }, [initialAggregates]);

  // Nombre de filtres actifs
  const activeFiltersCount = [
    selectedProductId !== "all",
    selectedProvinceId !== "all",
    searchQuery.trim() !== "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedProductId("all");
    setSelectedProvinceId("all");
  };

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleOpenProposal = (demand: DemandItem) => {
    setSelectedDemandForProposal(demand);
    setIsProposalModalOpen(true);
  };

  const handleConfirmRefuse = () => {
    if (!refusingDemand) return;
    setIsRefuseLoading(true);
    const demandId = refusingDemand.id;
    startTransition(async () => {
      const res = await refuseDemandAction(demandId);
      setIsRefuseLoading(false);
      if (res.error) {
        toast.error("Erreur", { description: res.error });
      } else {
        setGeneralDemands((prev) => prev.filter((d) => d.id !== demandId));
        toast.success("Demande écartée", {
          description: "La demande a été retirée de votre tableau de bord.",
        });
      }
      setRefusingDemand(null);
    });
  };

  const handleProposalSuccess = (message: string) => {
    toast.success("Proposition envoyée", { description: message });
  };

  // ─── Formatage des dates ──────────────────────────────────────────────────
  const formatPeriod = (start: string | null, end: string | null) => {
    if (!start && !end) return null;
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
    if (start && end) return `${fmt(start)} → ${fmt(end)}`;
    if (start) return `Dès ${fmt(start)}`;
    return `Avant ${fmt(end!)}`;
  };

  return (
    <div className="space-y-6">
      {/* ─── Fil d'Ariane ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/company"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Tableau de bord
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-semibold">Demande du marché</span>
      </div>

      {/* ─── En-tête de section ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-earth-900 via-earth-800 to-forest-900 p-6 sm:p-8 text-white shadow-lg">
        {/* Motif de fond décoratif */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20" />
          <div className="absolute bottom-2 right-20 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute top-16 right-32 w-8 h-8 rounded-full bg-white/15" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Badge de catégorie */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <Inbox className="w-3.5 h-3.5" />
              Espace Société — Flux Commercial
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Demande du marché
            </h1>
            <p className="text-sm sm:text-base text-white/70 max-w-xl leading-relaxed">
              Consultez les expressions de besoin des revendeurs et répondez directement avec vos
              productions réelles pour <span className="text-white/90 font-semibold">« {companyName} »</span>.
            </p>
          </div>

          {/* Statistiques rapides en-tête */}
          <div className="flex flex-row sm:flex-col gap-3 sm:items-end shrink-0">
            <div className="text-center sm:text-right">
              <p className="text-3xl font-black text-white">{generalDemands.length}</p>
              <p className="text-xs text-white/60 font-medium">Demandes générales</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-3xl font-black text-emerald-300">{stats.distinctProvinces}</p>
              <p className="text-xs text-white/60 font-medium">Provinces actives</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Cartes de métriques réelles ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Demandes actives",
            value: generalDemands.length,
            unit: "",
            icon: Inbox,
            bg: "bg-earth-50",
            iconColor: "text-earth-700",
            valueColor: "text-earth-950",
          },
          {
            label: "Volume total recherché",
            value: stats.totalVolume.toLocaleString("fr-FR"),
            unit: "t/u",
            icon: Scale,
            bg: "bg-forest-50",
            iconColor: "text-forest-700",
            valueColor: "text-forest-950",
          },
          {
            label: "Provinces en demande",
            value: stats.distinctProvinces,
            unit: "",
            icon: MapPin,
            bg: "bg-blue-50",
            iconColor: "text-blue-700",
            valueColor: "text-blue-950",
          },
          {
            label: "Denrées ciblées",
            value: stats.distinctProducts,
            unit: "",
            icon: Package,
            bg: "bg-amber-50",
            iconColor: "text-amber-700",
            valueColor: "text-amber-950",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={i}
              className="p-4 sm:p-5 border-gray-100 shadow-xs hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.bg} ${stat.iconColor} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
                    {stat.label}
                  </p>
                  <p className={`text-xl sm:text-2xl font-black ${stat.valueColor} leading-tight`}>
                    {stat.value}
                    {stat.unit && (
                      <span className="text-xs font-normal text-gray-500 ml-1">{stat.unit}</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Cartouche explicatif métier ───────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-earth-50/80 border border-earth-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-earth-100 text-earth-700 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-earth-900">Comment fonctionne la Demande du marché ?</p>
          <p className="text-xs text-earth-800/85 leading-relaxed">
            Les revendeurs expriment leurs besoins en denrées agricoles (produit, volume, province de livraison,
            période souhaitée). En tant que société agricole, vous pouvez <strong>répondre à ces demandes</strong> en
            associant l&apos;une de vos productions réelles et en soumettant un volume et un prix ferme.
            Le revendeur pourra ensuite convertir votre proposition en commande ferme.
          </p>
          <p className="text-[11px] text-earth-700/70 font-medium pt-0.5">
            💡 Règle clé : Une demande ≠ une commande. Aucun stock n&apos;est réservé avant l&apos;acceptation d&apos;une proposition.
          </p>
        </div>
      </div>

      {/* ─── Onglets ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {[
          { id: "general_demands" as ActiveTab, label: "Demandes générales", icon: Send, count: generalDemands.length },
          { id: "territorial_analysis" as ActiveTab, label: "Analyse territoriale", icon: BarChart3, count: initialAggregates.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
                isActive
                  ? "border-earth-800 text-earth-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-earth-100 text-earth-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Barre de recherche et filtres ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {/* Ligne principale de recherche */}
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par denrée, province, localité, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-earth-600/50 focus:border-earth-400 transition-all bg-gray-50/50 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bouton Filtres (mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm rounded-xl border transition-all cursor-pointer font-medium ${
              activeFiltersCount > 0
                ? "border-earth-300 bg-earth-50 text-earth-800"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="bg-earth-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {/* Réinitialiser (si filtres actifs) */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-earth-700 hover:text-earth-800 underline underline-offset-2 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Filtres dépliables */}
        {showFilters && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Filtre par denrée */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Denrée agricole
            </label>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              searchable
              options={useMemo(() => [
                { value: "all", label: "Toutes les denrées" },
                ...catalogProducts.map((p) => ({ value: p.id, label: p.name })),
              ], [catalogProducts])}
            />
          </div>

          {/* Filtre par province */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Province de livraison
            </label>
            <Select
              value={selectedProvinceId}
              onChange={(e) => setSelectedProvinceId(e.target.value)}
              searchable
              options={useMemo(() => [
                { value: "all", label: "Toutes les provinces" },
                ...provinces.map((prov) => ({ value: prov.id, label: prov.name })),
              ], [provinces])}
            />
          </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 1 : DEMANDES GÉNÉRALES DES REVENDEURS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "general_demands" && (
        <div className="space-y-4">
          {/* Compteur de résultats */}
          {generalDemands.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">
                {filteredGeneralDemands.length === generalDemands.length
                  ? `${generalDemands.length} demande${generalDemands.length > 1 ? "s" : ""} en attente de réponse`
                  : `${filteredGeneralDemands.length} résultat${filteredGeneralDemands.length > 1 ? "s" : ""} sur ${generalDemands.length}`}
              </p>
              {activeFiltersCount > 0 && filteredGeneralDemands.length < generalDemands.length && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-earth-700 hover:text-earth-800 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  Voir toutes les demandes
                </button>
              )}
            </div>
          )}

          {/* État vide : 0 demandes en base */}
          {generalDemands.length === 0 && (
            <EmptyState
              title="Aucune demande générale en attente"
              description="Dès qu'un acheteur publiera une expression de besoin nationale ou régionale, elle apparaîtra ici pour vous permettre d'y répondre avec vos productions réelles."
              icon={<Inbox className="w-8 h-8 text-earth-600" />}
              phaseBadge="Flux commercial actif"
            />
          )}

          {/* État vide : filtres actifs sans résultat */}
          {generalDemands.length > 0 && filteredGeneralDemands.length === 0 && (
            <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Aucun résultat trouvé</p>
                <p className="text-xs text-gray-500 mt-1">
                  Aucune demande ne correspond à vos critères de recherche.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-earth-700 hover:text-earth-800 underline underline-offset-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* Grille des cartes de demandes */}
          {filteredGeneralDemands.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredGeneralDemands.map((dem) => {
                const period = formatPeriod(dem.target_period_start, dem.target_period_end);
                const eligibleProductionsCount = companyProductions.filter(
                  (p) => p.product_id === dem.product_id
                ).length;

                return (
                  <Card
                    key={dem.id}
                    className="overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
                  >
                    {/* Bande colorée supérieure */}
                    <div className="h-1 bg-gradient-to-r from-earth-600 to-earth-800 group-hover:from-earth-500 group-hover:to-forest-700 transition-all duration-300" />

                    <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-4">
                      {/* ─── En-tête : Produit & Badge ─────────────────── */}
                      <div className="flex items-start gap-3">
                        {/* Visuel produit */}
                        <div className="relative w-12 h-12 rounded-xl bg-earth-50 border border-earth-100 overflow-hidden flex items-center justify-center shrink-0">
                          {dem.product.image_url ? (
                            <Image
                              src={dem.product.image_url}
                              alt={dem.product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-earth-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-earth-700 bg-earth-100/80 px-2 py-0.5 rounded-md">
                              {dem.product.category}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                              Besoin exprimé
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-1 truncate">
                            {dem.product.name}
                          </h3>
                        </div>
                      </div>

                      {/* ─── Volume demandé ─────────────────────────────── */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-earth-50 to-earth-100/50 border border-earth-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-semibold text-earth-600 uppercase tracking-wider">
                              Volume recherché
                            </p>
                            <p className="text-lg sm:text-xl font-black text-earth-950 mt-0.5">
                              {dem.quantity.toLocaleString("fr-FR")}{" "}
                              <span className="text-sm font-semibold text-earth-700">{dem.unit}</span>
                            </p>
                          </div>
                          <Scale className="w-6 h-6 text-earth-400" />
                        </div>
                      </div>

                      {/* ─── Informations de contexte ───────────────────── */}
                      <div className="space-y-2">
                        {/* Province de livraison */}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800 truncate">
                            {dem.province.name}
                            {dem.city ? ` — ${dem.city}` : ""}
                          </span>
                        </div>

                        {/* Période souhaitée */}
                        {period && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-700">{period}</span>
                          </div>
                        )}

                        {/* Entreprise ciblée */}
                        {dem.target_company && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-amber-700 font-medium">
                              Ciblé : {dem.target_company.name}
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        {dem.notes && (
                          <p className="text-xs text-gray-500 line-clamp-2 italic bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                            « {dem.notes} »
                          </p>
                        )}
                      </div>

                      {/* ─── Indicateur de compatibilité avec vos productions ─ */}
                      {eligibleProductionsCount > 0 ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-semibold">
                            {eligibleProductionsCount} production{eligibleProductionsCount > 1 ? "s" : ""}{" "}
                            compatible{eligibleProductionsCount > 1 ? "s" : ""} dans votre exploitation
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Aucune production correspondante actuellement</span>
                        </div>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* ─── Actions ────────────────────────────────────── */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <Link
                          href={`/dashboard/company/demands/${dem.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                        >
                          Examiner
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleOpenProposal(dem)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-earth-800 hover:bg-earth-900 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Répondre
                        </button>

                        <button
                          type="button"
                          onClick={() => setRefusingDemand(dem)}
                          title="Écarter cette demande"
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-gray-200 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 2 : ANALYSE MACROSCOPIQUE TERRITORIALE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "territorial_analysis" && (
        <div className="space-y-5">
          {/* Sous-titre */}
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Vue agrégée et anonymisée des expressions de besoin par denrée et par province. Ces données vous
            permettent d&apos;orienter vos futures campagnes commerciales vers les bassins à forte demande.
          </p>

          {/* État vide : 0 agrégats */}
          {initialAggregates.length === 0 && (
            <EmptyState
              title="Aucune expression de besoin sur le marché"
              description="Dès que des revendeurs formuleront des expressions de besoin dans leurs provinces, les volumes agrégés apparaîtront automatiquement ici pour orienter vos futures campagnes."
              icon={<Globe2 className="w-8 h-8 text-forest-700" />}
              phaseBadge="Marché en attente"
            />
          )}

          {/* État vide : filtres actifs sans résultat */}
          {initialAggregates.length > 0 && filteredAggregates.length === 0 && (
            <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Aucun agrégat trouvé</p>
                <p className="text-xs text-gray-500 mt-1">
                  Aucune donnée ne correspond à vos critères de filtrage.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-800 underline underline-offset-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* Tableau agrégé principal */}
          {filteredAggregates.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              {/* En-tête du tableau */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Cartographie des besoins par territoire
                    </h3>
                    <p className="text-xs text-gray-500">
                      {filteredAggregates.length} ligne{filteredAggregates.length > 1 ? "s" : ""} — Données réelles groupées
                    </p>
                  </div>
                </div>
                <Badge variant="forest" className="text-xs hidden sm:inline-flex">
                  Vue agrégée anonyme
                </Badge>
              </div>

              {/* Tableau responsive */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 sm:px-5">Province / Territoire</th>
                      <th className="py-3 px-4 sm:px-5">Denrée Agricole</th>
                      <th className="py-3 px-4 sm:px-5 hidden md:table-cell">Catégorie</th>
                      <th className="py-3 px-4 sm:px-5 text-center">Acheteurs</th>
                      <th className="py-3 px-4 sm:px-5 text-right">Volume Recherché</th>
                      <th className="py-3 px-4 sm:px-5 text-right hidden sm:table-cell">Opportunité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredAggregates.map((row, idx) => (
                      <tr
                        key={`${row.province_id}-${row.product_id}-${idx}`}
                        className="hover:bg-forest-50/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 sm:px-5">
                          <div className="flex items-center gap-2 font-semibold text-gray-900">
                            <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                            <span>{row.province_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-gray-800">
                          {row.product_name}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 hidden md:table-cell">
                          <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                            {row.product_category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-center">
                          <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
                            <Users className="w-3 h-3" />
                            {row.total_demands_count}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right font-black text-forest-950 text-sm">
                          {row.total_demanded_quantity.toLocaleString("fr-FR")}{" "}
                          <span className="text-xs font-normal text-forest-700">{row.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right hidden sm:table-cell">
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

              {/* Pied du tableau : totaux */}
              <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  Données agrégées et anonymisées — aucun revendeur n&apos;est identifiable
                </p>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-700">
                  <span>Total : {stats.totalDemands} acheteur(s)</span>
                  <span className="text-forest-700">
                    {stats.totalVolume.toLocaleString("fr-FR")} unité(s) recherché(s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bloc d'orientation vers les campagnes */}
          {initialAggregates.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-forest-50 border border-forest-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-forest-900">
                  Prêt à lancer une campagne commerciale ?
                </p>
                <p className="text-xs text-forest-700/80 mt-0.5">
                  Une fois votre récolte terminée, créez une campagne commerciale adossée à votre production
                  pour cibler directement ces bassins de demande.
                </p>
              </div>
              <Link
                href="/dashboard/company/productions"
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 rounded-xl shadow-xs transition-all whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5" />
                Mes productions
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ─── Modale de formulation de proposition ─────────────────────────── */}
      <CompanyDemandProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => {
          setIsProposalModalOpen(false);
          setSelectedDemandForProposal(null);
        }}
        demand={selectedDemandForProposal}
        companyProductions={companyProductions}
        onSuccess={handleProposalSuccess}
      />

      {/* ─── Dialog de confirmation d'écartement ──────────────────────────── */}
      <ConfirmDialog
        isOpen={!!refusingDemand}
        onClose={() => setRefusingDemand(null)}
        onConfirm={handleConfirmRefuse}
        title="Écarter cette demande ?"
        description={
          refusingDemand
            ? `Vous allez écarter la demande pour « ${refusingDemand.product.name} » (${refusingDemand.quantity.toLocaleString("fr-FR")} ${refusingDemand.unit}, province ${refusingDemand.province.name}). Elle sera retirée de votre tableau de bord.`
            : ""
        }
        confirmText="Confirmer l'écartement"
        variant="destructive"
        isLoading={isRefuseLoading}
      />
    </div>
  );
}
