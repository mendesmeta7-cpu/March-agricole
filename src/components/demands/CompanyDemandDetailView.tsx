"use client";

import { useState, useRef, useTransition } from "react";
import { DemandItem, DemandResponseItem } from "@/lib/queries/demands";
import { createDemandProposalAction } from "@/lib/actions/demands";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  ArrowLeft,
  Send,
  Building2,
  Calendar,
  Scale,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Sprout,
  DollarSign,
  Tag,
  ShoppingBag,
  FileText,
  Sparkles,
  Info,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CompanyProductionOption {
  id: string;
  title: string;
  expected_quantity: number;
  unit: string;
  status: string;
  product_id: string;
}

interface CompanyDemandDetailViewProps {
  demand: DemandItem;
  companyProductions: CompanyProductionOption[];
  myProposal?: DemandResponseItem | null;
  companyName: string;
  resellerInfo?: {
    business_name?: string;
    reseller_type?: string;
    city?: string;
  } | null;
}

export default function CompanyDemandDetailView({
  demand,
  companyProductions,
  myProposal = null,
  companyName,
  resellerInfo,
}: CompanyDemandDetailViewProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [currentProposal, setCurrentProposal] = useState<DemandResponseItem | null>(myProposal);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtrage strict : seules les productions du même produit que la demande
  const matchingProductions = companyProductions.filter(
    (p) => p.product_id === demand.product_id
  );

  const [selectedProductionId, setSelectedProductionId] = useState(
    matchingProductions[0]?.id || ""
  );
  const [proposedQuantity, setProposedQuantity] = useState(String(demand.quantity));
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [message, setMessage] = useState("");

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Non précisée";
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.set("demand_id", demand.id);
    formData.set("production_id", selectedProductionId);
    formData.set("proposed_quantity", proposedQuantity);
    formData.set("unit_price", unitPrice);
    formData.set("currency", currency);
    formData.set("message", message);

    startTransition(async () => {
      const res = await createDemandProposalAction(formData);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("Votre proposition commerciale a été transmise au revendeur avec succès !");
        const selectedProd = matchingProductions.find((p) => p.id === selectedProductionId);
        setCurrentProposal({
          id: "temp-id",
          demand_id: demand.id,
          company_id: "my-company",
          production_id: selectedProductionId,
          status: "proposed",
          proposed_quantity: Number(proposedQuantity),
          unit: selectedProd?.unit || demand.unit,
          unit_price: Number(unitPrice),
          currency,
          message,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          production: selectedProd ? {
            id: selectedProd.id,
            title: selectedProd.title,
            main_image_url: "",
            status: selectedProd.status,
            expected_quantity: selectedProd.expected_quantity,
            unit: selectedProd.unit,
          } : null,
        });
      }
    });
  };

  const resellerTypeLabels: Record<string, string> = {
    wholesaler: "Grossiste",
    semi_wholesaler: "Demi-grossiste",
    retailer: "Détaillant",
    processor: "Transformateur",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Navigation & Fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/company/demands"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux opportunités &amp; demandes
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Examen de la demande #{demand.id.slice(0, 8)}</span>
      </div>

      {/* 2. En-tête de page */}
      <PageHeader
        title={`Demande de ${demand.product?.name || "Denrée agricole"}`}
        description={`Expression de besoin reçue pour ${demand.quantity.toLocaleString("fr-FR")} ${demand.unit} à destination de ${demand.province?.name || "Région"}.`}
        badge={
          <Badge variant={demand.status === "active" ? "forest" : "neutral"}>
            {demand.status === "active" ? "Demande en attente d'offres" : `Statut : ${demand.status}`}
          </Badge>
        }
      />

      {/* Toasts Feedback */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 3. Grille Principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche (2/3) : Fiche Détaillée de la Demande */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 sm:p-6 space-y-5 border-gray-100 shadow-xs">
            {/* Produit & Catégorie */}
            <div className="flex items-start gap-4 pb-5 border-b border-gray-100">
              <div className="relative w-16 h-16 rounded-2xl bg-earth-50 border border-earth-100 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                {demand.product?.image_url ? (
                  <Image
                    src={demand.product.image_url}
                    alt={demand.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Package className="w-8 h-8 text-earth-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-earth-700 bg-earth-100/80 px-2.5 py-0.5 rounded-md inline-block mb-1.5">
                  {demand.product?.category || "Catégorie"}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {demand.product?.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Publiée le {formatDate(demand.created_at)}
                </p>
              </div>
            </div>

            {/* Volume & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-forest-50/60 border border-forest-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-forest-700 uppercase tracking-wider block">
                    Quantité demandée
                  </span>
                  <span className="text-lg font-black text-forest-950">
                    {demand.quantity.toLocaleString("fr-FR")}{" "}
                    <span className="text-xs font-normal text-forest-700">{demand.unit}</span>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-earth-50/60 border border-earth-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-earth-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-earth-700 uppercase tracking-wider block">
                    Destination souhaitée
                  </span>
                  <span className="text-sm font-bold text-earth-950 block truncate">
                    {demand.province?.name}
                    {demand.city ? ` (${demand.city})` : ""}
                  </span>
                  <span className="text-[10px] text-earth-700 font-medium">
                    {demand.country?.name || "RDC"}
                  </span>
                </div>
              </div>
            </div>

            {/* Période souhaitée & Notes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span>
                  <strong>Période d&apos;approvisionnement souhaitée :</strong>{" "}
                  {demand.target_period_start
                    ? `${formatDate(demand.target_period_start)} → ${formatDate(demand.target_period_end)}`
                    : "Dès disponibilité de la récolte"}
                </span>
              </div>

              {demand.notes && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Instructions ou précisions du revendeur :
                  </span>
                  <p className="text-amber-800 italic whitespace-pre-line leading-relaxed pl-5">
                    &ldquo;{demand.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Informations Acheteur */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-forest-700" />
                Profil de l&apos;Acheteur
              </h3>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-gray-900 block">
                    {resellerInfo?.business_name || "Acheteur professionnel"}
                  </span>
                  <span className="text-gray-500 text-[11px]">
                    Localité : {resellerInfo?.city || demand.city || demand.province?.name}
                  </span>
                </div>
                <Badge variant="earth" size="sm">
                  {resellerTypeLabels[resellerInfo?.reseller_type || "wholesaler"] || "Acheteur vérifié"}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne Droite (1/3) : Formulaire de Proposition ou État Actuel */}
        <div className="space-y-6">
          {currentProposal ? (
            <Card className="p-5 space-y-4 border-emerald-200 bg-emerald-50/40 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm border-b border-emerald-200/60 pb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Proposition Commerciale Transmise
              </div>

              <div className="space-y-3 text-xs text-gray-700">
                <div className="flex justify-between items-center py-1 border-b border-emerald-100/60">
                  <span className="text-gray-600">Quantité proposée</span>
                  <span className="font-bold text-emerald-950">
                    {currentProposal.proposed_quantity} {currentProposal.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-emerald-100/60">
                  <span className="text-gray-600">Prix unitaire</span>
                  <span className="font-extrabold text-emerald-950 text-sm">
                    {currentProposal.unit_price} {currentProposal.currency} / {currentProposal.unit}
                  </span>
                </div>

                {currentProposal.production && (
                  <div className="py-1">
                    <span className="text-gray-500 text-[11px] block">Production associée</span>
                    <span className="font-semibold text-gray-900">
                      {currentProposal.production.title}
                    </span>
                  </div>
                )}

                {currentProposal.message && (
                  <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200/60 text-[11px] text-gray-600 italic">
                    &ldquo;{currentProposal.message}&rdquo;
                  </div>
                )}

                <div className="pt-2 text-center">
                  <Badge variant="forest" size="md">
                    En attente de validation revendeur
                  </Badge>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-5 space-y-4 border-earth-200 bg-white shadow-xs">
              <div className="flex items-center gap-2 text-earth-950 font-bold text-sm border-b border-gray-100 pb-3">
                <Send className="w-4 h-4 text-earth-800" />
                Formuler une Proposition
              </div>

              {matchingProductions.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700" />
                    Aucune production disponible pour ce produit
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Vous n&apos;avez actuellement aucune récolte enregistrée pour « {demand.product?.name} ». Enregistrez une production pour pouvoir formuler une proposition ferme.
                  </p>
                  <Link
                    href="/dashboard/company/productions"
                    className="inline-block mt-2 font-bold text-forest-800 underline underline-offset-2"
                  >
                    Gérer mes productions &rarr;
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmitProposal} ref={formRef} className="space-y-4 text-xs">
                  {/* Sélection de la production réelle */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 block">
                      Production de votre exploitation <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProductionId}
                      onChange={(e) => setSelectedProductionId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-forest-600"
                    >
                      {matchingProductions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.expected_quantity} {p.unit} - {p.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantité & Unité */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="font-bold text-gray-700 block">
                        Volume proposé <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={proposedQuantity}
                        onChange={(e) => setProposedQuantity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-gray-900 focus:ring-2 focus:ring-forest-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-gray-700 block">Unité</label>
                      <input
                        type="text"
                        disabled
                        value={demand.unit}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Prix Unitaire & Devise */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1.5">
                      <label className="font-bold text-gray-700 block">
                        Prix unitaire <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        placeholder="Ex: 450"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-gray-900 focus:ring-2 focus:ring-forest-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-gray-700 block">Devise</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-gray-200 bg-white font-bold text-gray-800"
                      >
                        <option value="USD">USD</option>
                        <option value="CDF">CDF</option>
                      </select>
                    </div>
                  </div>

                  {/* Message d'accompagnement */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700 block">
                      Message ou conditions au revendeur
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Disponibilité sous 7 jours, possibilité de livraison à votre dépôt de Matadi."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-forest-600"
                    />
                  </div>

                  {/* Bouton d'envoi */}
                  <button
                    type="submit"
                    disabled={isPending || !selectedProductionId || !unitPrice}
                    className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {isPending ? "Transmission en cours..." : "Envoyer la proposition"}
                  </button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
