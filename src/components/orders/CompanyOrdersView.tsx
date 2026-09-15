"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Search,
  Filter,
  ArrowLeft,
  PackageOpen,
  Building2,
  Eye,
  Settings,
  Layers,
  Calendar,
  AlertTriangle,
  X,
  Store,
} from "lucide-react";

interface CompanyOrdersViewProps {
  initialOrders: OrderDetail[];
}

export default function CompanyOrdersView({
  initialOrders,
}: CompanyOrdersViewProps) {
  const router = useRouter();
  const [orders] = useState<OrderDetail[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");

  // Modal de mise à jour du statut
  const [statusModalOrder, setStatusModalOrder] = useState<OrderDetail | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("confirmed");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const inProgressCount = orders.filter((o) =>
    ["confirmed", "preparing", "ready"].includes(o.status)
  ).length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  // Liste des campagnes uniques
  const uniqueCampaigns = Array.from(
    new Map(orders.map((o) => [o.campaign_id, o.campaign.title])).entries()
  );

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      selectedStatus === "all" || order.status === selectedStatus;
    const matchesCampaign =
      selectedCampaignId === "all" || order.campaign_id === selectedCampaignId;
    const matchesSearch =
      searchQuery.trim() === "" ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.reseller.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_items.some((oi) =>
        oi.product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesStatus && matchesCampaign && matchesSearch;
  });

  const handleOpenStatusModal = (order: OrderDetail) => {
    setStatusModalOrder(order);
    setNewStatus(order.status === "pending" ? "confirmed" : order.status);
    setUpdateError(null);
  };

  const handleUpdateStatus = async () => {
    if (!statusModalOrder) return;
    setUpdating(true);
    setUpdateError(null);

    const res = await updateOrderStatusAction(statusModalOrder.id, newStatus);
    setUpdating(false);

    if (!res.success) {
      setUpdateError(res.error || "Impossible de mettre à jour le statut.");
      return;
    }

    setStatusModalOrder(null);
    router.refresh();
  };

  return (
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

      <PageHeader
        title="Commandes Reçues & Suivi des Stocks"
        description="Gérez les engagements fermes passés par les acheteurs professionnels et suivez l'état d'avancement de vos réservations."
      />

      {/* 2. Statistiques en temps réel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Commandes"
          value={totalCount}
          icon={<ShoppingBag className="w-5 h-5 text-forest-700" />}
          variant="forest"
          helper={totalCount === 0 ? "0 commande reçue" : `${totalCount} commande(s) globale(s)`}
        />
        <StatCard
          label="À Confirmer"
          value={pendingCount}
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          variant="default"
          helper={pendingCount === 0 ? "Aucune commande en attente" : `${pendingCount} commande(s) à valider`}
        />
        <StatCard
          label="En Préparation"
          value={inProgressCount}
          icon={<Truck className="w-5 h-5 text-indigo-700" />}
          variant="default"
          helper={inProgressCount === 0 ? "0 lot en cours" : `${inProgressCount} lot(s) en préparation`}
        />
        <StatCard
          label="Livrées"
          value={deliveredCount}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          variant="default"
          helper={deliveredCount === 0 ? "0 commande livrée" : `${deliveredCount} lot(s) réceptionné(s)`}
        />
      </div>

      {/* 3. Filtres et Recherche */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="N° commande, revendeur, culture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Filtre par statut */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 outline-hidden"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente de confirmation</option>
            <option value="confirmed">Confirmée</option>
            <option value="preparing">En cours de préparation</option>
            <option value="ready">Prête pour retrait</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée</option>
          </select>

          {/* Filtre par campagne */}
          {uniqueCampaigns.length > 0 && (
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 outline-hidden"
            >
              <option value="all">Toutes les campagnes</option>
              {uniqueCampaigns.map(([cId, cTitle]) => (
                <option key={cId} value={cId}>
                  {cTitle}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. Liste / Tableau des commandes ou état vide */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Aucune commande reçue
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            {orders.length === 0
              ? "Vos campagnes n'ont pas encore reçu d'engagements fermes de la part des revendeurs. Assurez-vous que vos offres commerciales sont bien publiées avec le statut Actif."
              : "Aucune commande ne correspond aux critères sélectionnés."}
          </p>
          <Link
            href="/dashboard/company/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-700 text-white font-semibold text-xs hover:bg-forest-800 transition-colors shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            Consulter mes campagnes de vente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Commande</th>
                  <th className="py-3.5 px-4">Acheteur / Revendeur</th>
                  <th className="py-3.5 px-4">Offre & Culture</th>
                  <th className="py-3.5 px-4 text-right">Volume</th>
                  <th className="py-3.5 px-4 text-right">Montant Total</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const mainItem = order.order_items[0];
                  const itemQty = mainItem ? mainItem.quantity : 0;
                  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit;

                  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(order.created_at));

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* N° Commande & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 font-mono block">
                          {order.order_number}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </td>

                      {/* Revendeur */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-earth-50 text-earth-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block truncate max-w-[160px]">
                              {order.reseller.business_name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {order.delivery_province?.name || "RDC"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Campagne & Produit */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-800 block truncate max-w-[180px]">
                          {mainItem?.product.name || order.campaign.title}
                        </span>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[180px]">
                          {order.campaign.title}
                        </span>
                      </td>

                      {/* Quantité */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-gray-900 flex items-center gap-1 justify-end">
                          <Layers className="w-3 h-3 text-earth-600" />
                          {itemQty.toLocaleString("fr-FR")} {itemUnit}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {mainItem ? `${mainItem.unit_price} ${order.currency}/${itemUnit}` : ""}
                        </span>
                      </td>

                      {/* Montant Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-black text-forest-900">
                          {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {order.currency}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(order)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
                              title="Changer le statut"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Link
                            href={`/dashboard/company/orders/${order.id}`}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-forest-800 hover:bg-forest-50 transition-colors inline-flex"
                            title="Voir le détail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de mise à jour du statut */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-forest-700" />
                Actualiser le Statut de la Commande
              </h3>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Commande <strong>{statusModalOrder.order_number}</strong> ({statusModalOrder.reseller.business_name})
            </p>

            {updateError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                {updateError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Sélectionner le nouveau statut :
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden font-medium"
              >
                <option value="pending">En attente de confirmation</option>
                <option value="confirmed">Confirmée par l&apos;exploitation</option>
                <option value="preparing">En cours de préparation</option>
                <option value="ready">Prête pour retrait / expédition</option>
                <option value="delivered">Livrée / Réceptionnée</option>
                <option value="cancelled">Annulée (Libère le stock réservé)</option>
              </select>
            </div>

            {newStatus === "cancelled" && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span>
                  Attention : L&apos;annulation libérera immédiatement la réservation de stock liée pour la restituer à l&apos;offre commerciale.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                disabled={updating}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-4 py-1.5 text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                {updating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  <span>Enregistrer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
