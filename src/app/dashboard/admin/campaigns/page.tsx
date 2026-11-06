import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import AdminListSection from "@/components/admin/AdminListSection";
import { AdminBackLink, AdminListFilters, type AdminColumn } from "@/components/admin/AdminListParts";
import CampaignStatusBadge from "@/components/campaigns/CampaignStatusBadge";
import {
  formatAdminAmount,
  formatAdminDateOnly,
  formatAdminQuantity,
} from "@/components/admin/adminFormat";
import {
  getAdminAccess,
  getAdminCampaigns,
  parseAdminListParams,
  type AdminCampaignRow,
} from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/dashboard/admin/campaigns";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCampaignsPage(props: PageProps) {
  const access = await getAdminAccess();
  if (access === "unauthenticated") redirect(`/login?redirect=${BASE_PATH}`);
  if (access === "forbidden") redirect("/unauthorized");

  // Pas de filtre de statut : le statut affiché est le statut EFFECTIF (calculé),
  // qui ne peut pas être filtré de manière fiable côté base avec la pagination.
  const params = parseAdminListParams(await props.searchParams);
  const result = await getAdminCampaigns(params);

  const columns: AdminColumn<AdminCampaignRow>[] = [
    {
      key: "title",
      header: "Campagne",
      cell: (row) => <span className="font-semibold text-gray-950 break-words">{row.title}</span>,
    },
    {
      key: "company",
      header: "Entreprise",
      cell: (row) => row.companyName ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "status",
      header: "Statut effectif",
      cell: (row) => (
        <div className="inline-flex flex-col items-end md:items-start gap-1">
          <CampaignStatusBadge status={row.effectiveStatus} />
          {row.effectiveStatus !== row.storedStatus && (
            <span className="text-[11px] text-gray-500">
              Échéances dépassées (statut enregistré : actif)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Quantité",
      align: "right",
      className: "whitespace-nowrap",
      cell: (row) => formatAdminQuantity(row.marketableQuantity, row.unit),
    },
    {
      key: "price",
      header: "Prix unitaire",
      align: "right",
      className: "whitespace-nowrap",
      cell: (row) => `${formatAdminAmount(row.unitPrice, row.currency)}${row.unit ? ` / ${row.unit}` : ""}`,
    },
    {
      key: "period",
      header: "Période",
      className: "whitespace-nowrap",
      cell: (row) =>
        row.endDate
          ? `${formatAdminDateOnly(row.startDate)} → ${formatAdminDateOnly(row.endDate)}`
          : `Dès le ${formatAdminDateOnly(row.startDate)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminBackLink />

      <PageHeader
        title="Supervision des Campagnes Commerciales"
        description="Consultez les offres de vente publiées par les entreprises. Le statut affiché tient compte des dates de fin et des dates limites de commande. Liste en lecture seule."
        badge={<Badge variant="neutral">Lecture seule</Badge>}
      />

      <AdminListFilters
        basePath={BASE_PATH}
        q={params.q}
        status={null}
        searchLabel="Rechercher une campagne"
        searchPlaceholder="Titre de la campagne…"
      />

      <AdminListSection
        basePath={BASE_PATH}
        params={params}
        result={result}
        caption="Liste des campagnes commerciales"
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="Aucune campagne publiée pour le moment"
        emptyDescription="Les campagnes commerciales apparaîtront ici dès qu'une entreprise en créera depuis son espace."
        icon={<Megaphone className="w-8 h-8 text-amber-600" />}
      />
    </div>
  );
}
