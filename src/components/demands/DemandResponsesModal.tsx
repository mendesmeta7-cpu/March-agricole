"use client";

import { useState, useTransition } from "react";
import { DemandItem, DemandResponseItem } from "@/lib/queries/demands";
import { Province } from "@/lib/queries/geography";
import { createOrderFromDemandResponseAction } from "@/lib/actions/orders";
import {
  X,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  Scale,
  MapPin,
  FileText,
  AlertCircle,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DemandResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: DemandItem | null;
  provinces: Province[];
  onOrderSuccess?: (orderNumber: string) => void;
}

export default function DemandResponsesModal({
  isOpen,
  onClose,
  demand,
  provinces,
  onOrderSuccess,
}: DemandResponsesModalProps) {
  const router = useRouter();
  const [selectedResponse, setSelectedResponse] = useState<DemandResponseItem | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; totalAmount: number } | null>(null);

  // Form states for ordering
  const [deliveryProvinceId, setDeliveryProvinceId] = useState(
    demand?.province_id || provinces[0]?.id || ""
  );
  const [deliveryCity, setDeliveryCity] = useState(demand?.city || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  if (!isOpen || !demand) return null;

  const responses = demand.responses || [];

  const handleStartOrder = (resp: DemandResponseItem) => {
    setSelectedResponse(resp);
    setIsOrdering(true);
    setErrorMessage(null);
    setDeliveryProvinceId(demand.province_id || provinces[0]?.id || "");
    setDeliveryCity(demand.city || "");
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResponse) return;

    setErrorMessage(null);

    startTransition(async () => {
      const res = await createOrderFromDemandResponseAction({
        response_id: selectedResponse.id,
        delivery_province_id: deliveryProvinceId,
        delivery_city: deliveryCity,
        delivery_address: deliveryAddress,
        notes: orderNotes,
      });

      if (!res.success || res.error) {
        setErrorMessage(res.error || "Une erreur est survenue lors de la validation de la commande.");
      } else if (res.data) {
        setSuccessOrder({
          orderNumber: res.data.orderNumber,
          totalAmount: res.data.totalAmount,
        });
        onOrderSuccess?.(res.data.orderNumber);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 mt-auto sm:mt-0"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-earth-900/5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Propositions reçues ({responses.length})</span>
            </h2>
            <p className="text-xs text-gray-500">
              Demande : <strong className="text-gray-800">{demand.product?.name || "Produit"}</strong> • {demand.quantity} {demand.unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {successOrder ? (
            <div className="p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Commande validée avec succès !</h3>
                <p className="text-xs text-gray-600">
                  N° de commande : <strong className="font-mono text-emerald-800">{successOrder.orderNumber}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Montant total : {successOrder.totalAmount.toLocaleString("fr-FR")} USD
                </p>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200/60 max-w-md mx-auto">
                Le stock a été réservé et le producteur a été notifié. Vous pouvez suivre l&apos;acheminement dans votre espace Commandes.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/dashboard/reseller/orders");
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-earth-800 hover:bg-earth-900 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Voir mes commandes
                </button>
              </div>
            </div>
          ) : isOrdering && selectedResponse ? (
            /* Formulaire de commande */
            <form onSubmit={handleConfirmOrder} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-800">
                  Confirmation de commande chez {selectedResponse.company?.name || "Entreprise"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOrdering(false)}
                  className="text-xs text-earth-700 hover:underline font-semibold"
                >
                  ← Revenir aux propositions
                </button>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Récapitulatif de l'offre */}
              <div className="p-3.5 bg-earth-50/70 border border-earth-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Production :</span>
                  <span className="font-bold text-gray-900">{selectedResponse.production?.title || demand.product?.name || "Production réelle"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Quantité :</span>
                  <span className="font-bold text-gray-900">{selectedResponse.proposed_quantity} {demand.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Prix unitaire :</span>
                  <span className="font-bold text-gray-900">{selectedResponse.unit_price} {selectedResponse.currency}/{demand.unit}</span>
                </div>
                <div className="pt-2 border-t border-earth-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-earth-950">Total à régler :</span>
                  <span className="font-extrabold text-earth-800">
                    {((selectedResponse.proposed_quantity || 0) * (selectedResponse.unit_price || 0)).toLocaleString("fr-FR")} {selectedResponse.currency}
                  </span>
                </div>
              </div>

              {/* Province de livraison */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-800">
                  Province de livraison <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={deliveryProvinceId}
                  onChange={(e) => setDeliveryProvinceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 bg-white"
                >
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ville & Adresse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-800">Ville / Commune</label>
                  <input
                    type="text"
                    placeholder="Ex: Lubumbashi"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-800">Adresse / Point de livraison</label>
                  <input
                    type="text"
                    placeholder="Ex: Dépôt Avenue des Usines N°12"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600"
                  />
                </div>
              </div>

              {/* Notes logistiques */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-800">Notes pour le producteur (optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="Instructions de déchargement ou contact sur place..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOrdering(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création de la commande...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Confirmer et Commander ({((selectedResponse.proposed_quantity || 0) * (selectedResponse.unit_price || 0)).toLocaleString("fr-FR")} {selectedResponse.currency})
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : responses.length === 0 ? (
            /* État vide soigné (Règle 2) */
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Aucune proposition reçue pour l&apos;instant</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Les producteurs agricoles de votre zone ont été notifiés. Leurs offres et devis s&apos;afficheront ici dès qu&apos;ils y répondront.
              </p>
            </div>
          ) : (
            /* Liste des propositions reçues */
            <div className="space-y-3">
              {responses.map((resp) => {
                const isProposed = resp.status === "proposed";
                const isOrdered = resp.status === "ordered";
                const isRefused = resp.status === "refused";

                return (
                  <div
                    key={resp.id}
                    className="p-4 rounded-2xl border border-gray-200 hover:border-earth-300 transition-all bg-white hover:shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-earth-100 text-earth-800 font-bold flex items-center justify-center text-xs shadow-2xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{resp.company?.name || "Entreprise agricole"}</h4>
                          <p className="text-[11px] text-gray-500">
                            Offre adossée à : <strong className="text-gray-700">{resp.production?.title || "Production réelle"}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Statut badge */}
                      {isOrdered && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Commandée
                        </span>
                      )}
                      {isRefused && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Refusée
                        </span>
                      )}
                      {isProposed && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> En attente de votre décision
                        </span>
                      )}
                    </div>

                    {/* Données chiffrées */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-gray-50 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Quantité</span>
                        <span className="font-bold text-gray-900">{resp.proposed_quantity.toLocaleString("fr-FR")} {demand.unit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Prix unitaire</span>
                        <span className="font-bold text-gray-900">{resp.unit_price} {resp.currency}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-gray-500 block">Montant total</span>
                        <span className="font-extrabold text-earth-800">
                          {((resp.proposed_quantity || 0) * (resp.unit_price || 0)).toLocaleString("fr-FR")} {resp.currency}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Proposé le : <strong>{new Date(resp.created_at).toLocaleDateString("fr-FR")}</strong>
                    </p>

                    {resp.message && (
                      <p className="text-[11px] text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100 italic">
                        &ldquo;{resp.message}&rdquo;
                      </p>
                    )}

                    {/* Bouton d'action */}
                    {isProposed && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleStartOrder(resp)}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Accepter et Commander
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
