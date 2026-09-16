"use client";

import { useState, useEffect, useTransition } from "react";
import {
  EligibleProductionOption,
  CompanyCampaignItem,
} from "@/lib/queries/campaigns";
import { AggregatedDemandItem } from "@/lib/queries/demands";
import { Province } from "@/lib/queries/geography";
import { createCampaignAction, updateCampaignAction } from "@/lib/actions/campaigns";
import {
  X,
  Tractor,
  Calendar,
  DollarSign,
  Layers,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibleProductions: EligibleProductionOption[];
  provinces: Province[];
  marketDemands: AggregatedDemandItem[];
  campaignToEdit?: CompanyCampaignItem | null;
}

export default function CampaignFormModal({
  isOpen,
  onClose,
  eligibleProductions,
  provinces,
  marketDemands,
  campaignToEdit,
}: CampaignFormModalProps) {
  const isEditing = !!campaignToEdit;

  const [productionId, setProductionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [marketableQuantity, setMarketableQuantity] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [minOrderQuantity, setMinOrderQuantity] = useState<number | "">(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availabilityPeriod, setAvailabilityPeriod] = useState("");
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [status, setStatus] = useState<"draft" | "active">("draft");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialisation lors de l'ouverture ou du changement de campagne à éditer
  useEffect(() => {
    if (campaignToEdit) {
      setProductionId(campaignToEdit.production_id);
      setTitle(campaignToEdit.title);
      setDescription(campaignToEdit.description || "");
      setMarketableQuantity(campaignToEdit.marketable_quantity);
      setUnitPrice(campaignToEdit.unit_price);
      setCurrency(campaignToEdit.currency || "USD");
      setMinOrderQuantity(campaignToEdit.min_order_quantity || 1);
      setStartDate(campaignToEdit.start_date || "");
      setEndDate(campaignToEdit.end_date || "");
      setAvailabilityPeriod(campaignToEdit.availability_period || "");
      setSelectedProvinces(campaignToEdit.delivery_zones.map((z) => z.province_id));
      setStatus(campaignToEdit.status === "active" ? "active" : "draft");
    } else {
      // Création
      setProductionId(eligibleProductions[0]?.id || "");
      setTitle("");
      setDescription("");
      setMarketableQuantity("");
      setUnitPrice("");
      setCurrency("USD");
      setMinOrderQuantity(1);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setAvailabilityPeriod("");
      setSelectedProvinces([]);
      setStatus("draft");
    }
    setErrorMessage(null);
  }, [campaignToEdit, eligibleProductions, isOpen]);

  if (!isOpen) return null;

  // Production actuellement sélectionnée
  const selectedProduction = eligibleProductions.find((p) => p.id === productionId);
  const maxAllowedQuantity = selectedProduction?.expected_quantity || 0;
  const currentUnit = selectedProduction?.unit || "tonne";

  // Demandes observées pertinentes pour ce produit
  const relevantDemands = selectedProduction
    ? marketDemands.filter((d) => d.product_id === selectedProduction.product_id)
    : [];

  const handleToggleProvince = (provId: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(provId) ? prev.filter((id) => id !== provId) : [...prev, provId]
    );
  };

  const handleSelectAllProvinces = () => {
    setSelectedProvinces(provinces.map((p) => p.id));
  };

  const handleClearAllProvinces = () => {
    setSelectedProvinces([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!productionId) {
      setErrorMessage("Veuillez sélectionner une production de référence.");
      return;
    }

    if (
      typeof marketableQuantity !== "number" ||
      marketableQuantity <= 0 ||
      marketableQuantity > maxAllowedQuantity
    ) {
      setErrorMessage(
        `La quantité commercialisée doit être comprise entre 1 et ${maxAllowedQuantity.toLocaleString("fr-FR")} ${currentUnit}.`
      );
      return;
    }

    if (typeof unitPrice !== "number" || unitPrice <= 0) {
      setErrorMessage("Le prix unitaire doit être strictement positif.");
      return;
    }

    if (selectedProvinces.length === 0) {
      setErrorMessage("Veuillez sélectionner au moins une province de livraison.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("production_id", productionId);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("marketable_quantity", marketableQuantity.toString());
        formData.append("unit_price", unitPrice.toString());
        formData.append("currency", currency);
        formData.append("min_order_quantity", (minOrderQuantity || 1).toString());
        formData.append("start_date", startDate);
        if (endDate) formData.append("end_date", endDate);
        if (availabilityPeriod) formData.append("availability_period", availabilityPeriod);
        formData.append("status", status);

        selectedProvinces.forEach((pId) => {
          formData.append("province_ids", pId);
        });

        const res = isEditing
          ? await updateCampaignAction(campaignToEdit.id, formData)
          : await createCampaignAction(formData);

        if (res.success) {
          onClose();
        } else {
          setErrorMessage(res.error || "Une erreur est survenue.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur de connexion.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête de la modale */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {isEditing ? "Modifier l'Offre Commerciale" : "Nouvelle Campagne Commerciale"}
            </h2>
            <p className="text-xs text-gray-500">
              Définissez votre offre de vente, vos prix, périodes et territoires desservis.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-gray-200/80 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Sélection obligatoire de la production parente */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Production de Référence (Obligatoire) *
            </label>
            {eligibleProductions.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                Aucune production disponible. Vous devez d&apos;abord enregistrer une production dans votre exploitation avant de créer une campagne.
              </div>
            ) : (
              <select
                disabled={isEditing}
                value={productionId}
                onChange={(e) => setProductionId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-hidden font-medium disabled:bg-gray-100"
                required
              >
                {eligibleProductions.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.title} — {prod.product_name} ({prod.expected_quantity} {prod.unit})
                  </option>
                ))}
              </select>
            )}

            {selectedProduction && (
              <div className="p-3 rounded-xl bg-forest-50/60 border border-forest-100 flex items-center justify-between text-xs text-forest-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <Tractor className="w-4 h-4 text-forest-700" />
                  Volume total déclaré :
                </span>
                <span className="font-extrabold text-forest-950">
                  {maxAllowedQuantity.toLocaleString("fr-FR")} {currentUnit}
                </span>
              </div>
            )}
          </div>

          {/* 2. Titre de la campagne */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Titre de l&apos;Offre Commerciale *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Maïs Blanc Séché - Arrivage Kinshasa Octobre"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-hidden"
            />
          </div>

          {/* 3. Volume commercialisé & Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantité commercialisée */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Quantité Mise en Vente ({currentUnit}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={maxAllowedQuantity || undefined}
                  value={marketableQuantity}
                  onChange={(e) =>
                    setMarketableQuantity(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  placeholder={`Max: ${maxAllowedQuantity}`}
                  required
                  className={`w-full px-3.5 py-2 rounded-xl border text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden ${
                    typeof marketableQuantity === "number" && marketableQuantity > maxAllowedQuantity
                      ? "border-rose-400 bg-rose-50"
                      : "border-gray-300"
                  }`}
                />
              </div>
              <span className="text-[11px] text-gray-500 block">
                Doit être &le; au volume de production ({maxAllowedQuantity} {currentUnit})
              </span>
            </div>

            {/* Prix unitaire ferme */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Prix Unitaire Ferme *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={unitPrice}
                  onChange={(e) =>
                    setUnitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  placeholder="Ex: 450"
                  required
                  className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 px-2 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-semibold"
                >
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
              <span className="text-[11px] text-gray-500 block">
                Prix par {currentUnit}
              </span>
            </div>
          </div>

          {/* 4. Calendrier commercial (Période) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Date d&apos;Ouverture de Vente *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Date de Clôture (Optionnelle)
              </label>
              <input
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
              />
            </div>
          </div>

          {/* Disponibilité & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Précision de Disponibilité
              </label>
              <input
                type="text"
                value={availabilityPeriod}
                onChange={(e) => setAvailabilityPeriod(e.target.value)}
                placeholder="Ex: Enlèvement sous 48h, bord champ"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Description / Modalités
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conditionnement en sacs de 50kg, etc."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
              />
            </div>
          </div>

          {/* 5. Territoires desservis (campaign_delivery_zones) */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                  Territoires Desservis (Zones de Livraison) *
                </label>
                <p className="text-[11px] text-gray-500">
                  Seuls les revendeurs situés dans ces provinces pourront commander cette offre.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllProvinces}
                  className="text-xs text-forest-700 hover:text-forest-900 font-semibold"
                >
                  Tout cocher
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAllProvinces}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Effacer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-gray-50 border border-gray-200">
              {provinces.map((prov) => {
                const isSelected = selectedProvinces.includes(prov.id);
                return (
                  <label
                    key={prov.id}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                      isSelected
                        ? "bg-forest-50 border-forest-300 text-forest-950 font-semibold"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleProvince(prov.id)}
                      className="rounded text-forest-700 focus:ring-forest-500"
                    />
                    <span className="truncate">{prov.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 6. Aide contextuelle : Demandes observées sur le marché (Non contraignant) */}
          {relevantDemands.length > 0 && (
            <div className="p-4 rounded-2xl bg-earth-50/70 border border-earth-200/80 space-y-2">
              <div className="flex items-center gap-2 text-earth-900 font-bold text-xs">
                <TrendingUp className="w-4 h-4 text-earth-700" />
                <span>Demandes d&apos;achat observées sur cette denrée (Aide à la décision) :</span>
              </div>
              <p className="text-[11px] text-earth-800 leading-relaxed">
                Voici les volumes demandés par les acheteurs sur ce produit selon l&apos;analyse territoriale de marché. Vous pouvez ajuster vos provinces cibles en conséquence.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {relevantDemands.map((dem, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-earth-900 border border-earth-200 text-xs font-semibold shadow-2xs"
                  >
                    <MapPin className="w-3 h-3 text-earth-600" />
                    {dem.province_name} : {Number(dem.total_demanded_quantity).toLocaleString("fr-FR")} {dem.unit}
                    <span className="text-[10px] text-earth-600 font-normal">
                      ({dem.total_demands_count} besoin{dem.total_demands_count > 1 ? "s" : ""})
                    </span>
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-earth-600 italic block pt-1">
                (Information purement indicative — Ne réserve aucun stock et ne crée aucune liaison automatique)
              </span>
            </div>
          )}

          {/* 7. Statut initial (Brouillon vs Publiée) */}
          {!isEditing && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 block text-xs">Statut initial</span>
                <span className="text-xs text-gray-500 block">
                  {status === "active"
                    ? "L'offre sera directement visible pour les revendeurs."
                    : "L'offre sera enregistrée en brouillon privé."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    status === "draft"
                      ? "bg-white border-forest-600 text-forest-800 shadow-xs"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  Brouillon
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    status === "active"
                      ? "bg-forest-700 border-forest-700 text-white shadow-xs"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  Publier (Actif)
                </button>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || eligibleProductions.length === 0}
              className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? "Enregistrement..." : isEditing ? "Mettre à jour l'offre" : "Enregistrer la campagne"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
