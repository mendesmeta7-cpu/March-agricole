"use client";

import React, { useState, useEffect } from "react";
import { CompanyProductItem } from "@/lib/queries/products";
import {
  updateCompanyProductAction,
  ActionResponse,
} from "@/lib/actions/products";
import { Drawer } from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import SubmitButton from "@/components/SubmitButton";
import {
  Edit3,
  Lock,
  Image as ImageIcon,
  Trash2,
  Power,
  PowerOff,
  Layers,
  Scale,
  Calendar,
  AlertCircle,
  Tag,
} from "lucide-react";

interface EditProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productItem: CompanyProductItem | null;
  onToggleStatus: (item: CompanyProductItem) => void;
  onDelete: (item: CompanyProductItem) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
  onSuccess?: () => void;
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

export default function EditProductDrawer({
  isOpen,
  onClose,
  productItem,
  onToggleStatus,
  onDelete,
  isToggling = false,
  isDeleting = false,
  onSuccess,
}: EditProductDrawerProps) {
  const { toast } = useToast();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeCustomImage, setRemoveCustomImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productItem) {
      setImagePreview(productItem.image_url || null);
      setRemoveCustomImage(false);
      setErrorMsg(null);
    }
  }, [productItem, isOpen]);

  if (!productItem) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La photo personnalisée ne doit pas dépasser 5 Mo.");
        return;
      }
      setRemoveCustomImage(false);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCustomImage = () => {
    setImagePreview(null);
    setRemoveCustomImage(true);
    toast.info("Le visuel sera réinitialisé à l'image officielle lors de l'enregistrement.");
  };

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg(null);
    formData.set("removeCustomImage", removeCustomImage.toString());

    try {
      const res = await updateCompanyProductAction(null, formData);
      if (res.success) {
        toast.success(res.message || "Fiche produit mise à jour avec succès.");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Erreur lors de la mise à jour.");
        toast.error(res.error || "Erreur de mise à jour.");
      }
    } catch (err: any) {
      const msg = err.message || "Une erreur inattendue est survenue.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const catalogFallbackImage = productItem.product.image_url;
  const productionsCount = productItem.productions_count ?? 0;
  const totalDeclaredVolume = productItem.total_declared_volume ?? 0;
  const currentUnit = productItem.unit || productItem.product.default_unit || "tonne";

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span>Modifier la configuration du produit</span>
        </div>
      }
      description={
        <span>
          Personnalisation d'exploitation pour{" "}
          <strong className="text-gray-900">{productItem.product.name}</strong>
        </span>
      }
      icon={<Edit3 className="w-5 h-5 text-forest-700" />}
    >
      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="companyProductId" value={productItem.id} />

        {errorMsg && (
          <Alert variant="error" title="Action impossible" onDismiss={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {/* Référence immuable du catalogue officiel */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/90 space-y-1.5">
          <div className="flex items-center justify-between text-gray-500 font-medium text-xs">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Référence officielle administrée</span>
            </span>
            <Badge variant="neutral" size="sm">
              {productItem.product.category}
            </Badge>
          </div>
          <div className="text-sm font-bold text-gray-900 flex items-center justify-between">
            <span>{productItem.product.name}</span>
            <span className="text-xs text-gray-500 font-normal">
              Unité catalogue : {productItem.product.default_unit}
            </span>
          </div>
        </div>

        {/* Avertissement / rappel si productions historiques rattachées */}
        {productionsCount > 0 ? (
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
            <Layers className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-950">
                {productionsCount} cycle{productionsCount > 1 ? "s" : ""} cultural{productionsCount > 1 ? "aux" : ""} rattaché{productionsCount > 1 ? "s" : ""}
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Volume total déclaré cumulé : <strong>{totalDeclaredVolume.toLocaleString("fr-FR")} {currentUnit}</strong>.
                Pour préserver votre historique agronomique, ce produit ne peut pas être supprimé physiquement mais peut être archivé à tout moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>Aucune production rattachée pour l'instant. Vous pourrez déclarer des récoltes ultérieurement.</span>
          </div>
        )}

        {/* Dénomination spécifique à votre ferme */}
        <FormField
          label="Dénomination spécifique à votre exploitation"
          description="Nom commercial ou appellation locale propre à votre ferme (ex: Maïs de Matadi, Pastèque de la Vallée...)."
        >
          <Input
            name="customName"
            defaultValue={productItem.custom_name || ""}
            placeholder={`Ex: ${productItem.product.name} de la Vallée`}
          />
        </FormField>

        {/* Unité d'exploitation */}
        <FormField
          label="Unité de mesure principale de l'exploitation"
          required
          description="Unité de référence retenue pour vos déclarations de récoltes et offres de vente."
        >
          <Select
            name="unit"
            defaultValue={productItem.unit || productItem.product.default_unit || "tonne"}
            options={UNITS}
          />
        </FormField>

        {/* Description spécifique */}
        <FormField
          label="Description propre à votre production"
          description="Précisions sur vos critères de tri, qualités organoleptiques, calibre ou terroir."
        >
          <Textarea
            name="description"
            rows={2}
            defaultValue={productItem.description || ""}
            placeholder="Précisions sur vos critères de tri, calibre, goût..."
          />
        </FormField>

        {/* Notes internes d'exploitation */}
        <FormField
          label="Notes d'exploitation (internes, confidentielles)"
          description="Notes d'exploitation réservées à votre entreprise (parcelles dédiées, matériel, entreposage)."
        >
          <Textarea
            name="notes"
            rows={2}
            defaultValue={productItem.notes || ""}
            placeholder="Notes d'exploitation, consignes d'entreposage..."
          />
        </FormField>

        {/* Photo personnalisée */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Photo personnalisée de votre exploitation
          </label>
          <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative">
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
                    ? "Photo propre à votre exploitation"
                    : catalogFallbackImage
                    ? "Photo officielle du catalogue utilisée par défaut"
                    : "Aucune photo configurée"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  {imagePreview
                    ? "Ce visuel apparaît sur vos récoltes sans modifier l'image officielle du catalogue commun."
                    : "L'image du catalogue commun s'applique tant qu'aucune photo propre n'est téléversée."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 gap-2">
              <input
                type="file"
                name="customImage"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-forest-700 file:text-white hover:file:bg-forest-800 cursor-pointer"
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveCustomImage}
                  className="text-xs text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Rétablir visuel catalogue</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pied d'actions avec Enregistrer, Archiver, Supprimer */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={productItem.is_active ? "outline" : "secondary"}
              size="sm"
              onClick={() => onToggleStatus(productItem)}
              disabled={isToggling || isSubmitting}
              className={productItem.is_active ? "text-amber-800 border-amber-200 hover:bg-amber-50" : "text-emerald-800 border-emerald-200 hover:bg-emerald-50"}
            >
              {productItem.is_active ? (
                <>
                  <PowerOff className="w-3.5 h-3.5 text-amber-600 mr-1" />
                  <span>Archiver</span>
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  <span>Réactiver</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(productItem)}
              disabled={isDeleting || isSubmitting}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Supprimer</span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <SubmitButton
              className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold shadow-xs"
              loadingText="Enregistrement..."
            >
              Enregistrer
            </SubmitButton>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
