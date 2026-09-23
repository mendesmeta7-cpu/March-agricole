"use client";

import { useState, useEffect } from "react";
import { ResellerCampaignItem } from "@/lib/queries/campaigns";
import { createOrderAction } from "@/lib/actions/orders";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingBag,
  Tag,
  Layers,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
} from "lucide-react";

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: ResellerCampaignItem | null;
  resellerProvinceId?: string;
  resellerProvinceName?: string;
  defaultCity?: string;
  defaultAddress?: string;
}

export default function OrderFormModal({
  isOpen,
  onClose,
  campaign,
  resellerProvinceId,
  resellerProvinceName,
  defaultCity = "",
  defaultAddress = "",
}: OrderFormModalProps) {
  const router = useRouter();

  const [quantity, setQuantity] = useState<number | "">("");
  const [deliveryCity, setDeliveryCity] = useState(defaultCity);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress);
  const [notes, setNotes] = useState("");

  const hasDestinations = Boolean(campaign?.destinations && campaign.destinations.length > 0);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const [selectedDepotId, setSelectedDepotId] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen && campaign) {
      setQuantity(campaign.min_order_quantity || 1);
      setNotes("");
      setErrorMessage(null);

      if (campaign.destinations && campaign.destinations.length > 0) {
        const firstDest = campaign.destinations[0];
        setSelectedDestinationId(firstDest.id);
        const firstDepot = firstDest.depots?.[0];
        setSelectedDepotId(firstDepot?.id || "");
        setDeliveryCity(firstDest.city_name);
        setDeliveryAddress(
          firstDepot
            ? `${firstDepot.name} (${firstDepot.commune}, ${firstDepot.address})`
            : defaultAddress
        );
      } else {
        setSelectedDestinationId("");
        setSelectedDepotId("");
        setDeliveryCity(defaultCity);
        setDeliveryAddress(defaultAddress);
      }
    }
  }, [isOpen, campaign, defaultCity, defaultAddress]);

  if (!isOpen || !campaign) return null;

  const currentDestination = campaign.destinations?.find((d) => d.id === selectedDestinationId);
  const currentDepot = currentDestination?.depots?.find((dp) => dp.id === selectedDepotId);

  const handleDestinationChange = (destId: string) => {
    setSelectedDestinationId(destId);
    const dest = campaign.destinations?.find((d) => d.id === destId);
    if (dest) {
      setDeliveryCity(dest.city_name);
      const firstDepot = dest.depots?.[0];
      setSelectedDepotId(firstDepot?.id || "");
      if (firstDepot) {
        setDeliveryAddress(`${firstDepot.name} (${firstDepot.commune}, ${firstDepot.address})`);
      }
    }
  };

  const handleDepotChange = (depotId: string) => {
    setSelectedDepotId(depotId);
    const dep = currentDestination?.depots?.find((dp) => dp.id === depotId);
    if (dep) {
      setDeliveryAddress(`${dep.name} (${dep.commune}, ${dep.address})`);
    }
  };

  const minQty = campaign.min_order_quantity || 1;
  const availableQty = campaign.available_quantity ?? campaign.marketable_quantity;
  const numQty = typeof quantity === "number" ? quantity : 0;
  const totalAmount = numQty * campaign.unit_price;

  // Province de livraison cible
  const targetProvinceId =
    currentDestination?.province_id ||
    resellerProvinceId ||
    campaign.delivery_zones[0]?.province_id;
  const targetProvinceName =
    currentDestination?.provinces?.name ||
    resellerProvinceName ||
    campaign.delivery_zones[0]?.provinces?.name ||
    "Votre province";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (typeof quantity !== "number" || quantity <= 0) {
      setErrorMessage("Veuillez saisir une quantité valide strictement supérieure à zéro.");
      return;
    }

    if (quantity < minQty) {
      setErrorMessage(`La quantité minimale pour cette offre est de ${minQty} ${campaign.unit}.`);
      return;
    }

    if (quantity > availableQty) {
      setErrorMessage(
        `La quantité demandée (${quantity} ${campaign.unit}) dépasse le stock restant disponible (${availableQty} ${campaign.unit}).`
      );
      return;
    }

    if (hasDestinations && !selectedDestinationId) {
      setErrorMessage("Veuillez sélectionner une ville d'arrivée pour cette commande.");
      return;
    }

    if (hasDestinations && currentDestination?.depots?.length && !selectedDepotId) {
      setErrorMessage("Veuillez sélectionner un point de dépôt d'arrivée.");
      return;
    }

    if (!targetProvinceId) {
      setErrorMessage("Province de livraison introuvable.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await createOrderAction({
        campaign_id: campaign.id,
        quantity,
        delivery_province_id: targetProvinceId,
        delivery_city: deliveryCity || currentDestination?.city_name || "",
        delivery_address: deliveryAddress,
        notes,
        destination_id: selectedDestinationId || undefined,
        depot_id: selectedDepotId || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Une erreur est survenue lors de la commande.");
        setSubmitting(false);
        return;
      }

      onClose();
      if (res.data?.orderId) {
        router.push(`/dashboard/reseller/orders/${res.data.orderId}`);
      } else {
        router.push("/dashboard/reseller/orders");
      }
    } catch (err: any) {
      console.error("Erreur soumission commande:", err);
      setErrorMessage(err.message || "Impossible de finaliser la commande.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* En-tête du Modal */}
        <div className="px-6 py-5 bg-gradient-to-r from-forest-900 to-forest-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Passer une Commande Ferme</h2>
              <span className="text-xs text-forest-200">
                {campaign.company.name} • {campaign.product.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Message d'erreur */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Récapitulatif de l'offre commerciale */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">{campaign.title}</span>
              <span className="text-xs font-bold text-forest-800">
                {campaign.unit_price.toLocaleString("fr-FR")} {campaign.currency} / {campaign.unit}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-2 border-t border-gray-200/60">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-earth-700" />
                <span>
                  Stock restant réel : <strong>{availableQty.toLocaleString("fr-FR")} {campaign.unit}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-forest-700" />
                <span>
                  Livraison : <strong>{targetProvinceName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Saisie de la quantité */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-900">
              Quantité à commander ({campaign.unit}) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min={minQty}
                max={availableQty}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={`Minimum : ${minQty} ${campaign.unit}`}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-hidden font-semibold"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                {campaign.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Minimum requis : {minQty} {campaign.unit}</span>
              <span>Max disponible : {availableQty} {campaign.unit}</span>
            </div>
          </div>

          {/* Prévisualisation contractuelle du total */}
          <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-forest-900 block">
                Montant total estimé (Snapshot)
              </span>
              <span className="text-[11px] text-forest-700">
                {numQty} {campaign.unit} × {campaign.unit_price.toLocaleString("fr-FR")} {campaign.currency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-forest-950">
                {totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {campaign.currency}
              </span>
            </div>
          </div>

          {/* Informations de livraison et choix de destination */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-forest-700" />
              Lieu de réception & Point d&apos;arrivée
            </h3>

            {hasDestinations ? (
              <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                {/* 1. Choix de la ville d'arrivée */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-800">
                    Ville d&apos;arrivée souhaitée *
                  </label>
                  <select
                    value={selectedDestinationId}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-forest-500 outline-hidden"
                  >
                    {campaign.destinations?.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.city_name} (Arrivée prévue le{" "}
                        {new Date(dest.expected_arrival_date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date prévue d'arrivée mise en avant */}
                {currentDestination && (
                  <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 flex items-center justify-between text-xs">
                    <span className="text-forest-800 font-medium flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-forest-700" />
                      Date prévue d&apos;arrivée de la récolte :
                    </span>
                    <span className="font-bold text-forest-950">
                      {new Date(currentDestination.expected_arrival_date).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}

                {/* 2. Choix du dépôt d'arrivée */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-800">
                    Point / Dépôt de livraison *
                  </label>
                  {(!currentDestination?.depots || currentDestination.depots.length === 0) ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs">
                      Aucun dépôt spécifique répertorié. L&apos;enlèvement s&apos;effectuera au dépôt central de la ville.
                    </div>
                  ) : (
                    <select
                      value={selectedDepotId}
                      onChange={(e) => handleDepotChange(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-forest-500 outline-hidden"
                    >
                      {currentDestination.depots.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name} — {dep.commune} ({dep.address})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Détails du dépôt sélectionné */}
                {currentDepot && (
                  <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-gray-900 border-b border-gray-100 pb-1">
                      <span>{currentDepot.name}</span>
                      <span className="text-[11px] font-normal text-gray-500">
                        Commune : <strong>{currentDepot.commune}</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-0.5">
                      {currentDepot.quartier && (
                        <div>
                          Quartier : <strong>{currentDepot.quartier}</strong>
                        </div>
                      )}
                      <div>
                        Adresse / Rue : <strong>{currentDepot.address}</strong>
                      </div>
                      {currentDepot.complement && (
                        <div>
                          Repère : <em>{currentDepot.complement}</em>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback pour anciennes campagnes sans structure destinations */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-gray-700">
                      Ville / Territoire
                    </label>
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      placeholder="Ex: Kinshasa, Matadi..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-gray-700">
                      Province de rattachement
                    </label>
                    <input
                      type="text"
                      value={targetProvinceName}
                      disabled
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-gray-700">
                    Adresse ou Entrepôt de livraison
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Ex: Hangar N°4, Marché Central..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-500 outline-hidden"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-gray-700">
                Instructions particulières / Notes pour l&apos;exploitation (Optionnel)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Précisions de conditionnement, créneau horaire souhaité..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-forest-500 outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Note de garantie transactionnelle */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2 text-blue-900 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Réservation transactionnelle atomique</strong> : La validation de cette commande bloque immédiatement les {numQty} {campaign.unit} dans les stocks de la ferme, garantissant l&apos;absence de sur-réservation.
            </span>
          </div>

          {/* Boutons d'action */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting || availableQty <= 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-700 text-white text-xs font-bold hover:bg-forest-800 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Réservation en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer la Commande Ferme</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
