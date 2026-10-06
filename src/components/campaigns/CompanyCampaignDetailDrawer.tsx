"use client";

import { useState, useTransition } from "react";
import {
  CompanyCampaignItem,
  CampaignDestination,
  CampaignStatus,
} from "@/lib/queries/campaigns";
import {
  getEffectiveCampaignStatus,
  getCampaignDestinationsSummary,
} from "@/lib/utils/campaignStatus";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import {
  updateCampaignStatusAction,
  updateDestinationArrivalDateAction,
} from "@/lib/actions/campaigns";
import CampaignStatusBadge from "./CampaignStatusBadge";
import {
  Megaphone,
  Tag,
  Layers,
  Calendar,
  MapPin,
  Building,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tractor,
  Play,
  Pause,
  XCircle,
  CheckCircle,
  X,
  Edit,
  Package,
  TrendingUp,
  Info,
} from "lucide-react";

interface CompanyCampaignDetailDrawerProps {
  campaign: CompanyCampaignItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (campaign: CompanyCampaignItem) => void;
}

export default function CompanyCampaignDetailDrawer({
  campaign,
  isOpen,
  onClose,
  onEdit,
}: CompanyCampaignDetailDrawerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<{
    type: "pause" | "activate" | "complete" | "cancel";
    label: string;
  } | null>(null);

  // Modal report de date
  const [editingDest, setEditingDest] = useState<CampaignDestination | null>(null);
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState("");
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [updateDateError, setUpdateDateError] = useState<string | null>(null);

  if (!campaign) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const effectiveStatus = getEffectiveCampaignStatus(campaign);
  const destSummary = getCampaignDestinationsSummary(campaign.destinations);
  const isEffectivelyCompleted = effectiveStatus === "completed" && campaign.status === "active";

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getDestinationState = (dest: CampaignDestination) => {
    if (!dest.order_deadline_date) return "open";
    return dest.order_deadline_date < todayStr ? "expired" : "active";
  };

  const handleStatusChange = (newStatus: CampaignStatus) => {
    setConfirmAction(null);
    startTransition(async () => {
      try {
        const res = await updateCampaignStatusAction(campaign.id, newStatus);
        if (res.success) {
          toast.success("Statut mis à jour", {
            description: `La campagne est maintenant ${newStatus === "active" ? "ouverte" : newStatus === "paused" ? "suspendue" : newStatus === "completed" ? "clôturée" : "annulée"}.`,
          });
        } else {
          toast.error("Erreur", { description: res.error || "Impossible de changer le statut." });
        }
      } catch {
        toast.error("Erreur réseau", { description: "Veuillez réessayer." });
      }
    });
  };

  const openDateModal = (dest: CampaignDestination) => {
    setEditingDest(dest);
    setNewArrivalDate(dest.expected_arrival_date || "");
    setNewDeadlineDate(dest.order_deadline_date || "");
    setUpdateDateError(null);
  };

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDest || !newArrivalDate) return;
    if (newArrivalDate < todayStr) {
      setUpdateDateError("La date d'arrivée ne peut pas être dans le passé.");
      return;
    }
    if (newDeadlineDate && newDeadlineDate < todayStr) {
      setUpdateDateError("La date limite de commande ne peut pas être dans le passé.");
      return;
    }
    setIsUpdatingDate(true);
    setUpdateDateError(null);
    try {
      const res = await updateDestinationArrivalDateAction(
        editingDest.id,
        newArrivalDate,
        newDeadlineDate || null
      );
      if (res.success) {
        toast.success("Date mise à jour", {
          description: `Les dates de ${editingDest.city_name} ont été actualisées.`,
        });
        editingDest.expected_arrival_date = newArrivalDate;
        editingDest.order_deadline_date = newDeadlineDate || null;
        setEditingDest(null);
      } else {
        setUpdateDateError(res.error || "Impossible de mettre à jour.");
      }
    } catch {
      setUpdateDateError("Erreur de connexion.");
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const stockPercent =
    campaign.marketable_quantity > 0
      ? Math.round((campaign.reserved_quantity / campaign.marketable_quantity) * 100)
      : 0;

  const confirmConfig = {
    pause: {
      title: "Suspendre la campagne ?",
      description: "Les revendeurs ne pourront plus passer de nouvelles commandes jusqu'à la réactivation. Les commandes existantes restent intactes.",
      confirmText: "Suspendre",
      variant: "warning" as const,
    },
    activate: {
      title: "Réactiver la campagne ?",
      description: "La campagne redeviendra visible et commandable par les revendeurs éligibles.",
      confirmText: "Réactiver",
      variant: "success" as const,
    },
    complete: {
      title: "Clôturer la campagne ?",
      description: "La campagne sera définitivement fermée aux nouvelles commandes. Les commandes existantes restent accessibles.",
      confirmText: "Clôturer définitivement",
      variant: "info" as const,
    },
    cancel: {
      title: "Annuler la campagne ?",
      description: "Cette action est irréversible. Les commandes déjà passées devront être traitées ou résolues séparément.",
      confirmText: "Annuler la campagne",
      variant: "destructive" as const,
    },
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        title={
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-forest-50 text-forest-800 text-[11px] font-semibold border border-forest-200/60">
                {campaign.product.category}
              </span>
              <span className="text-xs text-gray-500">{campaign.product.name}</span>
            </div>
            <p className="text-base font-bold text-gray-950 leading-tight">{campaign.title}</p>
          </div>
        }
        icon={<Megaphone className="w-5 h-5" />}
      >
        <div className="space-y-5">
          {/* ALERTE : Campagne terminée par expiration des destinations */}
          {isEffectivelyCompleted && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900">Campagne arrivée à échéance</p>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                  Toutes les destinations de cette campagne ont atteint leur date limite de commande.
                  La campagne est terminée automatiquement côté revendeurs. Vous pouvez la clôturer
                  officiellement ou consulter l'historique des commandes.
                </p>
              </div>
            </div>
          )}

          {/* Statut effectif */}
          <div className="flex items-center justify-between">
            <CampaignStatusBadge status={effectiveStatus} size="md" />
            {effectiveStatus !== campaign.status && (
              <span className="text-[11px] text-gray-400 italic">
                Statut calculé (expirations destinations)
              </span>
            )}
          </div>

          {/* Indicateurs de stock */}
          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Stock &amp; Réservations
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <span className="block text-[11px] text-gray-500 uppercase font-medium">Total</span>
                <span className="block text-xl font-extrabold text-gray-900 mt-0.5">
                  {campaign.marketable_quantity.toLocaleString("fr-FR")}
                </span>
                <span className="block text-[10px] text-gray-400">{campaign.unit}</span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] text-amber-600 uppercase font-medium">Réservé</span>
                <span className="block text-xl font-extrabold text-amber-700 mt-0.5">
                  {campaign.reserved_quantity.toLocaleString("fr-FR")}
                </span>
                <span className="block text-[10px] text-gray-400">{campaign.unit}</span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] text-emerald-600 uppercase font-medium">Disponible</span>
                <span className="block text-xl font-extrabold text-emerald-700 mt-0.5">
                  {campaign.available_quantity.toLocaleString("fr-FR")}
                </span>
                <span className="block text-[10px] text-gray-400">{campaign.unit}</span>
              </div>
            </div>
            {/* Barre de progression */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Taux de réservation</span>
                <span className="font-semibold">{stockPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(stockPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tarification */}
          <div className="rounded-2xl bg-forest-50/50 border border-forest-100 p-4 space-y-2">
            <h4 className="text-xs font-bold text-forest-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tarification
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-forest-900">
                {campaign.unit_price.toLocaleString("fr-FR")}
              </span>
              <span className="text-sm text-forest-700 font-semibold">{campaign.currency}</span>
              <span className="text-xs text-gray-500">/ {campaign.unit}</span>
            </div>
            {campaign.min_order_quantity > 1 && (
              <p className="text-xs text-gray-500">
                Quantité minimum : {campaign.min_order_quantity.toLocaleString("fr-FR")} {campaign.unit}
              </p>
            )}
          </div>

          {/* Dates d'offre */}
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              Offre valable du <strong>{formatDate(campaign.start_date)}</strong>
              {campaign.end_date
                ? <> au <strong>{formatDate(campaign.end_date)}</strong></>
                : <> (sans date de fin globale)</>}
            </span>
          </div>

          {/* Production parente */}
          <div className="flex items-start gap-3 bg-forest-50/40 rounded-xl p-3 border border-forest-100">
            <Tractor className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase font-medium">Production adossée</p>
              <p className="text-sm font-bold text-gray-900 truncate">{campaign.production.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Volume déclaré : {campaign.production.expected_quantity.toLocaleString("fr-FR")} {campaign.production.unit}
              </p>
            </div>
          </div>

          {/* Zones & Destinations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                Destinations ({destSummary.total})
              </h4>
              {destSummary.total > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  {destSummary.active > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      {destSummary.active} active{destSummary.active > 1 ? "s" : ""}
                    </span>
                  )}
                  {destSummary.expired > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                      {destSummary.expired} terminée{destSummary.expired > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>

            {campaign.destinations && campaign.destinations.length > 0 ? (
              <div className="space-y-2">
                {campaign.destinations.map((dest) => {
                  const state = getDestinationState(dest);
                  return (
                    <div
                      key={dest.id}
                      className={`rounded-xl border p-3 space-y-1.5 ${
                        state === "expired"
                          ? "bg-rose-50/50 border-rose-200/80"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${
                              state === "expired" ? "bg-rose-400" : "bg-emerald-400"
                            }`}
                          />
                          <span className="text-sm font-bold text-gray-900">{dest.city_name}</span>
                          {dest.provinces?.name && (
                            <span className="text-[11px] text-gray-400">({dest.provinces.name})</span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            state === "expired"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {state === "expired" ? "Terminée" : "Active"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pl-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>Arrivée : <strong>{formatDate(dest.expected_arrival_date)}</strong></span>
                        </div>
                        {dest.order_deadline_date ? (
                          <div className={`flex items-center gap-1 ${state === "expired" ? "text-rose-600 font-semibold" : "text-amber-700"}`}>
                            <AlertCircle className="w-3 h-3" />
                            <span>Limite : <strong>{formatDate(dest.order_deadline_date)}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>Sans date limite</span>
                          </div>
                        )}
                      </div>

                      {dest.depots && dest.depots.length > 0 && (
                        <div className="pl-4 space-y-1 pt-1 border-t border-gray-100">
                          {dest.depots.map((depot) => (
                            <div key={depot.id} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                              <Building className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                              <span>
                                <strong>{depot.name}</strong> — {depot.commune}
                                {depot.quartier ? `, ${depot.quartier}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bouton reporter date — disponible si non completed/cancelled */}
                      {campaign.status !== "completed" && campaign.status !== "cancelled" && (
                        <div className="pl-4 pt-1">
                          <button
                            type="button"
                            onClick={() => openDateModal(dest)}
                            className="text-[11px] text-forest-700 hover:text-forest-900 font-semibold hover:underline"
                          >
                            Reporter la date →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Affichage zones provinces si pas de destinations structurées */}
                {campaign.delivery_zones.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.delivery_zones.map((zone) => (
                      <span
                        key={zone.id}
                        className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-xs"
                      >
                        {zone.provinces?.name || "Province"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucune zone de livraison configurée.</p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {campaign.description && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 italic leading-relaxed">&ldquo;{campaign.description}&rdquo;</p>
            </div>
          )}

          {/* Note métier */}
          {isEffectivelyCompleted && (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Les commandes historiques de cette campagne sont conservées et restent consultables depuis l'espace Commandes.
              </span>
            </div>
          )}
        </div>
      </Drawer>

      {/* Actions dans le footer du drawer — injectées via un portal */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-[55] sm:max-w-2xl w-full px-5 py-3.5 bg-white border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            onClick={() => { onClose(); onEdit(campaign); }}
            disabled={isPending || effectiveStatus === "completed" || effectiveStatus === "cancelled"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Edit className="w-3.5 h-3.5" />
            Modifier
          </button>

          <div className="flex items-center gap-2">
            {(campaign.status === "draft" || campaign.status === "paused") && (
              <button
                onClick={() => setConfirmAction({ type: "activate", label: "Ouvrir" })}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {campaign.status === "draft" ? "Ouvrir" : "Réactiver"}
              </button>
            )}

            {campaign.status === "active" && (
              <>
                <button
                  onClick={() => setConfirmAction({ type: "pause", label: "Suspendre" })}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors disabled:opacity-50"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Suspendre
                </button>
                <button
                  onClick={() => setConfirmAction({ type: "complete", label: "Clôturer" })}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Clôturer
                </button>
              </>
            )}

            {campaign.status !== "completed" && campaign.status !== "cancelled" && (
              <button
                onClick={() => setConfirmAction({ type: "cancel", label: "Annuler" })}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                title="Annuler la campagne"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ConfirmDialog pour les actions de statut */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() =>
            handleStatusChange(
              confirmAction.type === "pause"
                ? "paused"
                : confirmAction.type === "activate"
                ? "active"
                : confirmAction.type === "complete"
                ? "completed"
                : "cancelled"
            )
          }
          title={confirmConfig[confirmAction.type].title}
          description={confirmConfig[confirmAction.type].description}
          confirmText={confirmConfig[confirmAction.type].confirmText}
          variant={confirmConfig[confirmAction.type].variant}
          isLoading={isPending}
        />
      )}

      {/* Modal report de date */}
      {editingDest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Reporter la date d&apos;arrivée</h3>
              </div>
              <button
                onClick={() => setEditingDest(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDate} className="p-6 space-y-4">
              <div>
                <span className="text-xs text-gray-500">Ville :</span>
                <span className="text-base font-bold text-gray-900 block">{editingDest.city_name}</span>
                <span className="text-[11px] text-gray-500">
                  Date actuelle : {formatDate(editingDest.expected_arrival_date)}
                </span>
              </div>

              {updateDateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  {updateDateError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Nouvelle Date d&apos;Arrivée *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={newArrivalDate}
                  onChange={(e) => setNewArrivalDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Date Limite de Commande <span className="text-gray-400 font-normal normal-case">(optionnel)</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={newDeadlineDate}
                  onChange={(e) => setNewDeadlineDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-500 outline-hidden"
                />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Après cette date, aucune nouvelle commande pour {editingDest.city_name}.
                  Les autres destinations restent actives.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <span className="font-bold block">Impact automatique :</span>
                <p>• Les dates de <strong>{editingDest.city_name}</strong> seront actualisées.</p>
                <p>• Une notification ciblée sera envoyée aux revendeurs concernés.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDest(null)}
                  disabled={isUpdatingDate}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDate || !newArrivalDate}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isUpdatingDate ? "Enregistrement..." : "Confirmer le report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
