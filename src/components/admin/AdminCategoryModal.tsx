"use client";

import { useState, useRef } from "react";
import { FeedCategoryItem } from "@/lib/queries/feedCategories";
import {
  createAdminFeedCategoryAction,
  updateAdminFeedCategoryAction,
  ActionResponse,
} from "@/lib/actions/admin/feedCategories";
import { X, Upload, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

interface AdminCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: FeedCategoryItem | null;
}

export default function AdminCategoryModal({
  isOpen,
  onClose,
  category,
}: AdminCategoryModalProps) {
  const isEditing = !!category;
  const [formState, setFormState] = useState<ActionResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(category?.image_url || null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setFormState(null);
    if (removeImage) {
      formData.set("removeImage", "true");
    }

    let res: ActionResponse;
    if (isEditing) {
      formData.set("id", category.id);
      res = await updateAdminFeedCategoryAction(null, formData);
    } else {
      res = await createAdminFeedCategoryAction(null, formData);
    }

    setFormState(res);
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? `Modifier la catégorie` : `Ajouter une catégorie`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Administrez les catégories visuelles affichées dans le Flux revendeur
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form action={handleSubmit} className="p-6 space-y-5">
          {formState?.error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formState.error}</span>
            </div>
          )}

          {formState?.success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formState.message}</span>
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nom de la catégorie *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={category?.name || ""}
              placeholder="ex. Céréales, Tubercules, Fruits..."
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
            />
          </div>

          {/* Image Cloudinary */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Image de la catégorie (Cloudinary)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0 relative group">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      title="Supprimer l'image"
                    >
                      <Trash2 className="w-5 h-5 text-red-300" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="category-image-upload"
                />
                <label
                  htmlFor="category-image-upload"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  <span>{previewUrl ? "Changer l'image" : "Choisir une image"}</span>
                </label>
                <p className="text-[11px] text-gray-500">
                  Format JPG, PNG ou WebP. Max 5 Mo. Stockée sur Cloudinary.
                </p>
              </div>
            </div>
          </div>

          {/* Ordre et Statut */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ordre d&apos;affichage
              </label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={category?.sort_order ?? 0}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={category?.is_active ?? true}
                  className="w-4 h-4 text-forest-700 rounded border-gray-300 focus:ring-forest-600"
                />
                <span className="text-xs font-semibold text-gray-800">
                  Catégorie active
                </span>
              </label>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <SubmitButton
              className="px-5 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-xs"
              loadingText="Téléversement en cours..."
            >
              {isEditing ? "Enregistrer les modifications" : "Créer la catégorie"}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
