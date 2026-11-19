"use client";

import { useState, useTransition, useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { DemandItem, DemandResponseItem } from "@/lib/queries/demands";
import { Province } from "@/lib/queries/geography";
import { createOrderFromDemandResponseAction } from "@/lib/actions/orders";
import Select from "@/components/ui/Select";
import {
  CheckCircle,
  Building2,
  Calendar,
  MapPin,
  AlertCircle,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMoney, formatQuantity, formatQuantityWithUnit } from "@/lib/utils/numberFormat";

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
  const [successOrder, setSuccessOrder] = useState<{
    orderNumber: string;
    totalAmount: number;
    currency: string;
  } | null>(null);

  // Form states for ordering
  const [deliveryProvinceId, setDeliveryProvinceId] = useState(
    demand?.province_id || provinces[0]?.id || ""
  );
  const [deliveryCity, setDeliveryCity] = useState(demand?.city || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: p.id, label: p.name })),
    [provinces]
  );

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
      try {
        const res = await createOrderFromDemandResponseAction({
          response_id: selectedResponse.id,
          delivery_province_id: deliveryProvinceId,
          delivery_city: deliveryCity,
          delivery_address: deliveryAddress,
          notes: orderNotes,
          // Prix affiché au revendeur : le serveur refuse la commande s'il a changé.
          expected_unit_price: selectedResponse.unit_price,
        });

        if (!res.success || res.error || !res.data) {
          // Le message métier renvoyé par le serveur (stock insuffisant, prix invalide
          // ou modifié…) est affiché tel quel ; aucun succès n'est annoncé.
          setErrorMessage(res.error || "Une erreur est survenue lors de la validation de la commande.");
        } else {
          setSuccessOrder({
            orderNumber: res.data.orderNumber,
            totalAmount: res.data.totalAmount,
            currency: res.data.currency || selectedResponse.currency,
          });
          onOrderSuccess?.(res.data.orderNumber);
        }
      } catch {
        setErrorMessage("La commande n'a pas pu être envoyée. Vérifiez votre connexion puis réessayez.");
      }
    });
  };

  // Lot UX/UI 5B : grand tiroir partagé (focus, Échap bloqué pendant l'envoi, verrouillage compté).
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      isDismissable={!isPending}
      showCloseButton={!isPending}
      title={`Propositions reçues (${responses.length})`}
      description={
        <>
          Demande : <strong className="text-gray-800">{demand.product?.name || "Produit"}</strong> •{" "}
          {formatQuantityWithUnit(demand.quantity, demand.unit)}
        </>
      }
    >
        <div className="space-y-4">
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
                <p className="text-xs font-semibold text-gray-700">
                  Montant total : {formatMoney(successOrder.totalAmount, successOrder.currency)}
                </p>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200/60 max-w-md mx-auto">
                Le stock a été réservé et la société a été notifiée. Vous pouvez suivre l&apos;acheminement dans votre espace Commandes.
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
                  Confirmation de commande chez {selectedResponse.company?.name || "Société"}
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
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
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
                  <span className="font-bold text-gray-900">{formatMoney(selectedResponse.unit_price, selectedResponse.currency)}/{demand.unit}</span>
                </div>
                <div className="pt-2 border-t border-earth-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-earth-950">Total à régler :</span>
                  <span className="font-extrabold text-earth-800">
                    {formatMoney((selectedResponse.proposed_quantity || 0) * (selectedResponse.unit_price || 0), selectedResponse.currency)}
                  </span>
                </div>
              </div>

              {/* Province de livraison */}
              <div className="space-y-1.5">
                <label htmlFor="demand-order-province" className="block text-xs font-semibold text-gray-800">
                  Province de livraison <span className="text-rose-500">*</span>
                </label>
                <Select
                  id="demand-order-province"
                  required
                  searchable
                  leftIcon={<MapPin className="w-4 h-4 text-earth-700" />}
                  placeholder="Sélectionner une province..."
                  value={deliveryProvinceId}
                  onChange={(e) => setDeliveryProvinceId(e.target.value)}
                  options={provinceOptions}
                />
              </div>

              {/* Ville & Adresse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="demand-order-city" className="block text-xs font-semibold text-gray-800">Ville / Commune</label>
                  <input
                    id="demand-order-city"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="Ex: Lubumbashi"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="demand-order-address" className="block text-xs font-semibold text-gray-800">Adresse / Point de livraison</label>
                  <input
                    id="demand-order-address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Ex: Dépôt Avenue des Usines N°12"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600"
                  />
                </div>
              </div>

              {/* Notes logistiques */}
              <div className="space-y-1.5">
                <label htmlFor="demand-order-notes" className="block text-xs font-semibold text-gray-800">Notes pour la société (optionnel)</label>
                <textarea
                  id="demand-order-notes"
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
                      Confirmer et Commander ({formatMoney((selectedResponse.proposed_quantity || 0) * (selectedResponse.unit_price || 0), selectedResponse.currency)})
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
                Les sociétés de votre zone ont été notifiées. Leurs propositions s&apos;afficheront ici dès qu&apos;elles y répondront.
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
                          <h4 className="text-xs font-bold text-gray-900">{resp.company?.name || "Société"}</h4>
                          <p className="text-xs text-gray-500">
                            Proposition adossée à : <strong className="text-gray-700">{resp.production?.title || "Production réelle"}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Statut badge */}
                      {isOrdered && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Commandée
                        </span>
                      )}
                      {isRefused && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Demande refusée
                        </span>
                      )}
                      {isProposed && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> En attente de votre décision
                        </span>
                      )}
                    </div>

                    {/* Données chiffrées */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-gray-50 text-xs">
                      <div>
                        <span className="text-xs text-gray-500 block">Quantité</span>
                        <span className="font-bold text-gray-900">{formatQuantity(resp.proposed_quantity)} {resp.unit || demand.unit}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Prix unitaire</span>
                        <span className="font-bold text-gray-900">{formatMoney(resp.unit_price, resp.currency)}/{resp.unit || demand.unit}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-xs text-gray-500 block">Montant total</span>
                        <span className="font-extrabold text-earth-800">
                          {formatMoney((resp.proposed_quantity || 0) * (resp.unit_price || 0), resp.currency)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
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
    </Drawer>
  );
}
