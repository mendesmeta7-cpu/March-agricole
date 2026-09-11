"use client";

import { useState } from "react";
import { AggregatedDemandItem } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province, Country } from "@/lib/queries/geography";
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
} from "lucide-react";
import Link from "next/link";

interface MarketDemandsAnalysisViewProps {
  initialAggregates: AggregatedDemandItem[];
  catalogProducts: CatalogProduct[];
  provinces: Province[];
  companyName: string;
}

export default function MarketDemandsAnalysisView({
  initialAggregates,
  catalogProducts,
  provinces,
  companyName,
}: MarketDemandsAnalysisViewProps) {
  const [aggregates, setAggregates] = useState<AggregatedDemandItem[]>(initialAggregates);
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Synchronisation
  if (initialAggregates !== aggregates) {
    setAggregates(initialAggregates);
  }

  // Filtrage combiné côté client
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
        title="Demandes du Marché & Analyse Territoriale"
        description={`Visualisez les volumes de denrées agricoles recherchés par les acheteurs à travers les provinces de la RDC pour orienter les campagnes de l'exploitation « ${companyName} ».`}
        badge={<Badge variant="forest">Intelligence Macro V1</Badge>}
      />

      {/* Note de Confidentialité & Décloisonnement */}
      <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100/80 text-forest-950 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 shrink-0 text-forest-700 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-forest-900">
            Décloisonnement territorial & Confidentialité des acheteurs :
          </p>
          <p className="text-xs text-forest-800/90 leading-relaxed">
            Ces statistiques sont agrégées en temps réel par province et par denrée. Elles vous permettent
            d&apos;identifier la demande solvable sur l&apos;ensemble du pays — y compris dans des territoires
            que vous ne desservez pas encore — tout en préservant l&apos;anonymat absolu des revendeurs.
          </p>
        </div>
      </div>

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

      {/* Barre de Recherche et Filtres */}
      <div className="p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filtrer par denrée, province, catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600 transition-all bg-gray-50/50 focus:bg-white"
            />
          </div>

          {/* Filtre Denrée */}
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

            {/* Filtre Province */}
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
                {filteredAggregates.map((row, idx) => (
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
  );
}
