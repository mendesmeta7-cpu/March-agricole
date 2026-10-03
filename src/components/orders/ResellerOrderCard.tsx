"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import QRCodeModal from "./QRCodeModal";
import { cancelOrderAction } from "@/lib/actions/orders";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
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
  XCircle,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  CheckCheck,
} from "lucide-react";

interface ResellerOrderCardProps {
  order: OrderDetail;
  onRefresh?: () => void;
  onOpenDrawer?: (order: OrderDetail) => void;
  onOpenQR?: (order: OrderDetail) => void;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Passée", icon: Clock },
  { status: "confirmed", label: "Confirmée", icon: CheckCircle2 },
  { status: "preparing", label: "Préparation", icon: Package },
  { status: "ready", label: "Prête", icon: Truck },
  { status: "delivered", label: "Livrée", icon: CheckCheck },
];

export default function ResellerOrderCard({
  order,
  onRefresh,
  onOpenDrawer,
  onOpenQR,
}: ResellerOrderCardProps) {
  const [showLocalQRModal, setShowLocalQRModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mainItem = order.order_items[0];
  const itemQuantity = mainItem ? mainItem.quantity : 0;
  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit;
  const itemUnitPrice = mainItem ? mainItem.unit_price : order.campaign.unit_price;

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

  const previousArrivalDate = order.destination?.previous_arrival_date
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(order.destination.previous_arrival_date))
    : null;

  const handleCopyOrderNumber = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

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

  const handleQRClick = () => {
    if (onOpenQR) {
      onOpenQR(order);
    } else {
      setShowLocalQRModal(true);
    }
  };

  const handleDetailClick = () => {
    if (onOpenDrawer) {
      onOpenDrawer(order);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 hover:border-forest-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      {/* 1. En-tête de la carte */}
      <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-extrabold text-gray-950 truncate tracking-tight">
                {order.order_number}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1 text-gray-400 hover:text-forest-700 rounded-md hover:bg-forest-50 transition-colors"
                title="Copier le numéro"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-gray-400" />
              {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleQRClick}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-forest-50 hover:border-forest-300 text-forest-800 transition-colors shadow-2xs"
            title="Afficher le QR code de retrait"
            aria-label="Afficher le QR code"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      </div>

      {/* 2. Corps de la carte */}
      <div className="p-3.5 sm:p-4 space-y-3 flex-1">
        {/* Exploitation vendeuse */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <Link
            href={`/dashboard/reseller/companies/${order.company_id}`}
            className="flex items-center gap-2 group/comp min-w-0"
          >
            <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
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

          <span className="text-[11px] text-gray-500 flex items-center gap-1 shrink-0">
            <MapPin className="w-3 h-3 text-gray-400" />
            {order.delivery_province?.name || "RDC"}
          </span>
        </div>

        {/* Culture & Quantité */}
        <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-900 block truncate">
              {mainItem?.product.name || order.campaign.title}
            </span>
            <span className="text-[11px] text-gray-500 block truncate mt-0.5">
              Réf. : {order.campaign.title}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-black text-gray-950 flex items-center gap-1 justify-end">
              <Layers className="w-3.5 h-3.5 text-earth-700" />
              {itemQuantity.toLocaleString("fr-FR")} {itemUnit}
            </span>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              à {itemUnitPrice.toLocaleString("fr-FR")} {order.currency}/{itemUnit}
            </span>
          </div>
        </div>

        {/* Arrivée & Dépôt */}
        {(formattedArrivalDate ||
          order.destination_city_snapshot ||
          order.destination?.city_name ||
          order.depot_name_snapshot ||
          order.depot?.name) && (
          <div className="p-2.5 rounded-xl bg-forest-50/40 border border-forest-100/70 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-forest-950 gap-2">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                Arrivée :{" "}
                <strong>
                  {order.destination_city_snapshot ||
                    order.destination?.city_name ||
                    order.delivery_city}
                </strong>
              </span>

              {formattedArrivalDate && (
                <span className="text-[11px] text-forest-800 font-bold flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3 text-forest-600" />
                  {formattedArrivalDate}
                </span>
              )}
            </div>

            {previousArrivalDate && (
              <span className="text-[10px] text-amber-800 font-medium block">
                ⚠️ Date réajustée (initiale : {previousArrivalDate})
              </span>
            )}

            {(order.depot_name_snapshot || order.depot?.name) && (
              <p className="text-[11px] text-gray-600 truncate pl-4">
                Point de retrait : <strong>{order.depot_name_snapshot || order.depot?.name}</strong>
              </p>
            )}
          </div>
        )}

        {/* Progression des statuts */}
        {order.status !== "cancelled" ? (
          <div className="pt-1 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
              <span>Étape</span>
              <span className="text-forest-800 font-bold">
                {currentStepIndex >= 0 ? `${currentStepIndex + 1} / 5` : ""}
              </span>
            </div>
            {/* Barre segmentée */}
            <div className="grid grid-cols-5 gap-1">
              {STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.status}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isCurrent
                        ? "bg-forest-600 ring-2 ring-forest-200"
                        : isPassed
                        ? "bg-forest-500"
                        : "bg-gray-200"
                    }`}
                    title={step.label}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Commande annulée — Stock libéré</span>
          </div>
        )}

        {/* Montant total */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-forest-50/50 border border-forest-100 text-xs">
          <span className="text-[11px] font-medium text-forest-800">
            Total engagé
          </span>
          <span className="text-sm font-black text-forest-950">
            {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
            {order.currency}
          </span>
        </div>
      </div>

      {/* 3. Pied de carte & Actions */}
      <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
        <div>
          {order.status === "pending" ? (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:underline inline-flex items-center gap-1 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Annuler
            </button>
          ) : order.status === "delivered" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Réceptionnée
            </span>
          ) : (
            <span className="text-[10px] text-gray-500">
              {order.status === "cancelled" ? "Réservation libérée" : "Stock garanti"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenDrawer ? (
            <button
              type="button"
              onClick={handleDetailClick}
              className="text-xs font-bold text-forest-700 hover:text-forest-900 inline-flex items-center gap-1 hover:underline underline-offset-2 px-2.5 py-1 rounded-lg hover:bg-forest-50 transition-colors"
            >
              <span>Détails</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href={`/dashboard/reseller/orders/${order.id}`}
              className="text-xs font-bold text-forest-700 hover:text-forest-900 inline-flex items-center gap-1 hover:underline underline-offset-2 px-2.5 py-1 rounded-lg hover:bg-forest-50 transition-colors"
            >
              <span>Détails</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Modal d'annulation de commande */}
      {showCancelModal && (
        <Dialog
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
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
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Retour
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
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
              <strong>{order.order_number}</strong> ({itemQuantity} {itemUnit} de{" "}
              {mainItem?.product.name}) ? La quantité réservée sera immédiatement remise à
              disposition de l&apos;offre commerciale.
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

      {/* Modal QR Code local */}
      {showLocalQRModal && (
        <QRCodeModal
          isOpen={showLocalQRModal}
          onClose={() => setShowLocalQRModal(false)}
          qrCodeToken={order.qr_code_token || order.order_number}
          orderNumber={order.order_number}
          productName={mainItem?.product.name || order.campaign.title}
          quantity={itemQuantity}
          unit={itemUnit}
          companyName={order.company.name}
        />
      )}
    </div>
  );
}
