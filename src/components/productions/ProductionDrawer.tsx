"use client";

import React, { useState, useRef, useTransition, useEffect, useMemo } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import { createProductionAction, updateProductionAction } from "@/lib/actions/productions";
import { MONTHS_FR, formatSeasonalPeriod } from "@/lib/utils/seasonalMonths";
import { Drawer } from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import {
  Tractor,
  Upload,
  Calendar,
  MapPin,
  Scale,
  Eye,
  Info,
  CheckCircle2,
  Sprout,
  Image as ImageIcon,
  Tag,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

interface ProductionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  companyProducts: CompanyProductItem[];
  editingProduction?: ProductionItem | null;
  onSuccess?: (message: string) => void;
}

const UNITS = [
  { value: "tonne", label: "Tonne(s)" },
  { value: "sac 50kg", label: "Sac(s) de 50 kg" },
  { value: "sac 100kg", label: "Sac(s) de 100 kg" },
  { value: "kg", label: "Kilogramme(s)" },
  { value: "cageot", label: "Cageot(s)" },
  { value: "carton", label: "Carton(s)" },
];

export default function ProductionDrawer({
  isOpen,
  onClose,
  companyProducts,
  editingProduction,
  onSuccess,
}: ProductionDrawerProps) {
  const { toast } = useToast();
  const isEditing = Boolean(editingProduction);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Champs de formulaire
  const [selectedCompanyProductId, setSelectedCompanyProductId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState<string>("");
  const [unit, setUnit] = useState("tonne");
  const [locationName, setLocationName] = useState("");
  const [status, setStatus] = useState<ProductionStatus>("planned");
  const [isPublic, setIsPublic] = useState(true);

  // Saisons agricoles (mois cycliques 1-12, sans année calendaire)
  const [plantingStartMonth, setPlantingStartMonth] = useState<string>("");
  const [plantingEndMonth, setPlantingEndMonth] = useState<string>("");
  const [harvestStartMonth, setHarvestStartMonth] = useState<string>("");
  const [harvestEndMonth, setHarvestEndMonth] = useState<string>("");

  // Gestion de la photo (Supabase Storage public-assets/productions)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCompanyProducts = companyProducts.filter((p) => p.is_active);

  const monthOptions = useMemo(
    () => [
      { value: "", label: "— Non défini —" },
      ...MONTHS_FR.map((m) => ({ value: String(m.value), label: m.label })),
    ],
    []
  );

  const productOptions = useMemo(
    () =>
      activeCompanyProducts.map((cp) => ({
        value: cp.id,
        label: cp.custom_name ? `${cp.custom_name} (${cp.product.name})` : cp.product.name,
        badge: cp.product.category,
      })),
    [activeCompanyProducts]
  );

  const unitOptions = useMemo(() => UNITS, []);

  const statusOptions = useMemo(
    () => [
      { value: "draft", label: "Brouillon (interne uniquement)" },
      { value: "planned", label: "Planifiée (programme de saison)" },
      { value: "growing", label: "En culture (en champ)" },
      { value: "harvested", label: "Récoltée" },
      { value: "cancelled", label: "Annulée" },
    ],
    []
  );

  // Synchronisation lors de l'ouverture ou du changement d'enregistrement
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
      setPlantingStartMonth(String(editingProduction.planting_start_month ?? ""));
      setPlantingEndMonth(String(editingProduction.planting_end_month ?? ""));
      setHarvestStartMonth(String(editingProduction.harvest_start_month ?? ""));
      setHarvestEndMonth(String(editingProduction.harvest_end_month ?? ""));
      setLocationName(editingProduction.location_name);
      setStatus(editingProduction.status);
      setIsPublic(editingProduction.is_public);
      setImagePreview(editingProduction.main_image_url || null);
    } else {
      // Nouvelle production
      const defaultProd = activeCompanyProducts[0];
      setSelectedCompanyProductId(defaultProd?.id || "");
      setTitle(defaultProd ? `Production de ${defaultProd.custom_name || defaultProd.product.name}` : "");
      setDescription("");
      setExpectedQuantity("");
      setUnit(defaultProd?.unit || defaultProd?.product.default_unit || "tonne");
      setPlantingStartMonth("");
      setPlantingEndMonth("");
      setHarvestStartMonth("");
      setHarvestEndMonth("");
      setLocationName("");
      setStatus("planned");
      setIsPublic(true);
      setImagePreview(defaultProd?.image_url || defaultProd?.product.image_url || null);
    }
    setErrorMessage(null);
  }, [isOpen, editingProduction, companyProducts]);

  // Changement de produit sélectionné
  const handleProductChange = (newCompanyProductId: string) => {
    setSelectedCompanyProductId(newCompanyProductId);
    const prod = companyProducts.find((p) => p.id === newCompanyProductId);
    if (prod) {
      if (!isEditing || !title) {
        setTitle(`Production de ${prod.custom_name || prod.product.name}`);
      }
      setUnit(prod.unit || prod.product.default_unit || "tonne");
      if (!imagePreview || imagePreview === editingProduction?.product?.image_url) {
        setImagePreview(prod.image_url || prod.product.image_url);
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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Format non supporté (utilisez JPG, PNG ou WebP).");
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
        toast.error("Erreur d'enregistrement", res.error);
      } else {
        const msg = res.message || (isEditing ? "Production mise à jour." : "Production créée avec succès.");
        toast.success(isEditing ? "Modifications enregistrées" : "Production créée", msg);
        onSuccess?.(msg);
        onClose();
      }
    });
  };

  // Aperçus dynamiques de saisons
  const plantingPreview = formatSeasonalPeriod(
    plantingStartMonth ? parseInt(plantingStartMonth, 10) : null,
    plantingEndMonth ? parseInt(plantingEndMonth, 10) : null
  );
  const harvestPreview = formatSeasonalPeriod(
    harvestStartMonth ? parseInt(harvestStartMonth, 10) : null,
    harvestEndMonth ? parseInt(harvestEndMonth, 10) : null
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="xl"
      title={isEditing ? "Modifier le cycle de production" : "Déclarer une nouvelle production"}
      description="Renseignez les caractéristiques réelles de votre cycle cultural sans incidence sur vos stocks actuels."
      icon={<Tractor className="w-5 h-5 text-forest-700" />}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={isPending}
            loadingText="Enregistrement..."
            disabled={isPending || activeCompanyProducts.length === 0}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {isEditing ? "Enregistrer les modifications" : "Créer la production"}
          </Button>
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 pb-4">
        {errorMessage && (
          <Alert variant="error" title="Vérification requise">
            {errorMessage}
          </Alert>
        )}

        {/* Rappel d'intégrité métier */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Information importante :</p>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              La quantité déclarée ici représente une <strong>estimation de récolte</strong>. Elle ne constitue
              ni un stock physique immédiatement commercialisable, ni une campagne ouverte à la commande.
            </p>
          </div>
        </div>

        {/* Sélection du produit d'exploitation */}
        <div className="space-y-1">
          {activeCompanyProducts.length === 0 ? (
            <Alert variant="warning" title="Aucun produit configuré">
              Votre exploitation ne dispose d&apos;aucun produit actif dans son catalogue. Veuillez d&apos;abord ajouter
              vos cultures depuis l&apos;onglet Catalogue Produits.
            </Alert>
          ) : (
            <FormField
              label="Culture / Produit d'exploitation"
              required
              description="Sélectionnez la denrée cultivée enregistrée dans votre catalogue société."
            >
              <Select
                name="companyProductId"
                value={selectedCompanyProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                options={productOptions}
                searchable
                disabled={isEditing}
                required
              />
            </FormField>
          )}
        </div>

        {/* Titre & Localisation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Intitulé du cycle"
            required
            description="Dénomination distinctive (ex. Parcelle Nord - Maïs Blanc)."
          >
            <Input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Récolte Maïs Blanc - Saison A"
              required
              minLength={3}
            />
          </FormField>

          <FormField
            label="Site / Localisation de culture"
            required
            description="Commune, village ou parcelle d'implantation."
          >
            <Input
              type="text"
              name="locationName"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex. Site de Maluku, Kinshasa"
              leftIcon={<MapPin className="w-4 h-4 text-gray-400" />}
              required
            />
          </FormField>
        </div>

        {/* Quantité déclarée & Unité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Volume prévisionnel planifié"
            required
            description="Quantité totale estimée ou récoltée (non engagée)."
          >
            <Input
              type="number"
              step="any"
              min="0.01"
              name="expectedQuantity"
              value={expectedQuantity}
              onChange={(e) => setExpectedQuantity(e.target.value)}
              placeholder="Ex. 500"
              leftIcon={<Scale className="w-4 h-4 text-gray-400" />}
              required
            />
          </FormField>

          <FormField
            label="Unité de mesure"
            required
            description="Unité de pesée ou de conditionnement."
          >
            <Select
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={unitOptions}
              required
            />
          </FormField>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            CALENDRIER DE PRODUCTION — SAISONS AGRICOLES RÉCURRENTES
            ═══════════════════════════════════════════════════════════ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-forest-50/70 border border-forest-100/90 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-forest-700" />
            <h4 className="text-xs font-bold text-forest-950 uppercase tracking-wide">
              Calendrier saisonnier récurrent
            </h4>
            <span className="text-[11px] text-forest-700/80 italic">(sans année calendaire)</span>
          </div>

          <p className="text-[11px] text-forest-900/80 leading-relaxed">
            Spécifiez les mois indicatifs de semis et de récolte. Ces repères saisonniers se répètent cycliquement chaque année
            et orientent les acheteurs sans contrainte d&apos;année calendaire.
          </p>

          {/* Plantation / Semis */}
          <div className="space-y-2 bg-white/80 p-3.5 rounded-xl border border-forest-100">
            <div className="flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-forest-600" />
              <span className="text-[11px] font-bold text-forest-900 uppercase">Période de plantation / semis</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600 font-medium">Mois de début</label>
                <Select
                  name="plantingStartMonth"
                  value={plantingStartMonth}
                  onChange={(e) => setPlantingStartMonth(e.target.value)}
                  options={monthOptions}
                  placeholder="— Non défini —"
                  selectSize="sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600 font-medium">Mois de fin</label>
                <Select
                  name="plantingEndMonth"
                  value={plantingEndMonth}
                  onChange={(e) => setPlantingEndMonth(e.target.value)}
                  options={monthOptions}
                  placeholder="— Non défini —"
                  selectSize="sm"
                />
              </div>
            </div>

            {plantingPreview && (
              <div className="flex items-center gap-1.5 text-[11px] text-forest-800 bg-forest-100/70 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3 text-forest-600 shrink-0" />
                <span>Semis / Plantation : <strong>{plantingPreview}</strong></span>
              </div>
            )}
          </div>

          {/* Récolte */}
          <div className="space-y-2 bg-white/80 p-3.5 rounded-xl border border-forest-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-amber-950 uppercase">Période de récolte</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600 font-medium">Mois de début</label>
                <Select
                  name="harvestStartMonth"
                  value={harvestStartMonth}
                  onChange={(e) => setHarvestStartMonth(e.target.value)}
                  options={monthOptions}
                  placeholder="— Non défini —"
                  selectSize="sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600 font-medium">Mois de fin</label>
                <Select
                  name="harvestEndMonth"
                  value={harvestEndMonth}
                  onChange={(e) => setHarvestEndMonth(e.target.value)}
                  options={monthOptions}
                  placeholder="— Non défini —"
                  selectSize="sm"
                />
              </div>
            </div>

            {harvestPreview && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Récolte : <strong>{harvestPreview}</strong></span>
              </div>
            )}
          </div>

          <p className="text-[10px] text-forest-800/80 italic">
            💡 Astuce : Les saisons agricoles qui chevauchent l&apos;année (ex. Octobre à Février) sont parfaitement prises en compte.
          </p>
        </div>

        {/* Statut du cycle & Visibilité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Statut du cycle cultural"
            required
            description="Étape agronomique d'avancement."
          >
            <Select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductionStatus)}
              options={statusOptions}
              required
            />
          </FormField>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 self-end">
            <div>
              <span className="text-xs font-semibold text-gray-900 block">Visibilité publique</span>
              <span className="text-[11px] text-gray-500 block">Visible sur le flux revendeur (si actif)</span>
            </div>
            <Switch
              name="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
          </div>
        </div>

        {/* Description & Précisions agronomiques */}
        <FormField
          label="Conditions culturales & Précisions agronomiques"
          description="Optionnel — Variété exacte, méthodes culturales (bio, raisonné), état sanitaire..."
        >
          <Textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Précisez la variété, le mode de culture, l'état sanitaire de la récolte..."
          />
        </FormField>

        {/* Photographie de production (Supabase Storage public-assets/productions) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-800">
            Photographie du champ / de la culture <span className="text-rose-500">*</span>
          </label>

          <div className="flex items-center gap-4">
            <div className="relative w-28 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
              {imagePreview ? (
                <Image src={imagePreview} alt="Aperçu production" fill className="object-cover" />
              ) : (
                <ImageIcon className="w-7 h-7 text-gray-400" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
                id="production-drawer-photo-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? "Changer la photographie" : "Sélectionner une photo"}
              </Button>
              <p className="text-[11px] text-gray-500">
                Format JPG, PNG ou WebP. Max 5 Mo.
              </p>
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
