"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import { createProductionAction, updateProductionAction } from "@/lib/actions/productions";
import {
  X,
  Upload,
  Tractor,
  AlertCircle,
  Calendar,
  MapPin,
  Scale,
  Eye,
  Info,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";

interface ProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProducts: CompanyProductItem[];
  editingProduction?: ProductionItem | null;
  onSuccess?: (message: string) => void;
}

export default function ProductionFormModal({
  isOpen,
  onClose,
  companyProducts,
  editingProduction,
  onSuccess,
}: ProductionFormModalProps) {
  const isEditing = Boolean(editingProduction);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // États du formulaire
  const [selectedCompanyProductId, setSelectedCompanyProductId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState<string>("");
  const [unit, setUnit] = useState("tonne");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [locationName, setLocationName] = useState("");
  const [status, setStatus] = useState<ProductionStatus>("planned");
  const [isPublic, setIsPublic] = useState(true);

  // Gestion de la photo
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronisation lors de l'ouverture ou du changement d'édition
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (editingProduction) {
      setSelectedCompanyProductId(editingProduction.company_product_id || "");
      setTitle(editingProduction.title);
      setDescription(editingProduction.description || "");
      setExpectedQuantity(String(editingProduction.expected_quantity));
      setUnit(editingProduction.unit);
      setPeriodStart(editingProduction.period_start);
      setPeriodEnd(editingProduction.period_end || "");
      setLocationName(editingProduction.location_name);
      setStatus(editingProduction.status);
      setIsPublic(editingProduction.is_public);
      setImagePreview(editingProduction.main_image_url || null);
    } else {
      // Nouvelle production
      const activeProducts = companyProducts.filter((p) => p.is_active);
      const defaultProd = activeProducts[0];
      setSelectedCompanyProductId(defaultProd?.id || "");
      setTitle(defaultProd ? `Production de ${defaultProd.custom_name || defaultProd.product.name}` : "");
      setDescription("");
      setExpectedQuantity("");
      setUnit(defaultProd?.product.default_unit || "tonne");
      // Date du jour par défaut
      const today = new Date().toISOString().split("T")[0];
      setPeriodStart(today);
      setPeriodEnd("");
      setLocationName("");
      setStatus("planned");
      setIsPublic(true);
      setImagePreview(defaultProd?.product.image_url || null);
    }
  }, [isOpen, editingProduction, companyProducts]);

  // Changement de produit sélectionné (mise à jour du titre suggéré et de l'unité)
  const handleProductChange = (newCompanyProductId: string) => {
    setSelectedCompanyProductId(newCompanyProductId);
    const prod = companyProducts.find((p) => p.id === newCompanyProductId);
    if (prod) {
      if (!isEditing || !title) {
        setTitle(`Production de ${prod.custom_name || prod.product.name}`);
      }
      setUnit(prod.product.default_unit || "tonne");
      if (!imagePreview || imagePreview === editingProduction?.product?.image_url) {
        setImagePreview(prod.product.image_url);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("La taille de l'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(formRef.current || undefined);

    startTransition(async () => {
      let res;
      if (isEditing && editingProduction) {
        formData.set("productionId", editingProduction.id);
        res = await updateProductionAction(null, formData);
      } else {
        res = await createProductionAction(null, formData);
      }

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        onSuccess?.(res.message || "Opération réussie !");
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  const activeCompanyProducts = companyProducts.filter((p) => p.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 mt-auto sm:mt-0"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-forest-900/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-700 text-white flex items-center justify-center shadow-xs">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                {isEditing ? "Modifier le cycle de production" : "Déclarer une nouvelle production"}
              </h2>
              <p className="text-xs text-gray-500">
                Enregistrez vos prévisions culturales réelles sans impact sur les stocks.
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
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Principe de planification V1 :</strong> La quantité
              renseignée ici est prévisionnelle. Elle n&apos;augmente aucun stock physique et ne
              déclenche aucune mise en vente immédiate.
            </div>
          </div>

          {/* Sélection du produit (Obligatoire, issu de company_products) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Produit cultivé par votre exploitation <span className="text-rose-500">*</span>
            </label>
            {activeCompanyProducts.length === 0 ? (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs">
                Vous n&apos;avez encore aucun produit actif dans votre exploitation. Veuillez d&apos;abord
                ajouter un produit à votre catalogue depuis l&apos;onglet Produits.
              </div>
            ) : (
              <select
                name="companyProductId"
                value={selectedCompanyProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={isEditing}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 bg-white transition-all disabled:bg-gray-100 disabled:text-gray-500"
              >
                {activeCompanyProducts.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.custom_name ? `${cp.custom_name} (${cp.product.name})` : cp.product.name} — [Catégorie : {cp.product.category}]
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-gray-500">
              Seuls les produits déjà configurés dans votre exploitation peuvent faire l&apos;objet d&apos;un cycle de culture.
            </p>
          </div>

          {/* Titre & Localisation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Titre de la production <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Récolte Maïs Blanc - Saison A"
                required
                minLength={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Localisation / Site de production <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="locationName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex. Site de Maluku, Kinshasa"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Quantité prévisionnelle & Unité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Quantité planifiée <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  name="expectedQuantity"
                  value={expectedQuantity}
                  onChange={(e) => setExpectedQuantity(e.target.value)}
                  placeholder="Ex. 500"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 transition-all"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 bg-white transition-all"
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

          {/* Dates du cycle culturel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Début de cycle / Semis <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="date"
                  name="periodStart"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Date prévue de récolte (estimée)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="date"
                  name="periodEnd"
                  value={periodEnd}
                  min={periodStart || undefined}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Statut & Visibilité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Statut du cycle <span className="text-rose-500">*</span>
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductionStatus)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 bg-white transition-all"
              >
                <option value="draft">Brouillon (interne uniquement)</option>
                <option value="planned">Planifiée (programme de saison)</option>
                <option value="growing">En culture (en champ)</option>
                <option value="harvested">Récoltée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 mt-auto">
              <div>
                <span className="text-xs font-semibold text-gray-800 block">
                  Visibilité publique
                </span>
                <span className="text-[11px] text-gray-500 block">
                  Visible aux revendeurs (si statut actif)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-600"></div>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Conditions culturales & Description (optionnel)
            </label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Précisez la variété, le mode de culture (conventionnel, raisonné, bio), l'état sanitaire du champ..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-forest-600 focus:border-forest-600 transition-all resize-none"
            />
          </div>

          {/* Photo de production */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-800">
              Photographie du champ / de la culture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Aperçu production"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="production-photo-input"
                />
                <label
                  htmlFor="production-photo-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {imagePreview ? "Changer la photographie" : "Sélectionner une photo"}
                </label>
                <p className="text-[11px] text-gray-500">
                  JPG, PNG ou WebP. Max 5 Mo. Stockée sur Supabase Storage.
                </p>
              </div>
            </div>
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
              disabled={isPending || activeCompanyProducts.length === 0}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement en cours...
                </>
              ) : isEditing ? (
                "Enregistrer les modifications"
              ) : (
                "Créer la production"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
