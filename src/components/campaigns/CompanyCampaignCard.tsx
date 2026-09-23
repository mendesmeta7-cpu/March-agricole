"use client";

import { useState, useTransition } from "react";
import { CompanyCampaignItem, CampaignDestination } from "@/lib/queries/campaigns";
import CampaignStatusBadge from "./CampaignStatusBadge";
import {
  updateCampaignStatusAction,
  updateDestinationArrivalDateAction,
} from "@/lib/actions/campaigns";
import {
  Calendar,
  MapPin,
  Tag,
  Tractor,
  Layers,
  Edit,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Sprout,
  ImageOff,
  Building,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CompanyCampaignCardProps {
  campaign: CompanyCampaignItem;
  onEdit: (campaign: CompanyCampaignItem) => void;
}

export default function CompanyCampaignCard({
  campaign,
  onEdit,
}: CompanyCampaignCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gestion du report de date d'arrivée par ville
  const [editingDestination, setEditingDestination] = useState<CampaignDestination | null>(null);
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [updateDateError, setUpdateDateError] = useState<string | null>(null);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const handleStatusChange = (newStatus: any) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await updateCampaignStatusAction(campaign.id, newStatus);
        if (!res.success) {
          setErrorMsg(res.error || "Erreur lors du changement de statut.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Erreur réseau.");
      }
    });
  };

  const openDateModal = (dest: CampaignDestination) => {
    setEditingDestination(dest);
    setNewArrivalDate(dest.expected_arrival_date || "");
    setUpdateDateError(null);
  };

  const handleSaveArrivalDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDestination || !newArrivalDate) return;

    setIsUpdatingDate(true);
    setUpdateDateError(null);

    try {
      const res = await updateDestinationArrivalDateAction(
        editingDestination.id,
        newArrivalDate
      );

      if (res.success) {
        // Mise à jour optimiste locale de la destination
        editingDestination.expected_arrival_date = newArrivalDate;
        setEditingDestination(null);
      } else {
        setUpdateDateError(res.error || "Impossible de mettre à jour la date.");
      }
    } catch (err: any) {
      setUpdateDateError(err.message || "Erreur de connexion.");
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const formattedStart = formatDate(campaign.start_date);
  const formattedEnd = formatDate(campaign.end_date);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div>
        {/* 1. En-tête : Produit, Catégorie & Statut */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-forest-50 text-forest-800 text-[11px] font-semibold uppercase tracking-wider border border-forest-200/60">
                {campaign.product.category}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {campaign.product.name}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 truncate">
              {campaign.title}
            </h3>
          </div>

          <CampaignStatusBadge status={campaign.status} size="sm" />
        </div>

        {/* 2. Données Commerciales Principales (Prix & Volume) */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            {/* Prix unitaire */}
            <div>
              <span className="text-[11px] text-gray-500 block uppercase font-medium">
                Prix Unitaire Ferme
              </span>
              <span className="text-base font-extrabold text-forest-900 flex items-center gap-1 mt-0.5">
                <Tag className="w-4 h-4 text-forest-600 inline" />
                {campaign.unit_price.toLocaleString("fr-FR")} {campaign.currency}
                <span className="text-xs font-medium text-gray-500">/{campaign.unit}</span>
              </span>
            </div>

            {/* Volume commercialisé */}
            <div>
              <span className="text-[11px] text-gray-500 block uppercase font-medium">
                Quantité Commercialisée
              </span>
              <span className="text-base font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
                <Layers className="w-4 h-4 text-earth-600 inline" />
                {campaign.marketable_quantity.toLocaleString("fr-FR")} {campaign.unit}
              </span>
            </div>
          </div>

          {/* Adossement à la production parente */}
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-forest-50/40 p-2.5 rounded-lg border border-forest-100">
            <Tractor className="w-4 h-4 text-forest-700 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-gray-900 block truncate">
                Adossée à : {campaign.production.title}
              </span>
              <span className="text-[11px] text-gray-500 block">
                Production totale : {campaign.production.expected_quantity.toLocaleString("fr-FR")} {campaign.production.unit}
              </span>
            </div>
          </div>

          {/* Description optionnelle */}
          {campaign.description && (
            <p className="text-xs text-gray-600 line-clamp-2 italic">
              &ldquo;{campaign.description}&rdquo;
            </p>
          )}

          {/* Calendrier de validité */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>
              Offre valable : {formattedStart} {formattedEnd ? `→ ${formattedEnd}` : "(illimitée)"}
            </span>
          </div>

          {/* Territoires desservis */}
          <div>
            <span className="text-[11px] text-gray-500 block uppercase font-medium mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Provinces Desservies ({campaign.delivery_zones.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {campaign.delivery_zones.map((zone) => (
                <span
                  key={zone.id}
                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[11px] font-medium shadow-2xs"
                >
                  {zone.provinces?.name || "Province"}
                </span>
              ))}
            </div>
          </div>

          {/* Villes d'arrivée et dépôts (Nouveau fonctionnement) */}
          {campaign.destinations && campaign.destinations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-500 block uppercase font-medium flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-forest-700" />
                Villes d&apos;arrivée ({campaign.destinations.length})
              </span>
              <div className="space-y-1.5">
                {campaign.destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-xl bg-forest-50/40 border border-forest-100 text-xs gap-2"
                  >
                    <div>
                      <span className="font-bold text-gray-950 block">{dest.city_name}</span>
                      <span className="text-[11px] text-forest-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-forest-600" />
                        Arrivée : <strong>{formatDate(dest.expected_arrival_date)}</strong>
                        {dest.depots && dest.depots.length > 0 && (
                          <span className="text-gray-500 font-normal">
                            • {dest.depots.length} dépôt{dest.depots.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
                    </div>

                    {campaign.status !== "completed" && campaign.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => openDateModal(dest)}
                        className="text-[11px] text-forest-700 hover:text-forest-900 font-bold hover:underline py-1 px-2.5 rounded-lg bg-white border border-forest-200/80 shadow-2xs transition-colors self-start sm:self-auto"
                      >
                        Reporter la date
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      {/* 3. Actions Opérationnelles */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onEdit(campaign)}
          disabled={isPending || campaign.status === "completed" || campaign.status === "cancelled"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-2xs disabled:opacity-50"
        >
          <Edit className="w-3.5 h-3.5 text-gray-500" />
          Modifier
        </button>

        <div className="flex items-center gap-1.5">
          {/* Si Brouillon ou Suspendue -> Ouvrir */}
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <button
              onClick={() => handleStatusChange("active")}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {campaign.status === "draft" ? "Ouvrir l'offre" : "Réactiver"}
            </button>
          )}

          {/* Si Active -> Suspendre ou Clôturer */}
          {campaign.status === "active" && (
            <>
              <button
                onClick={() => handleStatusChange("paused")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" />
                Suspendre
              </button>

              <button
                onClick={() => handleStatusChange("completed")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors shadow-2xs disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Clôturer
              </button>
            </>
          )}

          {/* Annuler si non terminée */}
          {campaign.status !== "completed" && campaign.status !== "cancelled" && (
            <button
              onClick={() => handleStatusChange("cancelled")}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
              title="Annuler définitivement la campagne"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de modification / report de la date d'arrivée */}
      {editingDestination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  Reporter la date d&apos;arrivée
                </h3>
              </div>
              <button
                onClick={() => setEditingDestination(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveArrivalDate} className="p-6 space-y-4">
              <div>
                <span className="text-xs text-gray-500 block">Ville concernée :</span>
                <span className="text-base font-bold text-gray-900 block">
                  {editingDestination.city_name}
                </span>
                <span className="text-[11px] text-gray-500">
                  Date actuelle : {formatDate(editingDestination.expected_arrival_date)}
                </span>
              </div>

              {updateDateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{updateDateError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Nouvelle Date d&apos;Arrivée Prévue *
                </label>
                <input
                  type="date"
                  value={newArrivalDate}
                  onChange={(e) => setNewArrivalDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
                <span className="font-bold block">Impact automatique :</span>
                <p>
                  • La date sera instantanément actualisée sur toutes les commandes actives de <strong>{editingDestination.city_name}</strong>.
                </p>
                <p>
                  • Une notification ciblée sera envoyée uniquement aux revendeurs ayant commandé sur cette ville.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDestination(null)}
                  disabled={isUpdatingDate}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDate || !newArrivalDate}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 transition-colors shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isUpdatingDate ? "Enregistrement..." : "Confirmer le report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
