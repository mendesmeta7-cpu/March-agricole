import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import AdminListSection from "@/components/admin/AdminListSection";
import { AdminBackLink, AdminListFilters, type AdminColumn } from "@/components/admin/AdminListParts";
import { RESELLER_TYPE_LABELS, formatAdminDate } from "@/components/admin/adminFormat";
import {
  RESELLER_TYPES,
  getAdminAccess,
  getAdminResellers,
  parseAdminListParams,
  type AdminResellerRow,
} from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/dashboard/admin/resellers";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminResellersPage(props: PageProps) {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect(`/login?redirect=${BASE_PATH}`);
  if (access === "forbidden") redirect("/unauthorized");

  // Pour les revendeurs, le paramètre ?status= filtre la typologie d'acheteur.
  const params = parseAdminListParams(await props.searchParams, RESELLER_TYPES);
  const result = await getAdminResellers(params);

  const columns: AdminColumn<AdminResellerRow>[] = [
    {
      key: "name",
      header: "Revendeur",
      cell: (row) =>
        row.businessName ? (
          <span className="font-semibold text-gray-950 break-words">{row.businessName}</span>
        ) : (
          <span className="text-gray-400 italic">Raison sociale non renseignée</span>
        ),
    },
    {
      key: "type",
      header: "Typologie",
      cell: (row) => (
        <Badge variant="earth" size="sm">
          {RESELLER_TYPE_LABELS[row.resellerType] ?? row.resellerType}
        </Badge>
      ),
    },
    {
      key: "location",
      header: "Localisation",
      cell: (row) => [row.city, row.provinceName].filter(Boolean).join(", ") || "—",
    },
    {
      key: "created",
      header: "Inscription",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminBackLink />

      <PageHeader
        title="Supervision des Revendeurs"
        description="Consultez les acheteurs professionnels inscrits, leur typologie et leur territoire. Liste en lecture seule."
        badge={<Badge variant="neutral">Lecture seule</Badge>}
      />

      <AdminListFilters
        basePath={BASE_PATH}
        q={params.q}
        status={params.status}
        searchLabel="Rechercher un revendeur"
        searchPlaceholder="Raison sociale…"
        statusLabel="Typologie"
        allStatusesLabel="Toutes les typologies"
        statusOptions={RESELLER_TYPES.map((type) => ({ value: type, label: RESELLER_TYPE_LABELS[type] }))}
      />

      <AdminListSection
        basePath={BASE_PATH}
        params={params}
        result={result}
        caption="Liste des revendeurs inscrits"
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="Aucun revendeur inscrit pour le moment"
        emptyDescription="Les acheteurs professionnels apparaîtront ici dès leur inscription via le parcours officiel."
        icon={<Store className="w-8 h-8 text-earth-700" />}
      />
    </div>
  );
}
