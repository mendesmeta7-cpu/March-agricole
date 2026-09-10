"use client";

import { useState, useTransition } from "react";
import { ProductionItem, ProductionStatus } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import {
  updateProductionStatusAction,
  toggleProductionVisibilityAction,
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
  Share2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ProductionDetailViewProps {
  production: ProductionItem;
  companyProducts: CompanyProductItem[];
  companyName: string;
}

export default function ProductionDetailView({
  production: initialProduction,
  companyProducts,
  companyName,
}: ProductionDetailViewProps) {
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
            Modifier la production
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
            className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-1"
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
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md shadow-xs transition-all ${
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
                Quantité planifiée
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
                Récolte prévue
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
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">
              Gestion du cycle de vie culturel
            </h3>
            <p className="text-xs text-gray-500">
              Faites évoluer le statut de votre production au fil de l&apos;avancement en champ :
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {(["draft", "planned", "growing", "harvested", "cancelled"] as ProductionStatus[]).map(
                (st) => {
                  const isCurrent = production.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={isPending || isCurrent}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
