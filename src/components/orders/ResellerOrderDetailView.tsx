"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import QRCodeModal from "./QRCodeModal";
import { cancelOrderAction } from "@/lib/actions/orders";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  Building2,
  Calendar,
  MapPin,
  Tag,
  Layers,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  QrCode,
  CheckCircle2,
  Truck,
  Package,
  CheckCheck,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface ResellerOrderDetailViewProps {
  order: OrderDetail;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Commande passée", icon: Clock },
  { status: "confirmed", label: "Confirmée", icon: CheckCircle2 },
  { status: "preparing", label: "En préparation", icon: Package },
  { status: "ready", label: "Prête pour retrait", icon: Truck },
  { status: "delivered", label: "Livrée & Réceptionnée", icon: CheckCheck },
];

export default function ResellerOrderDetailView({
  order,
}: ResellerOrderDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      toast.error("Erreur", { description: res.error || "Impossible d'annuler la commande." });
      return;
    }

    toast.success("Commande annulée", {
      description: `La commande ${order.order_number} a été annulée et le stock libéré.`,
    });

    setShowCancelModal(false);
    router.refresh();
  };

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/reseller/orders"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Mes Commandes</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold font-mono">{order.order_number}</span>
      </div>

      {/* 2. En-tête principal */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center font-black shrink-0">
            <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-mono tracking-tight">
                {order.order_number}
              </h1>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1.5 text-gray-400 hover:text-forest-700 rounded-lg hover:bg-forest-50 transition-colors"
                title="Copier le numéro de commande"
              >
                {copied ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 gap-1">
                    <Check className="w-3.5 h-3.5" /> Copié
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Engagée le {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Bouton QR Code */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowQRModal(true)}
            className="shadow-xs"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            <span>Afficher le QR Code</span>
          </Button>

          <OrderStatusBadge status={order.status} />

          {order.status === "pending" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Bannière de confirmation de livraison si livrée */}
      {order.status === "delivered" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-0.5 text-xs">
              <h3 className="text-sm font-bold text-emerald-950">
                Commande réceptionnée & livrée
              </h3>
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
        </div>
      )}

      {/* 4. Workflow de progression des statuts réels */}
      {order.status !== "cancelled" ? (
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Suivi du Cycle de Vie
          </span>

          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0" />
            {currentStepIndex >= 0 && (
              <div
                className="absolute top-4 left-4 h-0.5 bg-forest-600 transition-all duration-500 -z-0"
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
                    className="flex flex-col items-center text-center max-w-[80px]"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
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
                      className={`text-[11px] mt-2 font-medium leading-tight ${
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
      ) : (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="text-xs">
            <h4 className="text-sm font-bold text-rose-950">Commande Annulée</h4>
            <p className="text-rose-800">
              La commande est annulée et la quantité réservée a été remise à disposition des autres
              acheteurs.
            </p>
          </div>
        </div>
      )}

      {/* 5. Grille de détail en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche : Lignes contractuelles et réservation (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lignes de commande */}
          <div className="p-5 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-forest-700" />
              <span>Détail Contractuel des Lignes de Commande</span>
            </h2>

            <div className="divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3.5">
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
                      <span className="text-sm font-bold text-gray-900 block">
                        {item.product.name}
                      </span>
                      <span className="text-xs text-gray-500 block">
                        {item.product.category} • Réf. Offre : {order.campaign.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs sm:text-right">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Prix Unitaire (Snapshot)</span>
                      <span className="font-semibold text-gray-800">
                        {item.unit_price.toLocaleString("fr-FR")} {order.currency}/{item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Quantité</span>
                      <span className="font-bold text-gray-900">
                        {item.quantity.toLocaleString("fr-FR")} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Sous-total</span>
                      <span className="font-extrabold text-forest-900">
                        {item.subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                        {order.currency}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total général */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between bg-forest-50/60 p-4 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-forest-900 block">
                  Montant Total Contractuel
                </span>
                <span className="text-[11px] text-forest-700">
                  Prix ferme immuable enregistré lors de la validation
                </span>
              </div>
              <span className="text-xl font-black text-forest-950 font-display">
                {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                {order.currency}
              </span>
            </div>
          </div>

          {/* Garantie de disponibilité de stock */}
          <div className="p-5 rounded-3xl bg-blue-50/30 border border-blue-200/80 text-xs sm:text-sm space-y-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-bold text-blue-950 block">
                  Garantie de Disponibilité du Stock
                </span>
                <p className="text-blue-900 text-xs leading-relaxed">
                  Le volume de {order.order_items[0]?.quantity || 0}{" "}
                  {order.campaign.unit} est fermement réservé auprès de la ferme et
                  vous est exclusivement attribué.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-blue-800">
                  <span>
                    Réservation : <strong>Confirmée</strong>
                  </span>
                  <span>
                    Volume garanti :{" "}
                    <strong>
                      {order.stock_reservation?.quantity || order.order_items[0]?.quantity || 0}{" "}
                      {order.campaign.unit}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Partenaire & Logistique (1 col) */}
        <div className="space-y-6">
          {/* Entreprise Agricole */}
          <div className="p-5 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-forest-700" />
              <span>Exploitation Vendeuse</span>
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                {order.company.logo_url ? (
                  <Image
                    src={order.company.logo_url}
                    alt={order.company.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-forest-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-gray-900 truncate block">
                  {order.company.name}
                </span>
                <span className="text-xs text-gray-500">
                  {order.company.city ? `${order.company.city}, ` : ""}
                  {order.company.provinces?.name || "RDC"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <Link
                href={`/dashboard/reseller/companies/${order.company_id}`}
                className="text-xs font-bold text-forest-700 hover:text-forest-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Consulter le profil public de l&apos;exploitation</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Destination de Campagne & Dépôt de Retrait */}
          {(order.destination_city_snapshot ||
            order.destination?.city_name ||
            order.depot_name_snapshot ||
            order.depot?.name) && (
            <div className="p-5 rounded-3xl bg-forest-50/30 border border-forest-200/80 space-y-3">
              <h3 className="text-xs font-bold text-forest-950 uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-forest-700" />
                <span>Arrivée & Dépôt de Retrait</span>
              </h3>

              <div className="space-y-2.5 text-xs text-gray-800">
                <div>
                  <span className="text-gray-500 text-[11px] block">Ville d&apos;arrivée prévue :</span>
                  <span className="font-bold text-gray-950 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-forest-600" />
                    {order.destination_city_snapshot ||
                      order.destination?.city_name ||
                      order.delivery_city}
                  </span>
                </div>

                {formattedArrivalDate && (
                  <div>
                    <span className="text-gray-500 text-[11px] block">Date prévue d&apos;arrivée :</span>
                    <span className="font-bold text-forest-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-forest-600" />
                      {formattedArrivalDate}
                    </span>
                    {previousArrivalDate && (
                      <span className="text-[10px] text-amber-800 block mt-0.5 line-through">
                        Date initiale : {previousArrivalDate}
                      </span>
                    )}
                  </div>
                )}

                {(order.depot_name_snapshot || order.depot) && (
                  <div className="pt-2 border-t border-forest-100">
                    <span className="text-gray-500 text-[11px] block">Point de dépôt / retrait :</span>
                    <span className="font-bold text-gray-900 block mt-0.5">
                      {order.depot?.name || order.depot_name_snapshot}
                    </span>
                    {order.depot && (
                      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
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
            </div>
          )}

          {/* Lieu de livraison */}
          <div className="p-5 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-forest-700" />
              <span>Territoire de l&apos;Acheteur</span>
            </h3>

            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <span className="text-gray-500 text-[11px] block">Province :</span>
                <span className="font-semibold text-gray-900">
                  {order.delivery_province?.name || "Non spécifié"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 text-[11px] block">Ville / Territoire :</span>
                <span className="font-semibold text-gray-900">
                  {order.delivery_city || "Non spécifié"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 text-[11px] block">Adresse / Entrepôt :</span>
                <span className="text-gray-800">
                  {order.delivery_address || "Adresse par défaut de l'acheteur"}
                </span>
              </div>
            </div>
          </div>

          {/* Notes et instructions */}
          {order.notes && (
            <div className="p-5 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-forest-700" />
                <span>Instructions Particulières</span>
              </h3>
              <p className="text-xs text-gray-600 italic leading-relaxed">
                &ldquo;{order.notes}&rdquo;
              </p>
            </div>
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
              Êtes-vous sûr de vouloir annuler la commande <strong>{order.order_number}</strong> ?
              Le volume réservé sera instantanément réintégré aux stocks disponibles de l&apos;offre commerciale.
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
                placeholder="Ex: Changement de prévisions d'achat..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:ring-1 focus:ring-rose-500 outline-hidden resize-none"
              />
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal QR Code pour présentation à l'exploitation */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeToken={order.qr_code_token || order.order_number}
        orderNumber={order.order_number}
        productName={order.order_items[0]?.product.name || order.campaign.title}
        quantity={order.order_items[0]?.quantity || 0}
        unit={order.campaign.unit}
        companyName={order.company.name}
      />
    </div>
  );
}
