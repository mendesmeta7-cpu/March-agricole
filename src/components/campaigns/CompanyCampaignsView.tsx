"use client";

import { useState, useMemo } from "react";
import {
  CompanyCampaignItem,
  EligibleProductionOption,
  CampaignStatus,
} from "@/lib/queries/campaigns";
import {
  getEffectiveCampaignStatus,
} from "@/lib/utils/campaignStatus";

import { Province } from "@/lib/queries/geography";
import { AggregatedDemandItem } from "@/lib/queries/demands";
import CompanyCampaignCard from "./CompanyCampaignCard";
import CompanyCampaignDetailDrawer from "./CompanyCampaignDetailDrawer";
import CampaignFormModal from "./CampaignFormModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { ToastProvider } from "@/components/ui/Toast";
import {
  Megaphone,
  Plus,
  Search,
  Layers,
  CheckCircle2,
  FileEdit,
  PackageOpen,
  ArrowLeft,
  Filter,
  X,
  TrendingUp,
  Clock,
  Info,
} from "lucide-react";
import Link from "next/link";

interface CompanyCampaignsViewProps {
  initialCampaigns: CompanyCampaignItem[];
  eligibleProductions: EligibleProductionOption[];
  provinces: Province[];
  marketDemands: AggregatedDemandItem[];
  initialModalOpen?: boolean;
  defaultProductionId?: string;
}

export default function CompanyCampaignsView({
  initialCampaigns,
  eligibleProductions,
  provinces,
  marketDemands,
  initialModalOpen = false,
  defaultProductionId,
}: CompanyCampaignsViewProps) {
  const [campaigns] = useState<CompanyCampaignItem[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [campaignToEdit, setCampaignToEdit] = useState<CompanyCampaignItem | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<CompanyCampaignItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Statuts effectifs (correction bug expiration)
  const campaignsWithEffectiveStatus = useMemo(
    () =>
      campaigns.map((c) => ({
        ...c,
        _effectiveStatus: getEffectiveCampaignStatus(c),
      })),
    [campaigns]
  );

  // Filtrage réactif basé sur le statut effectif
  const filteredCampaigns = useMemo(() => {
    return campaignsWithEffectiveStatus.filter((camp) => {
      const matchesStatus =
        selectedStatus === "all" || camp._effectiveStatus === selectedStatus;
      const matchesSearch =
        searchQuery.trim() === "" ||
        camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.production.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [campaignsWithEffectiveStatus, selectedStatus, searchQuery]);

  // Métriques réelles basées sur le statut effectif
  const metrics = useMemo(() => {
    const total = campaigns.length;
    const active = campaignsWithEffectiveStatus.filter((c) => c._effectiveStatus === "active").length;
    const draft = campaignsWithEffectiveStatus.filter((c) => c._effectiveStatus === "draft").length;
    const completed = campaignsWithEffectiveStatus.filter((c) => c._effectiveStatus === "completed").length;
    const totalVolume = campaignsWithEffectiveStatus
      .filter((c) => c._effectiveStatus === "active")
      .reduce((acc, c) => acc + c.marketable_quantity, 0);
    return { total, active, draft, completed, totalVolume };
  }, [campaigns, campaignsWithEffectiveStatus]);

  const handleOpenCreate = () => {
    setCampaignToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (camp: CompanyCampaignItem) => {
    setCampaignToEdit(camp);
    setDetailCampaign(null);
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleViewDetail = (camp: CompanyCampaignItem) => {
    setDetailCampaign(camp);
    setIsDetailOpen(true);
  };

  // Tabs de statut avec compteurs
  const statusTabs = [
    { id: "all", label: "Toutes", count: metrics.total },
    { id: "active", label: "Actives", count: metrics.active },
    { id: "draft", label: "Brouillons", count: metrics.draft },
    { id: "paused", label: "Suspendues", count: null },
    { id: "completed", label: "Clôturées", count: metrics.completed },
    { id: "cancelled", label: "Annulées", count: null },
  ];

  return (
    <ToastProvider>
      <div className="space-y-6">
        {/* 1. Fil d'Ariane */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard/company"
            className="hover:text-forest-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>
        </div>

        {/* 2. En-tête héro */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-900 via-forest-800 to-earth-900 p-6 sm:p-8 text-white shadow-xl">
          {/* Motif de fond décoratif */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-[40px] border-white -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full border-[30px] border-white translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-semibold uppercase tracking-wider mb-3">
              <Megaphone className="w-3.5 h-3.5" />
              Espace Société — Offres Commerciales
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Campagnes de Vente
            </h1>
            <p className="text-white/70 text-sm sm:text-base max-w-xl leading-relaxed">
              Publiez vos offres fermes, fixez vos prix par unité et délimitez précisément
              les provinces éligibles à la livraison.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <div className="text-center">
                <span className="block text-2xl font-extrabold">{metrics.active}</span>
                <span className="block text-white/60 text-xs">Active{metrics.active > 1 ? "s" : ""}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="block text-2xl font-extrabold">{metrics.total}</span>
                <span className="block text-white/60 text-xs">Total</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="block text-2xl font-extrabold">
                  {metrics.totalVolume.toLocaleString("fr-FR")}
                </span>
                <span className="block text-white/60 text-xs">Tonnes actives</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Métriques détaillées */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Total
                </span>
                <span className="text-2xl font-extrabold text-gray-900 mt-1 block">
                  {metrics.total}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Actives
                </span>
                <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                  {metrics.active}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Volume actif
                </span>
                <span className="text-2xl font-extrabold text-forest-950 mt-1 block">
                  {metrics.totalVolume.toLocaleString("fr-FR")}
                  <span className="text-xs font-normal text-gray-500 ml-1">t</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Brouillons
                </span>
                <span className="text-2xl font-extrabold text-gray-700 mt-1 block">
                  {metrics.draft}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
                <FileEdit className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* 4. Note pédagogique */}
        <Card padding="md" className="bg-amber-50/50 border-amber-200/80">
          <div className="flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                Règle d&apos;Or — Découplage Métier (V1) :
              </span>
              <p className="text-amber-800 text-xs leading-relaxed">
                Une campagne commerciale matérialise une offre ferme adossée à une production.
                Elle ne génère aucune réservation tant qu&apos;une commande n&apos;est pas confirmée.
                Une destination arrivée à échéance reste commandable dans les autres destinations encore actives.
              </p>
            </div>
          </div>
        </Card>

        {/* 5. Barre Filtres + Recherche + Bouton Créer */}
        <div className="flex flex-col gap-3">
          {/* Ligne 1 : Recherche + Créer */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par titre, produit, production..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs transition-all shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle Campagne</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>

          {/* Ligne 2 : Onglets de statut */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedStatus === tab.id
                    ? "bg-forest-800 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStatus === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Grille de cartes ou État vide */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-14 text-center shadow-xs">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 mb-4">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {campaigns.length === 0
                ? "Aucune campagne commerciale"
                : "Aucun résultat"}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {campaigns.length === 0
                ? "Aucune campagne n'a encore été créée pour votre exploitation. Créez votre première offre commerciale pour valoriser vos productions auprès des revendeurs."
                : "Aucune campagne ne correspond aux filtres de recherche actuels. Modifiez les filtres ou effacez la recherche."}
            </p>
            {campaigns.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-700 text-white font-semibold text-xs hover:bg-forest-800 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Lancer ma première offre
              </button>
            )}
            {campaigns.length > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setSelectedStatus("all"); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.map((camp) => (
              <CompanyCampaignCard
                key={camp.id}
                campaign={camp}
                onEdit={handleOpenEdit}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
        )}

        {/* Drawer de détail */}
        <CompanyCampaignDetailDrawer
          campaign={detailCampaign}
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setDetailCampaign(null); }}
          onEdit={handleOpenEdit}
        />

        {/* Modale de création / modification */}
        <CampaignFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          eligibleProductions={eligibleProductions}
          provinces={provinces}
          marketDemands={marketDemands}
          campaignToEdit={campaignToEdit}
          defaultProductionId={defaultProductionId}
        />
      </div>
    </ToastProvider>
  );
}
