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
  Plus,
  Trash2,
  Building,
} from "lucide-react";

export interface FormDepot {
  id?: string;
  name: string;
  commune: string;
  quartier: string;
  address: string;
  complement: string;
}

export interface FormDestination {
  id?: string;
  province_id: string;
  city_name: string;
  expected_arrival_date: string;
  depots: FormDepot[];
}

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibleProductions: EligibleProductionOption[];
  provinces: Province[];
  marketDemands: AggregatedDemandItem[];
  campaignToEdit?: CompanyCampaignItem | null;
  defaultProductionId?: string;
}

export default function CampaignFormModal({
  isOpen,
  onClose,
  eligibleProductions,
  provinces,
  marketDemands,
  campaignToEdit,
  defaultProductionId,
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
  const [destinations, setDestinations] = useState<FormDestination[]>([]);
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

      if (campaignToEdit.destinations && campaignToEdit.destinations.length > 0) {
        setDestinations(
          campaignToEdit.destinations.map((d) => ({
            id: d.id,
            province_id: d.province_id,
            city_name: d.city_name,
            expected_arrival_date: d.expected_arrival_date,
            depots: (d.depots || []).map((dep) => ({
              id: dep.id,
              name: dep.name,
              commune: dep.commune,
              quartier: dep.quartier || "",
              address: dep.address,
              complement: dep.complement || "",
            })),
          }))
        );
      } else {
        setDestinations([]);
      }
    } else {
      // Création
      const initialProdId =
        (defaultProductionId && eligibleProductions.some((p) => p.id === defaultProductionId))
          ? defaultProductionId
          : eligibleProductions[0]?.id || "";
      const prod = eligibleProductions.find((p) => p.id === initialProdId);

      setProductionId(initialProdId);
      setTitle(prod ? `Campagne ${prod.title}` : "");
      setDescription("");
      setMarketableQuantity(prod?.expected_quantity || "");
      setUnitPrice("");
      setCurrency("USD");
      setMinOrderQuantity(1);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setAvailabilityPeriod("");
      setSelectedProvinces([]);
      setDestinations([]);
      setStatus("draft");
    }
    setErrorMessage(null);
  }, [campaignToEdit, eligibleProductions, isOpen, defaultProductionId]);

  const handleAddDestination = () => {
    const defaultProvId = provinces[0]?.id || "";
    setDestinations((prev) => [
      ...prev,
      {
        province_id: defaultProvId,
        city_name: "",
        expected_arrival_date: startDate || new Date().toISOString().split("T")[0],
        depots: [],
      },
    ]);
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDestination = (index: number, field: keyof FormDestination, value: any) => {
    setDestinations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddDepot = (destIndex: number) => {
    setDestinations((prev) => {
      const next = [...prev];
      const dest = next[destIndex];
      const depots = dest.depots || [];
      next[destIndex] = {
        ...dest,
        depots: [
          ...depots,
          {
            name: `Dépôt ${dest.city_name || ""}`.trim(),
            commune: "",
            quartier: "",
            address: "",
            complement: "",
          },
        ],
      };
      return next;
    });
  };

  const handleRemoveDepot = (destIndex: number, depotIndex: number) => {
    setDestinations((prev) => {
      const next = [...prev];
      const dest = next[destIndex];
      next[destIndex] = {
        ...dest,
        depots: dest.depots.filter((_, i) => i !== depotIndex),
      };
      return next;
    });
  };

  const handleUpdateDepot = (destIndex: number, depotIndex: number, field: keyof FormDepot, value: string) => {
    setDestinations((prev) => {
      const next = [...prev];
      const dest = next[destIndex];
      const depots = [...dest.depots];
      depots[depotIndex] = { ...depots[depotIndex], [field]: value };
      next[destIndex] = { ...dest, depots };
      return next;
    });
  };

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

    // Validation des destinations et dépôts
    if (destinations.length > 0) {
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        if (!dest.city_name.trim()) {
          setErrorMessage(`Veuillez renseigner le nom de la ville pour la destination #${i + 1}.`);
          return;
        }
        if (!dest.expected_arrival_date) {
          setErrorMessage(`Veuillez renseigner la date prévue d'arrivée pour la ville ${dest.city_name}.`);
          return;
        }
        if (!dest.depots || dest.depots.length === 0) {
          setErrorMessage(`Veuillez ajouter au moins un point de dépôt pour la ville ${dest.city_name}.`);
          return;
        }
        for (let j = 0; j < dest.depots.length; j++) {
          const dep = dest.depots[j];
          if (!dep.commune.trim()) {
            setErrorMessage(`Veuillez renseigner la commune pour le dépôt #${j + 1} à ${dest.city_name}.`);
            return;
          }
          if (!dep.address.trim()) {
            setErrorMessage(`Veuillez renseigner la rue ou adresse pour le dépôt #${j + 1} à ${dest.city_name}.`);
            return;
          }
        }
      }
    }

    const effectiveProvinces = new Set([...selectedProvinces]);
    destinations.forEach((d) => {
      if (d.province_id) effectiveProvinces.add(d.province_id);
    });

    if (effectiveProvinces.size === 0) {
      setErrorMessage("Veuillez sélectionner au moins une province de livraison ou configurer une ville d'arrivée.");
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

        Array.from(effectiveProvinces).forEach((pId) => {
          formData.append("province_ids", pId);
        });

        if (destinations.length > 0) {
          formData.append("destinations_json", JSON.stringify(destinations));
        }

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
                Date de Clôture (Fin Commerciale)
              </label>
              <input
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-hidden"
              />
              <span className="text-[11px] text-gray-500 block">
                À cette date, la campagne sera automatiquement clôturée et les demandes réactivées.
              </span>
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

          {/* SECTION SPÉCIFIQUE : Villes d'Arrivée & Dépôts de Retrait (Nouveau fonctionnement) */}
          <div className="space-y-4 pt-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-forest-700" />
                  Arrivée de la Production par Ville & Dépôts
                </label>
                <p className="text-[11px] text-gray-500">
                  Définissez chaque ville desservie avec sa date d&apos;arrivée prévue et ses points de dépôt spécifiques.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDestination}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 text-xs font-bold transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5 text-forest-700" />
                Ajouter une ville
              </button>
            </div>

            {destinations.length === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  Aucune ville d&apos;arrivée configurée pour l&apos;instant.
                </p>
                <button
                  type="button"
                  onClick={handleAddDestination}
                  className="text-xs text-forest-700 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Configurer une ville et ses dépôts
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {destinations.map((dest, destIdx) => (
                  <div
                    key={destIdx}
                    className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3.5 transition-all shadow-2xs"
                  >
                    {/* En-tête de la ville */}
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-forest-700 text-white flex items-center justify-center font-bold text-xs">
                          {destIdx + 1}
                        </span>
                        <span className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                          Ville d&apos;arrivée #{destIdx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDestination(destIdx)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Supprimer cette ville"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Retirer la ville</span>
                      </button>
                    </div>

                    {/* Champs Ville, Province et Date Prévue */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
                          Nom de la Ville *
                        </label>
                        <input
                          type="text"
                          value={dest.city_name}
                          onChange={(e) => handleUpdateDestination(destIdx, "city_name", e.target.value)}
                          placeholder="Ex: Kinshasa, Matadi..."
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-forest-500 outline-hidden bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
                          Province de Rattachement *
                        </label>
                        <select
                          value={dest.province_id}
                          onChange={(e) => handleUpdateDestination(destIdx, "province_id", e.target.value)}
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-forest-500 outline-hidden bg-white"
                        >
                          {provinces.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
                          Date Prévue d&apos;Arrivée *
                        </label>
                        <input
                          type="date"
                          value={dest.expected_arrival_date}
                          onChange={(e) => handleUpdateDestination(destIdx, "expected_arrival_date", e.target.value)}
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-forest-500 outline-hidden bg-white"
                        />
                      </div>
                    </div>

                    {/* Dépôts d'arrivée dans cette ville */}
                    <div className="space-y-2 pt-2 border-t border-gray-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                          Points / Dépôts d&apos;arrivée ({dest.depots?.length || 0}) *
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddDepot(destIdx)}
                          className="text-xs text-forest-700 hover:text-forest-900 font-semibold inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Ajouter un dépôt
                        </button>
                      </div>

                      {(!dest.depots || dest.depots.length === 0) ? (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-[11px]">
                          Veuillez ajouter au moins un point de livraison ou dépôt pour {dest.city_name || "cette ville"}.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dest.depots.map((dep, depIdx) => (
                            <div
                              key={depIdx}
                              className="p-3 rounded-xl bg-white border border-gray-200 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-xs">
                                  Dépôt #{depIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDepot(destIdx, depIdx)}
                                  className="text-rose-500 hover:text-rose-700 p-1 text-[11px] font-medium inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Supprimer
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                                    Nom du Dépôt
                                  </label>
                                  <input
                                    type="text"
                                    value={dep.name}
                                    onChange={(e) => handleUpdateDepot(destIdx, depIdx, "name", e.target.value)}
                                    placeholder="Ex: Dépôt Central Lemba"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 outline-hidden"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                                    Commune *
                                  </label>
                                  <input
                                    type="text"
                                    value={dep.commune}
                                    onChange={(e) => handleUpdateDepot(destIdx, depIdx, "commune", e.target.value)}
                                    placeholder="Ex: Lemba, Limete..."
                                    required
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 outline-hidden"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                                    Quartier
                                  </label>
                                  <input
                                    type="text"
                                    value={dep.quartier}
                                    onChange={(e) => handleUpdateDepot(destIdx, depIdx, "quartier", e.target.value)}
                                    placeholder="Ex: Quartier 1"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 outline-hidden"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                                    Rue / Avenue / Marché *
                                  </label>
                                  <input
                                    type="text"
                                    value={dep.address}
                                    onChange={(e) => handleUpdateDepot(destIdx, depIdx, "address", e.target.value)}
                                    placeholder="Ex: 1ère Rue, Marché central"
                                    required
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 outline-hidden"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                                    Repère / Complément
                                  </label>
                                  <input
                                    type="text"
                                    value={dep.complement}
                                    onChange={(e) => handleUpdateDepot(destIdx, depIdx, "complement", e.target.value)}
                                    placeholder="Ex: En face de la station"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 outline-hidden"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Territoires desservis complémentaires (campaign_delivery_zones) */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                  Provinces Éligibles de Livraison
                </label>
                <p className="text-[11px] text-gray-500">
                  Les provinces de vos villes d&apos;arrivée sont ajoutées d&apos;office. Vous pouvez en cocher d&apos;autres si vous livrez toute la province.
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
