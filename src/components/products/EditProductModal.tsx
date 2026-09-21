"use client";

import { useState } from "react";
import { CompanyProductItem } from "@/lib/queries/products";
import { updateCompanyProductAction, ActionResponse } from "@/lib/actions/products";
import SubmitButton from "@/components/SubmitButton";
import Badge from "@/components/ui/Badge";
import {
  X,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Lock,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productItem: CompanyProductItem | null;
}

const UNITS = [
  { value: "tonne", label: "Tonne (t)" },
  { value: "sac_100kg", label: "Sac de 100 kg" },
  { value: "sac_50kg", label: "Sac de 50 kg" },
  { value: "sac_25kg", label: "Sac de 25 kg" },
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "carton", label: "Carton" },
  { value: "panier", label: "Panier" },
];

export default function EditProductModal({
  isOpen,
  onClose,
  productItem,
}: EditProductModalProps) {
  const [state, setState] = useState<ActionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    productItem?.image_url || null
  );
  const [removeCustomImage, setRemoveCustomImage] = useState(false);

  if (!isOpen || !productItem) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRemoveCustomImage(false);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCustomImage = () => {
    setImagePreview(null);
    setRemoveCustomImage(true);
  };

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setState(null);
    formData.set("removeCustomImage", removeCustomImage.toString());
    try {
      const res = await updateCompanyProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setState(null);
        }, 1000);
      }
    } catch (err: any) {
      setState({ error: err.message || "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Photo de référence du catalogue servant de fallback
  const catalogFallbackImage = productItem.product.image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center flex-shrink-0">
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                Modifier la fiche de votre produit
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {productItem.product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form action={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <input type="hidden" name="companyProductId" value={productItem.id} />

          {state?.error && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}
          {state?.success && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
          )}

          {/* Renseignements immuables du catalogue */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-gray-500 font-medium">
              <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                <Lock className="w-3 h-3 text-gray-400" /> Référence catalogue officielle
              </span>
              <Badge variant="neutral" size="sm">{productItem.product.category}</Badge>
            </div>
            <div className="text-sm font-bold text-gray-900">
              {productItem.product.name}
            </div>
          </div>

          {/* Dénomination spécifique */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Dénomination spécifique à votre exploitation
            </label>
            <input
              type="text"
              name="customName"
              defaultValue={productItem.custom_name || ""}
              placeholder={`Ex: ${productItem.product.name} de la Vallée`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Unité d'exploitation */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Unité de mesure principale *
            </label>
            <select
              name="unit"
              defaultValue={productItem.unit || productItem.product.default_unit || "tonne"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none bg-white transition-all"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description spécifique */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description propre à votre production (optionnelle)
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={productItem.description || ""}
              placeholder="Précisions sur vos critères de tri, calibre, goût..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Notes internes d'exploitation */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes d&apos;exploitation (internes, optionnelles)
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={productItem.notes || ""}
              placeholder="Notes techniques, consignes de stockage..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* PARTIES 4 & 5 : Photo personnalisée */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Photo personnalisée de votre exploitation
            </label>
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Photo personnalisée"
                      className="w-full h-full object-cover"
                    />
                  ) : catalogFallbackImage ? (
                    <img
                      src={catalogFallbackImage}
                      alt="Photo catalogue par défaut"
                      className="w-full h-full object-cover opacity-75"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-gray-900">
                    {imagePreview
                      ? "Photo personnalisée de votre exploitation"
                      : catalogFallbackImage
                      ? "Photo par défaut du catalogue"
                      : "Aucune photo configurée"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {imagePreview
                      ? "Ce visuel apparaît sur vos récoltes et productions."
                      : "La photo officielle du catalogue s'applique tant qu'aucune photo propre n'est importée."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <input
                  type="file"
                  name="customImage"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-forest-700 file:text-white hover:file:bg-forest-800 cursor-pointer"
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomImage}
                    className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 flex-shrink-0 ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Rétablir visuel catalogue</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pied */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <SubmitButton
              className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs sm:text-sm font-semibold shadow-xs"
              loadingText="Enregistrement..."
            >
              Enregistrer les modifications
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
