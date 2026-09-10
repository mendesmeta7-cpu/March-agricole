import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminDemandsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la vue générale
        </Link>
      </div>

      <PageHeader
        title="Supervision des Demandes du Marché"
        description="Analysez les flux de demandes exprimées par les revendeurs et la vue agrégée par province."
        badge={<Badge variant="neutral">Jalon Phase 6</Badge>}
      />

      <EmptyState
        title="Module Demandes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 6 (Gestion des Demandes). Il permettra de superviser la cartographie des tensions de marché et l'exactitude de la vue agrégée v_market_demands_aggregated."
        phaseBadge="Phase 6 — À Venir"
        icon={<TrendingUp className="w-8 h-8 text-earth-700" />}
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
