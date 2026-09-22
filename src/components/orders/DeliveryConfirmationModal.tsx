"use client";

import { useState, useTransition } from "react";
import { LookupDeliveryOrderResult, confirmOrderDeliveryAction } from "@/lib/actions/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShoppingBag,
  Calendar,
  MapPin,
  Truck,
  ShieldCheck,
  Layers,
  ArrowRight,
} from "lucide-react";

interface DeliveryConfirmationModalProps {
  order: LookupDeliveryOrderResult | null;
  isOpen: boolean;
  onClose: () => void;
  onDeliveryConfirmed: (updatedOrderNumber: string) => void;
}

export default function DeliveryConfirmationModal({
  order,
  isOpen,
  onClose,
  onDeliveryConfirmed,
}: DeliveryConfirmationModalProps) {
  const [isConfirmingStep, setIsConfirmingStep] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    orderNumber: string;
    deliveredAt: string;
    deliveredQuantity: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !order) return null;

  const isAlreadyDelivered = order.status === "delivered";

  const handleConfirmDelivery = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await confirmOrderDeliveryAction(order.order_id, deliveryNotes);

      if (!res.success) {
        setErrorMessage(res.error || "Échec de la confirmation de livraison.");
        setIsConfirmingStep(false);
        return;
      }

      setSuccessData({
        orderNumber: res.data!.orderNumber,
        deliveredAt: res.data!.deliveredAt,
        deliveredQuantity: res.data!.deliveredQuantity,
      });

      onDeliveryConfirmed(res.data!.orderNumber);
    });
  };

  const formattedOrderDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(order.created_at));

  const formattedDeliveredDate = order.delivered_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(order.delivered_at))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-forest-900/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest-800 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 font-mono">
                  {order.order_number}
                </h3>
              </div>
              <p className="text-[11px] text-gray-500">Vérification de la commande & confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {successData ? (
            /* Écran de succès */
            <div className="p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-gray-900">
                  Livraison confirmée avec succès !
                </h4>
                <p className="text-xs text-gray-600">
                  Commande : <strong className="font-mono text-forest-900">{successData.orderNumber}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Quantité livrée : <strong className="text-gray-900">{successData.deliveredQuantity} {order.unit}</strong>
                </p>
              </div>
              <p className="text-xs text-gray-500 bg-forest-50/60 p-3 rounded-2xl border border-forest-100 max-w-sm mx-auto leading-relaxed">
                Le statut de la commande est désormais passé à <strong>« Livrée »</strong>. L&apos;acheteur et vos indicateurs ont été mis à jour instantanément.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl transition-all shadow-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            /* Fiche détaillée de la commande */
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Statut & Alertes */}
              {isAlreadyDelivered ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cette commande a déjà été livrée.</span>
                  </div>
                  {formattedDeliveredDate && (
                    <p className="text-[11px] text-emerald-800 pl-6">
                      Date de livraison : <strong>{formattedDeliveredDate}</strong>
                      {order.delivered_quantity && (
                        <> • Volume remis : <strong>{order.delivered_quantity} {order.unit}</strong></>
                      )}
                    </p>
                  )}
                  {order.delivery_notes && (
                    <p className="text-[11px] text-emerald-700 pl-6 italic">
                      Notes : « {order.delivery_notes} »
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Statut actuel</span>
                  <OrderStatusBadge status={order.status as any} />
                </div>
              )}

              {/* Détails acheteur et cadre */}
              <div className="p-4 rounded-2xl border border-gray-200/80 bg-white space-y-3">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Acheteur / Revendeur
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 truncate">
                      {order.reseller_business_name}
                    </h4>
                  </div>
                </div>

                {/* Produits & Quantités */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Produit(s) commandé(s)
                  </span>
                  {order.items.length > 0 ? (
                    <div className="space-y-1.5">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-gray-50/80 border border-gray-100"
                        >
                          <span className="font-semibold text-gray-800">{item.product_name}</span>
                          <span className="font-extrabold text-forest-900">
                            {item.quantity.toLocaleString("fr-FR")} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-gray-800">
                      {order.total_ordered_quantity} {order.unit}
                    </div>
                  )}
                </div>

                {/* Référence Campagne ou Production */}
                {(order.campaign_title || order.production_title) && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      Origine :
                    </span>
                    <span className="font-semibold text-gray-800">
                      {order.campaign_title || order.production_title}
                    </span>
                  </div>
                )}

                {/* Localisation */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Destination :
                  </span>
                  <span className="font-semibold text-gray-800">
                    {order.delivery_province_name || "Non spécifiée"} {order.delivery_city ? `(${order.delivery_city})` : ""}
                  </span>
                </div>

                {/* Date de commande */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Date de commande :
                  </span>
                  <span className="text-gray-700 font-medium">{formattedOrderDate}</span>
                </div>
              </div>

              {/* Formulaire de confirmation de livraison */}
              {!isAlreadyDelivered && (
                <div className="space-y-3 pt-2">
                  {isConfirmingStep ? (
                    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900 space-y-1">
                          <p className="font-bold">
                            Confirmer que cette commande a bien été remise et livrée ?
                          </p>
                          <p className="text-[11px] text-amber-800">
                            Cette action basculera définitivement la commande au statut « Livrée » et confirmera la réservation de {order.total_ordered_quantity} {order.unit}.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setIsConfirmingStep(false)}
                          className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={handleConfirmDelivery}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          {isPending ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Validation...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Oui, confirmer la livraison
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-gray-700">
                          Observations / Notes de remise (facultatif)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Ex: Marchandise contrôlée et remise au transporteur..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-500 outline-hidden"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsConfirmingStep(true)}
                        className="w-full py-3 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        CONFIRMER LA LIVRAISON
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successData && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-200/60 transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
