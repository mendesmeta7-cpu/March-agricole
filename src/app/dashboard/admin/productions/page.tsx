import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Tractor, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminProductionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la vue générale
        </Link>
      </div>

      <PageHeader
        title="Supervision des Productions Agricoles"
        description="Surveillez les déclarations de culture, les récoltes planifiées et les visuels publiés par les entreprises."
        badge={<Badge variant="neutral">Jalon Phase 5</Badge>}
      />

      <EmptyState
        title="Module Productions en cours de jalonnement"
        description="Ce module sera activé lors de la Phase 5 (Gestion des Productions). Il offrira aux administrateurs une visibilité complète sur les fiches de production et les volumes déclarés à l'échelle nationale."
        phaseBadge="Phase 5 — À Venir"
        icon={<Tractor className="w-8 h-8 text-forest-700" />}
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
