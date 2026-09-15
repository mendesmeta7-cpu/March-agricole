"use client";

import { useState } from "react";
import {
  CompanyCampaignItem,
  EligibleProductionOption,
  CampaignStatus,
} from "@/lib/queries/campaigns";
import { Province } from "@/lib/queries/geography";
import { AggregatedDemandItem } from "@/lib/queries/demands";
import CompanyCampaignCard from "./CompanyCampaignCard";
import CampaignFormModal from "./CampaignFormModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import {
  Megaphone,
  Plus,
  Search,
  Layers,
  CheckCircle2,
  FileEdit,
  Info,
  PackageOpen,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface CompanyCampaignsViewProps {
  initialCampaigns: CompanyCampaignItem[];
  eligibleProductions: EligibleProductionOption[];
  provinces: Province[];
  marketDemands: AggregatedDemandItem[];
}

export default function CompanyCampaignsView({
  initialCampaigns,
  eligibleProductions,
  provinces,
  marketDemands,
}: CompanyCampaignsViewProps) {
  const [campaigns] = useState<CompanyCampaignItem[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<CompanyCampaignItem | null>(null);

  // Filtrage réactif
  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesStatus =
      selectedStatus === "all" || camp.status === selectedStatus;
    const matchesSearch =
      searchQuery.trim() === "" ||
      camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.production.title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Métriques réelles (sans mock data)
  const totalCount = campaigns.length;
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const totalMarketedVolume = campaigns
    .filter((c) => c.status === "active")
    .reduce((acc, c) => acc + c.marketable_quantity, 0);

  const handleOpenCreate = () => {
    setCampaignToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (camp: CompanyCampaignItem) => {
    setCampaignToEdit(camp);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Fil d'Ariane & En-tête */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/company" className="hover:text-forest-800 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        title="Campagnes de Vente Commerciales"
        description="Publiez vos offres de vente fermes, fixez vos prix par unité et délimitez les provinces éligibles à la livraison."
        action={
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-sm transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Campagne
          </button>
        }
      />

      {/* 2. Cartouches d'indicateurs réels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Total Campagnes
              </span>
              <span className="text-2xl font-extrabold text-gray-900 mt-1 block">
                {totalCount}
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
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Campagnes Actives
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                {activeCount}
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
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Volume Actif en Vente
              </span>
              <span className="text-2xl font-extrabold text-forest-950 mt-1 block">
                {totalMarketedVolume.toLocaleString("fr-FR")} <span className="text-xs font-normal text-gray-500">t</span>
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
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Brouillons
              </span>
              <span className="text-2xl font-extrabold text-gray-700 mt-1 block">
                {draftCount}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Note de sensibilisation Règle d'Or 3 */}
      <Card padding="md" className="bg-amber-50/50 border-amber-200/80">
        <div className="flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              Cadre Opérationnel V1 & Découplage Métier (Règle d&apos;Or 3) :
            </span>
            <p className="text-amber-800 text-xs leading-relaxed">
              Une campagne commerciale matérialise une offre de mise en marché ferme adossée à une production. Elle ne génère aucune réservation de stock ni prélèvement physique tant qu&apos;une commande n&apos;a pas été confirmée. Les demandes formulées par les revendeurs restent indépendantes et ne sont pas converties automatiquement.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Barre de Filtres et Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre, culture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Toutes" },
            { id: "active", label: "Ouvertes" },
            { id: "draft", label: "Brouillons" },
            { id: "paused", label: "Suspendues" },
            { id: "completed", label: "Clôturées" },
            { id: "cancelled", label: "Annulées" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? "bg-forest-800 text-white shadow-2xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Liste des Cartes ou État Vide */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 mb-4">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Aucune campagne commerciale trouvée
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            {campaigns.length === 0
              ? "Aucune campagne n'a encore été créée pour votre exploitation. Créez votre première offre commerciale pour valoriser vos productions auprès des revendeurs."
              : "Aucune campagne ne correspond aux filtres de recherche actuels."}
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => (
            <CompanyCampaignCard
              key={camp.id}
              campaign={camp}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {/* Modale de création / modification */}
      <CampaignFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eligibleProductions={eligibleProductions}
        provinces={provinces}
        marketDemands={marketDemands}
        campaignToEdit={campaignToEdit}
      />
    </div>
  );
}
