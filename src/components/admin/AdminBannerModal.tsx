"use client";

import { useState, useRef } from "react";
import { FeedBannerItem } from "@/lib/queries/feedBanners";
import {
  createAdminFeedBannerAction,
  updateAdminFeedBannerAction,
  ActionResponse,
} from "@/lib/actions/admin/feedBanners";
import { X, Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

interface AdminBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner?: FeedBannerItem | null;
}

export default function AdminBannerModal({
  isOpen,
  onClose,
  banner,
}: AdminBannerModalProps) {
  const isEditing = !!banner;
  const [formState, setFormState] = useState<ActionResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(banner?.image_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setFormState(null);

    let res: ActionResponse;
    if (isEditing) {
      formData.set("id", banner.id);
      res = await updateAdminFeedBannerAction(null, formData);
    } else {
      res = await createAdminFeedBannerAction(null, formData);
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
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? `Modifier la bannière` : `Ajouter une bannière`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Gérez les affiches et bannières du carrousel d&apos;accueil du Flux revendeur
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
        <form action={handleSubmit} className="p-6 space-y-4">
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

          {/* Titre */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Titre de la bannière *
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={banner?.title || ""}
              placeholder="ex. Récoltes de Maïs au Kasaï"
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
            />
          </div>

          {/* Sous-titre */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Sous-titre / Message descriptif
            </label>
            <textarea
              name="subtitle"
              rows={2}
              defaultValue={banner?.subtitle || ""}
              placeholder="Commandez directement auprès des producteurs avec réservation immédiate."
              className="w-full px-4 py-2 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
            />
          </div>

          {/* Bouton d'action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Texte du bouton CTA
              </label>
              <input
                type="text"
                name="buttonLabel"
                defaultValue={banner?.button_label || "Voir les offres"}
                placeholder="ex. Découvrir, Voir les offres..."
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Lien de redirection (URL)
              </label>
              <input
                type="text"
                name="buttonUrl"
                defaultValue={banner?.button_url || "/dashboard/reseller/campaigns"}
                placeholder="/dashboard/reseller/campaigns"
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Image Cloudinary */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Image d&apos;arrière-plan (Cloudinary) {!isEditing && "*"}
            </label>

            <div className="space-y-3">
              {previewUrl && (
                <div className="w-full aspect-21/9 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden relative">
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  required={!isEditing}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="banner-image-upload"
                />
                <label
                  htmlFor="banner-image-upload"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  <span>{previewUrl ? "Remplacer l'image" : "Sélectionner une photo"}</span>
                </label>
                <span className="text-[11px] text-gray-500">
                  Format recommandé : 1400×600 (JPG, PNG, WebP). Max 8 Mo.
                </span>
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
                defaultValue={banner?.sort_order ?? 0}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-hidden transition-all"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={banner?.is_active ?? true}
                  className="w-4 h-4 text-forest-700 rounded border-gray-300 focus:ring-forest-600"
                />
                <span className="text-xs font-semibold text-gray-800">
                  Bannière active
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
              {isEditing ? "Enregistrer les modifications" : "Publier la bannière"}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
