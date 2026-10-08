"use client";

import React, { useState, useMemo } from "react";
import { CatalogProduct } from "@/lib/queries/products";
import {
  associateCatalogProductAction,
  createAndAssociateProductAction,
  ActionResponse,
} from "@/lib/actions/products";
import { Drawer } from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import SubmitButton from "@/components/SubmitButton";
import {
  Search,
  Package,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  Info,
  Layers,
  Scale,
  CheckCircle2,
  AlertCircle,
  Tag,
  X,
} from "lucide-react";

interface AddProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: CatalogProduct[];
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

export default function AddProductDrawer({
  isOpen,
  onClose,
  catalogProducts,
  onSuccess,
}: AddProductDrawerProps) {
  const { toast } = useToast();

  // Navigation interne : "search" (Étape 1) | "configure" (Étape 2A) | "custom" (Étape 2B)
  const [step, setStep] = useState<"search" | "configure" | "custom">("search");
  const [searchCatalog, setSearchCatalog] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null);

  // Aperçu de photo personnalisée
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Catégories agronomiques réelles dérivées du catalogue officiel
  const distinctCategories = useMemo(() => {
    const cats = Array.from(new Set(catalogProducts.map((p) => p.category))).filter(Boolean);
    return cats.sort();
  }, [catalogProducts]);

  // Filtrage du catalogue
  const filteredCatalog = useMemo(() => {
    const q = searchCatalog.trim().toLowerCase();
    return catalogProducts.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === "all" || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [catalogProducts, searchCatalog, selectedCategory]);

  const handleSelectProduct = (prod: CatalogProduct) => {
    setSelectedCatalogProduct(prod);
    setCustomImagePreview(null);
    setErrorMsg(null);
    setStep("configure");
  };

  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La photo personnalisée ne doit pas dépasser 5 Mo.");
        return;
      }
      setCustomImagePreview(URL.createObjectURL(file));
    }
  };

  const resetState = () => {
    setStep("search");
    setSearchCatalog("");
    setSelectedCategory("all");
    setSelectedCatalogProduct(null);
    setCustomImagePreview(null);
    setErrorMsg(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 200);
  };

  async function handleAssociate(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await associateCatalogProductAction(null, formData);
      if (res.success) {
        toast.success(res.message || "Produit associé à votre exploitation avec succès.");
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        setErrorMsg(res.error || "Une erreur est survenue lors de l'association.");
        toast.error(res.error || "Erreur lors de l'association du produit.");
      }
    } catch (err: any) {
      const msg = err.message || "Une erreur inattendue est survenue.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateCustom(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createAndAssociateProductAction(null, formData);
      if (res.success) {
        toast.success(res.message || "Produit personnalisé enregistré avec succès.");
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        setErrorMsg(res.error || "Une erreur est survenue lors de la création.");
        toast.error(res.error || "Erreur de création du produit.");
      }
    } catch (err: any) {
      const msg = err.message || "Une erreur inattendue est survenue.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          {step !== "search" && (
            <button
              type="button"
              onClick={() => {
                setStep("search");
                setErrorMsg(null);
              }}
              className="p-1 -ml-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mr-1"
              title="Retour à la sélection du catalogue"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span>
            {step === "search" && "Ajouter une denrée à votre exploitation"}
            {step === "configure" && `Configurer : ${selectedCatalogProduct?.name}`}
            {step === "custom" && "Créer un produit personnalisé privé"}
          </span>
        </div>
      }
      description={
        step === "search"
          ? "Étape 1 sur 2 : Recherchez et sélectionnez la culture dans le référentiel officiel."
          : step === "configure"
          ? "Étape 2 sur 2 : Personnalisez l'unité d'exploitation, votre dénomination et votre photo."
          : "Ce produit sera strictement privé et utilisable uniquement par votre exploitation."
      }
      icon={<Package className="w-5 h-5 text-forest-700" />}
    >
      <div className="space-y-4">
        {errorMsg && (
          <Alert variant="error" title="Action impossible" onDismiss={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 1 : SÉLECTION DANS LE CATALOGUE NATIONAL */}
        {/* ======================================================== */}
        {step === "search" && (
          <div className="space-y-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                placeholder="Rechercher par nom (ex: Maïs, Tomate, Manioc, Haricot...)"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 transition-all"
              />
              {searchCatalog && (
                <button
                  type="button"
                  onClick={() => setSearchCatalog("")}
                  className="p-1 text-gray-400 hover:text-gray-600 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtres par catégories réelles sous forme de pilules défilables */}
            {distinctCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                    selectedCategory === "all"
                      ? "bg-forest-800 text-white font-semibold shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  Toutes ({catalogProducts.length})
                </button>
                {distinctCategories.map((cat) => {
                  const count = catalogProducts.filter((p) => p.category === cat).length;
                  const isSel = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                        isSel
                          ? "bg-forest-800 text-white font-semibold shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Liste des références du catalogue */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredCatalog.length > 0 ? (
                filteredCatalog.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl border border-gray-200/90 hover:border-forest-400 bg-white hover:bg-forest-50/30 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-900 group-hover:text-forest-800 transition-colors">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            {prod.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Unité par défaut : <span className="font-medium text-gray-700">{prod.default_unit}</span>
                          {prod.description && ` — ${prod.description}`}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => handleSelectProduct(prod)}
                      className="shrink-0"
                    >
                      Sélectionner
                    </Button>
                  </div>
                ))
              ) : (
                /* État aucun résultat dans le catalogue */
                <div className="py-10 px-4 text-center space-y-3 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Aucune culture correspondante dans le catalogue officiel
                    </p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      La denrée que vous cultivez ne figure pas encore au référentiel centralisé ? Vous pouvez créer un produit personnalisé privé pour votre exploitation.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setStep("custom");
                        setErrorMsg(null);
                      }}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Créer un produit personnalisé privé</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Pied informatif de l'étape 1 */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>{catalogProducts.length} références administrées disponibles.</span>
              <button
                type="button"
                onClick={() => {
                  setStep("custom");
                  setErrorMsg(null);
                }}
                className="text-forest-700 hover:text-forest-900 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Produit personnalisé privé &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 2A : CONFIGURATION DU PRODUIT CATALOGUE CHOISI */}
        {/* ======================================================== */}
        {step === "configure" && selectedCatalogProduct && (
          <form action={handleAssociate} className="space-y-4">
            <input type="hidden" name="productId" value={selectedCatalogProduct.id} />

            {/* Cartouche récapitulatif du produit catalogue sélectionné */}
            <div className="p-3.5 rounded-2xl bg-forest-50/80 border border-forest-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white border border-forest-200 flex items-center justify-center shrink-0 overflow-hidden relative">
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
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-forest-950 truncate">
                      {selectedCatalogProduct.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-forest-800 border border-forest-200 shrink-0">
                      {selectedCatalogProduct.category}
                    </span>
                  </div>
                  <p className="text-xs text-forest-800/80 mt-0.5">
                    Référence officielle administrée du catalogue commun
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("search")}
                className="text-xs font-semibold text-forest-800 hover:text-forest-950 hover:underline shrink-0 px-2 py-1"
              >
                Changer
              </button>
            </div>

            {/* Dénomination spécifique à la ferme */}
            <FormField
              label="Dénomination spécifique à votre exploitation"
              description="Nom commercial ou appellation locale qui distinguera vos récoltes (ex: Maïs doux de Bandundu, Variété F1...)."
            >
              <Input
                name="customName"
                placeholder={`Ex: ${selectedCatalogProduct.name} de la Vallée`}
              />
            </FormField>

            {/* Unité de mesure */}
            <FormField
              label="Unité de mesure principale de l'exploitation"
              required
              description="Unité de base pour le suivi des stocks et la commercialisation de ce produit."
            >
              <Select
                name="unit"
                defaultValue={selectedCatalogProduct.default_unit || "tonne"}
                options={UNITS}
              />
            </FormField>

            {/* Description propre à l'exploitation */}
            <FormField
              label="Description propre à votre production"
              description="Précisez les qualités gustatives, le calibre, le terroir ou les spécifications de tri."
            >
              <Textarea
                name="description"
                rows={2}
                placeholder="Qualités agronomiques, calibre, sol de culture..."
              />
            </FormField>

            {/* Notes d'exploitation internes */}
            <FormField
              label="Notes d'exploitation (internes)"
              description="Notes d'exploitation privées pour votre équipe (parcelles, consignes d'entreposage)."
            >
              <Textarea
                name="notes"
                rows={2}
                placeholder="Notes d'exploitation, parcelles dédiées, consignes d'entreposage..."
              />
            </FormField>

            {/* Photo personnalisée d'exploitation */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Photo personnalisée de votre produit (optionnelle)
              </label>
              <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {customImagePreview ? (
                      <img
                        src={customImagePreview}
                        alt="Photo personnalisée"
                        className="w-full h-full object-cover"
                      />
                    ) : selectedCatalogProduct.image_url ? (
                      <img
                        src={selectedCatalogProduct.image_url}
                        alt="Photo du catalogue par défaut"
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-gray-900">
                      {customImagePreview
                        ? "Nouvelle photo personnalisée prête à être enregistrée"
                        : selectedCatalogProduct.image_url
                        ? "Photo officielle du catalogue utilisée par défaut"
                        : "Aucune photo par défaut"}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      {customImagePreview
                        ? "Cette photo est propre à votre exploitation et n'écrase JAMAIS l'image officielle du catalogue commun."
                        : "Vous pouvez conserver ce visuel officiel ou téléverser une photo réelle de votre propre récolte."}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <input
                    type="file"
                    name="customImage"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCustomImageChange}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-forest-700 file:text-white hover:file:bg-forest-800 cursor-pointer"
                  />
                  {customImagePreview && (
                    <button
                      type="button"
                      onClick={() => setCustomImagePreview(null)}
                      className="text-xs text-red-600 hover:underline shrink-0 ml-2 font-medium"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions en pied de formulaire */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("search")}
                disabled={isSubmitting}
              >
                Retour au catalogue
              </Button>
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
        {/* ÉTAPE 2B : PRODUIT PERSONNALISÉ PRIVÉ */}
        {/* ======================================================== */}
        {step === "custom" && (
          <form action={handleCreateCustom} className="space-y-4">
            <Alert variant="info" title="Produit personnalisé strictement privé">
              Ce produit sera utilisable exclusivement par votre exploitation pour déclarer vos cycles de productions et publier vos offres. Il n'apparaîtra pas dans le catalogue commun partagé.
            </Alert>

            {/* Nom du produit */}
            <FormField
              label="Nom du produit personnalisé"
              required
              description="Ex: Arachide rouge de Bandundu, Soja local bio..."
            >
              <Input
                name="name"
                required
                defaultValue={searchCatalog}
                placeholder="Ex: Arachide rouge de Bandundu"
              />
            </FormField>

            {/* Catégorie et Unité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Catégorie agronomique" required>
                <Select
                  name="category"
                  defaultValue={distinctCategories[0] || "Autres productions agricoles"}
                  options={distinctCategories.map((c) => ({ value: c, label: c }))}
                />
              </FormField>

              <FormField label="Unité de mesure par défaut" required>
                <Select
                  name="defaultUnit"
                  defaultValue="tonne"
                  options={UNITS}
                />
              </FormField>
            </div>

            {/* Dénomination spécifique ferme */}
            <FormField
              label="Dénomination spécifique de l'exploitation (optionnelle)"
              description="Appellation commerciale propre si différente du nom général."
            >
              <Input
                name="customName"
                placeholder="Dénomination commerciale propre..."
              />
            </FormField>

            {/* Description */}
            <FormField
              label="Description générale (optionnelle)"
              description="Caractéristiques, qualité gustative ou particularités de culture."
            >
              <Textarea
                name="productDescription"
                rows={2}
                placeholder="Description du produit et de ses caractéristiques..."
              />
            </FormField>

            {/* Photo propre */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Photo personnalisée de votre exploitation (optionnelle)
              </label>
              <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50">
                <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {customImagePreview ? (
                    <img
                      src={customImagePreview}
                      alt="Aperçu photo"
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
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-forest-700 file:text-white hover:file:bg-forest-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("search")}
                disabled={isSubmitting}
              >
                Retour à la recherche
              </Button>
              <SubmitButton
                className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold shadow-xs"
                loadingText="Création en cours..."
              >
                Créer et ajouter à mon exploitation
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </Drawer>
  );
}
