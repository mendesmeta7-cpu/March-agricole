"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import { useUnsavedChangesGuard } from "@/components/ui/useUnsavedChangesGuard";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  EligibleProductionOption,
  CompanyCampaignItem,
} from "@/lib/queries/campaigns";
import { AggregatedDemandItem } from "@/lib/queries/demands";
import { Province } from "@/lib/queries/geography";
import {
  createCampaignAction,
  updateCampaignAction,
  getProductionAvailabilityAction,
} from "@/lib/actions/campaigns";
import type { ProductionCampaignAvailability } from "@/lib/actions/campaignAvailability";
import Select from "@/components/ui/Select";
import {
  Tractor,
  Calendar,
  MapPin,
  TrendingUp,
  AlertCircle,
  Plus,
  Trash2,
  Building,
  Clock,
} from "lucide-react";
import { formatMoney, formatQuantity, formatQuantityWithUnit } from "@/lib/utils/numberFormat";

export interface FormDepot {
  id?: string;
  name: string;
  commune: string;
  quartier: string;
  address: string;
  complement: string;
}

export interface FormDestination {
  id?: string;
  province_id: string;
  city_name: string;
  expected_arrival_date: string;
  order_deadline_date?: string | null;
  depots: FormDepot[];
}

interface CampaignFormProps {
  /** « assistant » : création en cinq étapes ; « sections » : modification sur une page à sections */
  mode: "assistant" | "sections";
  eligibleProductions: EligibleProductionOption[];
  provinces: Province[];
  marketDemands: AggregatedDemandItem[];
  campaignToEdit?: CompanyCampaignItem | null;
  defaultProductionId?: string;
}

/**
 * Formulaire de campagne en page dédiée (Lot UX/UI 5B, ADR-058), issu de l'ancienne modale CampaignFormModal :
 * mêmes champs, mêmes contrôles, mêmes actions serveur. Création : assistant en cinq étapes, sans
 * enregistrement intermédiaire. Modification : sections navigables. Saisie protégée avant de quitter.
 */
export default function CampaignForm({
  mode,
  eligibleProductions,
  provinces,
  marketDemands,
  campaignToEdit,
  defaultProductionId,
}: CampaignFormProps) {
  // Page dédiée : le formulaire est toujours affiché.
  const isOpen = true;
  const isEditing = !!campaignToEdit;

  const [productionId, setProductionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [marketableQuantity, setMarketableQuantity] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [minOrderQuantity, setMinOrderQuantity] = useState<number | "">(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availabilityPeriod, setAvailabilityPeriod] = useState("");
  const [destinations, setDestinations] = useState<FormDestination[]>([]);
  const [status, setStatus] = useState<"draft" | "active">("draft");

  // D2 / D4 — seules les productions récoltées sont proposées, avec leur volume encore
  // disponible pour une campagne. En modification, la production de la campagne est
  // affichée même si elle n'est plus proposable (le sélecteur est alors verrouillé).
  const productionOptions = useMemo(() => {
    const options = eligibleProductions.map((prod) => ({
      value: prod.id,
      label:
        prod.available_quantity === null
          ? `${prod.title} — ${prod.product_name} (disponibilité illisible)`
          : `${prod.title} — ${prod.product_name} (disponible : ${formatQuantityWithUnit(prod.available_quantity, prod.unit)})`,
    }));
    if (campaignToEdit && !options.some((o) => o.value === campaignToEdit.production_id)) {
      options.unshift({
        value: campaignToEdit.production_id,
        label: `${campaignToEdit.production.title} — ${campaignToEdit.product.name}`,
      });
    }
    return options;
  }, [eligibleProductions, campaignToEdit]);

  // D4 — en modification, disponibilité lue côté serveur en excluant la campagne modifiée
  const [editAvailability, setEditAvailability] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "ready"; data: ProductionCampaignAvailability }
    | { state: "error"; message: string }
  >({ state: "idle" });

  useEffect(() => {
    if (!isOpen || !campaignToEdit) {
      setEditAvailability({ state: "idle" });
      return;
    }
    let cancelled = false;
    setEditAvailability({ state: "loading" });
    getProductionAvailabilityAction(campaignToEdit.production_id, campaignToEdit.id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.availability) {
          setEditAvailability({ state: "ready", data: res.availability });
        } else {
          setEditAvailability({
            state: "error",
            message: res.error || "La disponibilité de la production est momentanément illisible.",
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditAvailability({
            state: "error",
            message: "La disponibilité de la production est momentanément illisible. Vérifiez votre connexion.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, campaignToEdit]);

  const currencyOptions = useMemo(
    () => [
      { value: "USD", label: "USD" },
      { value: "CDF", label: "CDF" },
    ],
    []
  );

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const errorRef = useRef<HTMLDivElement | null>(null);

  // LOAD-04 : l'erreur est affichée près du bouton d'envoi et ramenée dans le champ de vision.
  useEffect(() => {
    if (errorMessage && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errorMessage]);

  // Initialisation une seule fois par campagne : un rafraîchissement des données de la page
  // ne doit jamais effacer la saisie en cours.
  const initialisation = useRef<string | null>(null);
  const [instantaneInitial, setInstantaneInitial] = useState<string | null>(null);
  const [initialisationEnCours, setInitialisationEnCours] = useState(false);
  useEffect(() => {
    const cle = campaignToEdit?.id ?? "nouvelle";
    if (initialisation.current === cle) return;
    initialisation.current = cle;
    setInitialisationEnCours(true);
    if (campaignToEdit) {
      setProductionId(campaignToEdit.production_id);
      setTitle(campaignToEdit.title);
      setDescription(campaignToEdit.description || "");
      setMarketableQuantity(campaignToEdit.marketable_quantity);
      setUnitPrice(campaignToEdit.unit_price);
      setCurrency(campaignToEdit.currency || "USD");
      setMinOrderQuantity(campaignToEdit.min_order_quantity || 1);
      setStartDate(campaignToEdit.start_date || "");
      setEndDate(campaignToEdit.end_date || "");
      setAvailabilityPeriod(campaignToEdit.availability_period || "");
      setStatus(campaignToEdit.status === "active" ? "active" : "draft");

      if (campaignToEdit.destinations && campaignToEdit.destinations.length > 0) {
        setDestinations(
          campaignToEdit.destinations.map((d) => ({
            id: d.id,
            province_id: d.province_id,
            city_name: d.city_name,
            expected_arrival_date: d.expected_arrival_date,
            order_deadline_date: d.order_deadline_date || null,
            depots: (d.depots || []).map((dep) => ({
              id: dep.id,
              name: dep.name,
              commune: dep.commune,
              quartier: dep.quartier || "",
              address: dep.address,
              complement: dep.complement || "",
            })),
          }))
        );
      } else if (campaignToEdit.delivery_zones && campaignToEdit.delivery_zones.length > 0) {
        // Rétrocompatibilité avec les anciennes campagnes sans destinations
        setDestinations(
          campaignToEdit.delivery_zones.map((z) => {
            const matchedProv = provinces.find((p) => p.id === z.province_id);
            const provName = matchedProv?.name || "Territoire";
            return {
              province_id: z.province_id,
              city_name: provName,
              expected_arrival_date: campaignToEdit.start_date || new Date().toISOString().split("T")[0],
              depots: [
                {
                  name: `Dépôt principal ${provName}`,
                  commune: "",
                  quartier: "",
                  address: "",
                  complement: "",
                },
              ],
            };
          })
        );
      } else {
        setDestinations([]);
      }
    } else {
      // Création
      const initialProdId =
        defaultProductionId && eligibleProductions.some((p) => p.id === defaultProductionId)
          ? defaultProductionId
          : eligibleProductions[0]?.id || "";
      const prod = eligibleProductions.find((p) => p.id === initialProdId);

      setProductionId(initialProdId);
      setTitle(prod ? `Campagne ${prod.title}` : "");
      setDescription("");
      setMarketableQuantity(prod?.available_quantity ? prod.available_quantity : "");
      setUnitPrice("");
      setCurrency("USD");
      setMinOrderQuantity(1);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setAvailabilityPeriod("");
      setDestinations([]);
      setStatus("draft");
    }
    setErrorMessage(null);
  }, [campaignToEdit, eligibleProductions, isOpen, defaultProductionId, provinces]);

  // Étapes de l'assistant (création) ; en modification, toutes les sections sont affichées.
  const [etape, setEtape] = useState(1);
  const [etapeMax, setEtapeMax] = useState(1);
  const instantane = JSON.stringify({
    productionId, title, description, marketableQuantity, unitPrice, currency, minOrderQuantity,
    startDate, endDate, availabilityPeriod, destinations, status,
  });
  useEffect(() => {
    if (initialisationEnCours) {
      setInstantaneInitial(instantane);
      setInitialisationEnCours(false);
    }
  }, [initialisationEnCours, instantane]);
  const modifie = instantaneInitial !== null && instantane !== instantaneInitial;
  const garde = useUnsavedChangesGuard(modifie);
  const RETOUR = "/dashboard/company/campaigns";

  // Production actuellement sélectionnée
  const selectedProduction = eligibleProductions.find((p) => p.id === productionId);

  // D4 — volume disponible pour CETTE campagne (null = inconnu : enregistrement bloqué,
  // jamais de repli sur le volume déclaré). En modification, la quantité actuelle de la
  // campagne reste acceptée (le contrôle en base ne porte que sur un engagement accru).
  const availabilityInfo: {
    available: number | null;
    committed: number | null;
    expected: number | null;
    unit: string;
    loading: boolean;
    error: string | null;
  } = isEditing
    ? editAvailability.state === "ready"
      ? {
          available: editAvailability.data.available_quantity,
          committed: editAvailability.data.committed_quantity,
          expected: editAvailability.data.expected_quantity,
          unit: editAvailability.data.unit,
          loading: false,
          error: null,
        }
      : {
          available: null,
          committed: null,
          expected: null,
          unit: campaignToEdit?.unit || "tonne",
          loading: editAvailability.state === "loading" || editAvailability.state === "idle",
          error: editAvailability.state === "error" ? editAvailability.message : null,
        }
    : {
        available: selectedProduction?.available_quantity ?? null,
        committed: selectedProduction?.committed_quantity ?? null,
        expected: selectedProduction?.expected_quantity ?? null,
        unit: selectedProduction?.unit || "tonne",
        loading: false,
        error:
          selectedProduction && selectedProduction.availability_error
            ? "La disponibilité de cette production est momentanément illisible. Veuillez recharger la page."
            : null,
      };
  const originalQuantity = isEditing ? Number(campaignToEdit?.marketable_quantity || 0) : 0;
  const maxAllowedQuantity =
    availabilityInfo.available === null ? null : Math.max(availabilityInfo.available, originalQuantity);
  const currentUnit = availabilityInfo.unit;
  const isQuantityOverMax =
    typeof marketableQuantity === "number" &&
    maxAllowedQuantity !== null &&
    marketableQuantity > maxAllowedQuantity;
  const todayStr = new Date().toISOString().split("T")[0];

  // Demandes observées pertinentes pour ce produit (aide à la décision)
  const relevantDemands = selectedProduction
    ? marketDemands.filter((d) => d.product_id === selectedProduction.product_id)
    : [];

  // Dictionnaire des demandes indexées par province_id
  const demandByProvinceId = new Map<string, AggregatedDemandItem>();
  relevantDemands.forEach((dem) => {
    if (dem.province_id) {
      demandByProvinceId.set(dem.province_id, dem);
    }
  });

  // Bascule de sélection d'une destination / territoire
  const handleToggleTerritory = (prov: Province) => {
    const isAlreadySelected = destinations.some((d) => d.province_id === prov.id);

    if (isAlreadySelected) {
      // Retrait de la destination
      setDestinations((prev) => prev.filter((d) => d.province_id !== prov.id));
    } else {
      // Ajout automatique de la destination avec bloc de configuration par défaut
      const defaultDate = startDate || new Date().toISOString().split("T")[0];
      setDestinations((prev) => [
        ...prev,
        {
          province_id: prov.id,
          city_name: prov.name,
          expected_arrival_date: defaultDate,
          order_deadline_date: null,
          depots: [
            {
              name: `Dépôt principal ${prov.name}`,
              commune: "",
              quartier: "",
              address: "",
              complement: "",
            },
          ],
        },
      ]);
    }
  };

  const handleSelectAllTerritories = () => {
    const defaultDate = startDate || new Date().toISOString().split("T")[0];
    const newDestinations: FormDestination[] = provinces.map((prov) => {
      const existing = destinations.find((d) => d.province_id === prov.id);
      if (existing) return existing;
      return {
        province_id: prov.id,
        city_name: prov.name,
        expected_arrival_date: defaultDate,
        order_deadline_date: null,
        depots: [
          {
            name: `Dépôt principal ${prov.name}`,
            commune: "",
            quartier: "",
            address: "",
            complement: "",
          },
        ],
      };
    });
    setDestinations(newDestinations);
  };

  const handleClearAllTerritories = () => {
    setDestinations([]);
  };

  const handleUpdateDestinationDate = (destIndex: number, dateValue: string) => {
    setDestinations((prev) => {
      const next = [...prev];
      next[destIndex] = { ...next[destIndex], expected_arrival_date: dateValue };
      return next;
    });
  };

  const handleUpdateDestinationDeadline = (destIndex: number, dateValue: string) => {
    setDestinations((prev) => {
      const next = [...prev];
      next[destIndex] = { ...next[destIndex], order_deadline_date: dateValue || null };
      return next;
    });
  };

  const handleRemoveDestinationByIndex = (destIndex: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== destIndex));
  };

  const handleAddDepot = (destIndex: number) => {
    setDestinations((prev) => {
      const next = [...prev];
      const dest = next[destIndex];
      const currentDepots = dest.depots || [];
      next[destIndex] = {
        ...dest,
        depots: [
          ...currentDepots,
          {
            name: `Dépôt #${currentDepots.length + 1} ${dest.city_name}`,
            commune: "",
            quartier: "",
            address: "",
            complement: "",
          },
        ],
      };
      return next;
    });
  };

  const handleRemoveDepot = (destIndex: number, depotIndex: number) => {
    setDestinations((prev) => {
      const next = [...prev];
      const dest = next[destIndex];
      if (dest.depots.length <= 1) return prev; // Conserver au moins 1 dépôt
      next[destIndex] = {
        ...dest,
        depots: dest.depots.filter((_, i) => i !== depotIndex),
      };
      return next;
    });
  };

  const handleUpdateDepot = (
    destIndex: number,
    depotIndex: number,
    field: keyof FormDepot,
    value: string
  ) => {
    setDestinations((prev) => {
      const next = [...prev];
      const dest = next[destIndex];
      const depots = [...dest.depots];
      depots[depotIndex] = { ...depots[depotIndex], [field]: value };
      next[destIndex] = { ...dest, depots };
      return next;
    });
  };

  // Contrôles d'origine regroupés par étape (aucun retiré ni modifié) : 16 messages.
  const validerEtape = (n: number): string | null => {
    if (n === 1) {
      if (!productionId) {
        return "Veuillez sélectionner une production de référence.";
      }

      if (maxAllowedQuantity === null) {
        return availabilityInfo.loading
            ? "Vérification du volume disponible en cours, veuillez patienter."
            : availabilityInfo.error || "Le volume disponible de la production est momentanément illisible.";
      }

      if (typeof marketableQuantity !== "number" || marketableQuantity <= 0) {
        return "La quantité mise en vente doit être strictement positive.";
      }

      if (marketableQuantity > maxAllowedQuantity) {
        return `La quantité mise en vente (${formatQuantityWithUnit(marketableQuantity, currentUnit)}) dépasse le volume disponible pour cette campagne (${formatQuantityWithUnit(maxAllowedQuantity, currentUnit)}).`;
      }

      if (typeof unitPrice !== "number" || unitPrice <= 0) {
        return "Le prix unitaire doit être strictement positif.";
      }
    }
    if (n === 2) {
      const todayStr = new Date().toISOString().split("T")[0];

      // Contrôle anti-dates passées (Règle métier stricte)
      if (!isEditing && startDate < todayStr) {
        return "La date d'ouverture de vente ne peut pas être dans le passé.";
      }

      if (endDate && endDate < todayStr) {
        return "La date de clôture commerciale ne peut pas être dans le passé.";
      }

      if (endDate && startDate && endDate < startDate) {
        return "La date de clôture ne peut pas être antérieure à la date d'ouverture.";
      }
    }
    if (n === 3) {
      // Validation stricte des destinations
      if (destinations.length === 0) {
        return "Veuillez sélectionner au moins une destination à desservir pour cette campagne.";
      }
    }
    if (n === 4) {
      // Validation des dates et dépôts par destination
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        if (!dest.expected_arrival_date) {
          return `Veuillez renseigner la date prévue d'arrivée pour la destination ${dest.city_name}.`;
        }
        if (dest.expected_arrival_date < todayStr) {
          return `La date prévue d'arrivée pour ${dest.city_name} ne peut pas être dans le passé.`;
        }
        if (dest.order_deadline_date && dest.order_deadline_date < todayStr) {
          return `La date limite de commande pour ${dest.city_name} ne peut pas être dans le passé.`;
        }
        if (!dest.depots || dest.depots.length === 0) {
          return `Veuillez ajouter au moins un point de dépôt pour la destination ${dest.city_name}.`;
        }
        for (let j = 0; j < dest.depots.length; j++) {
          const dep = dest.depots[j];
          if (!dep.name.trim()) {
            return `Veuillez renseigner le nom du dépôt #${j + 1} à ${dest.city_name}.`;
          }
          if (!dep.commune.trim()) {
            return `Veuillez renseigner la commune pour le dépôt #${j + 1} à ${dest.city_name}.`;
          }
          if (!dep.address.trim()) {
            return `Veuillez renseigner la rue / avenue / marché pour le dépôt #${j + 1} à ${dest.city_name}.`;
          }
        }
      }
    }
    return null;
  };
  const SECTIONS = ["etape-production", "etape-calendrier", "etape-destinations", "etape-configuration", "etape-publication"];
  // Titre de page (focus à l'arrivée) et titre de l'étape affichée (focus à chaque changement d'étape)
  const titrePageRef = useRef<HTMLHeadingElement>(null);
  const focusEtape = useRef(false);
  useEffect(() => {
    titrePageRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!focusEtape.current) return;
    focusEtape.current = false;
    document.getElementById(`titre-${SECTIONS[etape - 1]}`)?.focus({ preventScroll: true });
  }, [etape]);
  const allerA = (n: number) => {
    setErrorMessage(null);
    focusEtape.current = mode === "assistant";
    setEtape(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const montrerErreur = (n: number, message: string) => {
    if (mode === "assistant") {
      setEtapeMax((m) => Math.max(m, n));
      setEtape(n);
    } else {
      document.getElementById(SECTIONS[n - 1])?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setErrorMessage(message);
  };
  const suivante = () => {
    const message = validerEtape(etape);
    if (message) {
      setErrorMessage(message);
      return;
    }
    const n = Math.min(5, etape + 1);
    setEtapeMax((m) => Math.max(m, n));
    allerA(n);
  };
  // Étape à reprendre après un refus du serveur, d'après le contenu du message
  const etapeDuMessage = (message: string): number =>
    /dépôt|destination|arrivée|limite de commande|ville/i.test(message) ? 4
      : /territoire|province/i.test(message) ? 3
      : /date|clôture|ouverture/i.test(message) ? 2
      : /production|quantité|volume|prix|disponib/i.test(message) ? 1
      : 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    // Entrée dans un champ d'une étape intermédiaire : passage à l'étape suivante, jamais d'envoi
    if (mode === "assistant" && etape < 5) {
      suivante();
      return;
    }
    for (const n of [1, 2, 3, 4]) {
      const message = validerEtape(n);
      if (message) {
        montrerErreur(n, message);
        return;
      }
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("production_id", productionId);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("marketable_quantity", marketableQuantity.toString());
        formData.append("unit_price", unitPrice.toString());
        formData.append("currency", currency);
        formData.append("min_order_quantity", (minOrderQuantity || 1).toString());
        formData.append("start_date", startDate);
        if (endDate) formData.append("end_date", endDate);
        if (availabilityPeriod) formData.append("availability_period", availabilityPeriod);
        formData.append("status", status);

        // Synchronisation des province_ids
        destinations.forEach((d) => {
          formData.append("province_ids", d.province_id);
        });

        // Destinations et dépôts
        formData.append("destinations_json", JSON.stringify(destinations));

        const res = isEditing
          ? await updateCampaignAction(campaignToEdit.id, formData)
          : await createCampaignAction(formData);

        if (res.success) {
          toast.success(isEditing ? "Campagne mise à jour" : "Campagne enregistrée", {
            description: res.message,
          });
          garde.desarmer();
          router.push(RETOUR);
        } else if (res.campaignId) {
          // La campagne existe mais est incomplète : on ferme la modale (pour éviter une
          // seconde création) et on affiche l'erreur de façon persistante.
          toast.error("Campagne incomplète", {
            description: res.error || "La campagne doit être complétée.",
            duration: 12000,
          });
          garde.desarmer();
          router.push(RETOUR);
        } else {
          const message = res.error || "Une erreur est survenue.";
          montrerErreur(etapeDuMessage(message), message);
        }
      } catch (err: any) {
        console.error("Erreur enregistrement campagne :", err);
        setErrorMessage("Erreur de connexion.");
      }
    });
  };

  const ETAPES = [
    { n: 1, id: "etape-production", titre: "Production et offre" },
    { n: 2, id: "etape-calendrier", titre: "Calendrier et présentation" },
    { n: 3, id: "etape-destinations", titre: "Destinations" },
    { n: 4, id: "etape-configuration", titre: "Configuration par destination" },
    { n: 5, id: "etape-publication", titre: "Vérification et publication" },
  ];
  const visible = (n: number) => (mode === "sections" ? n <= 4 : etape === n);
  const productionChoisie = productionOptions.find((o) => o.value === productionId)?.label;
  const dateFr = (d: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR") : "—");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {garde.dialog}
      <div className="space-y-2">
        <Link href={RETOUR} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-forest-800">
          ← Retour aux campagnes
        </Link>
        <h1 ref={titrePageRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-gray-900 focus:outline-none">
          {isEditing ? "Modifier la campagne" : "Nouvelle campagne"}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Définissez votre campagne, vos prix, périodes et configurez vos destinations d&apos;arrivée.
        </p>
      </div>

      {mode === "assistant" ? (
        <nav aria-label="Étapes de la création de la campagne" className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
          <p className="text-xs font-semibold text-gray-700 mb-2" aria-live="polite">
            Étape {etape} sur 5 : {ETAPES[etape - 1].titre}
          </p>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3" aria-hidden="true">
            <div className="h-full bg-forest-600 transition-all" style={{ width: `${(etape / 5) * 100}%` }} />
          </div>
          <ol className="grid grid-cols-5 gap-1.5">
            {ETAPES.map((e) => (
              <li key={e.n}>
                <button
                  type="button"
                  onClick={() => e.n <= etapeMax && allerA(e.n)}
                  disabled={e.n > etapeMax || isPending}
                  aria-current={e.n === etape ? "step" : undefined}
                  aria-label={`Étape ${e.n} : ${e.titre}`}
                  className={`w-full min-h-[44px] rounded-xl px-1.5 py-1.5 text-xs font-semibold leading-tight text-center transition-colors disabled:cursor-not-allowed ${
                    e.n === etape
                      ? "bg-forest-700 text-white"
                      : e.n <= etapeMax
                      ? "bg-forest-50 text-forest-800 hover:bg-forest-100"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  <span className="block">{e.n}</span>
                  <span className="hidden md:block">{e.titre}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : (
        <nav aria-label="Sections de la campagne" className="bg-white rounded-2xl border border-gray-200 p-2 overflow-x-auto no-scrollbar">
          <ul className="flex gap-1.5 min-w-max">
            {ETAPES.slice(0, 4).map((e) => (
              <li key={e.n}>
                <a href={`#${e.id}`} className="inline-flex items-center min-h-[44px] px-3 rounded-xl text-xs font-semibold text-forest-800 hover:bg-forest-50">
                  {e.titre}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <form id="campaign-form" onSubmit={handleSubmit} className="space-y-6 text-sm">
        {visible(1) && (
          <section id="etape-production" aria-labelledby="titre-etape-production" className="scroll-mt-24 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-6">
            <h2 id="titre-etape-production" tabIndex={-1} className="text-base font-bold text-gray-900 focus:outline-none">1. Production et offre</h2>
          {/* 1. Sélection obligatoire de la production parente */}
          <div className="space-y-2">
            <label id="campaign-production-label" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Production de Référence (Obligatoire) *
            </label>
            {!isEditing && eligibleProductions.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                Aucune production récoltée disponible. Une campagne ne peut être créée que sur une production au statut
                « Récoltée » : faites évoluer le statut de votre production depuis l&apos;espace Productions, puis revenez ici.
              </div>
            ) : (
              <Select aria-labelledby="campaign-production-label"
                disabled={isEditing}
                value={productionId}
                onChange={(e) => setProductionId(e.target.value)}
                options={productionOptions}
                searchable
                leftIcon={<Tractor className="w-4 h-4 text-forest-700" />}
                placeholder="Sélectionner une production..."
                required
              />
            )}

            {(selectedProduction || isEditing) && (
              <div
                id="campaign-production-availability"
                className="p-3 rounded-xl bg-forest-50/60 border border-forest-100 text-xs text-forest-900 space-y-1"
                aria-live="polite"
              >
                {availabilityInfo.loading ? (
                  <span className="flex items-center gap-1.5 font-medium text-forest-800">
                    <Clock className="w-4 h-4 text-forest-700" aria-hidden="true" />
                    Vérification du volume disponible…
                  </span>
                ) : availabilityInfo.error || availabilityInfo.available === null ? (
                  <span className="flex items-start gap-1.5 font-medium text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                    {availabilityInfo.error ||
                      "La disponibilité de cette production est momentanément illisible."}
                  </span>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Tractor className="w-4 h-4 text-forest-700" aria-hidden="true" />
                        Disponible pour cette campagne :
                      </span>
                      <span className="font-extrabold text-forest-950">
                        {formatQuantityWithUnit(availabilityInfo.available, currentUnit)}
                      </span>
                    </div>
                    {availabilityInfo.committed !== null && availabilityInfo.expected !== null && (
                      <p className="text-xs text-forest-800/80">
                        Déjà engagé sur d&apos;autres campagnes ou commandes :{" "}
                        {formatQuantityWithUnit(availabilityInfo.committed, currentUnit)} sur un volume déclaré de{" "}
                        {formatQuantityWithUnit(availabilityInfo.expected, currentUnit)}.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* 2. Titre de la campagne */}
          <div className="space-y-1.5">
            <label htmlFor="campaign-title" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Titre de la campagne *
            </label>
            <input id="campaign-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Maïs Blanc Séché - Arrivage Kinshasa Octobre"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none"
            />
          </div>

          {/* 3. Volume commercialisé & Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantité commercialisée */}
            <div className="space-y-1.5">
              <label
                htmlFor="campaign-marketable-quantity"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700"
              >
                Quantité Mise en Vente ({currentUnit}) *
              </label>
              <div className="relative">
                <input
                  id="campaign-marketable-quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  max={maxAllowedQuantity ?? undefined}
                  value={marketableQuantity}
                  onChange={(e) =>
                    setMarketableQuantity(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  placeholder={
                    maxAllowedQuantity === null
                      ? "Disponibilité en cours de vérification"
                      : `Max : ${formatQuantity(maxAllowedQuantity)}`
                  }
                  required
                  aria-invalid={isQuantityOverMax || undefined}
                  aria-describedby="campaign-marketable-quantity-hint campaign-production-availability"
                  className={`w-full px-3.5 py-2 rounded-xl border text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none ${
                    isQuantityOverMax ? "border-rose-400 bg-rose-50" : "border-gray-300"
                  }`}
                />
              </div>
              <span id="campaign-marketable-quantity-hint" className="text-xs text-gray-500 block">
                {maxAllowedQuantity === null
                  ? "Le volume disponible doit être vérifié avant l'enregistrement."
                  : `Doit être ≤ au volume disponible pour cette campagne (${formatQuantityWithUnit(maxAllowedQuantity, currentUnit)}).`}
              </span>
            </div>

            {/* Prix unitaire ferme */}
            <div className="space-y-1.5">
              <label htmlFor="campaign-unit-price" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Prix Unitaire Ferme *
              </label>
              <div className="flex gap-2">
                <input id="campaign-unit-price"
                  type="number"
                  step="any"
                  min="0.01"
                  value={unitPrice}
                  onChange={(e) =>
                    setUnitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  placeholder="Ex: 450"
                  required
                  className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none"
                />
                <div className="w-28">
                  <Select
                    aria-label="Devise"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    options={currencyOptions}
                    selectSize="md"
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 block">
                Prix par {currentUnit}
              </span>
            </div>
          </div>
          </section>
        )}
        {visible(2) && (
          <section id="etape-calendrier" aria-labelledby="titre-etape-calendrier" className="scroll-mt-24 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-6">
            <h2 id="titre-etape-calendrier" tabIndex={-1} className="text-base font-bold text-gray-900 focus:outline-none">2. Calendrier et présentation</h2>
          {/* 4. Calendrier commercial (Période) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="campaign-start-date" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Date d&apos;Ouverture de Vente *
              </label>
              <input id="campaign-start-date"
                type="date"
                min={isEditing && startDate && startDate < todayStr ? startDate : todayStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="campaign-end-date" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Date de Clôture (Fin Commerciale)
              </label>
              <input id="campaign-end-date"
                type="date"
                min={startDate && startDate > todayStr ? startDate : todayStr}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none"
              />
              <span className="text-xs text-gray-500 block">
                À cette date, la campagne sera automatiquement clôturée.
              </span>
            </div>
          </div>

          {/* Disponibilité & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="campaign-availability-period" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Précision de Disponibilité
              </label>
              <input id="campaign-availability-period"
                type="text"
                value={availabilityPeriod}
                onChange={(e) => setAvailabilityPeriod(e.target.value)}
                placeholder="Ex: Enlèvement sous 48h, bord champ"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="campaign-description" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Description / Modalités
              </label>
              <input id="campaign-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conditionnement en sacs de 50kg, etc."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none"
              />
            </div>
          </div>
          </section>
        )}
        {visible(3) && (
          <section id="etape-destinations" aria-labelledby="titre-etape-destinations" className="scroll-mt-24 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-5">
            <h2 id="titre-etape-destinations" tabIndex={-1} className="text-base font-bold text-gray-900 focus:outline-none">3. Destinations</h2>
            {/* 1. Sélecteur de Territoires / Destinations */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p id="campaign-destinations-label" className="block text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-forest-700" aria-hidden="true" />
                    Destinations Desservies ({destinations.length} sélectionnée{destinations.length > 1 ? "s" : ""}) *
                  </p>
                  <p className="text-xs text-gray-500">
                    Cochez les territoires que vous desservez dans cette campagne. Chaque territoire sélectionné génère automatiquement son bloc de configuration.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllTerritories}
                    className="text-xs text-forest-700 hover:text-forest-900 font-semibold"
                  >
                    Tout sélectionner
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllTerritories}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Effacer
                  </button>
                </div>
              </div>

              {/* Grille de sélection des territoires avec mise en valeur des demandes */}
              <div role="group" aria-labelledby="campaign-destinations-label" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-52 overflow-y-auto overscroll-contain p-3 rounded-2xl bg-gray-50 border border-gray-200">
                {provinces.map((prov) => {
                  const isSelected = destinations.some((d) => d.province_id === prov.id);
                  const demand = demandByProvinceId.get(prov.id);

                  return (
                    <label
                      key={prov.id}
                      className={`flex flex-col p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                        isSelected
                          ? "bg-forest-50/90 border-forest-400 text-forest-950 font-semibold shadow-xs"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTerritory(prov)}
                          className="rounded text-forest-700 focus:ring-forest-500 w-3.5 h-3.5"
                        />
                        <span className="truncate">{prov.name}</span>
                      </div>

                      {demand && (
                        <span className="mt-1 text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium w-fit">
                          <TrendingUp className="w-2.5 h-2.5 text-amber-600" />
                          {formatQuantityWithUnit(demand.total_demanded_quantity, demand.unit)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        )}
        {visible(4) && (
          <section id="etape-configuration" aria-labelledby="titre-etape-configuration" className="scroll-mt-24 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-5">
            <h2 id="titre-etape-configuration" tabIndex={-1} className="text-base font-bold text-gray-900 focus:outline-none">4. Configuration par destination</h2>
            {/* 2. Blocs de configuration générés automatiquement pour chaque destination sélectionnée */}
            {destinations.length === 0 ? (
              <div className="p-5 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center space-y-1.5">
                <p className="text-xs font-semibold text-gray-600">
                  Aucune destination sélectionnée pour cette campagne.
                </p>
                <p className="text-xs text-gray-500">
                  Cochez au moins un territoire ci-dessus pour définir sa date d&apos;arrivée prévue et ses dépôts de retrait.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-forest-700" />
                    Configuration des Arrivées & Dépôts par Destination
                  </span>
                  <span className="text-[11px] text-forest-700 font-medium bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
                    {destinations.length} destination{destinations.length > 1 ? "s" : ""} active{destinations.length > 1 ? "s" : ""}
                  </span>
                </div>

                {destinations.map((dest, destIdx) => (
                  <div
                    key={dest.province_id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-forest-200 shadow-xs space-y-4 transition-all"
                  >
                    {/* En-tête de la destination */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-forest-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {destIdx + 1}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-sm tracking-wide">
                            {dest.city_name}
                          </h4>
                          <span className="text-xs text-forest-700 font-medium">
                            Territoire de destination
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDestinationByIndex(destIdx)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Retirer cette destination"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Retirer</span>
                      </button>
                    </div>

                    {/* Dates pour cette destination : Arrivée & Date limite de commande */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                      <div className="space-y-1">
                        <label htmlFor={`campaign-dest-${destIdx}-arrival`} className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-forest-600" />
                          Date Prévue d&apos;Arrivée à {dest.city_name} *
                        </label>
                        <input id={`campaign-dest-${destIdx}-arrival`}
                          type="date"
                          min={todayStr}
                          value={dest.expected_arrival_date}
                          onChange={(e) => handleUpdateDestinationDate(destIdx, e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor={`campaign-dest-${destIdx}-deadline`} className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-forest-600" />
                          Date Limite de Commande
                          <span className="text-gray-400 font-normal normal-case ml-1">(optionnel)</span>
                        </label>
                        <input id={`campaign-dest-${destIdx}-deadline`}
                          type="date"
                          min={todayStr}
                          value={dest.order_deadline_date || ""}
                          onChange={(e) => handleUpdateDestinationDeadline(destIdx, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                        />
                        <span className="text-xs text-gray-500 block">
                          Fermera automatiquement les commandes pour {dest.city_name}.
                        </span>
                      </div>
                    </div>

                    {/* Dépôts / Points de retrait exclusifs à cette destination */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                          Points / Dépôts d&apos;arrivée ({dest.depots?.length || 0}) *
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddDepot(destIdx)}
                          className="text-xs text-forest-700 hover:text-forest-900 font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-forest-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter un dépôt à {dest.city_name}
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {dest.depots.map((dep, depIdx) => (
                          <div
                            key={depIdx}
                            className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center text-[11px] font-bold">
                                  {depIdx + 1}
                                </span>
                                Dépôt #{depIdx + 1} ({dest.city_name})
                              </span>
                              {dest.depots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDepot(destIdx, depIdx)}
                                  className="text-rose-500 hover:text-rose-700 p-1 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" /> Supprimer ce dépôt
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label htmlFor={`campaign-dest-${destIdx}-depot-${depIdx}-name`} className="block text-[11px] uppercase font-bold text-gray-600 mb-0.5">
                                  Nom du Dépôt
                                </label>
                                <input id={`campaign-dest-${destIdx}-depot-${depIdx}-name`}
                                  type="text"
                                  value={dep.name}
                                  onChange={(e) => handleUpdateDepot(destIdx, depIdx, "name", e.target.value)}
                                  placeholder="Ex: Dépôt Central Lemba"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                                />
                              </div>
                              <div>
                                <label htmlFor={`campaign-dest-${destIdx}-depot-${depIdx}-commune`} className="block text-[11px] uppercase font-bold text-gray-600 mb-0.5">
                                  Commune *
                                </label>
                                <input id={`campaign-dest-${destIdx}-depot-${depIdx}-commune`}
                                  type="text"
                                  value={dep.commune}
                                  onChange={(e) => handleUpdateDepot(destIdx, depIdx, "commune", e.target.value)}
                                  placeholder="Ex: Lemba, Limete..."
                                  required
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label htmlFor={`campaign-dest-${destIdx}-depot-${depIdx}-quartier`} className="block text-[11px] uppercase font-bold text-gray-600 mb-0.5">
                                  Quartier
                                </label>
                                <input id={`campaign-dest-${destIdx}-depot-${depIdx}-quartier`}
                                  type="text"
                                  value={dep.quartier}
                                  onChange={(e) => handleUpdateDepot(destIdx, depIdx, "quartier", e.target.value)}
                                  placeholder="Ex: Quartier 1"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                                />
                              </div>
                              <div>
                                <label htmlFor={`campaign-dest-${destIdx}-depot-${depIdx}-address`} className="block text-[11px] uppercase font-bold text-gray-600 mb-0.5">
                                  Rue / Avenue / Marché *
                                </label>
                                <input id={`campaign-dest-${destIdx}-depot-${depIdx}-address`}
                                  type="text"
                                  value={dep.address}
                                  onChange={(e) => handleUpdateDepot(destIdx, depIdx, "address", e.target.value)}
                                  placeholder="Ex: 1ère Rue, Marché central"
                                  required
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                                />
                              </div>
                              <div>
                                <label htmlFor={`campaign-dest-${destIdx}-depot-${depIdx}-complement`} className="block text-[11px] uppercase font-bold text-gray-600 mb-0.5">
                                  Repère / Complément
                                </label>
                                <input id={`campaign-dest-${destIdx}-depot-${depIdx}-complement`}
                                  type="text"
                                  value={dep.complement}
                                  onChange={(e) => handleUpdateDepot(destIdx, depIdx, "complement", e.target.value)}
                                  placeholder="Ex: En face de la station"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {mode === "assistant" && etape === 5 && (
          <section id="etape-publication" aria-labelledby="titre-etape-publication" className="scroll-mt-24 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-5">
            <h2 id="titre-etape-publication" tabIndex={-1} className="text-base font-bold text-gray-900 focus:outline-none">5. Vérification et publication</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><dt className="font-semibold text-gray-600">Production</dt><dd className="text-gray-900">{productionChoisie || "—"}</dd></div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><dt className="font-semibold text-gray-600">Titre</dt><dd className="text-gray-900">{title || "—"}</dd></div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><dt className="font-semibold text-gray-600">Quantité mise en vente</dt><dd className="text-gray-900">{marketableQuantity === "" ? "—" : formatQuantityWithUnit(marketableQuantity, currentUnit)}</dd></div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><dt className="font-semibold text-gray-600">Prix unitaire</dt><dd className="text-gray-900 whitespace-nowrap">{unitPrice === "" ? "—" : `${formatMoney(unitPrice, currency)}/${currentUnit}`}</dd></div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><dt className="font-semibold text-gray-600">Période de vente</dt><dd className="text-gray-900">{dateFr(startDate)}{endDate ? ` → ${dateFr(endDate)}` : ""}</dd></div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><dt className="font-semibold text-gray-600">Destinations</dt><dd className="text-gray-900">{destinations.length ? destinations.map((d) => `${d.city_name} (${d.depots.length} dépôt${d.depots.length > 1 ? "s" : ""})`).join(", ") : "—"}</dd></div>
            </dl>
          {/* Statut initial (Brouillon vs Publiée) */}
          {!isEditing && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 block text-xs">Statut initial</span>
                <span className="text-xs text-gray-500 block">
                  {status === "active"
                    ? "La campagne sera directement visible pour les revendeurs."
                    : "La campagne sera enregistrée en brouillon privé."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    status === "draft"
                      ? "bg-white border-forest-600 text-forest-800 shadow-xs"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  Brouillon
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    status === "active"
                      ? "bg-forest-700 border-forest-700 text-white shadow-xs"
                      : "bg-gray-100 border-transparent text-gray-600"
                  }`}
                >
                  Publier (Actif)
                </button>
              </div>
            </div>
          )}
          </section>
        )}
      </form>

      {/* Message d'erreur placé près du bouton d'envoi (LOAD-04) */}
      {errorMessage && (
        <div
          ref={errorRef}
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barre d'actions : au-dessus de la barre basse mobile, en bas de l'écran sur ordinateur */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-4 z-30 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (mode === "assistant" && etape > 1 ? allerA(etape - 1) : garde.naviguer(RETOUR))}
          disabled={isPending}
          className="min-h-[44px] px-4 rounded-xl text-sm text-gray-700 hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
        >
          {mode === "assistant" && etape > 1 ? "Précédent" : "Annuler"}
        </button>
        {mode === "assistant" && etape < 5 ? (
          <button
            type="button"
            onClick={suivante}
            disabled={isPending || (!isEditing && eligibleProductions.length === 0)}
            className="min-h-[44px] px-5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
          >
            Suivant
          </button>
        ) : (
          <button
            type="submit"
            form="campaign-form"
            disabled={
              isPending ||
              (!isEditing && eligibleProductions.length === 0) ||
              maxAllowedQuantity === null
            }
            className="min-h-[44px] px-5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? "Enregistrement..." : isEditing ? "Mettre à jour la campagne" : "Enregistrer la campagne"}
          </button>
        )}
      </div>
    </div>
  );
}
