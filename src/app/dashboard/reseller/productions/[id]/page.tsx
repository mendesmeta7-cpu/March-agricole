import { getPublicProductionDetail } from "@/lib/queries/feed";
import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProductionStatusBadge from "@/components/productions/ProductionStatusBadge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  Tractor,
  Sprout,
  ImageOff,
  Sparkles,
  Info,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface ResellerProductionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ResellerProductionDetailPage({
  params,
}: ResellerProductionDetailPageProps) {
  const production = await getPublicProductionDetail(params.id);

  if (!production) {
    notFound();
  }

  // Formatage des dates du cycle
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formattedStart = formatDate(production.period_start);
  const formattedEnd = formatDate(production.period_end);

  const provinceName = (production.company as any)?.provinces?.name || "";
  const countryName = (production.company as any)?.countries?.name || "RDC";
  const locationDisplay = [production.location_name, provinceName, countryName]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Fil d'Ariane & Navigation de retour */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/reseller/feed"
          className="hover:text-forest-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au flux des productions
        </Link>
      </div>

      {/* 2. En-tête de la fiche de production */}
      <PageHeader
        title={production.title}
        description={`Production agricole déclarée par ${production.company.name}`}
        badge={<ProductionStatusBadge status={production.status} size="md" />}
      />

      {/* 3. Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Photo et description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo principale */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs">
            <div className="relative w-full aspect-16/10 sm:aspect-16/9 bg-gray-100">
              {production.main_image_url ? (
                <img
                  src={production.main_image_url}
                  alt={production.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6">
                  <ImageOff className="w-12 h-12 text-gray-300 mb-2" />
                  <span className="text-sm font-medium text-gray-500">
                    Aucune photo enregistrée
                  </span>
                </div>
              )}

              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-white text-xs font-semibold uppercase tracking-wider">
                  {production.product.category}
                </span>
              </div>
            </div>

            {/* Description culturale */}
            <div className="p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-forest-700" />
                Présentation de la culture
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {production.description ||
                  "Aucune note spécifique ou description complémentaire n'a été fournie par le producteur pour ce cycle cultural."}
              </p>
            </div>
          </div>

          {/* Note d'information revendeur (Règle d'Or 3) */}
          <Card padding="md" className="bg-amber-50/50 border-amber-200/80">
            <div className="flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">
                  Engagement commercial & Disponibilité physique :
                </span>
                <p className="text-amber-800 text-xs leading-relaxed">
                  Cette fiche constitue une déclaration de culture prévisionnelle. La vente directe et les commandes fermes ne sont pas encore ouvertes pour cette production. Elles seront disponibles dès la mise en ligne d&apos;une campagne commerciale par l&apos;exploitation.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne droite : Exploitation & Métriques */}
        <div className="space-y-6">
          {/* Identité de l'exploitation productrice */}
          <Card padding="md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-forest-700" />
              Exploitation Productrice
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-forest-50 border border-forest-200/80 flex items-center justify-center text-forest-800 flex-shrink-0 overflow-hidden relative shadow-2xs">
                  {production.company.logo_url ? (
                    <img
                      src={production.company.logo_url}
                      alt={production.company.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-forest-700" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="font-bold text-gray-900 text-sm block truncate">
                    {production.company.name}
                  </span>
                  <span className="text-xs text-gray-500 block truncate">
                    {provinceName}, {countryName}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <span className="text-xs text-forest-700 bg-forest-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 font-medium border border-forest-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-forest-600" />
                  Producteur vérifié sur la plateforme
                </span>
              </div>
            </div>
          </Card>

          {/* Données culturales prévisionnelles */}
          <Card padding="md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Tractor className="w-4 h-4 text-forest-700" />
              Données Prévisionnelles
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Culture */}
              <div>
                <span className="text-[11px] text-gray-400 block uppercase font-medium">
                  Denrée / Produit
                </span>
                <span className="font-bold text-gray-900 block mt-0.5">
                  {production.product.name}
                </span>
              </div>

              {/* Volume prévu */}
              <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-100">
                <span className="text-[11px] text-forest-700 block uppercase font-semibold">
                  Volume planifié
                </span>
                <span className="text-base font-extrabold text-forest-950 block mt-0.5">
                  {production.expected_quantity.toLocaleString("fr-FR")} {production.unit}
                </span>
                <span className="text-[10px] text-forest-600 block mt-0.5">
                  (Estimation prévisionnelle déclarée)
                </span>
              </div>

              {/* Période */}
              <div>
                <span className="text-[11px] text-gray-400 block uppercase font-medium">
                  Calendrier cultural
                </span>
                <div className="mt-1 space-y-1 text-gray-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Début : {formattedStart || "Non spécifié"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Fin estimée : {formattedEnd || "En cours de maturation"}</span>
                  </div>
                </div>
              </div>

              {/* Localisation */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 block uppercase font-medium">
                  Implantation géographique
                </span>
                <div className="flex items-start gap-1.5 mt-1 text-gray-800">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{locationDisplay}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Action alternative : Exprimer un besoin */}
          <Card padding="md" className="border-earth-200/80 bg-earth-50/40">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-earth-900 font-bold text-xs sm:text-sm">
                <TrendingUp className="w-4 h-4 text-earth-700" />
                Intéressé par ce produit ?
              </div>
              <p className="text-xs text-earth-800 leading-relaxed">
                Vous pouvez formuler une demande d&apos;achat sur cette denrée pour informer les producteurs de vos volumes cibles.
              </p>
              <Link
                href="/dashboard/reseller/demands"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-earth-700 text-white hover:bg-earth-800 transition-all shadow-xs"
              >
                Formuler une demande d&apos;achat &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
