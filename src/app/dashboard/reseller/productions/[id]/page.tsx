import { getPublicProductionDetail } from "@/lib/queries/feed";
import { getActiveCampaignByProductionId } from "@/lib/queries/campaigns";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ProductionStatusBadge from "@/components/productions/ProductionStatusBadge";
import ResellerProductionDetailActions from "@/components/feed/ResellerProductionDetailActions";
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
  ShoppingCart,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { formatProductionSeasonCalendar } from "@/lib/utils/seasonalMonths";

interface ResellerProductionDetailPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    order?: string;
  };
}

export default async function ResellerProductionDetailPage({
  params,
  searchParams,
}: ResellerProductionDetailPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Récupération préalable de la localisation officielle du revendeur connecté
  let reseller: any = null;
  if (user) {
    const { data: resellerData, error: resellerErr } = await supabase
      .from("resellers")
      .select("id, country_id, province_id, city, delivery_address, provinces (id, name, code), countries (id, name, code)")
      .eq("id", user.id)
      .maybeSingle();

    if (!resellerErr && resellerData) {
      reseller = resellerData;
    }
  }

  // 2. Chargement conjoint production, provinces et campagne active avec éligibilité
  const [production, provincesRes, activeCampaign] = await Promise.all([
    getPublicProductionDetail(params.id, reseller),
    supabase.from("provinces").select("id, country_id, code, name").order("name"),
    getActiveCampaignByProductionId(params.id, reseller),
  ]);

  if (!production) {
    notFound();
  }

  const provinces = provincesRes.data || [];
  const defaultProvinceId = reseller?.province_id || undefined;

  const { plantingPeriod, harvestPeriod, hasPlanting, hasHarvest } = formatProductionSeasonCalendar(production);

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
          href="/dashboard/reseller"
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
                  Cette fiche constitue une déclaration de culture. Vous pouvez formuler une <strong>demande d&apos;approvisionnement directe</strong> pour signaler votre intérêt au producteur et l&apos;aider à calibrer son offre.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne droite : Exploitation & Métriques */}
        <div className="space-y-6">
          {/* Action principale : Commander (si campagne active) ou Demande directe */}
          <Card
            padding="md"
            className={
              activeCampaign
                ? "border-emerald-300 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-400/20"
                : "border-emerald-200 bg-emerald-50/30 shadow-xs"
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                {activeCampaign ? (
                  <>
                    <Megaphone className="w-4 h-4 text-emerald-700" />
                    Offre Commerciale Ferme Ouverte
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    Expression de besoin directe
                  </>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {activeCampaign
                  ? "Une campagne de vente ferme est actuellement ouverte sur cette production. Vous pouvez passer commande et réserver vos volumes immédiatement."
                  : "Vous souhaitez réserver ou acheter une partie de cette récolte ? Transmettez vos volumes cibles et votre province au producteur."}
              </p>

              <ResellerProductionDetailActions
                production={{
                  id: production.id,
                  title: production.title,
                  unit: production.unit,
                  expected_quantity: production.expected_quantity,
                  status: production.status,
                  company_name: production.company.name,
                  product_name: production.product.name,
                  main_image_url: production.main_image_url || undefined,
                }}
                provinces={provinces}
                defaultProvinceId={defaultProvinceId}
                activeCampaign={activeCampaign}
                autoOpenOrder={searchParams?.order === "true" || searchParams?.order === "1"}
                resellerInfo={{
                  id: reseller?.id,
                  countryId: reseller?.country_id,
                  countryName: (reseller?.countries as any)?.name || "",
                  provinceId: defaultProvinceId,
                  provinceName: (reseller?.provinces as any)?.name || "",
                  city: reseller?.city || "",
                  address: reseller?.delivery_address || "",
                  deliveryAddress: reseller?.delivery_address || "",
                }}
              />
            </div>
          </Card>

          {/* Identité de l'exploitation productrice */}
          <Card padding="md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-forest-700" />
              Exploitation Productrice
            </h3>

            <div className="space-y-4">
              <Link
                href={`/dashboard/reseller/companies/${production.company.id}`}
                className="group/comp flex items-center gap-3.5 p-2 -m-2 rounded-xl hover:bg-forest-50/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-forest-50 border border-forest-200/80 flex items-center justify-center text-forest-800 flex-shrink-0 overflow-hidden relative shadow-2xs group-hover/comp:border-forest-400 transition-colors">
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
                  <span className="font-bold text-gray-900 text-sm block truncate group-hover/comp:text-forest-700 transition-colors">
                    {production.company.name}
                  </span>
                  <span className="text-xs text-gray-500 block truncate">
                    {provinceName}, {countryName}
                  </span>
                </div>
              </Link>

              <div className="pt-3 border-t border-gray-100 space-y-3">
                <span className="text-xs text-forest-700 bg-forest-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 font-medium border border-forest-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-forest-600" />
                  Producteur vérifié sur la plateforme
                </span>

                <Link
                  href={`/dashboard/reseller/companies/${production.company.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-forest-50 text-forest-800 hover:bg-forest-700 hover:text-white transition-all duration-150 border border-forest-200/80"
                >
                  <span>Consulter le profil de l&apos;exploitation</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
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
              <div>
                <span className="text-[11px] text-gray-400 block uppercase font-medium">
                  Denrée / Produit
                </span>
                <span className="font-bold text-gray-900 block mt-0.5">
                  {production.product.name}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-100">
                <span className="text-[11px] text-forest-700 block uppercase font-semibold">
                  Quantité planifiée
                </span>
                <span className="text-base font-extrabold text-forest-950 block mt-0.5">
                  {production.expected_quantity.toLocaleString("fr-FR")} {production.unit}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 block uppercase font-medium">
                  Calendrier saisonnier
                </span>
                <div className="mt-1.5 space-y-1.5 text-gray-800">
                  {hasPlanting && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest-500" />
                      <span className="text-xs">
                        🌱 Plantation : 
                        <strong className="text-forest-800">{plantingPeriod}</strong>
                      </span>
                    </div>
                  )}
                  {hasHarvest && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs">
                        🌾 Récolte : 
                        <strong className="text-amber-700">{harvestPeriod}</strong>
                      </span>
                    </div>
                  )}
                  {!hasPlanting && !hasHarvest && (
                    <span className="text-xs text-gray-400 italic">Calendrier non renseigné</span>
                  )}
                  <p className="text-[10px] text-gray-400 italic mt-1">
                    Cycle récurrent — valable chaque année
                  </p>
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
}
