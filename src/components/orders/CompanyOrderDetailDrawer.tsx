"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Store,
  Calendar,
  MapPin,
  Tag,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  CheckCheck,
  Check,
  XCircle,
  FileText,
  ExternalLink,
  AlertTriangle,
  Info,
  Settings,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface CompanyOrderDetailDrawerProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStatusModal: (order: OrderDetail) => void;
  onConfirmDelivery: (order: OrderDetail) => void;
  onQuickTransition: (order: OrderDetail, targetStatus: OrderStatus) => void;
  onRequestCancel: (order: OrderDetail) => void;
  isActionLoading?: boolean;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Commande passée", icon: Clock },
  { status: "confirmed", label: "Confirmée", icon: CheckCircle2 },
  { status: "preparing", label: "En préparation", icon: Package },
  { status: "ready", label: "Prête pour retrait", icon: Truck },
  { status: "delivered", label: "Livrée", icon: CheckCheck },
];

export default function CompanyOrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onOpenStatusModal,
  onConfirmDelivery,
  onQuickTransition,
  onRequestCancel,
  isActionLoading = false,
}: CompanyOrderDetailDrawerProps) {

  if (!order) return null;

  const mainItem = order.order_items[0];
  const itemQuantity = mainItem ? mainItem.quantity : 0;
  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit || "tonne";

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(order.created_at));

  const formattedDeliveryDate = order.delivered_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(order.delivered_at))
    : null;

  const arrivalDate =
    order.expected_arrival_date_snapshot || order.destination?.expected_arrival_date;

  const formattedArrivalDate = arrivalDate
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(arrivalDate))
    : null;

  const getStepIndex = (status: OrderStatus) => {
    if (status === "cancelled") return -1;
    return STEPS.findIndex((s) => s.status === status);
  };

  const currentStepIdx = getStepIndex(order.status);

  // Prochaine action suggérée
  const renderPrimaryAction = () => {
    if (order.status === "pending") {
      return (
        <Button
          variant="primary"
          size="md"
          isLoading={isActionLoading}
          onClick={() => onQuickTransition(order, "confirmed")}
          className="gap-2 font-bold"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirmer la commande</span>
        </Button>
      );
    }
    if (order.status === "confirmed") {
      return (
        <Button
          variant="secondary"
          size="md"
          isLoading={isActionLoading}
          onClick={() => onQuickTransition(order, "preparing")}
          className="gap-2 font-bold bg-indigo-700 hover:bg-indigo-800 text-white"
        >
          <Package className="w-4 h-4" />
          <span>Passer en préparation</span>
        </Button>
      );
    }
    if (order.status === "preparing") {
      return (
        <Button
          variant="success"
          size="md"
          isLoading={isActionLoading}
          onClick={() => onQuickTransition(order, "ready")}
          className="gap-2 font-bold"
        >
          <Truck className="w-4 h-4" />
          <span>Marquer comme prête</span>
        </Button>
      );
    }
    if (order.status === "ready") {
      return (
        <Button
          variant="primary"
          size="md"
          isLoading={isActionLoading}
          onClick={() => onConfirmDelivery(order)}
          className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Confirmer la livraison</span>
        </Button>
      );
    }
    return null;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-950 text-base sm:text-lg">
            {order.reseller.business_name}
          </span>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      }
      description={`Commande reçue le ${formattedDate} • Réf. ${order.order_number}`}
      icon={<ShoppingBag className="w-5 h-5 text-forest-700" />}
      footer={
        <div className="flex items-center justify-between gap-3 w-full flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenStatusModal(order)}
                  disabled={isActionLoading}
                  className="gap-1.5 text-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Statut</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestCancel(order)}
                  disabled={isActionLoading}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Annuler
                </Button>
              </>
            )}

            <Link
              href={`/dashboard/company/orders/${order.id}`}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-forest-800 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title="Ouvrir la page complète"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fermer
            </Button>
            {renderPrimaryAction()}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1. Stepper Visuel de progression */}
        {order.status !== "cancelled" ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/90 border border-gray-200/80">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-forest-600" />
              Progression logistique de la commande
            </h4>
            <div className="relative">
              {/* Ligne de connexion arrière */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-forest-600 transition-all duration-300 -z-0"
                style={{
                  width:
                    currentStepIdx >= 0
                      ? `${(currentStepIdx / (STEPS.length - 1)) * 100}%`
                      : "0%",
                }}
              />

              <div className="grid grid-cols-5 gap-1 relative z-10">
                {STEPS.map((s, idx) => {
                  const isDone = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const Icon = s.icon;

                  return (
                    <div
                      key={s.status}
                      className="flex flex-col items-center text-center space-y-1.5"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-forest-600 text-white ring-4 ring-forest-100"
                            : isCurrent
                            ? "bg-forest-900 text-white ring-4 ring-forest-200 shadow-sm"
                            : "bg-white text-gray-400 border-2 border-gray-200"
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold leading-tight line-clamp-2 ${
                          isCurrent
                            ? "text-forest-950 font-bold"
                            : isDone
                            ? "text-gray-700"
                            : "text-gray-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block">Commande annulée</span>
              <p className="text-rose-700 leading-relaxed">
                Cette commande a été annulée. La réservation de stock liée a été
                automatiquement restituée à la campagne commerciale pour éviter toute perte de disponibilité.
              </p>
            </div>
          </div>
        )}

        {/* 2. Bannière livrée si livrée */}
        {order.status === "delivered" && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block">Livraison effectuée avec succès</span>
              <p className="text-emerald-800">
                {formattedDeliveryDate
                  ? `Lot réceptionné par le revendeur le ${formattedDeliveryDate}.`
                  : "Confirmation de livraison enregistrée."}
                {order.delivered_quantity !== null && order.delivered_quantity !== undefined && (
                  <span className="font-bold">
                    {" "}
                    • Quantité remise : {order.delivered_quantity.toLocaleString("fr-FR")}{" "}
                    {order.campaign.unit}
                  </span>
                )}
              </p>
              {order.delivery_notes && (
                <p className="text-emerald-700 italic mt-1 bg-white/60 p-2 rounded-lg border border-emerald-200/50">
                  Note : &ldquo;{order.delivery_notes}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* 3. Lignes de commande fermes */}
        <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs">
          <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-forest-700" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Produits & Engagements Fermes
              </h3>
            </div>
            <span className="text-xs font-bold text-forest-900">
              {order.order_items.length} article(s)
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-earth-50 border border-earth-100/80 flex items-center justify-center overflow-hidden shrink-0">
                    {item.product?.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tag className="w-5 h-5 text-earth-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-950 block">
                      {item.product?.name || item.product_name_snapshot || "Produit agricole"}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {item.product?.category || "Culture"} • Offre :{" "}
                      {order.campaign?.title || order.campaign_title_snapshot || "Offre commerciale"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-right">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Prix Unitaire</span>
                    <span className="font-semibold text-gray-800">
                      {item.unit_price.toLocaleString("fr-FR")} {order.currency}/{item.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px]">Volume Commandé</span>
                    <span className="font-bold text-gray-950">
                      {item.quantity.toLocaleString("fr-FR")} {item.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px]">Sous-total</span>
                    <span className="font-black text-forest-900">
                      {item.subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                      {order.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ligne récapitulative du montant */}
          <div className="p-4 bg-forest-900/5 border-t border-forest-900/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-forest-950 block">
                Montant Total de la Commande
              </span>
              <span className="text-[11px] text-forest-700">
                Engagement commercial ferme avec stock réservé
              </span>
            </div>
            <span className="text-xl font-black text-forest-950 font-mono">
              {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
              {order.currency}
            </span>
          </div>
        </div>

        {/* 4. Garantie de Réservation de Stock */}
        <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 text-blue-950 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 flex-1">
            <span className="font-bold text-blue-950 block">
              Réservation Ferme de Stock
            </span>
            <p className="text-blue-900/90 leading-relaxed">
              Cette commande a réservé {itemQuantity} {itemUnit} sur l&apos;offre commerciale{" "}
              <strong>{order.campaign?.title || order.campaign_title_snapshot || "Offre"}</strong>.
              Ce volume est déduit en temps réel de votre stock disponible pour garantir
              l&apos;absence totale de surréservation.
            </p>
            <div className="pt-1 flex items-center gap-4 text-[11px] font-semibold text-blue-800">
              <span>
                Réservation : <strong>Confirmée</strong>
              </span>
              <span>
                Quantité réservée :{" "}
                <strong>
                  {order.stock_reservation?.quantity || itemQuantity} {itemUnit}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* 5. Acheteur / Revendeur */}
        <div className="rounded-2xl border border-gray-200/90 p-4 bg-white space-y-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Store className="w-4 h-4 text-forest-700" />
            Acheteur Professionnel / Revendeur
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-400 text-[11px] block">Raison Sociale</span>
              <span className="font-bold text-gray-900 text-sm">
                {order.reseller.business_name}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-[11px] block">Territoire d&apos;activité</span>
              <span className="font-semibold text-gray-800">
                {order.reseller.city ? `${order.reseller.city}, ` : ""}
                {order.reseller.provinces?.name || "RDC"}
              </span>
            </div>
            {order.reseller.delivery_address && (
              <div className="sm:col-span-2">
                <span className="text-gray-400 text-[11px] block">Adresse habituelle</span>
                <span className="text-gray-700">{order.reseller.delivery_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* 6. Destination, Dépôt & Logistique */}
        <div className="rounded-2xl border border-gray-200/90 p-4 bg-white space-y-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-forest-700" />
            Destination de Campagne & Retrait
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-400 text-[11px] block">Ville de destination</span>
              <span className="font-bold text-gray-950 text-sm">
                {order.destination_city_snapshot ||
                  order.destination?.city_name ||
                  order.delivery_city ||
                  "Non spécifié"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-[11px] block">Date d&apos;arrivée prévue</span>
              <span className="font-bold text-forest-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-forest-600" />
                {formattedArrivalDate || "Non renseignée"}
              </span>
            </div>

            {(order.depot_name_snapshot || order.depot) && (
              <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                <span className="text-gray-400 text-[11px] block">Point de dépôt / retrait</span>
                <span className="font-bold text-gray-900 block">
                  {order.depot?.name || order.depot_name_snapshot}
                </span>
                {order.depot && (
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Commune {order.depot.commune}
                    {order.depot.quartier && `, Quartier ${order.depot.quartier}`}
                    <br />
                    {order.depot.address}
                    {order.depot.complement && ` (${order.depot.complement})`}
                  </p>
                )}
              </div>
            )}

            {order.delivery_address && (
              <div className="sm:col-span-2">
                <span className="text-gray-400 text-[11px] block">Adresse de livraison spécifique</span>
                <span className="text-gray-700">{order.delivery_address}</span>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-400 text-[11px] block">Instructions de l&apos;acheteur</span>
              <p className="text-gray-700 italic mt-0.5">&ldquo;{order.notes}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
