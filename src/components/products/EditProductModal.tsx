"use client";

import { useState } from "react";
import { CompanyProductItem } from "@/lib/queries/products";
import { updateCompanyProductAction, ActionResponse } from "@/lib/actions/products";
import SubmitButton from "@/components/SubmitButton";
import Badge from "@/components/ui/Badge";
import { X, Edit3, AlertCircle, CheckCircle2, Lock } from "lucide-react";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productItem: CompanyProductItem | null;
}

export default function EditProductModal({
  isOpen,
  onClose,
  productItem,
}: EditProductModalProps) {
  const [state, setState] = useState<ActionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !productItem) return null;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setState(null);
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
                Modifier la fiche produit
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {productItem.product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px]"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form action={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
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
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-gray-500 font-medium">
              <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                <Lock className="w-3 h-3 text-gray-400" /> Référentiel national (Fixe)
              </span>
              <Badge variant="neutral" size="sm">{productItem.product.category}</Badge>
            </div>
            <div className="text-sm font-bold text-gray-900">
              {productItem.product.name}
            </div>
            <div className="text-gray-600 text-[11px]">
              Unité de référence : <span className="font-semibold">{productItem.product.default_unit}</span>
            </div>
          </div>

          <input
            type="hidden"
            name="companyProductId"
            value={productItem.id}
          />

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Dénomination spécifique à votre exploitation
            </label>
            <input
              type="text"
              name="customName"
              defaultValue={productItem.custom_name || ""}
              placeholder={`Ex. ${productItem.product.name} Sélection Spéciale`}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Appellation commerciale sous laquelle vous vendez ce produit.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Notes agronomiques ou d&apos;exploitation
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={productItem.description || ""}
              placeholder="Précisez les conditions de culture, variété, caractéristiques..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors text-center min-h-[44px]"
            >
              Annuler
            </button>
            <SubmitButton
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-forest-700 text-white text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-all shadow-xs min-h-[44px] flex items-center justify-center"
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
