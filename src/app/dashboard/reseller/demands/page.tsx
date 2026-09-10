import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResellerDemandsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/reseller" className="hover:text-earth-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil revendeur
        </Link>
      </div>

      <PageHeader
        title="Mes Demandes d'Approvisionnement"
        description="Exprimez vos besoins d'achat réels pour informer les producteurs agricoles de la demande solvable sur votre territoire."
        badge={<Badge variant="neutral">Jalon Phase 6</Badge>}
      />

      <EmptyState
        title="Module Demandes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 6 (Gestion des Demandes). Vous pourrez formuler des prévisions de volume (en tonnes ou sacs) sans engagement financier ni réservation de stock, afin de susciter l'offre des producteurs."
        phaseBadge="Phase 6 — À Venir"
        icon={<TrendingUp className="w-8 h-8 text-earth-700" />}
        action={
          <Link
            href="/dashboard/reseller"
            className="px-4 py-2 rounded-xl bg-earth-700 text-white font-medium text-sm hover:bg-earth-800 transition-all shadow-xs"
          >
            Revenir à la vue principale
          </Link>
        }
      />
    </div>
  );
}
