import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CompanyOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/company" className="hover:text-forest-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        title="Commandes Reçues & Suivi des Stocks"
        description="Gérez les engagements fermes passés par les acheteurs professionnels et suivez l'état des réservations."
        badge={<Badge variant="neutral">Jalon Phase 10</Badge>}
      />

      <EmptyState
        title="Module Commandes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 10 (Commandes et Réservations). Il vous permettra de valider les commandes passées par les revendeurs éligibles, de suivre les débits atomiques de stock et d'actualiser les statuts d'expédition."
        phaseBadge="Phase 10 — À Venir"
        icon={<ShoppingBag className="w-8 h-8 text-forest-700" />}
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
