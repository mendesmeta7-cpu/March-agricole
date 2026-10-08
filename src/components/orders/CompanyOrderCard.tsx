"use client";

import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import Button from "@/components/ui/Button";
import Image from "next/image";
import {
  Store,
  Calendar,
  Layers,
  MapPin,
  Truck,
  Eye,
  Settings,
  Package,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface CompanyOrderCardProps {
  order: OrderDetail;
  onOpenDetail: (order: OrderDetail) => void;
  onOpenStatusModal?: (order: OrderDetail) => void;
  onQuickStatusChange?: (order: OrderDetail, nextStatus: OrderStatus) => void;
}

export default function CompanyOrderCard({
  order,
  onOpenDetail,
  onOpenStatusModal,
  onQuickStatusChange,
}: CompanyOrderCardProps) {
  const mainItem = order.order_items[0];
  const itemQty = mainItem ? mainItem.quantity : 0;
  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit || "tonne";
  const itemPrice = mainItem ? mainItem.unit_price : order.campaign.unit_price || 0;

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(order.created_at));

  const arrivalDate =
    order.expected_arrival_date_snapshot || order.destination?.expected_arrival_date;

  const formattedArrivalDate = arrivalDate
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(arrivalDate))
    : null;

  // Barre d'accentuation supérieure selon le statut
  const statusBorderMap: Record<OrderStatus, string> = {
    pending: "from-amber-400 via-amber-500 to-amber-600",
    confirmed: "from-blue-500 via-blue-600 to-blue-700",
    preparing: "from-indigo-500 via-indigo-600 to-indigo-700",
    ready: "from-emerald-500 via-emerald-600 to-emerald-700",
    delivered: "from-forest-700 via-forest-800 to-forest-900",
    cancelled: "from-rose-400 via-rose-500 to-rose-600",
  };

  // Prochaine action rapide selon le workflow métier
  const getNextQuickAction = () => {
    if (!onQuickStatusChange) return null;
    switch (order.status) {
      case "pending":
        return {
          label: "Confirmer",
          nextStatus: "confirmed" as OrderStatus,
          variant: "primary" as const,
        };
      case "confirmed":
        return {
          label: "Préparer",
          nextStatus: "preparing" as OrderStatus,
          variant: "secondary" as const,
        };
      case "preparing":
        return {
          label: "Marquer prête",
          nextStatus: "ready" as OrderStatus,
          variant: "success" as const,
        };
      default:
        return null;
    }
  };

  const quickAction = getNextQuickAction();

  return (
    <div className="group relative bg-white rounded-3xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* 1. Bande supérieure dynamique de couleur */}
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${statusBorderMap[order.status] || "from-gray-300 to-gray-400"}`}
      />

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* 2. En-tête : N° Commande + Date + Statut */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-xs text-gray-500 font-medium block">
              Réf. {order.order_number}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-gray-400" />
              {formattedDate}
            </span>
          </div>

          <div className="shrink-0">
            <OrderStatusBadge status={order.status} size="sm" compact />
          </div>
        </div>

        {/* 3. Acheteur Revendeur */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-earth-100 text-earth-800 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs text-gray-900 block truncate">
              {order.reseller.business_name}
            </span>
            <span className="text-[10px] text-gray-500 block truncate">
              {order.reseller.city ? `${order.reseller.city}, ` : ""}
              {order.reseller.provinces?.name || order.delivery_province?.name || "RDC"}
            </span>
          </div>
        </div>

        {/* 4. Produit & Détail Volume */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-earth-50 border border-earth-100/80 flex items-center justify-center overflow-hidden shrink-0">
            {mainItem?.product?.image_url ? (
              <Image
                src={mainItem.product.image_url}
                alt={mainItem.product.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-6 h-6 text-earth-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
              {mainItem?.product?.name || mainItem?.product_name_snapshot || "Produit agricole"}
            </h4>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              Offre : {order.campaign?.title || order.campaign_title_snapshot || "Offre commerciale"}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-black text-gray-900 bg-forest-50/80 px-2 py-0.5 rounded-lg border border-forest-100/60">
                <Layers className="w-3 h-3 text-forest-700" />
                {itemQty.toLocaleString("fr-FR")} {itemUnit}
              </span>
              <span className="text-[11px] text-gray-400">
                {itemPrice.toLocaleString("fr-FR")} {order.currency}/{itemUnit}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Destination & Logistique (si disponible) */}
        {(order.destination_city_snapshot || order.destination?.city_name || order.depot_name_snapshot || order.depot?.name) && (
          <div className="text-[11px] text-gray-600 bg-forest-50/40 rounded-xl p-2 border border-forest-100/50 flex items-start gap-2">
            <Truck className="w-3.5 h-3.5 text-forest-700 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-gray-900">
                {order.destination_city_snapshot || order.destination?.city_name || order.delivery_city}
              </span>
              {formattedArrivalDate && (
                <span className="text-gray-500"> • Arrivée : {formattedArrivalDate}</span>
              )}
              {(order.depot_name_snapshot || order.depot?.name) && (
                <span className="block text-[10px] text-gray-500 truncate">
                  Point : {order.depot?.name || order.depot_name_snapshot}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 6. Bannière livrée si livrée */}
        {order.status === "delivered" && (
          <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 rounded-xl p-2 border border-emerald-200/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Réception physique confirmée & stock déchargé</span>
          </div>
        )}

        {/* 7. Montant Total & Ligne financière */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">Montant total</span>
          <span className="text-sm sm:text-base font-black text-forest-950 font-mono">
            {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
            {order.currency}
          </span>
        </div>
      </div>

      {/* 8. Barre d'actions du bas */}
      <div className="px-4 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {onOpenStatusModal && order.status !== "delivered" && order.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => onOpenStatusModal(order)}
              className="p-2 text-gray-500 hover:text-forest-900 hover:bg-forest-50 rounded-xl border border-gray-200 transition-colors"
              title="Changer le statut"
              aria-label="Changer le statut"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {quickAction && (
            <Button
              variant={quickAction.variant}
              size="sm"
              onClick={() => onQuickStatusChange?.(order, quickAction.nextStatus)}
              className="text-xs font-bold"
            >
              {quickAction.label}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDetail(order)}
            className="text-xs font-semibold gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Détail</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
