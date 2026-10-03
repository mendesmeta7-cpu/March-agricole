"use client";

import { DemandItem } from "@/lib/queries/demands";
import { Drawer } from "@/components/ui/Drawer";
import DemandStatusBadge from "./DemandStatusBadge";
import Button from "@/components/ui/Button";
import {
  Package,
  Calendar,
  MapPin,
  Scale,
  Building2,
  Sprout,
  Globe,
  Edit3,
  XCircle,
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";

interface ResellerDemandDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  demand: DemandItem | null;
  onEdit?: (demand: DemandItem) => void;
  onCancel?: (demandId: string) => void;
  onViewResponses?: (demand: DemandItem) => void;
  isCancelling?: boolean;
}

export default function ResellerDemandDetailDrawer({
  isOpen,
  onClose,
  demand,
  onEdit,
  onCancel,
  onViewResponses,
  isCancelling = false,
}: ResellerDemandDetailDrawerProps) {
  if (!demand) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
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

  const isProductionDemand = demand.demand_type === "production";
  const responses = demand.responses || [];
  const responsesCount = responses.length;
  const hasPeriod = demand.target_period_start || demand.target_period_end;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      side="right"
      title={
        <div className="flex items-center gap-2">
          <span>Détail de la Demande d&apos;Achat</span>
        </div>
      }
      description={
        <span>
          Exprimée le {formatDate(demand.created_at)} • Réf. #{demand.id.slice(0, 8)}
        </span>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>

          <div className="flex items-center gap-2">
            {responsesCount > 0 && (
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  onClose();
                  onViewResponses?.(demand);
                }}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Consulter les offres ({responsesCount})
              </Button>
            )}

            {demand.status === "active" && (
              <>
                {!isProductionDemand && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEdit(demand);
                    }}
                    leftIcon={<Edit3 className="w-4 h-4" />}
                  >
                    Modifier
                  </Button>
                )}
                {onCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCancel(demand.id)}
                    isLoading={isCancelling}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Annuler
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* En-tête Denrée & Badges */}
        <div className="p-4 sm:p-5 rounded-2xl bg-earth-50/70 border border-earth-100 flex items-start gap-4">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-earth-200/80 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
            {demand.product.image_url ? (
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

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-earth-800 bg-earth-200/70 px-2 py-0.5 rounded-md">
                {demand.product.category}
              </span>
              {isProductionDemand ? (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  <Sprout className="w-3 h-3" /> Demande sur production
                </span>
              ) : (
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100/80 border border-blue-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Demande générale du marché
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-gray-950 truncate">
              {demand.product.name}
            </h3>

            <div className="pt-1">
              <DemandStatusBadge status={demand.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Bloc Volume & Statut Quantitatif */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
            <div className="flex items-center gap-2 text-xs text-earth-700 font-semibold">
              <Scale className="w-4 h-4" />
              <span>Volume recherché</span>
            </div>
            <p className="text-xl font-extrabold text-gray-950">
              {demand.quantity.toLocaleString("fr-FR")}{" "}
              <span className="text-sm font-medium text-gray-600">{demand.unit}</span>
            </p>
            <p className="text-[11px] text-gray-500">Unité de référence : {demand.unit}</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <MessageSquare className="w-4 h-4" />
              <span>Propositions reçues</span>
            </div>
            <p className="text-xl font-extrabold text-gray-950">
              {responsesCount}{" "}
              <span className="text-sm font-medium text-gray-600">
                offre{responsesCount > 1 ? "s" : ""}
              </span>
            </p>
            <p className="text-[11px] text-gray-500">
              {responsesCount > 0
                ? "Devis et offres fermes disponibles"
                : "En attente des exploitants de la zone"}
            </p>
          </div>
        </div>

        {/* Destination & Territoire */}
        <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-earth-700" />
            Territoire & Bassin de Consommation
          </h4>
          <div className="text-sm text-gray-900 font-medium">
            <span>Province de {demand.province.name}</span>
            {demand.city && <span className="text-gray-600 font-normal">, Ville : {demand.city}</span>}
            <span className="text-xs text-gray-500 ml-1.5">({demand.country.name})</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ce besoin est visible par les exploitants agricoles desservant ce territoire ou capables d&apos;y acheminer leurs récoltes.
          </p>
        </div>

        {/* Période d'approvisionnement */}
        {hasPeriod && (
          <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-earth-700" />
              Calendrier Souhaité
            </h4>
            <div className="text-sm text-gray-900 font-medium">
              {demand.target_period_start && demand.target_period_end ? (
                <span>
                  Du <strong>{formatDate(demand.target_period_start)}</strong> au{" "}
                  <strong>{formatDate(demand.target_period_end)}</strong>
                </span>
              ) : demand.target_period_start ? (
                <span>
                  À partir du <strong>{formatDate(demand.target_period_start)}</strong>
                </span>
              ) : (
                <span>
                  Au plus tard le <strong>{formatDate(demand.target_period_end)}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Fiche Production associée (si demande sur production) */}
        {demand.production && (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5" />
              Production Agricole Associée
            </h4>

            <div className="flex items-start gap-3">
              {demand.production.main_image_url && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-emerald-100 shrink-0">
                  <Image
                    src={demand.production.main_image_url}
                    alt={demand.production.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="space-y-1 min-w-0 flex-1">
                <h5 className="text-sm font-bold text-gray-900 truncate">
                  {demand.production.title}
                </h5>
                <p className="text-xs text-gray-600">
                  Volume total attendu :{" "}
                  <strong>
                    {demand.production.expected_quantity?.toLocaleString("fr-FR")}{" "}
                    {demand.production.unit}
                  </strong>
                </p>
                {demand.production.location_name && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {demand.production.location_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exploitation ciblée (si demande ciblée) */}
        {demand.target_company && (
          <div className="p-4 rounded-xl bg-forest-50/50 border border-forest-200/80 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-forest-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Exploitation Ciblée Spécifiquement
            </h4>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-gray-900">{demand.target_company.name}</p>
            </div>
          </div>
        )}

        {/* Notes & Exigences particulières */}
        {demand.notes && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-600" />
              Notes & Spécifications Fournies
            </h4>
            <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed whitespace-pre-line">
              « {demand.notes} »
            </p>
          </div>
        )}

        {/* Section Propositions Reçues */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              Propositions des Producteurs ({responsesCount})
            </h4>
            {responsesCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewResponses?.(demand);
                }}
                className="text-xs text-earth-700 font-bold hover:underline flex items-center gap-1"
              >
                Gérer les offres <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {responsesCount === 0 ? (
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200/70 text-center space-y-2">
              <Clock className="w-7 h-7 text-gray-400 mx-auto" />
              <p className="text-xs font-semibold text-gray-800">
                Aucune offre reçue pour l&apos;instant
              </p>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                Les entreprises agricoles réelles notifiées analyseront votre besoin en fonction de leurs récoltes et vous adresseront leurs devis directement ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {responses.map((resp) => {
                const totalAmount = (resp.proposed_quantity || 0) * (resp.unit_price || 0);
                return (
                  <div
                    key={resp.id}
                    className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-earth-300 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-950 truncate">
                          {resp.company?.name || "Entreprise agricole"}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Production : {resp.production?.title || "Stock certifié"}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                        {resp.status === "ordered" ? "Commandée" : resp.status === "proposed" ? "Disponible" : resp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-gray-50 text-[11px]">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Volume proposé</span>
                        <strong className="text-gray-900">{resp.proposed_quantity} {demand.unit}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Prix unitaire</span>
                        <strong className="text-gray-900">{resp.unit_price} {resp.currency}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Total</span>
                        <strong className="text-earth-900">{totalAmount.toLocaleString("fr-FR")} {resp.currency}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
