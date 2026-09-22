"use client";

import { useState, useRef, useTransition } from "react";
import { DemandItem } from "@/lib/queries/demands";
import { createDemandProposalAction } from "@/lib/actions/demands";
import {
  X,
  Send,
  AlertCircle,
  Calendar,
  DollarSign,
  Scale,
  Building2,
  FileText,
  Info,
  CheckCircle2,
  Sprout,
} from "lucide-react";

interface CompanyProductionOption {
  id: string;
  title: string;
  expected_quantity: number;
  unit: string;
  status: string;
  product_id: string;
}

interface CompanyDemandProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: DemandItem | null;
  companyProductions: CompanyProductionOption[];
  onSuccess?: (message: string) => void;
}

export default function CompanyDemandProposalModal({
  isOpen,
  onClose,
  demand,
  companyProductions,
  onSuccess,
}: CompanyDemandProposalModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtrer les productions de l'entreprise correspondant au produit demandé
  const eligibleProductions = companyProductions.filter(
    (p) => !demand || p.product_id === demand.product_id
  );

  const [selectedProductionId, setSelectedProductionId] = useState(
    eligibleProductions[0]?.id || ""
  );
  const [quantity, setQuantity] = useState(demand ? String(demand.quantity) : "");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [message, setMessage] = useState("");

  if (!isOpen || !demand) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(formRef.current || undefined);
    formData.set("demand_id", demand.id);

    startTransition(async () => {
      const res = await createDemandProposalAction(formData);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("Votre proposition commerciale a été envoyée au revendeur avec succès !");
        onSuccess?.(res.message || "Proposition envoyée avec succès !");
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    });
  };

  const selectedProduction = eligibleProductions.find((p) => p.id === selectedProductionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 mt-auto sm:mt-0"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-earth-900/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-earth-800 text-white flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Formuler une proposition commerciale
              </h2>
              <p className="text-xs text-gray-500">
                Répondez à la demande du revendeur avec vos volumes et conditions tarifaires.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Détails de la demande revendeur */}
        <div className="px-5 py-3.5 bg-earth-50/50 border-b border-earth-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-earth-950">
              {demand.product?.name || "Produit recherché"}
            </span>
            <span className="text-xs font-extrabold text-earth-700 bg-white px-2.5 py-0.5 rounded-full border border-earth-200 shadow-2xs">
              Besoin : {demand.quantity.toLocaleString("fr-FR")} {demand.unit}
            </span>
          </div>
          <p className="text-[11px] text-gray-600 flex items-center gap-2">
            <span>📍 Destination : {demand.province?.name || "Province"} {demand.city ? `(${demand.city})` : ""}</span>
          </p>
          {demand.notes && (
            <p className="text-[11px] text-gray-500 italic bg-white/70 p-2 rounded-lg border border-gray-100 mt-1">
              &ldquo;{demand.notes}&rdquo;
            </p>
          )}
        </div>

        {/* Form Body */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 leading-relaxed font-semibold">{successMessage}</div>
            </div>
          )}

          {/* Choix de la production réelle de l'exploitation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Associer à l&apos;une de vos productions réelles <span className="text-rose-500">*</span>
            </label>
            {eligibleProductions.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  Vous n&apos;avez aucune production active de {demand.product?.name || "ce produit"} déclarée dans votre exploitation. Vous devez d&apos;abord créer ou déclarer cette production.
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  name="production_id"
                  required
                  value={selectedProductionId}
                  onChange={(e) => setSelectedProductionId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 bg-white font-medium"
                >
                  {eligibleProductions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — ({p.status === "harvested" ? "Récoltée" : "En culture"}, {p.expected_quantity} {p.unit})
                    </option>
                  ))}
                </select>
                <Sprout className="w-4 h-4 text-earth-600 absolute left-3 top-3 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Quantité & Prix unitaire */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Quantité proposée ({demand.unit}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="proposed_quantity"
                  required
                  min="0.01"
                  step="any"
                  placeholder="Ex: 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full pl-9 pr-14 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 font-semibold"
                />
                <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {demand.unit}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Prix unitaire ({currency}/{demand.unit}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="unit_price"
                  required
                  min="0.01"
                  step="any"
                  placeholder="Ex: 450"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full pl-9 pr-16 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 font-bold text-earth-900"
                />
                <DollarSign className="w-4 h-4 text-earth-700 absolute left-3 top-3" />
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="absolute right-1.5 top-1.5 text-xs font-bold text-gray-700 bg-gray-100 border-none rounded-md px-2 py-1.5 focus:ring-0"
                >
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calcul du montant total prévisionnel */}
          {Number(quantity) > 0 && Number(unitPrice) > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-semibold">Montant total de votre proposition :</span>
              <span className="text-sm font-extrabold text-emerald-800">
                {(Number(quantity) * Number(unitPrice)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {currency}
              </span>
            </div>
          )}

          {/* Date de livraison estimée */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Date / Délai estimé de disponibilité (optionnel)
            </label>
            <div className="relative">
              <input
                type="date"
                name="estimated_delivery_date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Message ou conditions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Message et conditions logistiques pour l&apos;acheteur (optionnel)
            </label>
            <div className="relative">
              <textarea
                name="message"
                rows={3}
                placeholder="Ex: Marchandise conditionnée en sacs de 50 kg, disponible au dépôt de Kolwezi ou livrable sous 48h..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 resize-none"
              />
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || eligibleProductions.length === 0 || !quantity || !unitPrice}
              className="px-5 py-2 text-xs font-bold text-white bg-earth-800 hover:bg-earth-900 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Transmettre ma proposition
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
