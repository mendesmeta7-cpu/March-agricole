import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminCompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la vue générale
        </Link>
      </div>

      <PageHeader
        title="Supervision des Entreprises Agricoles"
        description="Gérez les validations administratives, les fiches d'exploitation et les membres fondateurs."
        badge={<Badge variant="neutral">Supervision Admin</Badge>}
      />

      <EmptyState
        title="Module de modération des entreprises"
        description="Ce module d'administration permettra de consulter les entreprises enregistrées, de valider leur statut administratif et de contrôler l'étanchéité des rattachements de membres."
        phaseBadge="Administration V1"
        icon={<Building2 className="w-8 h-8 text-forest-700" />}
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
