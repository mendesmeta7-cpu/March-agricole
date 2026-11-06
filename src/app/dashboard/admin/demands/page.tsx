import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import AdminListSection from "@/components/admin/AdminListSection";
import { AdminBackLink, AdminListFilters, type AdminColumn } from "@/components/admin/AdminListParts";
import DemandStatusBadge from "@/components/demands/DemandStatusBadge";
import {
  DEMAND_STATUS_LABELS,
  DEMAND_TYPE_LABELS,
  formatAdminDate,
  formatAdminQuantity,
} from "@/components/admin/adminFormat";
import {
  DEMAND_STATUSES,
  getAdminAccess,
  getAdminDemands,
  parseAdminListParams,
  type AdminDemandRow,
} from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/dashboard/admin/demands";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminDemandsPage(props: PageProps) {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect(`/login?redirect=${BASE_PATH}`);
  if (access === "forbidden") redirect("/unauthorized");

  const params = parseAdminListParams(await props.searchParams, DEMAND_STATUSES);
  const result = await getAdminDemands(params);

  const columns: AdminColumn<AdminDemandRow>[] = [
    {
      key: "product",
      header: "Produit demandé",
      cell: (row) =>
        row.productName ? (
          <span className="font-semibold text-gray-950 break-words">{row.productName}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "reseller",
      header: "Revendeur",
      cell: (row) => row.resellerName ?? <span className="text-gray-400">Non renseigné</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={row.demandType === "production" ? "forest" : "neutral"} size="sm">
          {DEMAND_TYPE_LABELS[row.demandType] ?? row.demandType}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Quantité",
      align: "right",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminQuantity(row.quantity, row.unit),
    },
    {
      key: "province",
      header: "Province",
      cell: (row) => row.provinceName ?? "—",
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => <DemandStatusBadge status={row.status} />,
    },
    {
      key: "created",
      header: "Créée le",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminBackLink />

      <PageHeader
        title="Supervision des Demandes du Marché"
        description="Consultez les demandes exprimées par les revendeurs, leur territoire et leur statut. Liste en lecture seule."
        badge={<Badge variant="neutral">Lecture seule</Badge>}
      />

      <AdminListFilters
        basePath={BASE_PATH}
        q={params.q}
        status={params.status}
        searchLabel="Rechercher par produit"
        searchPlaceholder="Nom du produit demandé…"
        statusOptions={DEMAND_STATUSES.map((status) => ({
          value: status,
          label: DEMAND_STATUS_LABELS[status],
        }))}
      />

      <AdminListSection
        basePath={BASE_PATH}
        params={params}
        result={result}
        caption="Liste des demandes des revendeurs"
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="Aucune demande exprimée pour le moment"
        emptyDescription="Les demandes apparaîtront ici dès qu'un revendeur en publiera depuis son espace."
        icon={<TrendingUp className="w-8 h-8 text-earth-700" />}
      />
    </div>
  );
}
