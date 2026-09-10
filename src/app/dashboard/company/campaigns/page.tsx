import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Megaphone, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CompanyCampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/company" className="hover:text-forest-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        title="Campagnes Commerciales"
        description="Créez et gérez vos offres de vente ciblées par province, avec fixation des prix fermes et quotas commercialisables."
        badge={<Badge variant="neutral">Jalon Phase 9</Badge>}
      />

      <EmptyState
        title="Module Campagnes en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 9 (Campagnes Commerciales). Vous pourrez adosser une campagne à une récolte existante, spécifier les provinces éligibles à la livraison (campaign_delivery_zones) et ouvrir les commandes fermes."
        phaseBadge="Phase 9 — À Venir"
        icon={<Megaphone className="w-8 h-8 text-amber-700" />}
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
