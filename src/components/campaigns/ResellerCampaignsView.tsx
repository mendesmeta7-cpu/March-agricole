"use client";

import { useState } from "react";
import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import ResellerCampaignCard from "./ResellerCampaignCard";
import OrderFormModal from "@/components/orders/OrderFormModal";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import {
  Megaphone,
  Search,
  Filter,
  CheckCircle2,
  PackageOpen,
  Info,
  TrendingUp,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

interface ResellerCampaignsViewProps {
  initialCampaigns: ResellerCampaignItem[];
  resellerProvinceId?: string;
  resellerProvinceName?: string;
  resellerCity?: string;
  resellerAddress?: string;
}

export default function ResellerCampaignsView({
  initialCampaigns,
  resellerProvinceId,
  resellerProvinceName,
  resellerCity = "",
  resellerAddress = "",
}: ResellerCampaignsViewProps) {
  const [campaigns] = useState<ResellerCampaignItem[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // État du modal de commande
  const [orderingCampaign, setOrderingCampaign] = useState<ResellerCampaignItem | null>(null);

  // Catégories uniques
  const categories = Array.from(
    new Set(campaigns.map((c) => c.product.category))
  ).filter(Boolean);

  // Filtrage réactif
  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesCategory =
      selectedCategory === "all" || camp.product.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEligibility = !eligibleOnly || camp.is_eligible;

    return matchesCategory && matchesSearch && matchesEligibility;
  });

  const eligibleCount = campaigns.filter((c) => c.is_eligible).length;

  return (
    <div className="space-y-6">
      {/* 1. Fil d'Ariane & Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/reseller"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
      </div>

      <PageHeader
        title="Campagnes & Offres Commerciales"
        description="Découvrez les productions mises en vente active par les exploitations agricoles avec prix fermes, volumes garantis et zones de livraison."
      />

      {/* 2. Note d'information revendeur */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="bg-forest-50/40 border-forest-200/80">
          <div className="flex items-start gap-3 text-forest-900 text-xs sm:text-sm">
            <Info className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                Éligibilité territoriale ({resellerProvinceName || "Votre Province"}) :
              </span>
              <p className="text-forest-800 text-xs leading-relaxed">
                Les offres sont étiquetées selon les territoires desservis. Cliquez sur <strong>Commander</strong> pour réserver un volume de manière atomique si votre province est couverte.
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-earth-200/80 bg-earth-50/40">
          <div className="flex items-start gap-3 text-earth-900 text-xs sm:text-sm">
            <TrendingUp className="w-5 h-5 text-earth-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Une offre ne dessert pas votre province ?</span>
              <p className="text-earth-800 text-xs leading-relaxed">
                Formulez une demande d&apos;achat sur cette denrée pour informer les producteurs de vos volumes cibles.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Barre de Filtres et Recherche */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-1">
          {/* Recherche */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par culture, entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden"
            />
          </div>

          {/* Catégories */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 outline-hidden"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Éligibilité */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 self-start md:self-auto shadow-2xs">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
            className="rounded text-forest-700 focus:ring-forest-500"
          />
          <span className="font-medium">Desservant ma province ({eligibleCount})</span>
        </label>
      </div>

      {/* 4. Grille des offres ou État vide */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Aucune offre commerciale disponible
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            {campaigns.length === 0
              ? "Aucune campagne commerciale ouverte n'est actuellement disponible sur la plateforme."
              : "Aucune offre ne correspond aux critères de recherche sélectionnés."}
          </p>
          <Link
            href="/dashboard/reseller/demands"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-700 text-white font-semibold text-xs hover:bg-forest-800 transition-colors shadow-xs"
          >
            <TrendingUp className="w-4 h-4" />
            Exprimer un besoin d&apos;approvisionnement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => (
            <ResellerCampaignCard
              key={camp.id}
              campaign={camp}
              onOrderClick={(c) => setOrderingCampaign(c)}
            />
          ))}
        </div>
      )}

      {/* Modal de passation de commande */}
      {orderingCampaign && (
        <OrderFormModal
          isOpen={!!orderingCampaign}
          onClose={() => setOrderingCampaign(null)}
          campaign={orderingCampaign}
          resellerProvinceId={resellerProvinceId}
          resellerProvinceName={resellerProvinceName}
          defaultCity={resellerCity}
          defaultAddress={resellerAddress}
        />
      )}
    </div>
  );
}
