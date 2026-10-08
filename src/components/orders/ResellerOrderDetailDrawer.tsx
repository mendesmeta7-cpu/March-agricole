"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import Drawer from "@/components/ui/Drawer";
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
  ShieldCheck,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  CheckCheck,
  XCircle,
  Copy,
  Check,
  QrCode,
  FileText,
  ExternalLink,
  AlertTriangle,
  Info,
} from "lucide-react";

interface ResellerOrderDetailDrawerProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onShowQR: (order: OrderDetail) => void;
  onCancelOrder: (order: OrderDetail) => void;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Commande passée", icon: Clock },
  { status: "confirmed", label: "Confirmée", icon: CheckCircle2 },
  { status: "preparing", label: "En préparation", icon: Package },
  { status: "ready", label: "Prête", icon: Truck },
  { status: "delivered", label: "Livrée", icon: CheckCheck },
];

export default function ResellerOrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onShowQR,
  onCancelOrder,
}: ResellerOrderDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const mainItem = order.order_items[0];
  const itemQuantity = mainItem ? mainItem.quantity : 0;
  const itemUnit = mainItem ? mainItem.unit : order.campaign.unit;

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

  const previousArrivalDate = order.destination?.previous_arrival_date
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(order.destination.previous_arrival_date))
    : null;

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Progression index
  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="xl"
      icon={<ShoppingBag className="w-5 h-5 text-forest-700" />}
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full pr-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-gray-900">
                {order.order_number}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1 text-gray-400 hover:text-forest-700 rounded-md hover:bg-forest-50 transition-colors"
                title="Copier le numéro de commande"
              >
                {copied ? (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 gap-0.5">
                    <Check className="w-3 h-3" /> Copié
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <span className="text-[11px] text-gray-500 font-normal block">
              Passée le {formattedDate}
            </span>
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <Link
            href={`/dashboard/reseller/orders/${order.id}`}
            className="text-xs font-semibold text-forest-800 hover:text-forest-950 inline-flex items-center gap-1.5 hover:underline"
            onClick={onClose}
          >
            <span>Ouvrir la page complète</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            {order.status === "pending" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onClose();
                  onCancelOrder(order);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Annuler la commande</span>
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onShowQR(order);
              }}
            >
              <QrCode className="w-4 h-4" />
              <span>Afficher le QR Code</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-gray-800">
        {/* 1. Bannière de livraison confirmée si livrée */}
        {order.status === "delivered" && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-emerald-950 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <h4 className="text-sm font-bold text-emerald-950">
                Commande réceptionnée & livrée
              </h4>
              <p className="text-emerald-800">
                {formattedDeliveryDate
                  ? `Livraison confirmée le ${formattedDeliveryDate}`
                  : "Livraison validée par l'exploitation agricole."}
                {order.delivered_quantity !== null && order.delivered_quantity !== undefined && (
                  <span className="font-bold">
                    {" "}• Quantité livrée : {order.delivered_quantity.toLocaleString("fr-FR")}{" "}
                    {order.campaign.unit}
                  </span>
                )}
              </p>
              {order.delivered_by && (
                <p className="text-emerald-700 text-[11px]">
                  Validé par : <strong>{order.delivered_by}</strong>
                </p>
              )}
              {order.delivery_notes && (
                <p className="text-emerald-700 italic mt-1 bg-emerald-100/60 p-2 rounded-lg">
                  &ldquo;{order.delivery_notes}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* 2. Bannière commande annulée si applicable */}
        {order.status === "cancelled" && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="text-sm font-bold text-rose-950">Commande Annulée</h4>
              <p className="text-rose-800">
                Cette commande a été annulée. La réservation de stock a été automatiquement
                restituée à l&apos;offre commerciale de l&apos;exploitation.
              </p>
            </div>
          </div>
        )}

        {/* 3. Workflow de progression des statuts réels */}
        {order.status !== "cancelled" && (
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Cycle de vie de la commande
            </span>

            <div className="relative">
              {/* Ligne de fond */}
              <div className="absolute top-4 left-3 right-3 h-0.5 bg-gray-200 -z-0" />
              {/* Ligne active */}
              {currentStepIndex >= 0 && (
                <div
                  className="absolute top-4 left-3 h-0.5 bg-forest-600 transition-all duration-500 -z-0"
                  style={{
                    width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
                  }}
                />
              )}

              <div className="relative z-10 flex justify-between">
                {STEPS.map((step, idx) => {
                  const isPassed = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.status}
                      className="flex flex-col items-center text-center max-w-[64px]"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-forest-700 text-white ring-4 ring-forest-100 shadow-xs"
                            : isPassed
                            ? "bg-forest-600 text-white"
                            : "bg-white border-2 border-gray-300 text-gray-400"
                        }`}
                      >
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 leading-tight font-medium ${
                          isCurrent
                            ? "font-bold text-forest-900"
                            : isPassed
                            ? "text-gray-800"
                            : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. Lignes contractuelles / Produits commandés */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-forest-700" />
            Produit & Lignes de commande
          </h4>

          <div className="divide-y divide-gray-100">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tag className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-gray-950 text-sm block">
                      {item.product.name}
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      {item.product.category} • Réf. : {order.campaign.title}
                    </span>
                    <span className="text-[11px] text-forest-700 font-semibold block mt-0.5">
                      {item.unit_price.toLocaleString("fr-FR")} {order.currency} / {item.unit}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-extrabold text-gray-950 text-sm block">
                    {item.quantity.toLocaleString("fr-FR")} {item.unit}
                  </span>
                  <span className="text-xs font-bold text-forest-900 block mt-0.5">
                    {item.subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                    {order.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total général contractuel */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between bg-forest-50/60 p-3 rounded-xl">
            <div>
              <span className="text-xs font-bold text-forest-950 block">
                Total Contractuel Engagé
              </span>
              <span className="text-[10px] text-forest-700">
                Snapshot immuable enregistré à la commande
              </span>
            </div>
            <span className="text-base font-black text-forest-950">
              {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
              {order.currency}
            </span>
          </div>
        </div>

        {/* 5. Garantie de disponibilité de stock */}
        <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-blue-950 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Stock Réservé et Garanti</span>
          </div>
          <p className="text-[11px] text-blue-900 leading-relaxed">
            Votre volume de <strong>{itemQuantity.toLocaleString("fr-FR")} {itemUnit}</strong> est formellement réservé auprès de l&apos;exploitation et vous est exclusivement attribué.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-blue-800 font-semibold pt-1">
            <span>Réservation : <strong>Confirmée</strong></span>
            <span>Quantité : <strong>{itemQuantity.toLocaleString("fr-FR")} {itemUnit}</strong></span>
          </div>
        </div>

        {/* 6. Arrivée, Dépôt & Logistique */}
        <div className="p-4 rounded-2xl bg-forest-50/40 border border-forest-100/80 space-y-3">
          <h4 className="text-xs font-bold text-forest-950 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-forest-700" />
            Logistique d&apos;Arrivée & Retrait
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Ville de destination */}
            <div className="p-2.5 rounded-xl bg-white border border-forest-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Ville de destination
              </span>
              <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-forest-600" />
                {order.destination_city_snapshot ||
                  order.destination?.city_name ||
                  order.delivery_city ||
                  "Destination définie"}
              </span>
            </div>

            {/* Date d'arrivée */}
            <div className="p-2.5 rounded-xl bg-white border border-forest-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Date d&apos;arrivée prévue
              </span>
              <span className="text-xs font-extrabold text-forest-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-forest-600" />
                {formattedArrivalDate || "Date à confirmer"}
              </span>
              {previousArrivalDate && (
                <span className="text-[10px] text-amber-700 block mt-0.5 line-through">
                  Initiale : {previousArrivalDate}
                </span>
              )}
            </div>
          </div>

          {/* Dépôt de retrait */}
          {(order.depot_name_snapshot || order.depot) && (
            <div className="p-3 rounded-xl bg-white border border-forest-100 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Point de retrait / Entrepôt
              </span>
              <span className="font-bold text-gray-900 block text-xs">
                {order.depot?.name || order.depot_name_snapshot}
              </span>
              {order.depot && (
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Commune {order.depot.commune}
                  {order.depot.quartier && `, Quartier ${order.depot.quartier}`}
                  <br />
                  {order.depot.address}
                  {order.depot.complement && ` (${order.depot.complement})`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 7. Exploitation vendeuse */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-forest-700" />
            Exploitation Vendeuse
          </h4>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                {order.company.logo_url ? (
                  <Image
                    src={order.company.logo_url}
                    alt={order.company.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-forest-700" />
                )}
              </div>
              <div>
                <span className="font-bold text-gray-900 block text-xs">
                  {order.company.name}
                </span>
                <span className="text-[11px] text-gray-500 block">
                  {order.company.city ? `${order.company.city}, ` : ""}
                  {order.company.provinces?.name || "RDC"}
                </span>
              </div>
            </div>

            <Link
              href={`/dashboard/reseller/companies/${order.company_id}`}
              className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline shrink-0"
            >
              Voir le profil &rarr;
            </Link>
          </div>
        </div>

        {/* 8. Notes particulières */}
        {order.notes && (
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Instructions particulières de l&apos;acheteur
            </span>
            <p className="text-gray-700 italic leading-relaxed">
              &ldquo;{order.notes}&rdquo;
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
