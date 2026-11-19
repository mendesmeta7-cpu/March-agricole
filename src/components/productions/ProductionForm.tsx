"use client";

import React, { useState, useRef, useTransition, useEffect, useMemo } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import { createProductionAction, updateProductionAction } from "@/lib/actions/productions";
import type { ActionResponse as ProductionActionResponse } from "@/lib/actions/productions";
import { MONTHS_FR, formatSeasonalPeriod } from "@/lib/utils/seasonalMonths";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUnsavedChangesGuard } from "@/components/ui/useUnsavedChangesGuard";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { PRODUCTION_LOCK_MESSAGES } from "@/lib/utils/productionRules";
import {
  compressPhotoForUpload,
  PHOTO_COMPRESSION_ERROR_MESSAGE,
} from "@/lib/utils/compressImage";
import {
  Loader2,
  Tractor,
  Upload,
  Calendar,
  MapPin,
  Scale,
  Info,
  CheckCircle2,
  Sprout,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface ProductionFormProps {
  companyProducts: CompanyProductItem[];
  editingProduction?: ProductionItem | null;
}

const UNITS = [
  { value: "tonne", label: "Tonne(s)" },
  { value: "sac 50kg", label: "Sac(s) de 50 kg" },
  { value: "sac 100kg", label: "Sac(s) de 100 kg" },
  { value: "kg", label: "Kilogramme(s)" },
  { value: "cageot", label: "Cageot(s)" },
  { value: "carton", label: "Carton(s)" },
];

/**
 * Formulaire de production en page dédiée (Lot UX/UI 5B, ADR-058), issu de ProductionDrawer : mêmes champs,
 * même photo, mêmes contrôles et mêmes actions serveur. Saisie protégée avant de quitter la page.
 */
export default function ProductionForm({
  companyProducts,
  editingProduction,
}: ProductionFormProps) {
  // Page dédiée : le formulaire est toujours affiché.
  const isOpen = true;
  const router = useRouter();
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
  // Photo prête à l'envoi, compressée si nécessaire ; null sans nouvelle photo.
  const [preparedPhoto, setPreparedPhoto] = useState<File | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoRequestRef = useRef(0);

  const activeCompanyProducts = companyProducts.filter((p) => p.is_active);

  // A4 / D1 / D3 — production engagée par une campagne active ou suspendue ouverte :
  // unité, statut et passage en non public sont figés (le trigger reste l'autorité).
  const isEngaged = Boolean(isEditing && editingProduction?.has_engaging_campaign);
  // C-4 : l'unité est figée par ses propres engagements (campagne non annulée,
  // commande en cours, proposition ouverte), même sans campagne ouverte.
  const isUnitLocked = Boolean(isEditing && (editingProduction?.has_unit_commitments ?? isEngaged));
  const isVisibilityLocked = isEngaged && Boolean(editingProduction?.is_public);
  const lockIdPrefix = React.useId();
  const unitLockId = `${lockIdPrefix}-unit-lock`;
  const statusLockId = `${lockIdPrefix}-status-lock`;
  const visibilityLockId = `${lockIdPrefix}-visibility-lock`;
  const productNoteId = `${lockIdPrefix}-product-note`;

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

  // Initialisation une seule fois par production : un rafraîchissement des données de la page
  // ne doit jamais effacer la saisie en cours.
  const initialisation = useRef<string | null>(null);
  const [initialisationEnCours, setInitialisationEnCours] = useState(false);
  useEffect(() => {
    const cle = editingProduction?.id ?? "nouvelle";
    if (initialisation.current === cle) return;
    initialisation.current = cle;
    setInitialisationEnCours(true);
    clearChosenPhoto();
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

  function clearChosenPhoto() {
    photoRequestRef.current += 1;
    setPreparedPhoto(null);
    setIsPreparingPhoto(false);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      clearChosenPhoto();
      setErrorMessage("La taille de l'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      clearChosenPhoto();
      setErrorMessage("Format non supporté (utilisez JPG, PNG ou WebP).");
      return;
    }

    setErrorMessage(null);
    setPhotoError(null);
    const requestId = ++photoRequestRef.current;
    setIsPreparingPhoto(true);

    let photo: File;
    try {
      photo = await compressPhotoForUpload(file);
    } catch (err) {
      console.error("Compression de la photo impossible :", err);
      if (requestId !== photoRequestRef.current) return;
      clearChosenPhoto();
      setPhotoError(PHOTO_COMPRESSION_ERROR_MESSAGE);
      return;
    }
    if (requestId !== photoRequestRef.current) return;

    setPreparedPhoto(photo);
    setIsPreparingPhoto(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(photo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreparingPhoto) return;
    setErrorMessage(null);

    const formData = new FormData(formRef.current || undefined);
    if (preparedPhoto) formData.set("image", preparedPhoto, preparedPhoto.name);

    startTransition(async () => {
      let res: ProductionActionResponse;
      try {
        if (isEditing && editingProduction) {
          formData.set("productionId", editingProduction.id);
          res = await updateProductionAction(null, formData);
        } else {
          res = await createProductionAction(null, formData);
        }
      } catch (err) {
        // Une action rejetée affiche un message au lieu de faire tomber la page.
        console.error("Erreur enregistrement production :", err);
        res = {
          error: "L'enregistrement de la production a échoué. Vérifiez votre connexion puis réessayez.",
        };
      }

      if (res.error) {
        setErrorMessage(res.error);
        toast.error("Erreur d'enregistrement", res.error);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const msg = res.message || (isEditing ? "Production mise à jour." : "Production créée avec succès.");
        toast.success(isEditing ? "Modifications enregistrées" : "Production créée", msg);
        garde.desarmer();
        router.push(RETOUR);
      }
    });
  };

  const RETOUR = editingProduction
    ? `/dashboard/company/productions/${editingProduction.id}`
    : "/dashboard/company/productions";
  const instantane = JSON.stringify({
    selectedCompanyProductId, title, description, expectedQuantity, unit, plantingStartMonth, plantingEndMonth,
    harvestStartMonth, harvestEndMonth, locationName, status, isPublic, photo: preparedPhoto ? preparedPhoto.name : null,
  });
  const [instantaneInitial, setInstantaneInitial] = useState<string | null>(null);
  useEffect(() => {
    if (initialisationEnCours) {
      setInstantaneInitial(instantane);
      setInitialisationEnCours(false);
    }
  }, [initialisationEnCours, instantane]);
  const garde = useUnsavedChangesGuard(instantaneInitial !== null && instantane !== instantaneInitial);

  // Focus sur le titre à l'arrivée sur la page (clavier et lecteur d'écran partent du formulaire)
  const titrePageRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titrePageRef.current?.focus({ preventScroll: true });
  }, []);

  const photoStatus = isPreparingPhoto
    ? "Préparation de la photo…"
    : isPending && preparedPhoto
      ? "Envoi de la photo…"
      : null;

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
    <div className="max-w-3xl mx-auto space-y-5">
      {garde.dialog}
      <div className="space-y-2">
        <Link href={RETOUR} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-forest-800">
          {editingProduction ? "← Retour à la production" : "← Retour aux productions & récoltes"}
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            <Tractor className="w-5 h-5 text-forest-700" />
          </div>
          <h1 ref={titrePageRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-gray-900 focus:outline-none">
            {isEditing ? "Modifier le cycle de production" : "Déclarer une nouvelle production"}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Renseignez les caractéristiques réelles de votre cycle cultural sans incidence sur vos stocks actuels.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6">
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
              Votre société ne dispose d&apos;aucun produit actif dans son catalogue. Veuillez d&apos;abord ajouter
              vos produits depuis la rubrique Catalogue produits.
            </Alert>
          ) : (
            <FormField
              label="Produit cultivé"
              required
              description={
                isEditing ? (
                  <span id={productNoteId}>
                    Le produit d&apos;une production n&apos;est plus modifiable après sa création.
                    {isEngaged ? ` ${PRODUCTION_LOCK_MESSAGES.product}` : ""}
                  </span>
                ) : (
                  "Sélectionnez le produit cultivé enregistré dans le catalogue de votre société."
                )
              }
            >
              <div role="group" aria-describedby={isEditing ? productNoteId : undefined}>
                <Select
                  name="companyProductId"
                  value={selectedCompanyProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  options={productOptions}
                  searchable
                  disabled={isEditing}
                  required
                />
              </div>
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
            description={
              isUnitLocked ? (
                <span id={unitLockId} className="text-amber-800 font-medium">
                  {PRODUCTION_LOCK_MESSAGES.unit}
                </span>
              ) : (
                "Unité de pesée ou de conditionnement."
              )
            }
          >
            {/* Le champ masqué du Select transmet l'unité actuelle même verrouillé */}
            <div role="group" aria-describedby={isUnitLocked ? unitLockId : undefined}>
              <Select
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                options={unitOptions}
                disabled={isUnitLocked}
                required
              />
            </div>
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
            <span className="text-xs text-forest-700/80 italic">(sans année calendaire)</span>
          </div>

          <p className="text-xs text-forest-900/80 leading-relaxed">
            Spécifiez les mois indicatifs de semis et de récolte. Ces repères saisonniers se répètent cycliquement chaque année
            et orientent les revendeurs sans contrainte d&apos;année calendaire.
          </p>

          {/* Plantation / Semis */}
          <div className="space-y-2 bg-white/80 p-3.5 rounded-xl border border-forest-100">
            <div className="flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-forest-600" />
              <span className="text-[11px] font-bold text-forest-900 uppercase">Période de plantation / semis</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs text-gray-600 font-medium">Mois de début</label>
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
                <label className="block text-xs text-gray-600 font-medium">Mois de fin</label>
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
                <label className="block text-xs text-gray-600 font-medium">Mois de début</label>
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
                <label className="block text-xs text-gray-600 font-medium">Mois de fin</label>
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

          <p className="text-xs text-forest-800/80 italic">
            💡 Astuce : Les saisons agricoles qui chevauchent l&apos;année (ex. Octobre à Février) sont parfaitement prises en compte.
          </p>
        </div>

        {/* Statut du cycle & Visibilité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Statut du cycle cultural"
            required
            description={
              isEngaged ? (
                <span id={statusLockId} className="text-amber-800 font-medium">
                  {PRODUCTION_LOCK_MESSAGES.status}
                </span>
              ) : (
                "Étape agronomique d'avancement."
              )
            }
          >
            <div role="group" aria-describedby={isEngaged ? statusLockId : undefined}>
              <Select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductionStatus)}
                options={statusOptions}
                disabled={isEngaged}
                required
              />
            </div>
          </FormField>

          <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 self-end space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-gray-900 block">Visibilité publique</span>
                <span className="text-xs text-gray-500 block">Visible sur le tableau de bord revendeur (si actif)</span>
              </div>
              <Switch
                name={isVisibilityLocked ? undefined : "isPublic"}
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isVisibilityLocked}
                aria-label="Visibilité publique"
                aria-describedby={isVisibilityLocked ? visibilityLockId : undefined}
              />
              {/* Un champ désactivé n'est pas transmis : la valeur publique est conservée explicitement */}
              {isVisibilityLocked && <input type="hidden" name="isPublic" value="true" />}
            </div>
            {isVisibilityLocked && (
              <p id={visibilityLockId} className="text-xs text-amber-800 font-medium leading-relaxed">
                {PRODUCTION_LOCK_MESSAGES.visibility}
              </p>
            )}
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
            Photographie du champ / de la culture <span className="text-rose-600">*</span>
          </label>

          <div className="flex items-center gap-4">
            <div className="relative w-28 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
              {imagePreview ? (
                <Image src={imagePreview} alt="Aperçu production" fill className="object-cover" />
              ) : (
                <ImageIcon className="w-7 h-7 text-gray-400" />
              )}
              {photoStatus && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-forest-700 animate-spin" aria-hidden="true" />
                </div>
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
                disabled={isPending || isPreparingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? "Changer la photographie" : "Sélectionner une photo"}
              </Button>
              {photoError ? (
                <p role="alert" className="text-xs font-medium text-rose-700">
                  {photoError}
                </p>
              ) : photoStatus ? (
                <p role="status" className="text-xs font-semibold text-forest-800">
                  {photoStatus}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Format JPG, PNG ou WebP. Max 5 Mo.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
      </div>

      {/* Barre d'actions : au-dessus de la barre basse mobile, en bas de l'écran sur ordinateur */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-4 z-30 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-2xl shadow-sm px-4 py-3 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => garde.naviguer(RETOUR)} disabled={isPending} className="min-h-[44px]">
          Annuler
        </Button>
        <Button
          type="button"
          variant="primary"
          isLoading={isPending}
          loadingText="Enregistrement..."
          disabled={isPending || isPreparingPhoto || activeCompanyProducts.length === 0}
          onClick={() => formRef.current?.requestSubmit()}
          className="min-h-[44px]"
        >
          {isEditing ? "Enregistrer les modifications" : "Créer la production"}
        </Button>
      </div>
    </div>
  );
}
