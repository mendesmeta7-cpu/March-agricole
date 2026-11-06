import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import AdminListSection from "@/components/admin/AdminListSection";
import { AdminBackLink, AdminListFilters, type AdminColumn } from "@/components/admin/AdminListParts";
import { ActiveStateBadge, CompanyVerificationBadge } from "@/components/admin/AdminBadges";
import CompanyVerificationActions from "@/components/admin/CompanyVerificationActions";
import { VERIFICATION_LABELS, formatAdminDate } from "@/components/admin/adminFormat";
import {
  COMPANY_VERIFICATION_STATUSES,
  getAdminAccess,
  getAdminCompanies,
  getAdminCompanyVerificationCounts,
  parseAdminListParams,
  type AdminCompanyRow,
} from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/dashboard/admin/companies";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCompaniesPage(props: PageProps) {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect(`/login?redirect=${BASE_PATH}`);
  if (access === "forbidden") redirect("/unauthorized");

  const params = parseAdminListParams(await props.searchParams, COMPANY_VERIFICATION_STATUSES);
  const [result, counts] = await Promise.all([
    getAdminCompanies(params),
    getAdminCompanyVerificationCounts(),
  ]);

  const statusOptions = COMPANY_VERIFICATION_STATUSES.map((status) => ({
    value: status,
    label: counts ? `${VERIFICATION_LABELS[status]} (${counts[status]})` : VERIFICATION_LABELS[status],
  }));

  const columns: AdminColumn<AdminCompanyRow>[] = [
    {
      key: "name",
      header: "Entreprise",
      cell: (row) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-gray-950 break-words">{row.name}</p>
          {row.isActive && (
            <Link
              href={`/companies/${row.id}`}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-forest-700 underline-offset-2 hover:underline"
            >
              Profil public
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      ),
    },
    {
      key: "location",
      header: "Localisation",
      cell: (row) => [row.city, row.provinceName].filter(Boolean).join(", ") || "—",
    },
    {
      key: "owner",
      header: "Responsable",
      cell: (row) => row.ownerName ?? <span className="text-gray-400">Non renseigné</span>,
    },
    {
      key: "created",
      header: "Inscription",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminDate(row.createdAt),
    },
    {
      key: "verification",
      header: "Vérification",
      cell: (row) => <CompanyVerificationBadge status={row.verificationStatus} />,
    },
    {
      key: "active",
      header: "État du compte",
      cell: (row) => <ActiveStateBadge isActive={row.isActive} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <CompanyVerificationActions
          companyId={row.id}
          companyName={row.name}
          status={row.verificationStatus}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminBackLink />

      <PageHeader
        title="Supervision des Entreprises Agricoles"
        description="Consultez les entreprises inscrites et validez leur badge de vérification. Les autres informations sont en lecture seule."
        badge={
          counts && counts.pending > 0 ? (
            <Badge variant="warning">
              {counts.pending} en attente de vérification
            </Badge>
          ) : (
            <Badge variant="neutral">Supervision Admin</Badge>
          )
        }
      />

      <AdminListFilters
        basePath={BASE_PATH}
        q={params.q}
        status={params.status}
        searchLabel="Rechercher une entreprise"
        searchPlaceholder="Nom de l'entreprise…"
        statusLabel="Statut de vérification"
        statusOptions={statusOptions}
      />

      <AdminListSection
        basePath={BASE_PATH}
        params={params}
        result={result}
        caption="Liste des entreprises agricoles inscrites"
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="Aucune entreprise inscrite pour le moment"
        emptyDescription="Les entreprises agricoles apparaîtront ici dès leur inscription via le parcours officiel."
        icon={<Building2 className="w-8 h-8 text-forest-700" />}
      />
    </div>
  );
}
