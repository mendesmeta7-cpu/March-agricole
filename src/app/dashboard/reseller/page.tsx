import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  TrendingUp,
  ShoppingBag,
  Store,
  MapPin,
  Compass,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default async function ResellerDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Récupération des données réelles du revendeur
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user!.id)
    .single();

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, business_name, reseller_type, city, delivery_address, provinces(name, code), countries(name, code)")
    .eq("id", user!.id)
    .maybeSingle();

  // 2. Comptages réels depuis la base de données
  const [dRes, oRes, pRes] = await Promise.all([
    supabase.from("demands").select("*", { count: "exact", head: true }).eq("reseller_id", user!.id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("reseller_id", user!.id),
    supabase.from("productions").select("*", { count: "exact", head: true }).eq("is_public", true).in("status", ["planned", "growing", "harvested"]),
  ]);

  const demandsCount = dRes.count || 0;
  const ordersCount = oRes.count || 0;
  const productionsCount = pRes.count || 0;

  const resellerTypeLabels: Record<string, string> = {
    wholesaler: "Grossiste",
    semi_wholesaler: "Demi-grossiste",
    retailer: "Détaillant",
    processor: "Transformateur agro-alimentaire",
  };

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <PageHeader
        title={reseller?.business_name || profile?.full_name || "Tableau de Bord"}
        description="Consultez les offres agricoles actives, exprimez vos besoins d'approvisionnement et suivez vos commandes fermes."
        badge={
          <Badge variant="earth">
            {resellerTypeLabels[reseller?.reseller_type || "wholesaler"] || "Acheteur"}
          </Badge>
        }
        action={
          <Badge variant="forest" size="md" className="w-full sm:w-auto justify-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Acheteur Qualifié
          </Badge>
        }
      />

      {/* Cartouche Territoire Pivot */}
      <Card padding="md" className="border-earth-100 bg-gradient-to-r from-white to-earth-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-earth-100 border border-earth-200/80 flex items-center justify-center text-earth-800 flex-shrink-0 shadow-xs">
              <Store className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {reseller?.business_name || profile?.full_name}
              </h2>
              <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-600 flex-wrap">
                <span className="inline-flex items-center gap-1 font-semibold text-earth-900 bg-earth-100/80 px-2.5 py-1 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-earth-700 flex-shrink-0" />
                  <span>Territoire : {(reseller as any)?.provinces?.name || "Province"}, {(reseller as any)?.countries?.name || "RDC"}</span>
                </span>
                {reseller?.city && <span className="truncate">Ville : {reseller.city}</span>}
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/reseller/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all shadow-2xs whitespace-nowrap min-h-[44px]"
          >
            Paramètres &rarr;
          </Link>
        </div>
      </Card>

      {/* Métriques réelles (Aucune donnée fictive) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Mon Activité Commerciale (Données Réelles)
          </h2>
          <span className="text-xs text-gray-500">
            Zéro simulation, historique transactionnel vérifiable
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Productions Publiques Disponibles"
            value={productionsCount}
            icon={<Compass className="w-5 h-5 text-forest-700" />}
            variant="forest"
            helper={productionsCount === 0 ? "0 production publiée" : `${productionsCount} cycle(s) en ligne`}
          />
          <StatCard
            label="Besoins & Demandes Enregistrées"
            value={demandsCount}
            icon={<TrendingUp className="w-5 h-5 text-earth-700" />}
            variant="earth"
            helper={demandsCount === 0 ? "0 demande déposée" : `${demandsCount} demande(s)`}
          />
          <StatCard
            label="Commandes Fermes Récentes"
            value={ordersCount}
            icon={<ShoppingBag className="w-5 h-5 text-gray-700" />}
            variant="default"
            helper={ordersCount === 0 ? "0 commande en cours" : `${ordersCount} commande(s)`}
          />
        </div>
      </div>

      {/* Grille des modules d'activité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Feed des productions (Actif - Phase 7) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Compass className="w-4 h-4 text-forest-700" />
                Flux des Productions & Récoltes
              </h3>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            {productionsCount === 0 ? (
              <EmptyState
                title="Aucune production publiée pour le moment"
                description="Les exploitations partenaires n'ont pas encore publié de récoltes publiques. Consultez régulièrement le flux pour découvrir les denrées disponibles."
                className="py-6 sm:py-8 bg-forest-50/20"
              />
            ) : (
              <div className="space-y-2 py-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-forest-900">{productionsCount}</span> production(s) agricole(s) sont actuellement visibles sur la plateforme.
                </p>
                <p className="text-xs text-gray-500">
                  Découvrez les volumes planifiés, les cultures et les dates de récolte déclarées par les fermes.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <Link
              href="/dashboard/reseller/feed"
              className="text-xs font-semibold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1"
            >
              Consulter le flux des productions
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Module Demandes d'approvisionnement (Actif - Phase 6) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-earth-700" />
                Vos Expressions de Besoins
              </h3>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            {demandsCount === 0 ? (
              <EmptyState
                title="Vous n'avez encore exprimé aucune demande"
                description="Publiez les tonnages et denrées que vous recherchez pour inciter les producteurs à orienter leurs récoltes et leurs campagnes vers votre province."
                className="py-6 sm:py-8 bg-earth-50/20"
              />
            ) : (
              <p className="text-sm text-gray-600">Vous avez {demandsCount} expression(s) de besoin enregistrée(s).</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <Link
              href="/dashboard/reseller/demands"
              className="text-xs font-semibold text-earth-700 hover:text-earth-800 inline-flex items-center gap-1"
            >
              Gérer mes demandes
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
