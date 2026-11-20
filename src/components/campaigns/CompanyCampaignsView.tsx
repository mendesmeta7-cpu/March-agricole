"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sumByUnit } from "@/lib/utils/currencyTotals";
import {
  CompanyCampaignItem,
  CampaignStatus,
} from "@/lib/queries/campaigns";
import {
  getEffectiveCampaignStatus,
} from "@/lib/utils/campaignStatus";

import CompanyCampaignCard from "./CompanyCampaignCard";
import CompanyCampaignDetailDrawer from "./CompanyCampaignDetailDrawer";
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
  Filter,
  X,
  TrendingUp,
  Clock,
} from "lucide-react";
import InfoRepliable from "@/components/ui/InfoRepliable";
import { formatQuantity } from "@/lib/utils/numberFormat";

interface CompanyCampaignsViewProps {
  initialCampaigns: CompanyCampaignItem[];
  /** Campagne dont le tiroir de détail s'ouvre à l'arrivée (redirection de /campaigns/[id]) */
  initialDetailCampaignId?: string;
}

export default function CompanyCampaignsView({
  initialCampaigns,
  initialDetailCampaignId,
}: CompanyCampaignsViewProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CompanyCampaignItem[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [detailCampaign, setDetailCampaign] = useState<CompanyCampaignItem | null>(
    () => (initialDetailCampaignId ? initialCampaigns.find((c) => c.id === initialDetailCampaignId) ?? null : null)
  );
  const [isDetailOpen, setIsDetailOpen] = useState(() => detailCampaign !== null);

  // FUN-08 : resynchronisation avec les données serveur après router.refresh()
  // (création, modification, changement de statut), y compris la campagne ouverte dans le tiroir.
  useEffect(() => {
    setCampaigns(initialCampaigns);
    setDetailCampaign((prev) =>
      prev ? initialCampaigns.find((c) => c.id === prev.id) ?? prev : prev
    );
  }, [initialCampaigns]);

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
    // FUN-04 : volume actif ventilé par unité (jamais d'addition entre unités différentes)
    const activeVolumeByUnit = Object.entries(
      sumByUnit(
        campaignsWithEffectiveStatus.filter((c) => c._effectiveStatus === "active"),
        (c) => c.marketable_quantity,
        (c) => c.unit
      )
    ).filter(([, qty]) => qty !== 0);
    return { total, active, draft, completed, activeVolumeByUnit };
  }, [campaigns, campaignsWithEffectiveStatus]);

  // Lot UX/UI 5B : création et modification sur pages dédiées
  const handleOpenCreate = () => {
    router.push("/dashboard/company/campaigns/new");
  };

  const handleOpenEdit = (camp: CompanyCampaignItem) => {
    setDetailCampaign(null);
    setIsDetailOpen(false);
    router.push(`/dashboard/company/campaigns/${camp.id}/edit`);
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
        {/* 1. En-tête commun (Lot 6B, NAV-02) : les compteurs du bandeau sombre faisaient
            double emploi avec les cartes ci-dessous (NAV-06) ; seules les cartes restent. */}
        <PageHeader
          breadcrumb={[{ href: "/dashboard/company", label: "Tableau de bord" }]}
          title="Campagnes"
          description="Publiez vos campagnes, fixez vos prix par unité et délimitez précisément les provinces éligibles à la livraison."
        />

        {/* 2. Compteurs (un seul niveau). Correctif NAV-06 (arbitrage B) : cartes plus basses sous 640 px,
            mêmes intitulés et mêmes valeurs ; présentation inchangée au-delà. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card padding="none" className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Total
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-0.5 sm:mt-1 block">
                  {metrics.total}
                </span>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-forest-50 text-forest-700 items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="none" className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Actives
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-0.5 sm:mt-1 block">
                  {metrics.active}
                </span>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="none" className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Volume actif
                </span>
                {metrics.activeVolumeByUnit.length === 0 ? (
                  <span className="text-xl sm:text-2xl font-extrabold text-forest-950 mt-0.5 sm:mt-1 block">0</span>
                ) : (
                  metrics.activeVolumeByUnit.map(([unit, qty]) => (
                    <span key={unit} className="text-lg sm:text-xl font-extrabold text-forest-950 mt-0.5 sm:mt-1 block">
                      {formatQuantity(qty)}
                      <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
                    </span>
                  ))
                )}
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-forest-50 text-forest-800 items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="none" className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Brouillons
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-gray-700 mt-0.5 sm:mt-1 block">
                  {metrics.draft}
                </span>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gray-100 text-gray-600 items-center justify-center">
                <FileEdit className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Barre Filtres + Recherche + Bouton Créer */}
        <div className="flex flex-col gap-3">
          {/* Ligne 1 : Recherche + Créer */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                aria-label="Rechercher par titre, produit, production"
                type="text"
                placeholder="Rechercher par titre, produit, production..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-none shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs transition-all shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle Campagne</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>

          {/* Ligne 2 : Onglets de statut */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
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
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                      selectedStatus === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600"
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
                ? "Aucune campagne n'a encore été créée pour votre société. Créez votre première campagne pour valoriser vos productions auprès des revendeurs."
                : "Aucune campagne ne correspond aux filtres de recherche actuels. Modifiez les filtres ou effacez la recherche."}
            </p>
            {campaigns.length === 0 && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-700 text-white font-semibold text-xs hover:bg-forest-800 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Lancer ma première campagne
              </button>
            )}
            {campaigns.length > 0 && (
              <button
                type="button"
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

        {/* 7. Note pédagogique, repliée par défaut (Lot 6B, TXT-04), placée après la liste
            (correctif NAV-06, arbitrage D) : texte inchangé, toujours consultable. */}
        <InfoRepliable summary="Rappel de fonctionnement" tone="amber">
          <p>
            Une campagne met en vente tout ou partie d&apos;une production, à un prix et dans des conditions fixés.
            Elle ne génère aucune réservation tant qu&apos;une commande n&apos;est pas confirmée.
            Une destination arrivée à échéance reste commandable dans les autres destinations encore actives.
          </p>
        </InfoRepliable>

        {/* Drawer de détail */}
        <CompanyCampaignDetailDrawer
          campaign={detailCampaign}
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setDetailCampaign(null); }}
          onEdit={handleOpenEdit}
        />
      </div>
    </ToastProvider>
  );
}
