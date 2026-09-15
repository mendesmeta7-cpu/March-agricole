"use client";

import { useState } from "react";
import { OrderDetail } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import { cancelOrderAction } from "@/lib/actions/orders";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
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
  X,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";

interface ResellerOrderDetailViewProps {
  order: OrderDetail;
}

export default function ResellerOrderDetailView({
  order,
}: ResellerOrderDetailViewProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/reseller/orders"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste de mes commandes
        </Link>
      </div>

      {/* 2. En-tête principal */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center font-black">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-mono tracking-tight">
                {order.order_number}
              </h1>
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Engagée le {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <OrderStatusBadge status={order.status} />
          {order.status === "pending" && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Annuler la commande
            </button>
          )}
        </div>
      </div>

      {/* 3. Grille de détail en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche : Lignes contractuelles et réservation (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lignes de commande */}
          <Card padding="md">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-forest-700" />
              Détail Contractuel des Lignes de Commande
            </h2>

            <div className="divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.product.image_url ? (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          width={40}
                          height={40}
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
                      <span className="text-xs text-gray-500">
                        {item.product.category} • Réf. Offre : {order.campaign.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs sm:text-right">
                    <div>
                      <span className="text-gray-500 block">Prix Unitaire (Snapshot)</span>
                      <span className="font-semibold text-gray-800">
                        {item.unit_price.toLocaleString("fr-FR")} {order.currency}/{item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Quantité</span>
                      <span className="font-bold text-gray-900">
                        {item.quantity.toLocaleString("fr-FR")} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Sous-total</span>
                      <span className="font-extrabold text-forest-900">
                        {item.subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {order.currency}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total général */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between bg-forest-50/50 p-4 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-forest-900 block">
                  Montant Total Contractuel
                </span>
                <span className="text-[11px] text-forest-700">
                  Prix ferme immuable enregistré lors de la validation
                </span>
              </div>
              <span className="text-xl font-black text-forest-950">
                {order.total_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {order.currency}
              </span>
            </div>
          </Card>

          {/* Réservation atomique de stock */}
          <Card padding="md" className="border-blue-200/80 bg-blue-50/20">
            <div className="flex items-start gap-3 text-xs sm:text-sm">
              <ShieldCheck className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-bold text-blue-950 block">
                  Garantie de Réservation Transactionnelle de Stock
                </span>
                <p className="text-blue-900 text-xs leading-relaxed">
                  Cette commande a fait l&apos;objet d&apos;un verrouillage atomique côté serveur dans <code>stock_reservations</code>. Le volume de {order.order_items[0]?.quantity || 0} {order.campaign.unit} est formellement retiré du disponible public de la ferme et vous est exclusivement attribué.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-blue-800">
                  <span>Statut réservation : <strong>{order.stock_reservation?.status || "active"}</strong></span>
                  <span>Volume réservé : <strong>{order.stock_reservation?.quantity || 0} {order.campaign.unit}</strong></span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne Droite : Partenaire & Logistique (1 col) */}
        <div className="space-y-6">
          {/* Entreprise Agricole */}
          <Card padding="md">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-forest-700" />
              Exploitation Vendeuse
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
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

            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link
                href={`/dashboard/reseller/companies/${order.company_id}`}
                className="text-xs font-bold text-forest-700 hover:text-forest-800 hover:underline"
              >
                Consulter le profil public de l&apos;exploitation &rarr;
              </Link>
            </div>
          </Card>

          {/* Lieu de livraison */}
          <Card padding="md">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-forest-700" />
              Lieu de Livraison
            </h3>

            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <span className="text-gray-400 text-[11px] block">Province :</span>
                <span className="font-semibold text-gray-900">
                  {order.delivery_province?.name || "Non spécifié"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Ville / Territoire :</span>
                <span className="font-semibold text-gray-900">
                  {order.delivery_city || "Non spécifié"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Adresse / Entrepôt :</span>
                <span className="text-gray-800">
                  {order.delivery_address || "Adresse par défaut de l'acheteur"}
                </span>
              </div>
            </div>
          </Card>

          {/* Notes et instructions */}
          {order.notes && (
            <Card padding="md">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-forest-700" />
                Instructions Particulières
              </h3>
              <p className="text-xs text-gray-600 italic leading-relaxed">
                &ldquo;{order.notes}&rdquo;
              </p>
            </Card>
          )}
        </div>
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
                    <span>Annulation en cours...</span>
                  </>
                ) : (
                  <span>Confirmer l&apos;annulation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
