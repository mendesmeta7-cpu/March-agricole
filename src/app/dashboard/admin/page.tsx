import { createClient } from "@/lib/supabase/server";
import { countAdminEffectiveActiveCampaigns } from "@/lib/queries/admin";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import {
  Building2,
  Store,
  Package,
  Tractor,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  LayoutList,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type CountResult = { count: number | null; error: unknown };

/** Un comptage en erreur reste `null` (affiché « — ») au lieu d'être présenté comme 0. */
function countOrNull(res: CountResult): number | null {
  if (res.error) {
    console.error("[admin:dashboard.count]", res.error);
    return null;
  }
  return res.count ?? 0;
}

function display(value: number | null): string | number {
  return value === null ? "—" : value;
}

function plural(value: number | null, singular: string, pluralForm: string, empty: string): string {
  if (value === null) return "Comptage indisponible";
  if (value === 0) return empty;
  return `${value} ${value > 1 ? pluralForm : singular}`;
}

const SUPERVISION_LINKS = [
  {
    href: "/dashboard/admin/productions",
    label: "Productions",
    icon: <Tractor className="w-4 h-4 text-forest-600" aria-hidden="true" />,
  },
  {
    href: "/dashboard/admin/demands",
    label: "Demandes",
    icon: <TrendingUp className="w-4 h-4 text-earth-600" aria-hidden="true" />,
  },
  {
    href: "/dashboard/admin/campaigns",
    label: "Campagnes",
    icon: <Megaphone className="w-4 h-4 text-amber-600" aria-hidden="true" />,
  },
  {
    href: "/dashboard/admin/orders",
    label: "Commandes",
    icon: <ShoppingBag className="w-4 h-4 text-emerald-700" aria-hidden="true" />,
  },
  {
    href: "/dashboard/admin/products",
    label: "Catalogue produits",
    icon: <Package className="w-4 h-4 text-gray-600" aria-hidden="true" />,
  },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Comptages réels depuis la base de données
  const [
    companiesRes,
    pendingCompaniesRes,
    resellersRes,
    productsRes,
    productionsRes,
    demandsRes,
    ordersRes,
    activeCampaignsCount,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase.from("resellers").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("productions").select("id", { count: "exact", head: true }),
    supabase.from("demands").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    // FUN-10 : seules les campagnes EFFECTIVEMENT actives sont comptées.
    countAdminEffectiveActiveCampaigns(),
  ]);

  const companiesCount = countOrNull(companiesRes);
  const pendingCompaniesCount = countOrNull(pendingCompaniesRes);
  const resellersCount = countOrNull(resellersRes);
  const productsCount = countOrNull(productsRes);
  const productionsCount = countOrNull(productionsRes);
  const demandsCount = countOrNull(demandsRes);
  const ordersCount = countOrNull(ordersRes);

  const hasCountError = [
    companiesCount,
    pendingCompaniesCount,
    resellersCount,
    productsCount,
    productionsCount,
    demandsCount,
    ordersCount,
    activeCampaignsCount,
  ].some((value) => value === null);

  const companiesHelper =
    companiesCount !== null && companiesCount > 0 && pendingCompaniesCount !== null && pendingCompaniesCount > 0
      ? `${pendingCompaniesCount} en attente de vérification`
      : plural(companiesCount, "exploitation", "exploitations", "Aucune exploitation inscrite");

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <PageHeader
        title="Supervision de la Plateforme"
        description="Vue d'ensemble de l'écosystème agricole V1 : statistiques issues de la base de données et accès aux listes de supervision."
        badge={<Badge variant="forest">Super-Admin</Badge>}
      />

      {hasCountError && (
        <Alert variant="warning" title="Certains indicateurs sont indisponibles">
          Un ou plusieurs comptages n&apos;ont pas pu être chargés. Les valeurs concernées sont
          affichées « — » plutôt que 0. Rechargez la page pour réessayer.
        </Alert>
      )}

      {/* Cartes Métriques Réelles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Entreprises Agricoles"
          value={display(companiesCount)}
          helper={companiesHelper}
          icon={<Building2 className="w-5 h-5 text-forest-700" />}
          variant="forest"
        />
        <StatCard
          label="Revendeurs Inscrits"
          value={display(resellersCount)}
          helper={plural(resellersCount, "acheteur", "acheteurs", "Aucun acheteur inscrit")}
          icon={<Store className="w-5 h-5 text-earth-700" />}
          variant="earth"
        />
        <StatCard
          label="Catalogue Produits"
          value={display(productsCount)}
          helper={plural(productsCount, "produit", "produits", "Aucun produit référencé")}
          icon={<Package className="w-5 h-5 text-gray-700" />}
          variant="default"
        />
        <StatCard
          label="Commandes"
          value={display(ordersCount)}
          helper={plural(ordersCount, "commande", "commandes", "Aucune commande enregistrée")}
          icon={<ShoppingBag className="w-5 h-5 text-amber-700" />}
          variant="amber"
        />
      </div>

      {/* Métriques secondaires & accès aux modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : flux métier */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-forest-700" aria-hidden="true" />
              Indicateurs de flux métier
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                  <span>Productions déclarées</span>
                  <Tractor className="w-4 h-4 text-forest-600" aria-hidden="true" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{display(productionsCount)}</span>
                <span className="block text-[11px] text-gray-500 mt-1">Tous statuts confondus</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                  <span>Demandes exprimées</span>
                  <TrendingUp className="w-4 h-4 text-earth-600" aria-hidden="true" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{display(demandsCount)}</span>
                <span className="block text-[11px] text-gray-500 mt-1">Tous statuts confondus</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                  <span>Campagnes ouvertes</span>
                  <Megaphone className="w-4 h-4 text-amber-600" aria-hidden="true" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{display(activeCampaignsCount)}</span>
                <span className="block text-[11px] text-gray-500 mt-1">
                  Actives à ce jour (échéances prises en compte)
                </span>
              </div>
            </div>

            {companiesCount === 0 && resellersCount === 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <EmptyState
                  title="Aucun compte professionnel inscrit pour le moment"
                  description="Les entreprises agricoles et les revendeurs apparaîtront ici dès leur inscription via les formulaires officiels."
                  icon={<CheckCircle2 className="w-8 h-8 text-forest-700" />}
                />
              </div>
            )}
          </Card>

          {/* Raccourcis de supervision */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard/admin/companies"
              className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-forest-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="w-4 h-4 text-gray-400 group-hover:text-forest-700 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Supervision des Entreprises</h3>
              <p className="text-xs text-gray-500 mt-1">
                Liste des entreprises inscrites et validation du badge de vérification.
              </p>
            </Link>

            <Link
              href="/dashboard/admin/resellers"
              className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-earth-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-earth-50 text-earth-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="w-4 h-4 text-gray-400 group-hover:text-earth-700 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Supervision des Revendeurs</h3>
              <p className="text-xs text-gray-500 mt-1">
                Liste des acheteurs professionnels, de leur typologie et de leur territoire.
              </p>
            </Link>
          </div>
        </div>

        {/* Colonne droite : modules de supervision (informatif, sans indicateur simulé) */}
        <div className="space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-slate-700" aria-hidden="true" />
              Modules de supervision
            </h2>

            <ul className="space-y-2">
              {SUPERVISION_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 transition-all group"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      {link.icon}
                      {link.label}
                    </span>
                    <ArrowRight
                      className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              Les listes des entreprises, revendeurs, productions, demandes, campagnes et commandes
              sont en lecture seule, à l&apos;exception de la vérification des entreprises.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
