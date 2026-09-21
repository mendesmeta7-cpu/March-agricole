"use client";

import { useState } from "react";
import { CatalogProduct } from "@/lib/queries/products";
import {
  createAdminCatalogProductAction,
  updateAdminCatalogProductAction,
  ActionResponse,
} from "@/lib/actions/admin/products";
import SubmitButton from "@/components/SubmitButton";
import { X, Image as ImageIcon, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

interface AdminProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: CatalogProduct | null;
  categories: string[];
}

const DEFAULT_CATEGORIES = [
  "Céréales",
  "Légumineuses",
  "Tubercules et racines",
  "Légumes",
  "Légumes-feuilles / Produits locaux",
  "Fruits",
  "Oléagineux",
  "Épices et aromates",
  "Autres productions agricoles",
];

const DEFAULT_UNITS = [
  { value: "tonne", label: "Tonne (t)" },
  { value: "sac_100kg", label: "Sac de 100 kg" },
  { value: "sac_50kg", label: "Sac de 50 kg" },
  { value: "sac_25kg", label: "Sac de 25 kg" },
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "carton", label: "Carton" },
  { value: "panier", label: "Panier" },
];

export default function AdminProductModal({
  isOpen,
  onClose,
  productToEdit,
  categories,
}: AdminProductModalProps) {
  const isEditing = Boolean(productToEdit);
  const [selectedCategory, setSelectedCategory] = useState(
    productToEdit?.category || DEFAULT_CATEGORIES[0]
  );
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    productToEdit?.image_url || null
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [state, setState] = useState<ActionResponse | null>(null);

  if (!isOpen) return null;

  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories.filter(Boolean)])
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRemoveImage(false);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setRemoveImage(true);
  };

  async function handleSubmit(formData: FormData) {
    setState(null);
    if (isCustomCategory && customCategory.trim()) {
      formData.set("category", customCategory.trim());
    } else {
      formData.set("category", selectedCategory);
    }

    if (isEditing && productToEdit) {
      formData.set("productId", productToEdit.id);
      formData.set("keepExistingImage", (!removeImage && !formData.get("image")).toString());
      formData.set("removeImage", removeImage.toString());
      const res = await updateAdminCatalogProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setState(null);
        }, 1200);
      }
    } else {
      const res = await createAdminCatalogProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setState(null);
        }, 1200);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* En-tête */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-gray-950">
              {isEditing ? "Modifier une référence officielle" : "Ajouter un produit au catalogue"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Référentiel officiel commun administré par la plateforme
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {state?.error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state?.success && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {/* Formulaire */}
        <form action={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Nom du produit */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nom du produit (référence standard) *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={productToEdit?.name || ""}
              placeholder="Ex: Tomate, Maïs blanc, Manioc..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Catégorie *
              </label>
              <select
                value={isCustomCategory ? "custom" : selectedCategory}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setSelectedCategory(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white transition-all"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">+ Autre catégorie personnalisée</option>
              </select>
            </div>

            {/* Unité de mesure par défaut */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unité de mesure par défaut *
              </label>
              <select
                name="defaultUnit"
                defaultValue={productToEdit?.default_unit || "tonne"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white transition-all"
              >
                {DEFAULT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCustomCategory && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nouvelle catégorie *
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Ex: Produits maraîchers spéciaux"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description agronomique générale (optionnelle)
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={productToEdit?.description || ""}
              placeholder="Description générale de la variété, critères de qualité standard..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Photo officielle du catalogue */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Photo officielle de référence (catalogue)
            </label>
            <div className="flex items-center gap-4 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50">
              <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Aperçu officiel"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>JPG, PNG ou WebP. Max 5 Mo.</span>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Retirer la photo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Cette photo servira de visuel officiel de référence dans le catalogue commun.
            </p>
          </div>

          {/* Pied du formulaire */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <SubmitButton
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs"
              loadingText="Enregistrement..."
            >
              {isEditing ? "Mettre à jour" : "Ajouter la référence"}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
