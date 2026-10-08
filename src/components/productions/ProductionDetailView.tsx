"use client";

import React, { useState, useTransition } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import { ProductionDemandRegionAnalysis, DemandItem } from "@/lib/queries/demands";
import {
  updateProductionStatusAction,
  toggleProductionVisibilityAction,
  deleteProductionAction,
} from "@/lib/actions/productions";
import ProductionStatusBadge, { CampaignActiveBadge } from "./ProductionStatusBadge";
import ProductionDrawer from "./ProductionDrawer";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatProductionSeasonCalendar } from "@/lib/utils/seasonalMonths";
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
  BarChart3,
  Megaphone,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
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
  const { toast } = useToast();

  const [production, setProduction] = useState<ProductionItem>(initialProduction);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { plantingPeriod, harvestPeriod, hasPlanting, hasHarvest } =
    formatProductionSeasonCalendar(production);

  const isHarvested = production.status === "harvested";
  const hasActiveCampaign = Boolean(production.has_active_campaign);
  const regions = demandsAnalysis?.regions || [];
  const totalDemandsCount = demandsAnalysis?.totalDemandsCount || 0;
  const totalQuantityDemanded = demandsAnalysis?.totalQuantityDemanded || 0;

  // Mise à jour de statut du cycle cultural
  const handleStatusChange = (newStatus: ProductionStatus) => {
    if (newStatus === production.status) return;

    startTransition(async () => {
      const res = await updateProductionStatusAction(production.id, newStatus);
      if (res.error) {
        toast.error("Erreur de statut", res.error);
      } else {
        setProduction((prev) => ({ ...prev, status: newStatus }));
        toast.success("Statut cultural mis à jour", res.message || `Le cycle est désormais au statut « ${newStatus} ».`);
      }
    });
  };

  // Bascule de la visibilité publique
  const handleToggleVisibility = () => {
    const nextVal = !production.is_public;
    startTransition(async () => {
      const res = await toggleProductionVisibilityAction(production.id, nextVal);
      if (res.error) {
        toast.error("Erreur de visibilité", res.error);
      } else {
        setProduction((prev) => ({ ...prev, is_public: nextVal }));
        toast.success(
          nextVal ? "Visibilité activée" : "Passée en privé",
          nextVal
            ? "Cette production est désormais visible des revendeurs dans le flux d'approvisionnement."
            : "Cette production est désormais masquée du flux public des revendeurs."
        );
      }
    });
  };

  // Suppression sécurisée avec ConfirmDialog
  const handleDeleteConfirm = async () => {
    setIsDeleteLoading(true);

    try {
      const res = await deleteProductionAction(production.id);
      if (res.error) {
        toast.error("Suppression refusée", res.error);
      } else {
        toast.success("Production supprimée", "Le cycle cultural a été retiré avec succès.");
        router.push("/dashboard/company/productions");
      }
    } catch {
      toast.error("Erreur", "Une erreur inattendue est survenue.");
    } finally {
      setIsDeleteLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation fil d'Ariane & Actions d'en-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Link
            href="/dashboard/company/productions"
            className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Productions & Récoltes</span>
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold truncate max-w-[220px]">
            {production.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5 text-gray-600" />}
            onClick={() => setIsEditDrawerOpen(true)}
          >
            Modifier
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isPending || isDeleteLoading}
          >
            Supprimer
          </Button>
        </div>
      </div>

      {/* Bloc Héro Principal */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs overflow-hidden">
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

          {/* Dégradés protecteurs */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

          {/* Badges supérieurs */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ProductionStatusBadge status={production.status} size="md" />
              {hasActiveCampaign && <CampaignActiveBadge size="md" />}
            </div>

            <button
              type="button"
              onClick={handleToggleVisibility}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md shadow-xs transition-all cursor-pointer ${
                production.is_public
                  ? "bg-white/95 text-forest-800 hover:bg-white"
                  : "bg-black/75 text-gray-200 hover:bg-black/90"
              }`}
              title="Cliquez pour changer la visibilité de cette production auprès des revendeurs"
            >
              {production.is_public ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-forest-600" />
                  <span>Visible revendeurs (Public)</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                  <span>Privé (Masqué du flux)</span>
                </>
              )}
            </button>
          </div>

          {/* Informations titre en bas de bannière */}
          <div className="absolute bottom-4 left-4 right-4 text-white z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2 text-forest-100">
              <Tag className="w-3 h-3" />
              <span>{production.product.name}</span>
              {production.company_product?.custom_name && (
                <span>· {production.company_product.custom_name}</span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold leading-tight drop-shadow-xs">
              {production.title}
            </h1>
            <p className="text-xs sm:text-sm text-forest-100/90 mt-1 flex items-center gap-1.5">
              <span>Exploitation : {companyName}</span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5 inline text-forest-300" />
              <span>{production.location_name}</span>
            </p>
          </div>
        </div>

        {/* Corps de la Fiche */}
        <div className="p-4 sm:p-8 space-y-6">
          {/* Note d'intégrité métier stricte */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs sm:text-sm flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Information sur la production :</p>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Cette fiche enregistre exclusivement une <strong>production planifiée ou en cours</strong>.
                Elle ne constitue ni un stock physique disponible, ni une récolte certifiée, ni une campagne
                commerciale ouverte à la commande.
              </p>
            </div>
          </div>

          {/* Grille des caractéristiques clés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-forest-700">
                <Scale className="w-4 h-4" />
                <span>Volume prévisionnel déclaré</span>
              </div>
              <p className="text-2xl font-black text-forest-950">
                {production.expected_quantity.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs text-forest-800">Unité : <strong>{production.unit}</strong></p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3 col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Calendrier saisonnier récurrent (sans année calendaire)</span>
              </div>
              {hasPlanting || hasHarvest ? (
                <div className="space-y-2">
                  {hasPlanting && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase font-semibold text-gray-500 w-24 shrink-0">
                        Plantation
                      </span>
                      <span className="text-sm font-bold text-forest-800 bg-forest-50 px-2.5 py-0.5 rounded-lg border border-forest-100">
                        🌱 {plantingPeriod}
                      </span>
                    </div>
                  )}
                  {hasHarvest && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase font-semibold text-gray-500 w-24 shrink-0">
                        Récolte
                      </span>
                      <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100">
                        🌾 {harvestPeriod}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 italic">
                    Ces mois sont récurrents chaque année jusqu&apos;à modification de votre part.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Calendrier saisonnier non renseigné.</p>
              )}
            </div>
          </div>

          {/* Description & Conditions Culturales */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest-700" />
              <span>Conditions de culture et précisions agronomiques</span>
            </h2>
            {production.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
                {production.description}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Aucune description complémentaire renseignée pour cette culture.
              </p>
            )}
          </div>

          {/* Gestion du cycle de vie cultural / Statuts */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  Gestion du cycle de vie cultural
                </h3>
                <p className="text-xs text-gray-500">
                  Faites évoluer le statut au fil de l&apos;avancement effectif de la récolte :
                </p>
              </div>

              {isHarvested && (
                <Link
                  href={`/dashboard/company/campaigns/new?production_id=${production.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Créer une campagne commerciale</span>
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
                      type="button"
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
              <p className="text-[11px] text-amber-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Règle de commercialisation : Les offres commerciales ne peuvent être ouvertes que lorsque la production est passée au statut <strong>« Récoltée »</strong>.
                </span>
              </p>
            )}
          </div>

          {/* Section : ANALYSE TERRITORIALE DES DEMANDES POUR CETTE DENRÉE */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
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
                          <span>{reg.province_name}</span>
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
                  <span>Conseil : Lors de la publication d&apos;une campagne, sélectionnez en priorité les provinces présentant la plus forte concentration de demande.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tiroir d'édition (R1) */}
      <ProductionDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        companyProducts={companyProducts}
        editingProduction={production}
        onSuccess={() => {
          // Rechargement doux
          window.location.reload();
        }}
      />

      {/* Dialogue de Confirmation de Suppression Sécurisée (R1) */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer cette production ?"
        description={`Êtes-vous certain de vouloir supprimer « ${production.title} » ? Cette action est irréversible et sera immédiatement bloquée côté serveur si des commandes, campagnes ou demandes y sont rattachées.`}
        confirmText="Supprimer définitivement"
        cancelText="Conserver"
        variant="destructive"
        isLoading={isDeleteLoading}
      />
    </div>
  );
}
