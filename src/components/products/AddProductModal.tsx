"use client";

import { useState } from "react";
import { CatalogProduct } from "@/lib/queries/products";
import {
  associateCatalogProductAction,
  createAndAssociateProductAction,
  ActionResponse,
} from "@/lib/actions/products";
import SubmitButton from "@/components/SubmitButton";
import {
  X,
  Search,
  Check,
  Package,
  ArrowLeft,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
} from "lucide-react";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: CatalogProduct[];
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

const UNITS = [
  { value: "tonne", label: "Tonne (t)" },
  { value: "sac_100kg", label: "Sac de 100 kg" },
  { value: "sac_50kg", label: "Sac de 50 kg" },
  { value: "sac_25kg", label: "Sac de 25 kg" },
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "carton", label: "Carton" },
  { value: "panier", label: "Panier" },
];

export default function AddProductModal({
  isOpen,
  onClose,
  catalogProducts,
}: AddProductModalProps) {
  // Navigation du modal : "search" (Étape 1) | "configure" (Étape 2A) | "custom" (Étape 2B)
  const [step, setStep] = useState<"search" | "configure" | "custom">("search");
  const [searchCatalog, setSearchCatalog] = useState("");
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null);

  // État de prévisualisation d'image personnalisée
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);

  const [state, setState] = useState<ActionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filtrage du catalogue officiel
  const filteredCatalog = catalogProducts.filter((p) => {
    const q = searchCatalog.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const handleSelectProduct = (prod: CatalogProduct) => {
    setSelectedCatalogProduct(prod);
    setCustomImagePreview(null);
    setState(null);
    setStep("configure");
  };

  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomImagePreview(URL.createObjectURL(file));
    }
  };

  async function handleAssociate(formData: FormData) {
    setIsSubmitting(true);
    setState(null);
    try {
      const res = await associateCatalogProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          resetModal();
        }, 1200);
      }
    } catch (err: any) {
      setState({ error: err.message || "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateCustom(formData: FormData) {
    setIsSubmitting(true);
    setState(null);
    try {
      const res = await createAndAssociateProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          resetModal();
        }, 1200);
      }
    } catch (err: any) {
      setState({ error: err.message || "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const resetModal = () => {
    setStep("search");
    setSearchCatalog("");
    setSelectedCatalogProduct(null);
    setCustomImagePreview(null);
    setState(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* En-tête */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-forest-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== "search" && (
              <button
                type="button"
                onClick={() => {
                  setStep("search");
                  setState(null);
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition-colors"
                title="Retour à la recherche"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-950">
                {step === "search" && "Ajouter un produit à votre exploitation"}
                {step === "configure" && `Configurer : ${selectedCatalogProduct?.name}`}
                {step === "custom" && "Ajouter un produit personnalisé privé"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {step === "search" && "Étape 1 sur 2 : Rechercher et sélectionner dans le catalogue officiel"}
                {step === "configure" && "Étape 2 sur 2 : Personnaliser l'unité, la dénomination et votre photo"}
                {step === "custom" && "Ce produit sera strictement privé à votre ferme"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              resetModal();
            }}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message de feedback */}
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

        {/* ======================================================== */}
        {/* ÉTAPE 1 : RECHERCHE DANS LE CATALOGUE GLOBAL */}
        {/* ======================================================== */}
        {step === "search" && (
          <div className="p-6 flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Barre de recherche */}
            <div className="relative flex-shrink-0">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                placeholder="Rechercher un produit (ex: Tomate, Maïs, Manioc, Haricot...)"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all shadow-2xs"
              />
            </div>

            {/* Liste des résultats */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px] max-h-[380px]">
              {filteredCatalog.length > 0 ? (
                filteredCatalog.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl border border-gray-200/90 hover:border-forest-400 bg-white hover:bg-forest-50/40 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-950 truncate">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 flex-shrink-0">
                            {prod.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Unité standard : {prod.default_unit}
                          {prod.description && ` — ${prod.description}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectProduct(prod)}
                      className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold shadow-2xs transition-all flex-shrink-0"
                    >
                      Sélectionner
                    </button>
                  </div>
                ))
              ) : (
                /* PARTIE 6 : Aucun produit correspondant trouvé */
                <div className="py-12 px-4 text-center space-y-3 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Aucun produit correspondant n&apos;a été trouvé dans le catalogue.
                    </p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      Le produit que vous cultivez ne figure pas encore dans le référentiel officiel centralisé.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("custom");
                        setState(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold shadow-xs transition-all inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Ajouter un produit personnalisé</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Note informative en pied */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>{catalogProducts.length} références disponibles dans le catalogue officiel.</span>
              <button
                type="button"
                onClick={() => {
                  setStep("custom");
                  setState(null);
                }}
                className="text-forest-700 hover:underline font-medium"
              >
                Créer un produit personnalisé &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 2A : CONFIGURATION D'UN PRODUIT DU CATALOGUE */}
        {/* ======================================================== */}
        {step === "configure" && selectedCatalogProduct && (
          <form action={handleAssociate} className="p-6 overflow-y-auto space-y-4 flex-1">
            <input type="hidden" name="productId" value={selectedCatalogProduct.id} />

            {/* Fiche récapitulative du produit catalogue */}
            <div className="p-3.5 rounded-2xl bg-forest-50/70 border border-forest-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-forest-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {selectedCatalogProduct.image_url ? (
                    <img
                      src={selectedCatalogProduct.image_url}
                      alt={selectedCatalogProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-forest-700" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-forest-950">
                      {selectedCatalogProduct.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-forest-800 border border-forest-200">
                      {selectedCatalogProduct.category}
                    </span>
                  </div>
                  <p className="text-xs text-forest-800/80 mt-0.5">
                    Référence officielle du catalogue commun
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("search")}
                className="text-xs font-semibold text-forest-800 hover:underline"
              >
                Changer
              </button>
            </div>

            {/* Dénomination spécifique à la ferme */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Dénomination spécifique à votre ferme (optionnelle)
              </label>
              <input
                type="text"
                name="customName"
                placeholder={`Ex: ${selectedCatalogProduct.name} de la Vallée, Variété F1...`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Nom commercial propre à votre exploitation (distinguera vos récoltes).
              </p>
            </div>

            {/* Unité de mesure */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unité de mesure principale de l&apos;exploitation *
              </label>
              <select
                name="unit"
                defaultValue={selectedCatalogProduct.default_unit || "tonne"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none bg-white transition-all"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description générale de votre produit */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description de votre produit (optionnelle)
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Précisez les qualités gustatives, le calibre, le type de sol..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            {/* Notes d'exploitation privées */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes d&apos;exploitation (internes, optionnelles)
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Notes techniques, parcelles dédiées, consignes de stockage..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            {/* PARTIES 4 & 5 : Photo personnalisée de la société */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Photo personnalisée de votre produit (optionnelle)
              </label>
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {customImagePreview ? (
                      <img
                        src={customImagePreview}
                        alt="Photo personnalisée"
                        className="w-full h-full object-cover"
                      />
                    ) : selectedCatalogProduct.image_url ? (
                      <img
                        src={selectedCatalogProduct.image_url}
                        alt="Photo par défaut du catalogue"
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900">
                      {customImagePreview
                        ? "Nouvelle photo personnalisée prête à être enregistrée"
                        : selectedCatalogProduct.image_url
                        ? "Photo officielle du catalogue utilisée par défaut"
                        : "Aucune photo par défaut"}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customImagePreview
                        ? "Cette photo sera propre à votre exploitation et apparaîtra sur vos récoltes."
                        : "Vous pouvez conserver ce visuel ou importer une photo de votre propre production."}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between">
                  <input
                    type="file"
                    name="customImage"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCustomImageChange}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-forest-700 file:text-white hover:file:bg-forest-800 cursor-pointer"
                  />
                  {customImagePreview && (
                    <button
                      type="button"
                      onClick={() => setCustomImagePreview(null)}
                      className="text-xs text-red-600 hover:underline flex-shrink-0 ml-2"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep("search")}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
              <SubmitButton
                className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold shadow-xs"
                loadingText="Enregistrement..."
              >
                Enregistrer dans mon exploitation
              </SubmitButton>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 2B : PRODUIT PERSONNALISÉ PRIVÉ (INEXISTANT DU CATALOGUE) */}
        {/* ======================================================== */}
        {step === "custom" && (
          <form action={handleCreateCustom} className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Produit personnalisé privé :</strong> Ce produit sera utilisable exclusivement par votre exploitation pour déclarer vos productions et récoltes. Il ne sera ni partagé ni proposé aux autres sociétés.
              </div>
            </div>

            {/* Nom du produit */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nom du produit personnalisé *
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={searchCatalog}
                placeholder="Ex: Arachide rouge de Bandundu, Soja local..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Catégorie et Unité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catégorie agronomique *
                </label>
                <select
                  name="category"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none bg-white transition-all"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Unité de mesure par défaut *
                </label>
                <select
                  name="defaultUnit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none bg-white transition-all"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dénomination spécifique ferme */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Dénomination spécifique ferme (optionnelle)
              </label>
              <input
                type="text"
                name="customName"
                placeholder="Dénomination interne ou commerciale..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description générale (optionnelle)
              </label>
              <textarea
                name="productDescription"
                rows={2}
                placeholder="Description du produit et de ses caractéristiques..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            {/* Photo propre */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Photo personnalisée de votre produit (optionnelle)
              </label>
              <div className="flex items-center gap-4 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50">
                <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {customImagePreview ? (
                    <img
                      src={customImagePreview}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCustomImageChange}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-forest-700 file:text-white hover:file:bg-forest-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Pied du formulaire */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep("search")}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Retour à la recherche
              </button>
              <SubmitButton
                className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold shadow-xs"
                loadingText="Création..."
              >
                Créer et ajouter à mon exploitation
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
