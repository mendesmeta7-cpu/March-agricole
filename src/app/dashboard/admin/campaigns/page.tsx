import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Megaphone, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminCampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la vue générale
        </Link>
      </div>

      <PageHeader
        title="Supervision des Campagnes Commerciales"
        description="Contrôlez les offres de vente publiées, les prix unitaires et les zones de livraison déclarées."
        badge={<Badge variant="neutral">Jalon Phase 9</Badge>}
      />

      <EmptyState
        title="Module Campagnes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 9 (Campagnes Commerciales). Il permettra aux administrateurs de veiller à la conformité des offres de commercialisation et des zones territoriales couvertes."
        phaseBadge="Phase 9 — À Venir"
        icon={<Megaphone className="w-8 h-8 text-amber-600" />}
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
