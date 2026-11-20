import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Clock,
  ImageOff,
  Layers,
  MapPin,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  Info,
} from "lucide-react";
import type { PublicCampaign } from "@/lib/utils/publicCampaign";
import { formatMoney, formatQuantityWithUnit } from "@/lib/utils/numberFormat";
import CampaignShareActions from "./CampaignShareActions";

interface PublicCampaignViewProps {
  campaign: PublicCampaign;
  /** Zone d'action selon le visiteur : connexion, commande revendeur, gestion société… */
  action: ReactNode;
}

/** Date seule (AAAA-MM-JJ) lue en UTC : aucun décalage d'un jour selon le fuseau du serveur. */
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Page de consultation d'une campagne (Lot UX/UI 5B, ADR-058) : uniquement les informations
 * déclarées publiques (offre, société, zones générales et dates). Aucun stock restant, aucune
 * adresse de dépôt : les points de retrait sont présentés au revendeur connecté dans la commande.
 */
export default function PublicCampaignView({ campaign, action }: PublicCampaignViewProps) {
  const debut = formatDate(campaign.start_date);
  const fin = formatDate(campaign.end_date);
  const lieuSociete = [campaign.company.city, campaign.company.province_name].filter(Boolean).join(", ");

  return (
    <article className="space-y-6">
      {/* Visuel et titre */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
        <div className="relative h-52 sm:h-72 w-full bg-gray-100">
          {campaign.image_url ? (
            <Image
              src={campaign.image_url}
              alt={campaign.production.title || campaign.title}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50">
              <ImageOff className="w-10 h-10 mb-2" aria-hidden="true" />
              <span className="text-xs">Aucun visuel disponible</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold">
              Campagne ouverte
            </span>
            {campaign.product.category && (
              <span className="px-2.5 py-1 rounded-lg bg-white/95 text-forest-900 text-xs font-bold">
                {campaign.product.category}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-forest-700">{campaign.product.name}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{campaign.title}</h1>
          </div>
          <CampaignShareActions campaignId={campaign.id} title={campaign.title} />
        </div>
      </div>

      {/* Offre : prix et quantité proposée (jamais le stock restant) */}
      <section aria-labelledby="offre-titre" className="space-y-3">
        <h2 id="offre-titre" className="text-sm font-bold text-gray-900">
          L&apos;offre
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100">
            <span className="text-xs font-semibold text-forest-700 flex items-center gap-1.5">
              <Tag className="w-4 h-4" aria-hidden="true" />
              Prix unitaire
            </span>
            <p className="mt-1 text-lg sm:text-xl font-bold text-forest-950">
              <span className="whitespace-nowrap">{formatMoney(campaign.unit_price, campaign.currency)}</span>{" "}
              <span className="text-sm font-semibold text-forest-800 whitespace-nowrap">/ {campaign.unit}</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-earth-50/70 border border-earth-100">
            <span className="text-xs font-semibold text-earth-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4" aria-hidden="true" />
              Quantité proposée
            </span>
            <p className="mt-1 text-lg sm:text-xl font-bold text-earth-950 whitespace-nowrap">
              {formatQuantityWithUnit(campaign.marketable_quantity, campaign.unit)}
            </p>
            {campaign.min_order_quantity > 1 && (
              <p className="text-xs text-earth-800 mt-1">
                Minimum par commande : {formatQuantityWithUnit(campaign.min_order_quantity, campaign.unit)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Commander */}
      <section aria-labelledby="commande-titre" className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-3">
        <h2 id="commande-titre" className="text-sm font-bold text-gray-900">
          Commander
        </h2>
        {action}
      </section>

      {/* Société */}
      <section aria-labelledby="societe-titre" className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 space-y-3">
        <h2 id="societe-titre" className="text-sm font-bold text-gray-900">
          Société productrice
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {campaign.company.logo_url ? (
                <Image
                  src={campaign.company.logo_url}
                  alt=""
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 text-forest-700" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 break-words">{campaign.company.name}</p>
              {lieuSociete && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" aria-hidden="true" />
                  {lieuSociete}
                </p>
              )}
              {campaign.company.verification_status === "verified" && (
                <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Société vérifiée
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/companies/${campaign.company.id}`}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors shrink-0"
          >
            Voir le profil
          </Link>
        </div>
      </section>

      {/* Description */}
      {campaign.description && (
        <section aria-labelledby="description-titre" className="space-y-2">
          <h2 id="description-titre" className="text-sm font-bold text-gray-900">
            Conditions et détails
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-2xl border border-gray-200 whitespace-pre-line break-words">
            {campaign.description}
          </p>
        </section>
      )}

      {/* Calendrier */}
      <section aria-labelledby="periode-titre" className="space-y-2">
        <h2 id="periode-titre" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-forest-700" aria-hidden="true" />
          Période de commercialisation
        </h2>
        <div className="p-4 rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 space-y-1.5">
          <p className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {debut ? (
                <>
                  Du <strong>{debut}</strong> au <strong>{fin || "épuisement des stocks"}</strong>
                </>
              ) : (
                <>Jusqu&apos;au <strong>{fin || "épuisement des stocks"}</strong></>
              )}
            </span>
          </p>
          {campaign.availability_period && (
            <p className="text-gray-600 pl-6">Disponibilité : {campaign.availability_period}</p>
          )}
        </div>
      </section>

      {/* Destinations : villes et dates, jamais les adresses de dépôt */}
      {campaign.destinations.length > 0 && (
        <section aria-labelledby="destinations-titre" className="space-y-2">
          <h2 id="destinations-titre" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-forest-700" aria-hidden="true" />
            Villes de destination
          </h2>
          <ul className="space-y-2">
            {campaign.destinations.map((dest) => (
              <li key={dest.id} className="p-4 rounded-2xl bg-white border border-gray-200 space-y-1.5">
                <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-forest-700 shrink-0" aria-hidden="true" />
                  <span className="break-words">
                    {dest.city_name}
                    {dest.province_name ? ` (${dest.province_name})` : ""}
                  </span>
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 pl-6">
                  {dest.expected_arrival_date && (
                    <span>
                      Arrivée prévue : <strong>{formatDate(dest.expected_arrival_date)}</strong>
                    </span>
                  )}
                  {dest.order_deadline_date && (
                    <span>
                      Commandes jusqu&apos;au : <strong>{formatDate(dest.order_deadline_date)}</strong>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-600 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            Les points de retrait sont communiqués aux revendeurs connectés au moment de la commande.
          </p>
        </section>
      )}

      {/* Provinces desservies */}
      {campaign.provinces.length > 0 && (
        <section aria-labelledby="provinces-titre" className="space-y-2">
          <h2 id="provinces-titre" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-forest-700" aria-hidden="true" />
            Provinces desservies
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {campaign.provinces.map((nom) => (
              <li key={nom} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-medium">
                {nom}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
