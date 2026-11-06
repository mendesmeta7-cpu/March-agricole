import { redirect } from "next/navigation";
import { Tractor } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import AdminListSection from "@/components/admin/AdminListSection";
import { AdminBackLink, AdminListFilters, type AdminColumn } from "@/components/admin/AdminListParts";
import { VisibilityBadge } from "@/components/admin/AdminBadges";
import ProductionStatusBadge from "@/components/productions/ProductionStatusBadge";
import { PRODUCTION_STATUS_LABELS, formatAdminDate, formatAdminQuantity } from "@/components/admin/adminFormat";
import {
  PRODUCTION_STATUSES,
  getAdminAccess,
  getAdminProductions,
  parseAdminListParams,
  type AdminProductionRow,
} from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/dashboard/admin/productions";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminProductionsPage(props: PageProps) {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect(`/login?redirect=${BASE_PATH}`);
  if (access === "forbidden") redirect("/unauthorized");

  const params = parseAdminListParams(await props.searchParams, PRODUCTION_STATUSES);
  const result = await getAdminProductions(params);

  const columns: AdminColumn<AdminProductionRow>[] = [
    {
      key: "title",
      header: "Production",
      cell: (row) => <span className="font-semibold text-gray-950 break-words">{row.title}</span>,
    },
    {
      key: "company",
      header: "Entreprise",
      cell: (row) => row.companyName ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "product",
      header: "Produit",
      cell: (row) => row.productName ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "quantity",
      header: "Quantité prévue",
      align: "right",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminQuantity(row.expectedQuantity, row.unit),
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => <ProductionStatusBadge status={row.status} />,
    },
    {
      key: "visibility",
      header: "Visibilité",
      cell: (row) => <VisibilityBadge isPublic={row.isPublic} />,
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
        title="Supervision des Productions Agricoles"
        description="Consultez les productions déclarées par les entreprises, leur statut et leur visibilité. Liste en lecture seule."
        badge={<Badge variant="neutral">Lecture seule</Badge>}
      />

      <AdminListFilters
        basePath={BASE_PATH}
        q={params.q}
        status={params.status}
        searchLabel="Rechercher une production"
        searchPlaceholder="Titre de la production…"
        statusOptions={PRODUCTION_STATUSES.map((status) => ({
          value: status,
          label: PRODUCTION_STATUS_LABELS[status],
        }))}
      />

      <AdminListSection
        basePath={BASE_PATH}
        params={params}
        result={result}
        caption="Liste des productions déclarées"
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="Aucune production déclarée pour le moment"
        emptyDescription="Les productions apparaîtront ici dès qu'une entreprise en déclarera depuis son espace."
        icon={<Tractor className="w-8 h-8 text-forest-700" />}
      />
    </div>
  );
}
