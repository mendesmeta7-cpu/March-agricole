import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import AdminListSection from "@/components/admin/AdminListSection";
import { AdminBackLink, AdminListFilters, type AdminColumn } from "@/components/admin/AdminListParts";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { ORDER_STATUS_LABELS, formatAdminAmount, formatAdminDate } from "@/components/admin/adminFormat";
import {
  ORDER_STATUSES,
  getAdminAccess,
  getAdminOrders,
  parseAdminListParams,
  type AdminOrderRow,
} from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/dashboard/admin/orders";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOrdersPage(props: PageProps) {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect(`/login?redirect=${BASE_PATH}`);
  if (access === "forbidden") redirect("/unauthorized");

  const params = parseAdminListParams(await props.searchParams, ORDER_STATUSES);
  const result = await getAdminOrders(params);

  const columns: AdminColumn<AdminOrderRow>[] = [
    {
      key: "number",
      header: "N° de commande",
      cell: (row) => (
        <span className="font-semibold text-gray-950 font-mono text-xs sm:text-sm break-all">
          {row.orderNumber}
        </span>
      ),
    },
    {
      key: "company",
      header: "Entreprise",
      cell: (row) => row.companyName ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "reseller",
      header: "Revendeur",
      cell: (row) => row.resellerName ?? <span className="text-gray-400">Non renseigné</span>,
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => <OrderStatusBadge status={row.status} size="sm" compact />,
    },
    {
      key: "amount",
      header: "Montant",
      align: "right",
      className: "whitespace-nowrap font-semibold text-gray-900",
      cell: (row) => formatAdminAmount(row.totalAmount, row.currency),
    },
    {
      key: "created",
      header: "Passée le",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminBackLink />

      <PageHeader
        title="Supervision des Commandes"
        description="Consultez les commandes passées entre revendeurs et entreprises et leur statut. Les montants sont affichés dans leur devise d'origine. Liste en lecture seule."
        badge={<Badge variant="neutral">Lecture seule</Badge>}
      />

      <AdminListFilters
        basePath={BASE_PATH}
        q={params.q}
        status={params.status}
        searchLabel="Rechercher une commande"
        searchPlaceholder="Numéro de commande…"
        statusOptions={ORDER_STATUSES.map((status) => ({
          value: status,
          label: ORDER_STATUS_LABELS[status],
        }))}
      />

      <AdminListSection
        basePath={BASE_PATH}
        params={params}
        result={result}
        caption="Liste des commandes"
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="Aucune commande enregistrée pour le moment"
        emptyDescription="Les commandes apparaîtront ici dès qu'un revendeur passera une commande."
        icon={<ShoppingBag className="w-8 h-8 text-emerald-700" />}
      />
    </div>
  );
}
