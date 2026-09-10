import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la vue générale
        </Link>
      </div>

      <PageHeader
        title="Supervision des Commandes & Stocks"
        description="Audit des transactions de commande, intégrité des réservations atomiques et suivi des litiges."
        badge={<Badge variant="neutral">Jalon Phase 10</Badge>}
      />

      <EmptyState
        title="Module Commandes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 10 (Commandes et Réservation de Stock). Les administrateurs pourront y auditer les réservations transactionnelles et surveiller les cycles de statut des commandes."
        phaseBadge="Phase 10 — À Venir"
        icon={<ShoppingBag className="w-8 h-8 text-emerald-700" />}
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
