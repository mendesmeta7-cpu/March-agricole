"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import CompanyOrderCard from "./CompanyOrderCard";
import CompanyOrderDetailDrawer from "./CompanyOrderDetailDrawer";
import CompanyOrderLookupWidget from "./CompanyOrderLookupWidget";
import DeliveryConfirmationModal from "./DeliveryConfirmationModal";
import { updateOrderStatusAction, cancelOrderAction } from "@/lib/actions/orders";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import FiltresActifs from "@/components/ui/FiltresActifs";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  COMPANY_ORDER_STATUS_LABELS,
  canChangeCompanyOrderStatus,
  getNextCompanyOrderStatusOptions,
} from "./CompanyOrderStatusOptions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Search,
  Filter,
  PackageOpen,
  Eye,
  Settings,
  Layers,
  Calendar,
  X,
  Store,
  LayoutGrid,
  List,
  RotateCcw,
} from "lucide-react";
import { formatAmount, formatQuantityWithUnit } from "@/lib/utils/numberFormat";

interface CompanyOrdersViewProps {
  initialOrders: OrderDetail[];
}

function OrdersContent({ initialOrders }: CompanyOrdersViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderDetail[]>(initialOrders);

  // Resynchronisation après router.refresh() : les props serveur font foi (FUN-09).
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Drawer de détail
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<OrderDetail | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Modal Statut
  const [statusModalOrder, setStatusModalOrder] = useState<OrderDetail | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("confirmed");

  // Modal Confirmation Livraison (RPC confirm_order_delivery)
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<OrderDetail | null>(null);

  // Dialogue Annulation
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderDetail | null>(null);

  // États de chargement
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState(false);

  // Métriques réelles calculées
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const confirmed = orders.filter((o) => o.status === "confirmed").length;
    const preparing = orders.filter((o) => o.status === "preparing").length;
    const ready = orders.filter((o) => o.status === "ready").length;
    const inProgress = confirmed + preparing + ready;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;

    return { total, pending, confirmed, preparing, ready, inProgress, delivered, cancelled };
  }, [orders]);

  // Liste des campagnes uniques présentes dans les commandes réelles
  const uniqueCampaigns = useMemo(() => {
    return Array.from(
      new Map(
        orders
          .filter((o): o is OrderDetail & { campaign_id: string } => !!o.campaign_id)
          .map((o) => [o.campaign_id, o.campaign?.title || o.campaign_title_snapshot || "Campagne"])
      ).entries()
    );
  }, [orders]);

  const campaignOptions = useMemo(
    () => [
      { value: "all", label: "Toutes les campagnes" },
      ...uniqueCampaigns.map(([cId, cTitle]) => ({ value: cId, label: cTitle })),
    ],
    [uniqueCampaigns]
  );

  // FUN-01 : uniquement les statuts strictement postérieurs au statut courant de la commande ciblée.
  const statusOptions = useMemo(
    () => (statusModalOrder ? getNextCompanyOrderStatusOptions(statusModalOrder.status) : []),
    [statusModalOrder]
  );

  // Commandes filtrées
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === "all" || order.status === selectedStatus;
      const matchesCampaign =
        selectedCampaignId === "all" || order.campaign_id === selectedCampaignId;
      const cleanSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        cleanSearch === "" ||
        order.order_number.toLowerCase().includes(cleanSearch) ||
        order.reseller.business_name.toLowerCase().includes(cleanSearch) ||
        (order.campaign?.title || "").toLowerCase().includes(cleanSearch) ||
        (order.destination_city_snapshot || order.destination?.city_name || "").toLowerCase().includes(cleanSearch) ||
        order.order_items.some((oi) =>
          (oi.product?.name || oi.product_name_snapshot || "").toLowerCase().includes(cleanSearch)
        );

      return matchesStatus && matchesCampaign && matchesSearch;
    });
  }, [orders, selectedStatus, selectedCampaignId, searchQuery]);

  // Nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== "all") count++;
    if (selectedCampaignId !== "all") count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [selectedStatus, selectedCampaignId, searchQuery]);

  const handleResetFilters = () => {
    setSelectedStatus("all");
    setSelectedCampaignId("all");
    setSearchQuery("");
  };

  // Actions de Drawer / Modales
  const handleOpenDetail = (order: OrderDetail) => {
    setSelectedOrderForDetail(order);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenStatusModal = (order: OrderDetail) => {
    const options = getNextCompanyOrderStatusOptions(order.status);
    if (options.length === 0) return;
    setStatusModalOrder(order);
    setNewStatus(options[0].value);
  };

  // Transition rapide de statut (ex: pending -> confirmed)
  const handleQuickStatusChange = async (order: OrderDetail, targetStatus: OrderStatus) => {
    setActionLoading(true);
    try {
      const res = await updateOrderStatusAction(order.id, targetStatus);
      if (!res.success) {
        toast.error("Erreur de mise à jour", {
          description: res.error || "Impossible d'actualiser le statut.",
        });
        return;
      }

      toast.success("Statut mis à jour", {
        description: `La commande ${order.order_number} est désormais à l'état « ${COMPANY_ORDER_STATUS_LABELS[targetStatus]} ».`,
      });

      // Mise à jour de l'état local
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: targetStatus } : o))
      );
      if (selectedOrderForDetail?.id === order.id) {
        setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: targetStatus } : null));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error("Erreur action commande :", err);
      toast.error("Erreur", { description: "Erreur inattendue." });
    } finally {
      setActionLoading(false);
    }
  };

  // Soumission modale de changement de statut
  const handleSubmitStatusModal = async () => {
    if (!statusModalOrder) return;
    if (!statusOptions.some((opt) => opt.value === newStatus)) {
      toast.error("Statut non disponible", {
        description: "Ce statut ne peut pas être appliqué à la commande dans son état actuel.",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await updateOrderStatusAction(statusModalOrder.id, newStatus);
      if (!res.success) {
        toast.error("Erreur de mise à jour", {
          description: res.error || "Impossible d'actualiser le statut.",
        });
        return;
      }

      toast.success("Statut mis à jour", {
        description: `La commande ${statusModalOrder.order_number} est passée à « ${COMPANY_ORDER_STATUS_LABELS[newStatus]} ».`,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === statusModalOrder.id ? { ...o, status: newStatus } : o))
      );
      if (selectedOrderForDetail?.id === statusModalOrder.id) {
        setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      setStatusModalOrder(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error("Erreur action commande :", err);
      toast.error("Erreur", { description: "Erreur inattendue." });
    } finally {
      setActionLoading(false);
    }
  };

  // Annulation formelle d'une commande avec libération de stock
  const handleConfirmCancelOrder = async () => {
    if (!cancelModalOrder) return;
    setActionLoading(true);
    try {
      const res = await cancelOrderAction(
        cancelModalOrder.id,
        "Annulation demandée par l'exploitation agricole"
      );
      if (!res.success) {
        toast.error("Erreur lors de l'annulation", {
          description: res.error || "Impossible d'annuler la commande.",
        });
        return;
      }

      toast.success("Commande annulée", {
        description: `La commande ${cancelModalOrder.order_number} a été annulée et son stock a été libéré.`,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === cancelModalOrder.id ? { ...o, status: "cancelled" } : o))
      );
      if (selectedOrderForDetail?.id === cancelModalOrder.id) {
        setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      }

      setCancelModalOrder(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error("Erreur action commande :", err);
      toast.error("Erreur", { description: "Erreur inattendue." });
    } finally {
      setActionLoading(false);
    }
  };

  // Callback confirmation de livraison depuis Lookup Widget ou modal
  // FUN-09 : la livraison confirmée est reflétée immédiatement (statut, compteurs, boutons),
  // puis les données serveur sont rechargées.
  const markOrderDelivered = (updatedOrderNumber: string) => {
    const deliveredAt = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.order_number === updatedOrderNumber
          ? { ...o, status: "delivered", delivered_at: o.delivered_at || deliveredAt }
          : o
      )
    );
    setSelectedOrderForDetail((prev) =>
      prev && prev.order_number === updatedOrderNumber
        ? { ...prev, status: "delivered", delivered_at: prev.delivered_at || deliveredAt }
        : prev
    );
    startTransition(() => {
      router.refresh();
    });
  };

  const handleDeliveryConfirmed = (updatedOrderNumber: string) => {
    toast.success("Livraison confirmée", {
      description: `La commande ${updatedOrderNumber} est marquée comme livrée.`,
    });
    setDeliveryModalOrder(null);
    setIsDetailDrawerOpen(false);
    markOrderDelivered(updatedOrderNumber);
  };

  // Onglets de statut avec compteurs réels
  const statusTabs = [
    { id: "all", label: "Toutes", count: metrics.total },
    { id: "pending", label: "En attente", count: metrics.pending },
    { id: "confirmed", label: "Confirmées", count: metrics.confirmed },
    { id: "preparing", label: "En préparation", count: metrics.preparing },
    { id: "ready", label: "Prêtes", count: metrics.ready },
    { id: "delivered", label: "Livrées", count: metrics.delivered },
    { id: "cancelled", label: "Annulées", count: metrics.cancelled },
  ];

  return (
    <div className="space-y-6">
      {/* 1. En-tête commun (Lot 6B, NAV-02). Les compteurs du bandeau sombre (Total, En attente,
          Livrées) faisaient double emploi avec les cartes ci-dessous (NAV-06) : seules les cartes restent. */}
      <PageHeader
        breadcrumb={[{ href: "/dashboard/company", label: "Tableau de bord" }]}
        title="Commandes reçues"
        description="Suivez les engagements fermes de vos revendeurs, gérez la préparation de vos lots récoltés et validez les remises de stock physiques au dépôt."
      />

      {/* 2. Indicateur propre à cette page. Correctif NAV-06 (Lot 6B) : « Total Commandes », « À Valider » et
          « Livrées » répétaient exactement les onglets « Toutes », « En attente » et « Livrées » ci-dessous, toujours
          visibles (arbitrage A) : retirés. « En cours » (confirmées, en préparation ou prêtes) n'a pas d'onglet
          équivalent : il reste, avec sa légende, en carte basse (arbitrage B). Calculs inchangés (metrics). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="none" className="p-2.5 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            {/* Sous 640 px : libellé et légende sur une ligne (arbitrage B, suite) ; empilés au-delà */}
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 sm:block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                En Cours
              </span>
              <span className="text-xs text-gray-500 sm:mt-0.5 block">
                {metrics.inProgress === 0 ? "0 lot en préparation" : `${metrics.inProgress} confirmée(s) ou en route`}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xl leading-6 sm:text-2xl sm:leading-8 font-extrabold text-indigo-700">
                {metrics.inProgress}
              </span>
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Widget de Récupération Rapide & Scanner QR */}
      <CompanyOrderLookupWidget onDeliveryUpdated={markOrderDelivered} />

      {/* 5. Onglets de Statut Défilables */}
      <div className="border-b border-gray-200/80">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-forest-900 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-px rounded-full text-[11px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Barre d'outils de Filtrage et Recherche — recherche et accès aux filtres sur une même ligne
          (correctif NAV-06, arbitrage C) ; le critère de campagne choisi dans le tiroir reste rappelé sous 640 px. */}
      <div className="space-y-2">
      <div className="flex flex-row gap-2 sm:gap-3 items-center justify-between">
        {/* Barre de recherche */}
        <div className="relative flex-1 min-w-0 md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="N° commande, revendeur, produit, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Contrôles Desktop & Bascules */}
        <div className="flex items-center gap-2 justify-between md:justify-end">
          {/* Filtre campagne si uniqueCampagnes */}
          {uniqueCampaigns.length > 0 && (
            <div className="hidden sm:block w-52">
              <Select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                options={campaignOptions}
                selectSize="sm"
              />
            </div>
          )}

          {/* Bouton Filtres Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="sm:hidden min-h-11 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-forest-700 text-white text-[11px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Réinitialisation si filtres actifs */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              aria-label="Réinitialiser les filtres"
              className="text-xs text-forest-700 hover:text-forest-900 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-forest-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          )}

          {/* Bascule mode d'affichage Grille / Tableau */}
          <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "cards"
                  ? "bg-white text-forest-900 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Vue Cartes"
              aria-label="Vue Cartes"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white text-forest-900 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Vue Tableau compact"
              aria-label="Vue Tableau compact"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {selectedCampaignId !== "all" && (
        <FiltresActifs
          className="sm:hidden"
          criteres={[{
            cle: "campagne",
            libelle: "Campagne",
            valeur: campaignOptions.find((o) => o.value === selectedCampaignId)?.label ?? "Campagne",
            retirer: () => setSelectedCampaignId("all"),
          }]}
        />
      )}
      </div>

      {/* 7. Contenu : Liste de commandes ou États Vides */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-14 text-center shadow-2xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 mb-4">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
            {orders.length === 0 ? "Aucune commande reçue" : "Aucun résultat trouvé"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
            {orders.length === 0
              ? "Vos campagnes n'ont pas encore reçu d'engagements fermes de la part des revendeurs. Vérifiez que vos campagnes sont publiées et actives sur le marché."
              : "Aucune commande ne correspond aux filtres et termes de recherche sélectionnés."}
          </p>

          {orders.length === 0 ? (
            <Link
              href="/dashboard/company/campaigns"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 transition-colors shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Consulter mes campagnes</span>
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </Button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* Vue en Cartes Modernes */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredOrders.map((order) => (
            <CompanyOrderCard
              key={order.id}
              order={order}
              onOpenDetail={handleOpenDetail}
              onOpenStatusModal={handleOpenStatusModal}
              onQuickStatusChange={handleQuickStatusChange}
            />
          ))}
        </div>
      ) : (
        /* Vue Tableau Dense pour Desktop */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Commande</th>
                  <th className="py-3.5 px-4">Revendeur</th>
                  <th className="py-3.5 px-4">Produit & campagne</th>
                  <th className="py-3.5 px-4 text-right">Volume</th>
                  <th className="py-3.5 px-4 text-right">Montant</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const mainItem = order.order_items[0];
                  const itemQty = mainItem ? mainItem.quantity : 0;
                  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit || "tonne";

                  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(order.created_at));

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* N° Commande & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-gray-500 text-xs font-medium block">
                          Réf. {order.order_number}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </td>

                      {/* Revendeur */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-earth-50 text-earth-800 flex items-center justify-center font-bold text-xs shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate max-w-[160px]">
                              {order.reseller.business_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {order.reseller.city ? `${order.reseller.city}, ` : ""}
                              {order.reseller.provinces?.name || "RDC"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Offre & Produit */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900 block truncate max-w-[180px]">
                          {mainItem?.product?.name || mainItem?.product_name_snapshot || "Produit agricole"}
                        </span>
                        <span className="text-xs text-gray-400 block truncate max-w-[180px]">
                          {order.campaign?.title || order.campaign_title_snapshot || "Campagne"}
                        </span>
                      </td>

                      {/* Quantité */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-gray-900 flex items-center gap-1 justify-end">
                          <Layers className="w-3 h-3 text-forest-700" />
                          {formatQuantityWithUnit(itemQty, itemUnit)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {mainItem ? `${mainItem.unit_price} ${order.currency}/${itemUnit}` : ""}
                        </span>
                      </td>

                      {/* Montant Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-black text-forest-900 font-mono whitespace-nowrap">
                          {formatAmount(order.total_amount)}{" "}
                          {order.currency}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} size="sm" compact />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canChangeCompanyOrderStatus(order.status) && (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(order)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
                              title="Changer le statut"
                              aria-label={`Changer le statut de la commande ${order.order_number}`}
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(order)}
                            className="p-1.5 h-auto text-xs"
                            title="Voir le détail"
                            aria-label={`Voir le détail de la commande ${order.order_number}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
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

      {/* 8. Drawer de Détail de Commande (R1) */}
      <CompanyOrderDetailDrawer
        order={selectedOrderForDetail}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedOrderForDetail(null);
        }}
        onOpenStatusModal={(ord) => handleOpenStatusModal(ord)}
        onConfirmDelivery={(ord) => setDeliveryModalOrder(ord)}
        onQuickTransition={handleQuickStatusChange}
        onRequestCancel={(ord) => setCancelModalOrder(ord)}
        isActionLoading={actionLoading}
      />

      {/* 9. Modal Changement Manuel de Statut */}
      <Dialog
        isOpen={!!statusModalOrder && statusOptions.length > 0}
        onClose={() => setStatusModalOrder(null)}
        size="md"
        isDismissable={!actionLoading}
        showCloseButton={!actionLoading}
        icon={<Settings className="w-5 h-5" />}
        title={"Actualiser le Statut Logistique"}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusModalOrder(null)}
              disabled={actionLoading}
            >
              Fermer
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitStatusModal}
              isLoading={actionLoading}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        {statusModalOrder && (
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Commande <strong>{statusModalOrder.order_number}</strong> ({statusModalOrder.reseller.business_name})
            </p>

            <div className="space-y-1.5">
              <label htmlFor="company-orders-status-select" className="block text-xs font-bold text-gray-700">
                Sélectionner le nouveau statut :
              </label>
              <Select
                id="company-orders-status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                options={statusOptions}
                selectSize="sm"
              />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Le statut ne peut qu&apos;avancer. La livraison se confirme via le QR code ou le
              numéro de commande ; l&apos;annulation via le bouton « Annuler ».
            </p>
          </div>
        )}
      </Dialog>

      {/* 11. Modal Confirmation Livraison (RPC confirm_order_delivery) */}
      {deliveryModalOrder && (
        <DeliveryConfirmationModal
          order={{
            order_id: deliveryModalOrder.id,
            order_number: deliveryModalOrder.order_number,
            qr_code_token: deliveryModalOrder.qr_code_token,
            status: deliveryModalOrder.status,
            total_amount: deliveryModalOrder.total_amount,
            currency: deliveryModalOrder.currency,
            created_at: deliveryModalOrder.created_at,
            delivered_at: deliveryModalOrder.delivered_at,
            delivered_quantity: deliveryModalOrder.delivered_quantity,
            delivery_notes: deliveryModalOrder.delivery_notes,
            delivery_province_name: deliveryModalOrder.delivery_province?.name || null,
            delivery_city: deliveryModalOrder.destination_city_snapshot || deliveryModalOrder.delivery_city,
            delivery_address: deliveryModalOrder.delivery_address,
            reseller_id: deliveryModalOrder.reseller_id,
            reseller_business_name: deliveryModalOrder.reseller.business_name,
            company_id: deliveryModalOrder.company_id,
            company_name: deliveryModalOrder.company.name,
            campaign_title: deliveryModalOrder.campaign?.title || null,
            production_title: deliveryModalOrder.campaign?.production?.title || null,
            total_ordered_quantity: deliveryModalOrder.order_items[0]?.quantity || 0,
            unit: deliveryModalOrder.order_items[0]?.unit || "tonne",
            items: deliveryModalOrder.order_items.map((it) => ({
              product_id: it.product_id,
              product_name: it.product?.name || it.product_name_snapshot || "Produit",
              quantity: it.quantity,
              unit: it.unit,
              unit_price: it.unit_price,
              subtotal: it.subtotal,
            })),
          }}
          isOpen={!!deliveryModalOrder}
          onClose={() => setDeliveryModalOrder(null)}
          onDeliveryConfirmed={handleDeliveryConfirmed}
        />
      )}

      {/* 12. Dialogue de Confirmation d'Annulation (ConfirmDialog) */}
      {cancelModalOrder && (
        <ConfirmDialog
          isOpen={!!cancelModalOrder}
          onClose={() => setCancelModalOrder(null)}
          onConfirm={handleConfirmCancelOrder}
          title="Annuler cette commande ?"
          description={`Êtes-vous certain de vouloir annuler la commande ${cancelModalOrder.order_number} (${cancelModalOrder.reseller.business_name}) ? Cette action libérera immédiatement les ${cancelModalOrder.order_items[0]?.quantity || 0} ${cancelModalOrder.order_items[0]?.unit || "tonne"} réservés pour les remettre en stock disponible sur votre campagne.`}
          confirmText="Confirmer l'annulation"
          cancelText="Conserver la commande"
          variant="destructive"
          isLoading={actionLoading}
        />
      )}

      {/* 13. Drawer Filtres Mobile */}
      <Drawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filtres de recherche"
        size="sm"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Réinitialiser
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Appliquer
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {uniqueCampaigns.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Campagne :</label>
              <Select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                options={campaignOptions}
                selectSize="sm"
              />
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}

export default function CompanyOrdersView(props: CompanyOrdersViewProps) {
  return (
    <ToastProvider>
      <OrdersContent {...props} />
    </ToastProvider>
  );
}
