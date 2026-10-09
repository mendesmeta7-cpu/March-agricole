"use client";

import { useState, useTransition, useMemo } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import DeliveryConfirmationModal from "./DeliveryConfirmationModal";
import { updateOrderStatusAction, cancelOrderAction } from "@/lib/actions/orders";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  ShoppingBag,
  Store,
  Calendar,
  MapPin,
  Tag,
  Layers,
  ShieldCheck,
  AlertTriangle,
  X,
  FileText,
  Settings,
  CheckCircle2,
  Truck,
  CheckCheck,
  Check,
  Package,
  Clock,
  XCircle,
  Sparkles,
} from "lucide-react";

interface CompanyOrderDetailViewProps {
  order: OrderDetail;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Commande passée", icon: Clock },
  { status: "confirmed", label: "Confirmée", icon: CheckCircle2 },
  { status: "preparing", label: "En préparation", icon: Package },
  { status: "ready", label: "Prête pour retrait", icon: Truck },
  { status: "delivered", label: "Livrée", icon: CheckCheck },
];

function OrderDetailContent({ order: initialOrder }: CompanyOrderDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail>(initialOrder);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [updating, setUpdating] = useState(false);

  const statusOptions = useMemo(
    () => [
      { value: "pending", label: "En attente de confirmation" },
      { value: "confirmed", label: "Confirmée par l'exploitation" },
      { value: "preparing", label: "En cours de préparation" },
      { value: "ready", label: "Prête pour retrait / expédition" },
      { value: "cancelled", label: "Annulée (Libère le stock réservé)" },
    ],
    []
  );

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

  // Transition rapide
  const handleQuickTransition = async (targetStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const res = await updateOrderStatusAction(order.id, targetStatus);
      if (!res.success) {
        toast.error("Erreur", { description: res.error || "Impossible d'actualiser le statut." });
        return;
      }

      toast.success("Statut actualisé", {
        description: `La commande est désormais à l'état "${targetStatus}".`,
      });

      setOrder((prev) => ({ ...prev, status: targetStatus }));
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error("Erreur", { description: err.message || "Erreur inattendue." });
    } finally {
      setUpdating(false);
    }
  };

  // Mise à jour depuis modal de statut
  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const res = await updateOrderStatusAction(order.id, newStatus);
      if (!res.success) {
        toast.error("Erreur", { description: res.error || "Impossible d'actualiser le statut." });
        return;
      }

      toast.success("Statut enregistré", {
        description: `La commande est passée à "${newStatus}".`,
      });

      setOrder((prev) => ({ ...prev, status: newStatus }));
      setShowStatusModal(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error("Erreur", { description: err.message || "Erreur inattendue." });
    } finally {
      setUpdating(false);
    }
  };

  // Annulation avec libération de stock
  const handleConfirmCancel = async () => {
    setUpdating(true);
    try {
      const res = await cancelOrderAction(order.id, "Annulation demandée par l'exploitation agricole");
      if (!res.success) {
        toast.error("Erreur", { description: res.error || "Impossible d'annuler la commande." });
        return;
      }

      toast.success("Commande annulée", {
        description: `La commande ${order.order_number} a été annulée et le stock a été libéré.`,
      });

      setOrder((prev) => ({ ...prev, status: "cancelled" }));
      setShowCancelModal(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error("Erreur", { description: err.message || "Erreur inattendue." });
    } finally {
      setUpdating(false);
    }
  };

  // Callback confirmation livraison
  const handleDeliveryConfirmed = (updatedOrderNumber: string) => {
    toast.success("Livraison confirmée", {
      description: `La commande ${updatedOrderNumber} est marquée comme livrée.`,
    });
    setShowDeliveryModal(false);
    setOrder((prev) => ({ ...prev, status: "delivered", delivered_at: new Date().toISOString() }));
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/company/orders"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux commandes reçues</span>
        </Link>
      </div>

      {/* 2. En-tête principal */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-forest-900 text-white flex items-center justify-center font-black shadow-sm shrink-0">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-950 font-display tracking-tight">
                {order.reseller.business_name}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Reçue le {formattedDate} • <span className="font-mono text-gray-600">Réf. {order.order_number}</span>
            </span>
          </div>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">

          {order.status !== "cancelled" && order.status !== "delivered" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus(order.status === "pending" ? "confirmed" : order.status);
                  setShowStatusModal(true);
                }}
                disabled={updating}
                className="gap-1.5 text-xs font-semibold"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Changer le statut</span>
              </Button>

              {order.status === "pending" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleQuickTransition("confirmed")}
                  isLoading={updating}
                  className="gap-1.5 text-xs font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmer</span>
                </Button>
              )}

              {order.status === "confirmed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickTransition("preparing")}
                  isLoading={updating}
                  className="gap-1.5 text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>En préparation</span>
                </Button>
              )}

              {order.status === "preparing" && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleQuickTransition("ready")}
                  isLoading={updating}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Marquer prête</span>
                </Button>
              )}

              {order.status === "ready" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowDeliveryModal(true)}
                  disabled={updating}
                  className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Confirmer livraison</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                disabled={updating}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 3. Stepper Visuel de Progression */}
      {order.status !== "cancelled" ? (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-gray-200/90 shadow-2xs">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-forest-700" />
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
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
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
                      className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 ${
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
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-2xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-sm block">Commande annulée</span>
            <p className="text-rose-700 leading-relaxed">
              Cette commande a été annulée. La réservation de stock associée a été
              immédiatement libérée et restituée à l&apos;offre commerciale correspondante.
            </p>
          </div>
        </div>
      )}

      {/* 4. Bannière livrée si statut delivered */}
      {order.status === "delivered" && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Commande réceptionnée & livrée
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                {formattedDeliveryDate
                  ? `Livraison confirmée le ${formattedDeliveryDate}`
                  : "Confirmation de retrait enregistrée."}
                {order.delivered_quantity !== null && order.delivered_quantity !== undefined && (
                  <span className="font-bold">
                    {" "}
                    • Quantité remise : {order.delivered_quantity.toLocaleString("fr-FR")}{" "}
                    {order.campaign.unit}
                  </span>
                )}
              </p>
              {order.delivery_notes && (
                <p className="text-xs text-emerald-700 italic mt-1 bg-white/70 p-2 rounded-xl border border-emerald-200/60">
                  Note : &ldquo;{order.delivery_notes}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Grille de détail en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche : Lignes contractuelles et réservation (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lignes de commande */}
          <Card padding="md">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-forest-700" />
              Lignes de Commande Ferme
            </h2>

            <div className="divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-earth-50 border border-earth-100/80 flex items-center justify-center overflow-hidden shrink-0">
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
                      <span className="text-xs text-gray-500">
                        {item.product?.category || "Culture"} • Offre :{" "}
                        {order.campaign?.title || order.campaign_title_snapshot || "Offre commerciale"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs sm:text-right">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Prix Unitaire</span>
                      <span className="font-semibold text-gray-800">
                        {item.unit_price.toLocaleString("fr-FR")} {order.currency}/{item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">Volume</span>
                      <span className="font-bold text-gray-950">
                        {item.quantity.toLocaleString("fr-FR")} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">Total Ligne</span>
                      <span className="font-black text-forest-900 font-mono">
                        {item.subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                        {order.currency}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total général */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between bg-forest-900/5 p-4 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-forest-950 block">
                  Montant Total de la Commande
                </span>
                <span className="text-[11px] text-forest-700">
                  Engagement commercial ferme enregistré en base de données
                </span>
              </div>
              <span className="text-xl font-black text-forest-950 font-mono">
                {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                {order.currency}
              </span>
            </div>
          </Card>

          {/* Stock Réservé et Garanti */}
          <Card padding="md" className="border-blue-200/80 bg-blue-50/20">
            <div className="flex items-start gap-3.5 text-xs sm:text-sm">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-bold text-blue-950 block">
                  Stock Réservé et Garanti
                </span>
                <p className="text-blue-900 text-xs leading-relaxed">
                  Cette commande a réservé {itemQuantity} {itemUnit} sur l&apos;offre commerciale{" "}
                  <strong>{order.campaign?.title || order.campaign_title_snapshot || "Offre"}</strong>.
                  Ce volume est déduit du stock disponible à la vente pour garantir votre commande exclusive.
                </p>
                <div className="pt-1.5 flex items-center gap-4 text-xs font-semibold text-blue-800">
                  <span>
                    Statut : <strong>{order.stock_reservation?.status || "active"}</strong>
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
          </Card>
        </div>

        {/* Colonne Droite : Acheteur & Logistique (1 col) */}
        <div className="space-y-6">
          {/* Acheteur Revendeur */}
          <Card padding="md">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-forest-700" />
              Acheteur / Revendeur
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 text-[11px] block">Raison Sociale :</span>
                <span className="font-bold text-gray-950 text-sm block">
                  {order.reseller.business_name}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Territoire d&apos;activité :</span>
                <span className="text-gray-800 font-medium">
                  {order.reseller.city ? `${order.reseller.city}, ` : ""}
                  {order.reseller.provinces?.name || "RDC"}
                </span>
              </div>

              {order.reseller.delivery_address && (
                <div>
                  <span className="text-gray-400 text-[11px] block">Adresse de contact :</span>
                  <span className="text-gray-700">{order.reseller.delivery_address}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Destination de Campagne & Dépôt Prévu */}
          {(order.destination_city_snapshot ||
            order.destination?.city_name ||
            order.depot_name_snapshot ||
            order.depot?.name) && (
            <Card padding="md" className="border-forest-200/80 bg-forest-50/20">
              <h3 className="text-xs font-bold text-forest-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-forest-700" />
                Arrivée & Dépôt Prévu
              </h3>

              <div className="space-y-2.5 text-xs text-gray-800">
                <div>
                  <span className="text-gray-400 text-[11px] block">Ville d&apos;arrivée prévue :</span>
                  <span className="font-bold text-gray-950 text-sm">
                    {order.destination_city_snapshot ||
                      order.destination?.city_name ||
                      order.delivery_city}
                  </span>
                </div>

                {formattedArrivalDate && (
                  <div>
                    <span className="text-gray-400 text-[11px] block">Date prévue d&apos;arrivée :</span>
                    <span className="font-bold text-forest-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-forest-600" />
                      {formattedArrivalDate}
                    </span>
                  </div>
                )}

                {(order.depot_name_snapshot || order.depot) && (
                  <div className="pt-2 border-t border-forest-100">
                    <span className="text-gray-400 text-[11px] block">Point de dépôt / retrait :</span>
                    <span className="font-semibold text-gray-950 block">
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
              </div>
            </Card>
          )}

          {/* Lieu de livraison spécifié */}
          <Card padding="md">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-forest-700" />
              Lieu de Livraison Spécifié
            </h3>

            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <span className="text-gray-400 text-[11px] block">Province :</span>
                <span className="font-semibold text-gray-900">
                  {order.delivery_province?.name || "Non spécifié"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Ville :</span>
                <span className="font-semibold text-gray-900">
                  {order.delivery_city || "Non spécifié"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Adresse détaillée :</span>
                <span className="text-gray-800">
                  {order.delivery_address || "Adresse principale du revendeur"}
                </span>
              </div>
            </div>
          </Card>

          {/* Notes particulières */}
          {order.notes && (
            <Card padding="md">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-forest-700" />
                Instructions de l&apos;acheteur
              </h3>
              <p className="text-xs text-gray-700 italic leading-relaxed">
                &ldquo;{order.notes}&rdquo;
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal d'actualisation de statut */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-forest-700" />
                Actualiser l&apos;état logistique
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Commande <strong>{order.order_number}</strong>
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Nouveau statut :
              </label>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                options={statusOptions}
                selectSize="sm"
              />
            </div>

            {newStatus === "cancelled" && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Attention : L&apos;annulation libérera immédiatement la réservation de stock liée.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
              >
                Fermer
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateStatus}
                isLoading={updating}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Livraison */}
      {showDeliveryModal && (
        <DeliveryConfirmationModal
          order={{
            order_id: order.id,
            order_number: order.order_number,
            qr_code_token: order.qr_code_token,
            status: order.status,
            total_amount: order.total_amount,
            currency: order.currency,
            created_at: order.created_at,
            delivered_at: order.delivered_at,
            delivered_quantity: order.delivered_quantity,
            delivery_notes: order.delivery_notes,
            delivery_province_name: order.delivery_province?.name || null,
            delivery_city: order.destination_city_snapshot || order.delivery_city,
            delivery_address: order.delivery_address,
            reseller_id: order.reseller_id,
            reseller_business_name: order.reseller.business_name,
            company_id: order.company_id,
            company_name: order.company.name,
            campaign_title: order.campaign?.title || null,
            production_title: order.campaign?.production?.title || null,
            total_ordered_quantity: order.order_items[0]?.quantity || 0,
            unit: order.order_items[0]?.unit || "tonne",
            items: order.order_items.map((it) => ({
              product_id: it.product_id,
              product_name: it.product?.name || it.product_name_snapshot || "Produit",
              quantity: it.quantity,
              unit: it.unit,
              unit_price: it.unit_price,
              subtotal: it.subtotal,
            })),
          }}
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          onDeliveryConfirmed={handleDeliveryConfirmed}
        />
      )}

      {/* Dialogue Annulation */}
      {showCancelModal && (
        <ConfirmDialog
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
          title="Annuler cette commande ?"
          description={`Êtes-vous certain de vouloir annuler la commande ${order.order_number} (${order.reseller.business_name}) ? Cette action libérera immédiatement les ${itemQuantity} ${itemUnit} réservés pour les remettre en stock disponible sur votre offre commerciale.`}
          confirmText="Confirmer l'annulation"
          cancelText="Conserver la commande"
          variant="destructive"
          isLoading={updating}
        />
      )}
    </div>
  );
}

export default function CompanyOrderDetailView(props: CompanyOrderDetailViewProps) {
  return (
    <ToastProvider>
      <OrderDetailContent {...props} />
    </ToastProvider>
  );
}
