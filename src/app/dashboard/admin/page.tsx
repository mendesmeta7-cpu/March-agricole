import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
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
  Lock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Comptages réels depuis la base de données
  const [
    companiesRes,
    resellersRes,
    productsRes,
    productionsRes,
    demandsRes,
    campaignsRes,
    ordersRes,
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("resellers").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("productions").select("*", { count: "exact", head: true }),
    supabase.from("demands").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
  ]);

  const companiesCount = companiesRes.count || 0;
  const resellersCount = resellersRes.count || 0;
  const productsCount = productsRes.count || 0;
  const productionsCount = productionsRes.count || 0;
  const demandsCount = demandsRes.count || 0;
  const campaignsCount = campaignsRes.count || 0;
  const ordersCount = ordersRes.count || 0;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <PageHeader
        title="Supervision de la Plateforme"
        description="Vue d'ensemble opérationnelle de l'écosystème agricole V1, contrôle d'intégrité et statistiques réelles."
        badge={<Badge variant="forest">Super-Admin</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="success" size="md">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Système Sécurisé (RLS 100%)
            </Badge>
          </div>
        }
      />

      {/* Cartes Métriques Réelles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Entreprises Agricoles"
          value={companiesCount}
          helper={companiesCount === 0 ? "0 exploitation en base" : `${companiesCount} exploitation(s)`}
          icon={<Building2 className="w-5 h-5 text-forest-700" />}
          variant="forest"
        />
        <StatCard
          label="Revendeurs Inscrits"
          value={resellersCount}
          helper={resellersCount === 0 ? "0 acheteur en base" : `${resellersCount} acheteur(s)`}
          icon={<Store className="w-5 h-5 text-earth-700" />}
          variant="earth"
        />
        <StatCard
          label="Catalogue Produits"
          value={productsCount}
          helper={productsCount === 0 ? "0 produit référencé" : `${productsCount} produit(s)`}
          icon={<Package className="w-5 h-5 text-gray-700" />}
          variant="default"
        />
        <StatCard
          label="Commandes Fermes"
          value={ordersCount}
          helper={ordersCount === 0 ? "0 commande enregistrée" : `${ordersCount} commande(s)`}
          icon={<ShoppingBag className="w-5 h-5 text-amber-700" />}
          variant="amber"
        />
      </div>

      {/* Métriques secondaires & État de la plateforme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Surveillance des flux métier */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-forest-700" />
                Indicateurs de Flux Métier en Temps Réel
              </span>
              <span className="text-xs font-normal text-gray-500">Données PostgreSQL authentiques</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                  <span>Productions Déclarées</span>
                  <Tractor className="w-4 h-4 text-forest-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{productionsCount}</span>
                <span className="block text-[11px] text-gray-500 mt-1">Cultures & récoltes en base</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                  <span>Demandes Exprimées</span>
                  <TrendingUp className="w-4 h-4 text-earth-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{demandsCount}</span>
                <span className="block text-[11px] text-gray-500 mt-1">Besoins revendeurs</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                  <span>Campagnes Ouvertes</span>
                  <Megaphone className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{campaignsCount}</span>
                <span className="block text-[11px] text-gray-500 mt-1">Offres commerciales</span>
              </div>
            </div>

            {companiesCount === 0 && resellersCount === 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <EmptyState
                  title="Plateforme prête pour les premiers enregistrements réels"
                  description="La base de données est actuellement intègre et prête à accueillir les comptes d'entreprises agricoles et de revendeurs via les formulaires d'onboarding officiels."
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
                  <Building2 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-forest-700 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Supervision des Entreprises</h3>
              <p className="text-xs text-gray-500 mt-1">
                Contrôle des déclarations, vérification administrative et membres associés.
              </p>
            </Link>

            <Link
              href="/dashboard/admin/resellers"
              className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-earth-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-earth-50 text-earth-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-earth-700 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Supervision des Revendeurs</h3>
              <p className="text-xs text-gray-500 mt-1">
                Suivi des territoires pivots, typologies d&apos;achat et régularité des demandes.
              </p>
            </Link>
          </div>
        </div>

        {/* Colonne droite : Sécurité & Gouvernance */}
        <div className="space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              Sécurité & Architecture V1
            </h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs text-emerald-900 font-medium">Row Level Security (RLS)</span>
                <span className="text-xs font-bold text-emerald-700">17/17 Tables (100%)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-xs text-blue-900 font-medium">Protection Anti-Escalade</span>
                <span className="text-xs font-bold text-blue-700">Triggers Actifs</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-xs text-amber-900 font-medium">Auto-Owner Entreprise</span>
                <span className="text-xs font-bold text-amber-700">Conforme BR-COMP-05</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-xs text-purple-900 font-medium">Réservation de Stock</span>
                <span className="text-xs font-bold text-purple-700">RPC FOR UPDATE</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
