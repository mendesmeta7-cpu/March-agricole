"use client";

import { useState } from "react";
import { OrderDetail } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import QRCodeModal from "./QRCodeModal";
import { cancelOrderAction } from "@/lib/actions/orders";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Building2,
  Calendar,
  MapPin,
  Tag,
  Layers,
  ArrowRight,
  AlertTriangle,
  X,
  XCircle,
  QrCode,
} from "lucide-react";

interface ResellerOrderCardProps {
  order: OrderDetail;
  onRefresh?: () => void;
}

export default function ResellerOrderCard({
  order,
  onRefresh,
}: ResellerOrderCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const mainItem = order.order_items[0];
  const itemQuantity = mainItem ? mainItem.quantity : 0;
  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit;
  const itemUnitPrice = mainItem ? mainItem.unit_price : order.campaign.unit_price;

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(order.created_at));

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);

    const res = await cancelOrderAction(
      order.id,
      cancelReason || "Annulation demandée par le revendeur"
    );

    setCancelling(false);

    if (!res.success) {
      setCancelError(res.error || "Impossible d'annuler cette commande.");
      return;
    }

    setShowCancelModal(false);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 hover:border-forest-200 transition-all shadow-xs overflow-hidden flex flex-col justify-between">
      {/* 1. En-tête de la commande */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-900 block font-mono">
              {order.order_number}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-forest-50 hover:border-forest-300 text-forest-800 transition-colors"
            title="Afficher le QR code de retrait"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      </div>

      {/* 2. Corps de la carte : produit et ferme */}
      <div className="p-4 space-y-4 flex-1">
        {/* Exploitation vendeuse */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <Link
            href={`/dashboard/reseller/companies/${order.company_id}`}
            className="flex items-center gap-2 group/comp min-w-0"
          >
            <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {order.company.logo_url ? (
                <Image
                  src={order.company.logo_url}
                  alt={order.company.name}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-forest-700" />
              )}
            </div>
            <span className="font-semibold text-gray-800 truncate group-hover/comp:text-forest-700 transition-colors">
              {order.company.name}
            </span>
          </Link>

          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            {order.delivery_province?.name || "RDC"}
          </span>
        </div>

        {/* Culture commandée */}
        <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-900 block">
              {mainItem?.product.name || order.campaign.title}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              Offre : {order.campaign.title}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1 justify-end">
              <Layers className="w-3.5 h-3.5 text-earth-700" />
              {itemQuantity.toLocaleString("fr-FR")} {itemUnit}
            </span>
            <span className="text-[10px] text-gray-500 block">
              à {itemUnitPrice.toLocaleString("fr-FR")} {order.currency}/{itemUnit}
            </span>
          </div>
        </div>

        {/* Montant total */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-forest-50/50 border border-forest-100 text-xs">
          <span className="text-[11px] font-medium text-forest-800">
            Total engagé (Snapshot)
          </span>
          <span className="text-sm font-black text-forest-950">
            {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {order.currency}
          </span>
        </div>
      </div>

      {/* 3. Pied de carte & Actions */}
      <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
        {order.status === "pending" ? (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Annuler
          </button>
        ) : (
          <span className="text-[10px] text-gray-400">
            {order.status === "cancelled" ? "Réservation libérée" : "Stock bloqué"}
          </span>
        )}

        <Link
          href={`/dashboard/reseller/orders/${order.id}`}
          className="text-xs font-bold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 hover:underline underline-offset-2"
        >
          Détail de la commande
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Modal d'annulation de commande */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Annuler la Commande
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Êtes-vous sûr de vouloir annuler la commande <strong>{order.order_number}</strong> ({itemQuantity} {itemUnit} de {mainItem?.product.name}) ?
              La quantité réservée sera immédiatement remise à disposition de l&apos;offre commerciale.
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Retour
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                {cancelling ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Libération du stock...</span>
                  </>
                ) : (
                  <span>Confirmer l&apos;annulation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeToken={order.qr_code_token || order.id}
        orderNumber={order.order_number}
        productName={mainItem?.product.name || order.campaign.title}
        quantity={itemQuantity}
        unit={itemUnit}
        companyName={order.company.name}
      />
    </div>
  );
}
