import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la vue générale
        </Link>
      </div>

      <PageHeader
        title="Administration du Catalogue Produits"
        description="Gérez le référentiel officiel des produits agricoles (catégories, dénominations, unités de mesure)."
        badge={<Badge variant="neutral">Jalon Phase 4</Badge>}
      />

      <EmptyState
        title="Module Catalogue Produits en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 4 (Gestion des Produits). Les administrateurs pourront y administrer les denrées agricoles standardisées que les entreprises pourront ensuite intégrer à leurs exploitations."
        phaseBadge="Phase 4 — À Venir"
        icon={<Package className="w-8 h-8 text-slate-700" />}
        action={
          <Link
            href="/dashboard/admin"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-all shadow-xs"
          >
            Revenir au tableau de bord
          </Link>
        }
      />
    </div>
  );
}
