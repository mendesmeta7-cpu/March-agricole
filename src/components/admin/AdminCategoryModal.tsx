"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FeedCategoryItem } from "@/lib/queries/feedCategories";
import {
  createAdminFeedCategoryAction,
  updateAdminFeedCategoryAction,
  ActionResponse,
} from "@/lib/actions/admin/feedCategories";
import { Upload, Trash2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import Button from "@/components/ui/Button";
import { usePhotoForUpload } from "@/components/ui/usePhotoForUpload";
import PhotoUploadFeedback from "@/components/ui/PhotoUploadFeedback";

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
  const photo = usePhotoForUpload({ keepTransparency: true });
  const clearPhoto = photo.clear;
  // La fenêtre reste montée entre deux ouvertures : une photo préparée ne doit pas survivre.
  useEffect(() => {
    if (!isOpen) clearPhoto();
  }, [isOpen, clearPhoto]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { file, error } = await photo.onInputChange(e);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setRemoveImage(false);
    } else if (error && !removeImage) {
      setPreviewUrl(category?.image_url || null);
    }
  };

  const handleRemoveImage = () => {
    photo.clear();
    setPreviewUrl(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (formData: FormData) => {
    setFormState(null);
    if (removeImage) {
      formData.set("removeImage", "true");
    }
    photo.applyTo(formData, "image");

    let res: ActionResponse;
    try {
      if (isEditing) {
        formData.set("id", category.id);
        res = await updateAdminFeedCategoryAction(null, formData);
      } else {
        res = await createAdminFeedCategoryAction(null, formData);
      }
    } catch (err) {
      // Une action rejetée ne doit jamais laisser la fenêtre bloquée.
      console.error("Erreur enregistrement catégorie :", err);
      res = {
        error: "L'enregistrement de la catégorie a échoué. Vérifiez votre connexion puis réessayez.",
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

  // Lot UX/UI 5B : surface partagée Dialog (focus, Échap, verrouillage compté du défilement).
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isDismissable={!isSubmitting}
      showCloseButton={!isSubmitting}
      title={isEditing ? `Modifier la catégorie` : `Ajouter une catégorie`}
      description={"Administrez les catégories visuelles affichées dans le tableau de bord revendeur"}
    >
        {/* Formulaire */}
        <form action={handleSubmit} onSubmit={() => setIsSubmitting(true)} className="space-y-5">
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
            <label htmlFor="admin-category-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nom de la catégorie *
            </label>
            <input
              id="admin-category-name"
              type="text"
              name="name"
              required
              defaultValue={category?.name || ""}
              placeholder="ex. Céréales, Tubercules, Fruits..."
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
            />
          </div>

          {/* Image Cloudinary */}
          <div>
            <label htmlFor="admin-category-sortOrder" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
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
                      aria-label="Supprimer l'image"
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
                  ref={photo.inputRef}
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="category-image-upload"
                  aria-invalid={photo.error ? true : undefined}
                  aria-describedby={photo.error || photo.isPreparing ? photo.feedbackId : undefined}
                />
                {/* Sous-lot P : vrai bouton (focalisable, Entrée et Espace) qui ouvre le champ masqué */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 font-semibold"
                  leftIcon={<Upload className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />}
                  onClick={() => photo.inputRef.current?.click()}
                  aria-describedby={photo.error || photo.isPreparing ? photo.feedbackId : undefined}
                >
                  {previewUrl ? "Changer l'image" : "Choisir une image"}
                </Button>
                <p className="text-xs text-gray-500">
                  Format JPG, PNG ou WebP. Max 5 Mo. Stockée sur Cloudinary.
                </p>
                <PhotoUploadFeedback photo={photo} />
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
                id="admin-category-sortOrder"
                type="number"
                name="sortOrder"
                defaultValue={category?.sort_order ?? 0}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 text-sm outline-none transition-all"
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
              disabled={photo.isPreparing}
            >
              {isEditing ? "Enregistrer les modifications" : "Créer la catégorie"}
            </SubmitButton>
          </div>
        </form>
    </Dialog>
  );
}
