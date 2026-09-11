"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { DemandItem } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province, Country } from "@/lib/queries/geography";
import { createDemandAction, updateDemandAction } from "@/lib/actions/demands";
import {
  X,
  TrendingUp,
  AlertCircle,
  Calendar,
  MapPin,
  Scale,
  Building2,
  Info,
  FileText,
} from "lucide-react";

interface DemandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: CatalogProduct[];
  provinces: Province[];
  countries: Country[];
  companies?: { id: string; name: string }[];
  editingDemand?: DemandItem | null;
  defaultProvinceId?: string;
  defaultCountryId?: string;
  onSuccess?: (message: string) => void;
}

export default function DemandFormModal({
  isOpen,
  onClose,
  catalogProducts,
  provinces,
  countries,
  companies = [],
  editingDemand,
  defaultProvinceId,
  defaultCountryId,
  onSuccess,
}: DemandFormModalProps) {
  const isEditing = Boolean(editingDemand);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("tonne");
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [city, setCity] = useState("");
  const [targetPeriodStart, setTargetPeriodStart] = useState("");
  const [targetPeriodEnd, setTargetPeriodEnd] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (editingDemand) {
      setProductId(editingDemand.product_id);
      setQuantity(String(editingDemand.quantity));
      setUnit(editingDemand.unit);
      setCountryId(editingDemand.country_id);
      setProvinceId(editingDemand.province_id);
      setCity(editingDemand.city || "");
      setTargetPeriodStart(editingDemand.target_period_start || "");
      setTargetPeriodEnd(editingDemand.target_period_end || "");
      setTargetCompanyId(editingDemand.target_company_id || "");
      setNotes(editingDemand.notes || "");
    } else {
      const defaultProd = catalogProducts[0];
      setProductId(defaultProd?.id || "");
      setQuantity("");
      setUnit(defaultProd?.default_unit || "tonne");
      
      const codCountry = countries.find((c) => c.code === "COD") || countries[0];
      setCountryId(defaultCountryId || codCountry?.id || "");
      setProvinceId(defaultProvinceId || provinces[0]?.id || "");
      setCity("");
      setTargetPeriodStart("");
      setTargetPeriodEnd("");
      setTargetCompanyId("");
      setNotes("");
    }
  }, [isOpen, editingDemand, catalogProducts, countries, provinces, defaultProvinceId, defaultCountryId]);

  const handleProductChange = (newProductId: string) => {
    setProductId(newProductId);
    const prod = catalogProducts.find((p) => p.id === newProductId);
    if (prod && (!isEditing || !unit)) {
      setUnit(prod.default_unit || "tonne");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(formRef.current || undefined);

    startTransition(async () => {
      let res;
      if (isEditing && editingDemand) {
        formData.set("demandId", editingDemand.id);
        res = await updateDemandAction(null, formData);
      } else {
        res = await createDemandAction(null, formData);
      }

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        onSuccess?.(res.message || "Demande enregistrée avec succès !");
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 mt-auto sm:mt-0"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-earth-900/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-earth-700 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                {isEditing ? "Modifier mon expression de besoin" : "Exprimer un besoin d'approvisionnement"}
              </h2>
              <p className="text-xs text-gray-500">
                Informez les producteurs agricoles des volumes recherchés dans votre province.
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

        {/* Form Body */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Rappel Règle Métier */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Principe fondamental V1 :</strong> Une demande est une expression
              de besoin territorial. Elle n&apos;engage aucun paiement, ne réserve aucun stock et ne constitue pas
              une commande ferme.
            </div>
          </div>

          {/* Sélection du produit */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Denrée / Produit recherché <span className="text-rose-500">*</span>
            </label>
            {catalogProducts.length === 0 ? (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs">
                Aucun produit disponible dans le catalogue national.
              </div>
            ) : (
              <select
                name="productId"
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={isEditing}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 bg-white transition-all disabled:bg-gray-100 disabled:text-gray-500"
              >
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — [Catégorie : {p.category}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantité & Unité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Quantité estimée <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  name="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex. 100"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Unité de mesure <span className="text-rose-500">*</span>
              </label>
              <select
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 focus:border-earth-600 bg-white transition-all"
              >
                <option value="tonne">Tonne(s)</option>
                <option value="sac 50kg">Sac(s) de 50 kg</option>
                <option value="sac 100kg">Sac(s) de 100 kg</option>
                <option value="kg">Kilogramme(s)</option>
                <option value="cageot">Cageot(s)</option>
                <option value="carton">Carton(s)</option>
              </select>
            </div>
          </div>

          {/* Territoire de livraison / approvisionnement */}
          <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-earth-700" />
              Territoire de livraison souhaité
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">
                  Pays <span className="text-rose-500">*</span>
                </label>
                <select
                  name="countryId"
                  value={countryId}
                  onChange={(e) => setCountryId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 bg-white"
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">
                  Province / Région <span className="text-rose-500">*</span>
                </label>
                <select
                  name="provinceId"
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 bg-white"
                >
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">
                  Ville / Territoire
                </label>
                <input
                  type="text"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex. Lubumbashi"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Période souhaitée */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Période souhaitée à partir du
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="date"
                  name="targetPeriodStart"
                  value={targetPeriodStart}
                  onChange={(e) => setTargetPeriodStart(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Date limite souhaitée
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="date"
                  name="targetPeriodEnd"
                  value={targetPeriodEnd}
                  min={targetPeriodStart || undefined}
                  onChange={(e) => setTargetPeriodEnd(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Entreprise cible (Optionnel) */}
          {companies.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Producteur spécifique ciblé (optionnel)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <select
                  name="targetCompanyId"
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 bg-white transition-all"
                >
                  <option value="">Tous les producteurs (Ouvert au marché)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-gray-500">
                Laissez &quot;Tous les producteurs&quot; pour que votre besoin soit visible par l&apos;ensemble des entreprises agricoles de la région.
              </p>
            </div>
          )}

          {/* Notes et exigences qualitatives */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Spécifications techniques & Tolérances (optionnel)
            </label>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Précisez la variété souhaitée, le conditionnement attendu, le taux d'humidité toléré..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || catalogProducts.length === 0}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-earth-700 hover:bg-earth-800 rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : isEditing ? (
                "Enregistrer les modifications"
              ) : (
                "Publier mon expression de besoin"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
