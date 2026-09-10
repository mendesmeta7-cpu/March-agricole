import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResellerOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/reseller" className="hover:text-earth-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil revendeur
        </Link>
      </div>

      <PageHeader
        title="Mes Commandes d'Achat"
        description="Consultez l'historique et l'état de préparation de vos commandes fermes passées sur les campagnes agricoles actives."
        badge={<Badge variant="neutral">Jalon Phase 10</Badge>}
      />

      <EmptyState
        title="Module Commandes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 10 (Commandes et Réservation de Stock). Vous pourrez y passer des commandes fermes sur les campagnes commerciales desservant votre province et suivre la réservation atomique de vos volumes."
        phaseBadge="Phase 10 — À Venir"
        icon={<ShoppingBag className="w-8 h-8 text-earth-700" />}
        action={
          <Link
            href="/dashboard/reseller"
            className="px-4 py-2 rounded-xl bg-earth-700 text-white font-medium text-sm hover:bg-earth-800 transition-all shadow-xs"
          >
            Revenir à l&apos;accueil revendeur
          </Link>
        }
      />
    </div>
  );
}
