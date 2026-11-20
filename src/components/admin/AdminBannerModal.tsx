"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FeedBannerItem } from "@/lib/queries/feedBanners";
import {
  createAdminFeedBannerAction,
  updateAdminFeedBannerAction,
  ActionResponse,
} from "@/lib/actions/admin/feedBanners";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import Button from "@/components/ui/Button";
import { usePhotoForUpload } from "@/components/ui/usePhotoForUpload";
import PhotoUploadFeedback from "@/components/ui/PhotoUploadFeedback";
import { BANNER_MAX_SOURCE_BYTES } from "@/lib/utils/compressImage";

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
  const photo = usePhotoForUpload({ maxSourceBytes: BANNER_MAX_SOURCE_BYTES });
  const clearPhoto = photo.clear;
  // La fenêtre reste montée entre deux ouvertures : une photo préparée ne doit pas survivre.
  useEffect(() => {
    if (!isOpen) clearPhoto();
  }, [isOpen, clearPhoto]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { file, error } = await photo.onInputChange(e);
    if (file) setPreviewUrl(URL.createObjectURL(file));
    else if (error) setPreviewUrl(banner?.image_url || null);
  };

  const handleSubmit = async (formData: FormData) => {
    setFormState(null);
    photo.applyTo(formData, "image");

    let res: ActionResponse;
    try {
      if (isEditing) {
        formData.set("id", banner.id);
        res = await updateAdminFeedBannerAction(null, formData);
      } else {
        res = await createAdminFeedBannerAction(null, formData);
      }
    } catch (err) {
      // Une action rejetée ne doit jamais laisser la fenêtre bloquée.
      console.error("Erreur enregistrement bannière :", err);
      res = {
        error: "L'enregistrement de la bannière a échoué. Vérifiez votre connexion puis réessayez.",
      };
    }

    setFormState(res);
    setIsSubmitting(false);
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  // Lot UX/UI 5B : surface partagée Drawer (focus, Échap, verrouillage compté du défilement).
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isDismissable={!isSubmitting}
      showCloseButton={!isSubmitting}
      title={isEditing ? `Modifier la bannière` : `Ajouter une bannière`}
      description={"Gérez les affiches et bannières du carrousel d'accueil du tableau de bord revendeur"}
    >
        {/* Formulaire */}
        <form action={handleSubmit} onSubmit={() => setIsSubmitting(true)} className="space-y-4">
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
            <label htmlFor="admin-banner-title" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Titre de la bannière *
            </label>
            <input
              id="admin-banner-title"
              type="text"
              name="title"
              required
              defaultValue={banner?.title || ""}
              placeholder="ex. Récoltes de Maïs au Kasaï"
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
            />
          </div>

          {/* Sous-titre */}
          <div>
            <label htmlFor="admin-banner-subtitle" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Sous-titre / Message descriptif
            </label>
            <textarea
              id="admin-banner-subtitle"
              name="subtitle"
              rows={2}
              defaultValue={banner?.subtitle || ""}
              placeholder="Commandez directement auprès des sociétés avec réservation immédiate."
              className="w-full px-4 py-2 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
            />
          </div>

          {/* Bouton d'action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admin-banner-buttonLabel" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Texte du bouton CTA
              </label>
              <input
                id="admin-banner-buttonLabel"
                type="text"
                name="buttonLabel"
                defaultValue={banner?.button_label || "Voir les campagnes"}
                placeholder="ex. Découvrir, Voir les campagnes..."
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="admin-banner-buttonUrl" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Lien de redirection (URL)
              </label>
              <input
                id="admin-banner-buttonUrl"
                type="text"
                name="buttonUrl"
                defaultValue={banner?.button_url || "/dashboard/reseller/campaigns"}
                placeholder="/dashboard/reseller/campaigns"
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Image Cloudinary */}
          <div>
            <label htmlFor="admin-banner-sortOrder" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Image d&apos;arrière-plan (Cloudinary) {!isEditing && "*"}
            </label>

            <div className="space-y-3">
              {previewUrl && (
                <div className="w-full aspect-[21/9] rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden relative">
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  ref={photo.inputRef}
                  type="file"
                  name="image"
                  required={!isEditing}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="banner-image-upload"
                  aria-invalid={photo.error ? true : undefined}
                  aria-describedby={photo.error || photo.isPreparing ? photo.feedbackId : undefined}
                />
                {/* Sous-lot P : vrai bouton (focalisable, Entrée et Espace) qui ouvre le champ masqué */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 shrink-0 font-semibold"
                  leftIcon={<Upload className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />}
                  onClick={() => photo.inputRef.current?.click()}
                  aria-describedby={photo.error || photo.isPreparing ? photo.feedbackId : undefined}
                >
                  {previewUrl ? "Remplacer l'image" : "Sélectionner une photo"}
                </Button>
                <span className="text-xs text-gray-500">
                  Format recommandé : 1400×600 (JPG, PNG, WebP). Max 8 Mo.
                </span>
              </div>
              <PhotoUploadFeedback photo={photo} />
            </div>
          </div>

          {/* Ordre et Statut */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ordre d&apos;affichage
              </label>
              <input
                id="admin-banner-sortOrder"
                type="number"
                name="sortOrder"
                defaultValue={banner?.sort_order ?? 0}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
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
              disabled={photo.isPreparing}
            >
              {isEditing ? "Enregistrer les modifications" : "Publier la bannière"}
            </SubmitButton>
          </div>
        </form>
    </Drawer>
  );
}
