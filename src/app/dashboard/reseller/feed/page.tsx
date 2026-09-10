import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Compass, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResellerFeedPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/reseller" className="hover:text-earth-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil revendeur
        </Link>
      </div>

      <PageHeader
        title="Flux des Productions Agricoles Disponibles"
        description="Parcourez les fiches de récoltes publiées par les entreprises agricoles vérifiées et découvrez les exploitations de votre région."
        badge={<Badge variant="neutral">Jalon Phase 7</Badge>}
      />

      <EmptyState
        title="Flux de découverte en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 7 (Feed Revendeur). Il vous permettra de filtrer les productions réelles par denrée, par province et par période de disponibilité, avec photos hébergées sur Supabase Storage."
        phaseBadge="Phase 7 — À Venir"
        icon={<Compass className="w-8 h-8 text-forest-700" />}
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
