import { useState, useRef, useTransition, useEffect, useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { DemandItem } from "@/lib/queries/demands";
import { CatalogProduct } from "@/lib/queries/products";
import { Province, Country } from "@/lib/queries/geography";
import { createDemandAction, updateDemandAction } from "@/lib/actions/demands";
import { Select } from "@/components/ui/Select";
import {
  TrendingUp,
  AlertCircle,
  Calendar,
  MapPin,
  Scale,
  Building2,
  Info,
} from "lucide-react";

interface DemandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: CatalogProduct[];
  provinces: Province[];
  countries: Country[];
  companies?: { id: string; name: string }[];
  editingDemand?: DemandItem | null;
  defaultProvinceId?: string;
  defaultCountryId?: string;
  onSuccess?: (message: string) => void;
}

export default function DemandFormModal({
  isOpen,
  onClose,
  catalogProducts,
  provinces,
  countries,
  companies = [],
  editingDemand,
  defaultProvinceId,
  defaultCountryId,
  onSuccess,
}: DemandFormModalProps) {
  const isEditing = Boolean(editingDemand);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("tonne");
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [city, setCity] = useState("");
  const [targetPeriodStart, setTargetPeriodStart] = useState("");
  const [targetPeriodEnd, setTargetPeriodEnd] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (editingDemand) {
      setProductId(editingDemand.product_id);
      setQuantity(String(editingDemand.quantity));
      setUnit(editingDemand.unit);
      setCountryId(editingDemand.country_id);
      setProvinceId(editingDemand.province_id);
      setCity(editingDemand.city || "");
      setTargetPeriodStart(editingDemand.target_period_start || "");
      setTargetPeriodEnd(editingDemand.target_period_end || "");
      setTargetCompanyId(editingDemand.target_company_id || "");
      setNotes(editingDemand.notes || "");
    } else {
      const defaultProd = catalogProducts[0];
      setProductId(defaultProd?.id || "");
      setQuantity("");
      setUnit(defaultProd?.default_unit || "tonne");
      
      const codCountry = countries.find((c) => c.code === "COD") || countries[0];
      setCountryId(defaultCountryId || codCountry?.id || "");
      setProvinceId(defaultProvinceId || provinces[0]?.id || "");
      setCity("");
      setTargetPeriodStart("");
      setTargetPeriodEnd("");
      setTargetCompanyId("");
      setNotes("");
    }
  }, [isOpen, editingDemand, catalogProducts, countries, provinces, defaultProvinceId, defaultCountryId]);

  const productOptions = useMemo(() => {
    return catalogProducts.map((p) => ({
      value: p.id,
      label: p.name,
      badge: p.category,
      description: p.description ?? undefined,
    }));
  }, [catalogProducts]);

  const unitOptions = useMemo(() => [
    { value: "tonne", label: "Tonne(s)" },
    { value: "sac 50kg", label: "Sac(s) de 50 kg" },
    { value: "sac 100kg", label: "Sac(s) de 100 kg" },
    { value: "kg", label: "Kilogramme(s)" },
    { value: "cageot", label: "Cageot(s)" },
    { value: "carton", label: "Carton(s)" },
  ], []);

  const countryOptions = useMemo(() => {
    return countries.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.code})`,
    }));
  }, [countries]);

  const provinceOptions = useMemo(() => {
    return provinces.map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [provinces]);

  const companyOptions = useMemo(() => {
    return [
      { value: "", label: "Toutes les sociétés (ouvert au marché)" },
      ...companies.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ];
  }, [companies]);

  const handleProductChange = (newProductId: string) => {
    setProductId(newProductId);
    const prod = catalogProducts.find((p) => p.id === newProductId);
    if (prod && (!isEditing || !unit)) {
      setUnit(prod.default_unit || "tonne");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(formRef.current || undefined);

    startTransition(async () => {
      let res;
      try {
        if (isEditing && editingDemand) {
          formData.set("demandId", editingDemand.id);
          res = await updateDemandAction(null, formData);
        } else {
          res = await createDemandAction(null, formData);
        }
      } catch (err) {
        console.error("Erreur enregistrement demande:", err);
        setErrorMessage("La requête n'a pas pu aboutir. Vérifiez votre connexion puis réessayez.");
        return;
      }

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        onSuccess?.(res.message || "Demande enregistrée avec succès !");
        onClose();
      }
    });
  };


  if (!isOpen) return null;

  // Lot UX/UI 5B : surface partagée Drawer (focus, Échap, verrouillage compté du défilement).
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      isDismissable={!isPending}
      showCloseButton={!isPending}
      icon={<TrendingUp className="w-5 h-5" />}
      title={isEditing ? "Modifier ma demande" : "Exprimer une demande d'approvisionnement"}
      description={"Informez les sociétés des volumes recherchés dans votre province."}
      footer={
        <>
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
            form="demand-form"
            disabled={isPending || catalogProducts.length === 0}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-earth-700 hover:bg-earth-800 rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : isEditing ? (
              "Enregistrer les modifications"
            ) : (
              "Publier ma demande"
            )}
          </button>
        </>
      }
    >
        {/* Form Body */}
        <form id="demand-form" ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Rappel Règle Métier */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Information :</strong> Une demande est une expression
              de besoin territorial. Elle n&apos;engage aucun paiement, ne réserve aucun stock et ne constitue pas
              une commande.
            </div>
          </div>

          {/* Sélection du produit */}
          <div className="space-y-1.5">
            <label id="demand-product-label" className="block text-xs font-semibold text-gray-800">
              Produit recherché <span className="text-rose-600">*</span>
            </label>
            {catalogProducts.length === 0 ? (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs">
                Aucun produit disponible dans le catalogue national.
              </div>
            ) : (
              <Select aria-labelledby="demand-product-label"
                name="productId"
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                options={productOptions}
                searchable
                searchPlaceholder="Rechercher un produit (ail, maïs, ananas...)"
                placeholder="Sélectionner un produit..."
                disabled={isEditing}
                required
              />
            )}
          </div>

          {/* Quantité & Unité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="demand-quantity" className="block text-xs font-semibold text-gray-800">
                Quantité estimée <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
                <input id="demand-quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  name="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex. 100"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600/20 focus:border-earth-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label id="demand-unit-label" className="block text-xs font-semibold text-gray-800">
                Unité de mesure <span className="text-rose-600">*</span>
              </label>
              <Select aria-labelledby="demand-unit-label"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                options={unitOptions}
                required
              />
            </div>
          </div>

          {/* Territoire de livraison / approvisionnement */}
          <div className="space-y-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-earth-700" />
              Territoire de livraison souhaité
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label id="demand-country-label" className="block text-xs font-semibold text-gray-700">
                  Pays <span className="text-rose-700">*</span>
                </label>
                <Select aria-labelledby="demand-country-label"
                  name="countryId"
                  value={countryId}
                  onChange={(e) => setCountryId(e.target.value)}
                  options={countryOptions}
                  selectSize="sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label id="demand-province-label" className="block text-xs font-semibold text-gray-700">
                  Province / Région <span className="text-rose-700">*</span>
                </label>
                <Select aria-labelledby="demand-province-label"
                  name="provinceId"
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                  options={provinceOptions}
                  searchable={provinceOptions.length > 5}
                  searchPlaceholder="Rechercher..."
                  selectSize="sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="demand-city" className="block text-xs font-semibold text-gray-700">
                  Ville / Territoire
                </label>
                <input id="demand-city"
                  type="text"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex. Lubumbashi"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600/20 focus:border-earth-600 outline-none bg-white transition-all min-h-[34px]"
                />
              </div>
            </div>
          </div>

          {/* Période souhaitée */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="demand-period-start" className="block text-xs font-semibold text-gray-800">
                Période souhaitée à partir du
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
                <input id="demand-period-start"
                  type="date"
                  name="targetPeriodStart"
                  value={targetPeriodStart}
                  onChange={(e) => setTargetPeriodStart(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600/20 focus:border-earth-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="demand-period-end" className="block text-xs font-semibold text-gray-800">
                Date limite souhaitée
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
                <input id="demand-period-end"
                  type="date"
                  name="targetPeriodEnd"
                  value={targetPeriodEnd}
                  min={targetPeriodStart || undefined}
                  onChange={(e) => setTargetPeriodEnd(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600/20 focus:border-earth-600 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Entreprise cible (Optionnel) */}
          {companies.length > 0 && (
            <div className="space-y-1.5">
              <label id="demand-target-company-label" className="block text-xs font-semibold text-gray-800">
                Société ciblée (optionnel)
              </label>
              <Select aria-labelledby="demand-target-company-label"
                name="targetCompanyId"
                value={targetCompanyId}
                onChange={(e) => setTargetCompanyId(e.target.value)}
                options={companyOptions}
                searchable={companies.length > 5}
                searchPlaceholder="Rechercher une société..."
                leftIcon={<Building2 className="w-4 h-4 text-gray-400" />}
              />
              <p className="text-xs text-gray-500">
                Laissez &quot;Toutes les sociétés&quot; pour que votre demande soit visible par l&apos;ensemble des sociétés de la région.
              </p>
            </div>
          )}

          {/* Notes et exigences qualitatives */}
          <div className="space-y-1.5">
            <label htmlFor="demand-notes" className="block text-xs font-semibold text-gray-800">
              Spécifications techniques & Tolérances (optionnel)
            </label>
            <textarea id="demand-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Précisez la variété souhaitée, le conditionnement attendu, le taux d'humidité toléré..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-earth-600 transition-all resize-none"
            />
          </div>
        </form>
    </Drawer>
  );
}
