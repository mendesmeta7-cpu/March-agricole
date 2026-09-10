import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CompanyDemandsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/company" className="hover:text-forest-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        title="Demandes du Marché & Analyse Territoriale"
        description="Observez les volumes de denrées agricoles recherchés par les revendeurs dans toutes les provinces nationales."
        badge={<Badge variant="neutral">Jalon Phase 6</Badge>}
      />

      <EmptyState
        title="Analyse territoriale en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 6 (Gestion des Demandes). Il agrégera en temps réel les besoins réels exprimés par les revendeurs (via la vue SQL v_market_demands_aggregated) pour vous aider à calibrer vos futures campagnes de vente."
        phaseBadge="Phase 6 — À Venir"
        icon={<TrendingUp className="w-8 h-8 text-forest-700" />}
        action={
          <Link
            href="/dashboard/company"
            className="px-4 py-2 rounded-xl bg-forest-700 text-white font-medium text-sm hover:bg-forest-800 transition-all shadow-xs"
          >
            Revenir à la vue principale
          </Link>
        }
      />
    </div>
  );
}
