"use client";

import { useState, useTransition } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import { ProductionDemandRegionAnalysis, DemandItem } from "@/lib/queries/demands";
import {
  updateProductionStatusAction,
  toggleProductionVisibilityAction,
  deleteProductionAction,
} from "@/lib/actions/productions";
import ProductionStatusBadge from "./ProductionStatusBadge";
import ProductionFormModal from "./ProductionFormModal";
import Card from "@/components/ui/Card";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Scale,
  Eye,
  EyeOff,
  Edit3,
  Tractor,
  Tag,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  TrendingUp,
  BarChart3,
  Megaphone,
  ShoppingBag,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ProductionDetailViewProps {
  production: ProductionItem;
  companyProducts: CompanyProductItem[];
  companyName: string;
  demandsAnalysis?: {
    totalDemandsCount: number;
    totalQuantityDemanded: number;
    unit: string;
    regions: ProductionDemandRegionAnalysis[];
    demandsList: DemandItem[];
  };
}

export default function ProductionDetailView({
  production: initialProduction,
  companyProducts,
  companyName,
  demandsAnalysis,
}: ProductionDetailViewProps) {
  const router = useRouter();
  const [production, setProduction] = useState<ProductionItem>(initialProduction);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Non définie";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const handleStatusChange = (newStatus: ProductionStatus) => {
    startTransition(async () => {
      const res = await updateProductionStatusAction(production.id, newStatus);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setProduction((prev) => ({ ...prev, status: newStatus }));
        setFeedback({ type: "success", text: res.message || "Statut mis à jour." });
        setTimeout(() => setFeedback(null), 4000);
      }
    });
  };

  const handleToggleVisibility = () => {
    const nextVal = !production.is_public;
    startTransition(async () => {
      const res = await toggleProductionVisibilityAction(production.id, nextVal);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setProduction((prev) => ({ ...prev, is_public: nextVal }));
        setFeedback({ type: "success", text: res.message || "Visibilité mise à jour." });
        setTimeout(() => setFeedback(null), 4000);
      }
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        "Êtes-vous certain de vouloir supprimer cette production ? Cette action est irréversible et sera bloquée si des campagnes ou commandes y sont rattachées."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteProductionAction(production.id);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({ type: "success", text: "Production supprimée avec succès." });
        setTimeout(() => {
          router.push("/dashboard/company/productions");
        }, 1000);
      }
    });
  };

  const isHarvested = production.status === "harvested";
  const regions = demandsAnalysis?.regions || [];
  const totalDemandsCount = demandsAnalysis?.totalDemandsCount || 0;
  const totalQuantityDemanded = demandsAnalysis?.totalQuantityDemanded || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation fil d'Ariane & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Link
            href="/dashboard/company/productions"
            className="hover:text-forest-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux productions
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">
            {production.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
            Modifier
          </button>

          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-1 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Bloc Héro Principal */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="relative h-64 sm:h-80 w-full bg-forest-950">
          {production.main_image_url ? (
            <Image
              src={production.main_image_url}
              alt={production.title}
              fill
              priority
              className="object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-forest-900 text-white">
              <Tractor className="w-16 h-16 stroke-1 mb-2 text-forest-300" />
              <span className="text-sm font-medium text-forest-200">Visuel cultural</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* Badges en haut */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <ProductionStatusBadge status={production.status} size="md" />

            <button
              onClick={handleToggleVisibility}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md shadow-xs transition-all cursor-pointer ${
                production.is_public
                  ? "bg-white/95 text-forest-800 hover:bg-white"
                  : "bg-black/75 text-white hover:bg-black/90"
              }`}
            >
              {production.is_public ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-forest-600" />
                  Visibilité publique active
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                  Privé (invisible)
                </>
              )}
            </button>
          </div>

          {/* Informations titre en bas de bannière */}
          <div className="absolute bottom-4 left-4 right-4 text-white z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2 text-forest-100">
              <Tag className="w-3 h-3" />
              {production.product.name}
              {production.company_product?.custom_name &&
                ` (${production.company_product.custom_name})`}
            </div>
            <h1 className="text-xl sm:text-3xl font-bold leading-tight drop-shadow-xs">
              {production.title}
            </h1>
            <p className="text-xs sm:text-sm text-forest-100/90 mt-1 flex items-center gap-1.5">
              <span>Exploitation : {companyName}</span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5 inline" />
              <span>{production.location_name}</span>
            </p>
          </div>
        </div>

        {/* Corps de la fiche */}
        <div className="p-4 sm:p-8 space-y-6">
          {/* Note d'intégrité métier stricte */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs sm:text-sm flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Règle de séparation des concepts métier (V1) :</p>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Cette fiche enregistre exclusivement une <strong>production planifiée ou en cours</strong>.
                Elle ne constitue ni un stock disponible, ni une récolte certifiée, ni une campagne
                commerciale ouverte à la commande.
              </p>
            </div>
          </div>

          {/* Grille des caractéristiques clés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-forest-700">
                <Scale className="w-4 h-4" />
                Quantité déclarée
              </div>
              <p className="text-2xl font-black text-forest-950">
                {production.expected_quantity.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs text-forest-700">Unité : {production.unit}</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-gray-500" />
                Début de cycle / Semis
              </div>
              <p className="text-base font-bold text-gray-900">
                {formatDate(production.period_start)}
              </p>
              <p className="text-xs text-gray-500">Lancement cultural</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-gray-500" />
                Récolte prévue / effective
              </div>
              <p className="text-base font-bold text-gray-900">
                {formatDate(production.period_end)}
              </p>
              <p className="text-xs text-gray-500">Échéance prévisionnelle</p>
            </div>
          </div>

          {/* Description & Conditions Culturales */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">
              Conditions de culture et précisions agronomiques
            </h2>
            {production.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                {production.description}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Aucune description complémentaire renseignée pour cette culture.
              </p>
            )}
          </div>

          {/* Gestion du cycle de vie / Statuts */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  Gestion du cycle de vie cultural
                </h3>
                <p className="text-xs text-gray-500">
                  Faites évoluer le statut de votre production au fil de l&apos;avancement en champ :
                </p>
              </div>

              {isHarvested && (
                <Link
                  href={`/dashboard/company/campaigns/new?production_id=${production.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-earth-800 hover:bg-earth-900 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Créer une campagne commerciale
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(["draft", "planned", "growing", "harvested", "cancelled"] as ProductionStatus[]).map(
                (st) => {
                  const isCurrent = production.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={isPending || isCurrent}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-forest-700 text-white shadow-xs"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                      }`}
                    >
                      {st === "draft" && "Brouillon"}
                      {st === "planned" && "Planifiée"}
                      {st === "growing" && "En culture"}
                      {st === "harvested" && "Récoltée"}
                      {st === "cancelled" && "Annulée"}
                    </button>
                  );
                }
              )}
            </div>

            {!isHarvested && (
              <p className="text-[11px] text-amber-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5 mt-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Règle V1 : Les campagnes commerciales ne peuvent être lancées que lorsque la production est passée au statut <strong>« Récoltée »</strong>.
              </p>
            )}
          </div>

          {/* SECTION : ANALYSE TERRITORIALE DES DEMANDES POUR CETTE PRODUCTION */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-earth-700" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Analyse territoriale des demandes pour cette denrée
                  </h3>
                  <p className="text-xs text-gray-500">
                    Besoins exprimés par les revendeurs pour guider le choix de vos zones de livraison.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-earth-800 bg-earth-50 px-2.5 py-1 rounded-full border border-earth-200">
                {totalDemandsCount} demande(s) enregistrée(s)
              </span>
            </div>

            {regions.length === 0 ? (
              <div className="p-6 text-center bg-gray-50/60 rounded-2xl border border-gray-200/80 space-y-2">
                <p className="text-xs text-gray-600 font-medium">
                  Aucune demande territoriale ciblée sur cette denrée pour l&apos;instant.
                </p>
                <p className="text-[11px] text-gray-400">
                  Dès que les revendeurs publieront des besoins pour {production.product.name}, la répartition par province s&apos;affichera ici.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-earth-50/70 rounded-xl border border-earth-100 text-xs text-earth-900 flex items-center justify-between">
                  <span>Volume total recherché sur le marché :</span>
                  <strong className="text-sm font-extrabold text-earth-950">
                    {totalQuantityDemanded.toLocaleString("fr-FR")} {production.unit}
                  </strong>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {regions.map((reg) => (
                    <div
                      key={reg.province_id}
                      className="p-3.5 bg-white rounded-xl border border-gray-200 hover:border-earth-300 transition-all space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-earth-600" />
                          {reg.province_name}
                        </span>
                        <span className="text-[10px] font-extrabold text-earth-800 bg-earth-100/80 px-2 py-0.5 rounded-full">
                          {reg.percentage}%
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-earth-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(reg.percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span>{reg.demands_count} acheteur(s)</span>
                        <strong className="text-gray-900">
                          {reg.total_quantity.toLocaleString("fr-FR")} {reg.unit}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-gray-500 italic bg-gray-50/60 p-2.5 rounded-xl border border-gray-200/60 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-earth-600 shrink-0" />
                  Conseil V1 : Lors de la publication d&apos;une campagne, sélectionnez en priorité les provinces présentant la plus forte concentration de demande.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale d'édition */}
      <ProductionFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        companyProducts={companyProducts}
        editingProduction={production}
        onSuccess={(msg) => {
          setFeedback({ type: "success", text: msg });
          setTimeout(() => setFeedback(null), 4000);
        }}
      />
    </div>
  );
}
