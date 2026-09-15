"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import ResellerOrderCard from "./ResellerOrderCard";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Search,
  Filter,
  ArrowLeft,
  PackageOpen,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ResellerOrdersViewProps {
  initialOrders: OrderDetail[];
}

export default function ResellerOrdersView({
  initialOrders,
}: ResellerOrdersViewProps) {
  const router = useRouter();
  const [orders] = useState<OrderDetail[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const inProgressCount = orders.filter((o) =>
    ["confirmed", "preparing", "ready"].includes(o.status)
  ).length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      selectedStatus === "all" || order.status === selectedStatus;
    const matchesSearch =
      searchQuery.trim() === "" ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_items.some((oi) =>
        oi.product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/reseller"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil revendeur
        </Link>
      </div>

      <PageHeader
        title="Mes Commandes d'Achat"
        description="Consultez l'historique de vos engagements fermes, le suivi des réservations atomiques et l'état de préparation de vos lots."
      />

      {/* 2. Indicateurs statistiques réels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Commandes"
          value={totalCount}
          icon={<ShoppingBag className="w-5 h-5 text-forest-700" />}
          variant="forest"
          helper={totalCount === 0 ? "0 commande enregistrée" : `${totalCount} commande(s) passée(s)`}
        />
        <StatCard
          label="En Attente"
          value={pendingCount}
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          variant="default"
          helper={pendingCount === 0 ? "0 en attente" : `${pendingCount} à valider par l'exploitation`}
        />
        <StatCard
          label="En Préparation"
          value={inProgressCount}
          icon={<Truck className="w-5 h-5 text-indigo-700" />}
          variant="default"
          helper={inProgressCount === 0 ? "0 en cours" : `${inProgressCount} lot(s) en préparation`}
        />
        <StatCard
          label="Livrées / Clôturées"
          value={deliveredCount}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          variant="default"
          helper={deliveredCount === 0 ? "0 clôturée" : `${deliveredCount} lot(s) réceptionné(s)`}
        />
      </div>

      {/* 3. Filtres et Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="N° commande, culture, exploitation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 outline-hidden"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente de confirmation</option>
            <option value="confirmed">Confirmée par l&apos;exploitation</option>
            <option value="preparing">En cours de préparation</option>
            <option value="ready">Prête pour retrait / expédition</option>
            <option value="delivered">Livrée / Réceptionnée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      {/* 4. Liste des commandes ou état vide */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Aucune commande trouvée
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            {orders.length === 0
              ? "Vous n'avez pas encore passé de commande d'achat ferme. Explorez les campagnes commerciales ouvertes pour réserver des récoltes."
              : "Aucune commande ne correspond à vos critères de recherche actuels."}
          </p>
          <Link
            href="/dashboard/reseller/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-700 text-white font-semibold text-xs hover:bg-forest-800 transition-colors shadow-xs"
          >
            <Megaphone className="w-4 h-4" />
            Parcourir les offres commerciales
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => (
            <ResellerOrderCard
              key={order.id}
              order={order}
              onRefresh={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
