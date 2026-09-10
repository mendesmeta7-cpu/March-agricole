"use client";

import { useState } from "react";
import { CatalogProduct } from "@/lib/queries/products";
import { associateCatalogProductAction, createAndAssociateProductAction, ActionResponse } from "@/lib/actions/products";
import SubmitButton from "@/components/SubmitButton";
import Badge from "@/components/ui/Badge";
import { X, Search, Sparkles, PackagePlus, AlertCircle, CheckCircle2, Image as ImageIcon, Layers } from "lucide-react";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: CatalogProduct[];
}

const CATEGORIES = [
  "Céréales",
  "Tubercules & Racines",
  "Légumineuses & Protéagineux",
  "Maraîchage & Légumes",
  "Fruits",
  "Oléagineux & Cultures pérennes",
  "Plantes à épices & Aromates",
  "Autres denrées agricoles",
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
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">("catalog");
  const [searchCatalog, setSearchCatalog] = useState("");
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null);
  const [state, setState] = useState<ActionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredCatalog = catalogProducts.filter((p) =>
    p.name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
    p.category.toLowerCase().includes(searchCatalog.toLowerCase())
  );

  async function handleAssociate(formData: FormData) {
    setIsSubmitting(true);
    setState(null);
    try {
      const res = await associateCatalogProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setState(null);
          setSelectedCatalogProduct(null);
        }, 1200);
      }
    } catch (err: any) {
      setState({ error: err.message || "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateNew(formData: FormData) {
    setIsSubmitting(true);
    setState(null);
    try {
      const res = await createAndAssociateProductAction(null, formData);
      setState(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setState(null);
        }, 1200);
      }
    } catch (err: any) {
      setState({ error: err.message || "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200">
        {/* En-tête du modal */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
              <PackagePlus className="w-5 h-5 text-forest-700 flex-shrink-0" />
              <span className="truncate">Associer un Produit</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate sm:whitespace-normal">
              Sélectionnez ou créez une denrée agricole.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px]"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets de sélection */}
        <div className="flex border-b border-gray-100 px-3 sm:px-6 bg-white overflow-x-auto flex-shrink-0 gap-1">
          <button
            onClick={() => {
              setActiveTab("catalog");
              setState(null);
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === "catalog"
                ? "border-forest-700 text-forest-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Layers className="w-4 h-4 flex-shrink-0" />
            <span>Catalogue ({catalogProducts.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("custom");
              setState(null);
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === "custom"
                ? "border-forest-700 text-forest-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>Produit Absent ? Ajouter</span>
          </button>
        </div>

        {/* Messages d'état */}
        {state?.error && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 sm:p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 flex-shrink-0">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}
        {state?.success && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            <span>{state.message || "Opération réalisée avec succès."}</span>
          </div>
        )}

        {/* Contenu de l'onglet */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === "catalog" ? (
            /* Onglet 1 : Sélection dans le catalogue existant */
            <form action={handleAssociate} className="space-y-4 sm:space-y-5 flex flex-col min-h-full">
              {catalogProducts.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">
                    Rechercher dans le catalogue national
                  </label>
                  <div className="relative mb-2.5">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filtrer par nom (ex. Maïs, Manioc)..."
                      value={searchCatalog}
                      onChange={(e) => setSearchCatalog(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 focus:border-forest-700"
                    />
                  </div>

                  {/* Liste des produits filtrés */}
                  <div className="max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
                    {filteredCatalog.length === 0 ? (
                      <div className="p-4 text-center text-xs sm:text-sm text-gray-500">
                        Aucun produit trouvé.
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("custom");
                            setSearchCatalog("");
                          }}
                          className="block mx-auto mt-2 text-xs font-semibold text-forest-700 hover:underline"
                        >
                          + Ajouter ce produit au catalogue
                        </button>
                      </div>
                    ) : (
                      filteredCatalog.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => setSelectedCatalogProduct(prod)}
                          className={`p-3 flex items-center justify-between cursor-pointer hover:bg-forest-50/50 transition-colors min-h-[44px] ${
                            selectedCatalogProduct?.id === prod.id
                              ? "bg-forest-50 border-l-4 border-forest-700"
                              : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{prod.name}</div>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                              <span className="text-[11px] sm:text-xs text-gray-500 truncate">{prod.category}</span>
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">
                                {prod.default_unit}
                              </span>
                            </div>
                          </div>
                          {selectedCatalogProduct?.id === prod.id && (
                            <Badge variant="forest" size="sm">Sélectionné</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  Le catalogue général est actuellement vide. Vous pouvez enregistrer une première denrée via l&apos;onglet <strong>&quot;Produit Absent ? Ajouter&quot;</strong>.
                </div>
              )}

              {/* Champ caché de l'ID produit sélectionné */}
              <input
                type="hidden"
                name="productId"
                value={selectedCatalogProduct?.id || ""}
              />

              {selectedCatalogProduct && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 animate-in fade-in">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Configuration pour votre exploitation
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Dénomination spécifique (Optionnel)
                    </label>
                    <input
                      type="text"
                      name="customName"
                      placeholder={`Ex. ${selectedCatalogProduct.name} Blanc Premium`}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Précisez si vous commercialisez une variété spécifique.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes agronomiques ou descriptif (Optionnel)
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      placeholder="Ex. Culture plein champ biologique, variété locale..."
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors text-center min-h-[44px]"
                >
                  Annuler
                </button>
                <SubmitButton
                  disabled={!selectedCatalogProduct || isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-forest-700 text-white text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-all shadow-xs min-h-[44px] flex items-center justify-center"
                  loadingText="Association en cours..."
                >
                  Associer à mon exploitation
                </SubmitButton>
              </div>
            </form>
          ) : (
            /* Onglet 2 : Ajout d'un nouveau produit au catalogue général */
            <form action={handleCreateNew} className="space-y-3.5 sm:space-y-4">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-forest-50/60 border border-forest-100 text-forest-900 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-forest-700 flex-shrink-0 mt-0.5" />
                <span>
                  Ce produit sera ajouté au <strong>catalogue général officiel</strong> et associé à votre exploitation avec contrôle anti-doublon.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Nom officiel du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex. Maïs jaune, Manioc doux, Soja..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 focus:border-forest-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Catégorie agronomique <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 min-h-[40px]"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Unité de mesure par défaut <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="defaultUnit"
                    required
                    defaultValue="tonne"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 min-h-[40px]"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Description générale du produit (Optionnel)
                </label>
                <textarea
                  name="productDescription"
                  rows={2}
                  placeholder="Description agronomique générale de la denrée..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Photo illustrative (Optionnel, Max 5 Mo)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs font-medium text-gray-700 transition-colors min-h-[40px]">
                    <ImageIcon className="w-4 h-4 text-forest-700" />
                    <span>Choisir une image</span>
                    <input
                      type="file"
                      name="image"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-400">JPG, PNG ou WebP</span>
                </div>
              </div>

              <div className="pt-2 sm:pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Dénomination spécifique à votre ferme (Optionnel)
                  </label>
                  <input
                    type="text"
                    name="customName"
                    placeholder="Ex. Récolte Spéciale Nord"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes d&apos;exploitation (Optionnel)
                  </label>
                  <input
                    type="text"
                    name="companyDescription"
                    placeholder="Ex. Parcelle 3, sol volcanique"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30"
                  />
                </div>
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
                  Créer et associer le produit
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
