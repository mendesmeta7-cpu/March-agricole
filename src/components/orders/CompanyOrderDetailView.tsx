"use client";

import { useState } from "react";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";
import OrderStatusBadge from "./OrderStatusBadge";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
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
} from "lucide-react";

interface CompanyOrderDetailViewProps {
  order: OrderDetail;
}

export default function CompanyOrderDetailView({
  order,
}: CompanyOrderDetailViewProps) {
  const router = useRouter();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(order.created_at));

  const handleUpdateStatus = async () => {
    setUpdating(true);
    setUpdateError(null);

    const res = await updateOrderStatusAction(order.id, newStatus);
    setUpdating(false);

    if (!res.success) {
      setUpdateError(res.error || "Impossible d'actualiser le statut.");
      return;
    }

    setShowStatusModal(false);
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/company/orders"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux commandes reçues
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
              Reçue le {formattedDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <OrderStatusBadge status={order.status} />
          {order.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => {
                setNewStatus(order.status === "pending" ? "confirmed" : order.status);
                setShowStatusModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              Actualiser le statut
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
              Lignes de Commande Ferme
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
                        {item.product.category} • Campagne : {order.campaign.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs sm:text-right">
                    <div>
                      <span className="text-gray-500 block">Prix Unitaire</span>
                      <span className="font-semibold text-gray-800">
                        {item.unit_price.toLocaleString("fr-FR")} {order.currency}/{item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Volume Commandé</span>
                      <span className="font-bold text-gray-900">
                        {item.quantity.toLocaleString("fr-FR")} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Total Ligne</span>
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
                  Montant Total de la Commande
                </span>
                <span className="text-[11px] text-forest-700">
                  Engagement commercial ferme enregistré en base de données
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
                  État de la Réservation de Stock
                </span>
                <p className="text-blue-900 text-xs leading-relaxed">
                  Cette commande a réservé {order.order_items[0]?.quantity || 0} {order.campaign.unit} sur l&apos;offre commerciale <strong>{order.campaign.title}</strong>. Ce volume est débité de la quantité restant à vendre pour éviter tout risque de sur-réservation.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-blue-800">
                  <span>Statut : <strong>{order.stock_reservation?.status || "active"}</strong></span>
                  <span>Quantité bloquée : <strong>{order.stock_reservation?.quantity || 0} {order.campaign.unit}</strong></span>
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

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400 text-[11px] block">Raison Sociale :</span>
                <span className="font-bold text-gray-900 text-sm block">
                  {order.reseller.business_name}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Territoire d&apos;activité :</span>
                <span className="text-gray-700">
                  {order.reseller.city ? `${order.reseller.city}, ` : ""}
                  {order.reseller.provinces?.name || "RDC"}
                </span>
              </div>
            </div>
          </Card>

          {/* Lieu de livraison */}
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
              <p className="text-xs text-gray-600 italic leading-relaxed">
                &ldquo;{order.notes}&rdquo;
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal d'actualisation de statut */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-forest-700" />
                Actualiser l&apos;état logistique
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Commande <strong>{order.order_number}</strong>
            </p>

            {updateError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                {updateError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Nouveau statut :
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-forest-500 outline-hidden font-medium"
              >
                <option value="pending">En attente de confirmation</option>
                <option value="confirmed">Confirmée par l&apos;exploitation</option>
                <option value="preparing">En cours de préparation</option>
                <option value="ready">Prête pour retrait / expédition</option>
                <option value="delivered">Livrée / Réceptionnée</option>
                <option value="cancelled">Annulée (Libère le stock réservé)</option>
              </select>
            </div>

            {newStatus === "cancelled" && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span>
                  Attention : L&apos;annulation libérera immédiatement la réservation de stock liée.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-4 py-1.5 text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                {updating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  <span>Enregistrer le statut</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
