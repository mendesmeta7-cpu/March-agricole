"use client";

import { useState, useMemo } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import ResellerOrderCard from "./ResellerOrderCard";
import ResellerOrderDetailDrawer from "./ResellerOrderDetailDrawer";
import QRCodeModal from "./QRCodeModal";
import Dialog from "@/components/ui/Dialog";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cancelOrderAction } from "@/lib/actions/orders";
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
  X,
  ShieldCheck,
  QrCode,
  Layers,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ResellerOrdersViewProps {
  initialOrders: OrderDetail[];
}

type FilterCategory = "all" | "pending" | "in_progress" | "delivered" | "cancelled";

export default function ResellerOrdersView({
  initialOrders,
}: ResellerOrdersViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderDetail[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Tiroir de détail
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<OrderDetail | null>(null);

  // Modal QR Code global
  const [qrModalOrder, setQrModalOrder] = useState<OrderDetail | null>(null);

  // Modal d'annulation
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderDetail | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Synchronisation si initialOrders change
  if (initialOrders !== orders && initialOrders.length !== orders.length) {
    setOrders(initialOrders);
  }

  // Comptages statistiques réels (0 Mock Data)
  const totalCount = orders.length;
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );
  const inProgressCount = useMemo(
    () => orders.filter((o) => ["confirmed", "preparing", "ready"].includes(o.status)).length,
    [orders]
  );
  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === "delivered").length,
    [orders]
  );
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === "cancelled").length,
    [orders]
  );

  // Filtrage combiné (Recherche multi-critères + Statut)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Filtre de statut
      let matchesStatus = true;
      if (selectedFilter === "pending") {
        matchesStatus = order.status === "pending";
      } else if (selectedFilter === "in_progress") {
        matchesStatus = ["confirmed", "preparing", "ready"].includes(order.status);
      } else if (selectedFilter === "delivered") {
        matchesStatus = order.status === "delivered";
      } else if (selectedFilter === "cancelled") {
        matchesStatus = order.status === "cancelled";
      }

      // 2. Recherche textuelle
      const q = searchQuery.trim().toLowerCase();
      let matchesSearch = true;
      if (q) {
        const orderNum = order.order_number.toLowerCase();
        const compName = (order.company?.name || order.company_name_snapshot || "").toLowerCase();
        const campTitle = (order.campaign?.title || order.campaign_title_snapshot || "").toLowerCase();
        const city = (
          order.destination_city_snapshot ||
          order.destination?.city_name ||
          order.delivery_city ||
          ""
        ).toLowerCase();
        const depot = (order.depot_name_snapshot || order.depot?.name || "").toLowerCase();
        const items = order.order_items.some((oi) =>
          (oi.product?.name || oi.product_name_snapshot || "").toLowerCase().includes(q)
        );

        matchesSearch =
          orderNum.includes(q) ||
          compName.includes(q) ||
          campTitle.includes(q) ||
          city.includes(q) ||
          depot.includes(q) ||
          items;
      }

      return matchesStatus && matchesSearch;
    });
  }, [orders, selectedFilter, searchQuery]);

  // Action d'annulation
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;

    setCancelling(true);
    setCancelError(null);

    const res = await cancelOrderAction(
      cancelModalOrder.id,
      cancelReason || "Annulation demandée par le revendeur"
    );

    setCancelling(false);

    if (!res.success) {
      setCancelError(res.error || "Impossible d'annuler cette commande.");
      toast.error("Erreur", { description: res.error || "Impossible d'annuler la commande." });
      return;
    }

    toast.success("Commande annulée", {
      description: `La commande ${cancelModalOrder.order_number} a été annulée et le stock libéré.`,
    });

    setOrders((prev) =>
      prev.map((o) => (o.id === cancelModalOrder.id ? { ...o, status: "cancelled" } : o))
    );

    setCancelModalOrder(null);
    setCancelReason("");
    if (selectedOrderForDrawer?.id === cancelModalOrder.id) {
      setSelectedOrderForDrawer((prev) => (prev ? { ...prev, status: "cancelled" } : null));
    }
    router.refresh();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* 1. Fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/reseller"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Espace Revendeur</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Mes Commandes</span>
      </div>

      {/* 2. En-tête de section moderne */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
            Mes Commandes d&apos;Achat
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
            Suivez en temps réel vos réservations fermes de récoltes, l&apos;acheminement vers votre
            région et présentez votre QR Code sécurisé lors du retrait en dépôt.
          </p>
        </div>

        <Link
          href="/dashboard/reseller/campaigns"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all self-start md:self-auto shrink-0"
        >
          <Megaphone className="w-4 h-4 text-emerald-300" />
          <span>Explorer les offres</span>
        </Link>
      </div>

      {/* 3. Indicateurs statistiques réels (0 Mock Data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Total Commandes
            </span>
            <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-display">
              {totalCount}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {totalCount === 0 ? "0 commande enregistrée" : `${totalCount} commande(s) passée(s)`}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              En Attente
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-display">
              {pendingCount}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {pendingCount === 0
                ? "0 en attente"
                : `${pendingCount} à confirmer par la ferme`}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              En Préparation
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-indigo-950 font-display">
              {inProgressCount}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {inProgressCount === 0
                ? "0 en cours"
                : `${inProgressCount} lot(s) en préparation / route`}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Livrées / Clôturées
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-display">
              {deliveredCount}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {deliveredCount === 0
                ? "0 commande livrée"
                : `${deliveredCount} lot(s) réceptionné(s)`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Cartouche de transparence et rassurance */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-forest-50/70 to-emerald-50/50 border border-forest-100/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-forest-800 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="text-xs space-y-0.5">
            <h3 className="text-xs sm:text-sm font-bold text-forest-950">
              Garantie d&apos;Approvisionnement et Sécurité Transactionnelle
            </h3>
            <p className="text-forest-900/90 leading-relaxed text-[11px] sm:text-xs">
              Toute commande passée déduit instantanément la quantité des stocks de
              l&apos;exploitation. Vous recevez un QR code infalsifiable à présenter au point de
              retrait le jour de l&apos;arrivée.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-forest-200/80 text-[11px] font-semibold text-forest-900">
            <QrCode className="w-3.5 h-3.5 text-forest-700" />
            <span>Retrait par QR Code</span>
          </div>
        </div>
      </div>

      {/* 5. Barre de recherche et filtres de statuts */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Champ de recherche multi-champs */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="N° commande, culture, exploitation, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-white placeholder-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 outline-hidden transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bouton filtres mobile */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Filtrer les commandes</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-900 text-[10px] font-bold">
              {filteredOrders.length}
            </span>
          </Button>
        </div>

        {/* Onglets de statuts Desktop */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl border border-gray-200/70 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === "all"
                ? "bg-white text-gray-900 shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Toutes ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === "pending"
                ? "bg-white text-amber-900 shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            En attente ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("in_progress")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === "in_progress"
                ? "bg-white text-indigo-900 shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            En cours ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("delivered")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === "delivered"
                ? "bg-white text-emerald-900 shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Livrées ({deliveredCount})
          </button>
          {cancelledCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter("cancelled")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === "cancelled"
                  ? "bg-white text-rose-900 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annulées ({cancelledCount})
            </button>
          )}
        </div>
      </div>

      {/* 6. Grille des commandes ou états vides */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4 shadow-2xs">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {orders.length === 0 ? "Aucune commande pour le moment" : "Aucun résultat trouvé"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6">
            {orders.length === 0
              ? "Vous n'avez pas encore passé de commande d'achat ferme. Explorez les campagnes commerciales ouvertes pour réserver des récoltes."
              : "Aucune commande ne correspond à vos filtres ou à votre terme de recherche."}
          </p>

          {orders.length === 0 ? (
            <Link
              href="/dashboard/reseller/campaigns"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 transition-colors shadow-xs"
            >
              <Megaphone className="w-4 h-4 text-emerald-300" />
              <span>Découvrir les offres commerciales</span>
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <RotateCcw className="w-4 h-4" />
              <span>Réinitialiser les filtres</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {filteredOrders.map((order) => (
            <ResellerOrderCard
              key={order.id}
              order={order}
              onRefresh={() => router.refresh()}
              onOpenDrawer={(ord) => setSelectedOrderForDrawer(ord)}
              onOpenQR={(ord) => setQrModalOrder(ord)}
            />
          ))}
        </div>
      )}

      {/* 7. Drawer mobile de filtres */}
      <Drawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        side="bottom"
        size="md"
        title="Filtrer mes commandes"
      >
        <div className="space-y-4 p-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Statut de la commande
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedFilter("all");
                setIsMobileFilterOpen(false);
              }}
              className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                selectedFilter === "all"
                  ? "bg-forest-50 border-forest-500 text-forest-950 font-bold"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span>Toutes les commandes</span>
              <span className="text-[11px] text-gray-400 font-mono">{totalCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter("pending");
                setIsMobileFilterOpen(false);
              }}
              className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                selectedFilter === "pending"
                  ? "bg-amber-50 border-amber-500 text-amber-950 font-bold"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span>En attente de confirmation</span>
              <span className="text-[11px] text-gray-400 font-mono">{pendingCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter("in_progress");
                setIsMobileFilterOpen(false);
              }}
              className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                selectedFilter === "in_progress"
                  ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span>En préparation & acheminement</span>
              <span className="text-[11px] text-gray-400 font-mono">{inProgressCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter("delivered");
                setIsMobileFilterOpen(false);
              }}
              className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                selectedFilter === "delivered"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span>Livrées / Réceptionnées</span>
              <span className="text-[11px] text-gray-400 font-mono">{deliveredCount}</span>
            </button>

            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter("cancelled");
                  setIsMobileFilterOpen(false);
                }}
                className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                  selectedFilter === "cancelled"
                    ? "bg-rose-50 border-rose-500 text-rose-950 font-bold"
                    : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                <span>Commandes annulées</span>
                <span className="text-[11px] text-gray-400 font-mono">{cancelledCount}</span>
              </button>
            )}
          </div>
        </div>
      </Drawer>

      {/* 8. Drawer de consultation détaillée */}
      <ResellerOrderDetailDrawer
        order={selectedOrderForDrawer}
        isOpen={Boolean(selectedOrderForDrawer)}
        onClose={() => setSelectedOrderForDrawer(null)}
        onShowQR={(ord) => setQrModalOrder(ord)}
        onCancelOrder={(ord) => setCancelModalOrder(ord)}
      />

      {/* 9. Modal QR Code Global */}
      {qrModalOrder && (
        <QRCodeModal
          isOpen={Boolean(qrModalOrder)}
          onClose={() => setQrModalOrder(null)}
          qrCodeToken={qrModalOrder.qr_code_token || qrModalOrder.order_number}
          orderNumber={qrModalOrder.order_number}
          productName={
            qrModalOrder.order_items[0]?.product.name || qrModalOrder.campaign.title
          }
          quantity={qrModalOrder.order_items[0]?.quantity || 0}
          unit={qrModalOrder.campaign.unit}
          companyName={qrModalOrder.company.name}
        />
      )}

      {/* 10. Modal d'annulation de commande */}
      {cancelModalOrder && (
        <Dialog
          isOpen={Boolean(cancelModalOrder)}
          onClose={() => setCancelModalOrder(null)}
          size="sm"
          title={
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Annuler la Commande</span>
            </div>
          }
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOrder(null)}
                disabled={cancelling}
              >
                Retour
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                isLoading={cancelling}
              >
                Confirmer l&apos;annulation
              </Button>
            </div>
          }
        >
          <div className="space-y-3 pt-1">
            <p className="text-xs text-gray-600 leading-relaxed">
              Êtes-vous sûr de vouloir annuler la commande{" "}
              <strong>{cancelModalOrder.order_number}</strong> ? Le volume réservé sera
              instantanément réintégré aux stocks disponibles de l&apos;offre commerciale.
            </p>

            {cancelError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                {cancelError}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-gray-700">
                Motif de l&apos;annulation (Optionnel)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Changement de prévisions logistiques..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:ring-1 focus:ring-rose-500 outline-hidden resize-none"
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
