import React from "react";
import { Alert } from "@/components/ui/Alert";
import type { AdminListParams, AdminListResult } from "@/lib/queries/admin";
import {
  AdminColumn,
  AdminDataTable,
  AdminListEmpty,
  AdminListError,
  AdminPagination,
  buildAdminListHref,
} from "@/components/admin/AdminListParts";

interface AdminListSectionProps<T> {
  basePath: string;
  params: AdminListParams;
  result: AdminListResult<T>;
  caption: string;
  columns: AdminColumn<T>[];
  getRowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  icon: React.ReactNode;
}

/**
 * Rend l'état d'une liste d'administration : erreur explicite, état vide
 * (honnête, sans données fictives), ou tableau paginé.
 */
export default function AdminListSection<T>({
  basePath,
  params,
  result,
  caption,
  columns,
  getRowKey,
  emptyTitle,
  emptyDescription,
  icon,
}: AdminListSectionProps<T>) {
  if (result.error || result.total === null) {
    return (
      <AdminListError
        message={result.error ?? "Impossible de charger la liste."}
        retryHref={buildAdminListHref(basePath, params)}
      />
    );
  }

  if (result.rows.length === 0) {
    return (
      <AdminListEmpty
        basePath={basePath}
        hasFilters={Boolean(params.q || params.status)}
        outOfRange={result.total > 0 && params.page > 1}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        icon={icon}
      />
    );
  }

  return (
    <div className="space-y-4">
      {result.warning && <Alert variant="warning">{result.warning}</Alert>}
      <AdminDataTable caption={caption} rows={result.rows} columns={columns} getRowKey={getRowKey} />
      <AdminPagination
        basePath={basePath}
        q={params.q}
        status={params.status}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        rowsCount={result.rows.length}
      />
    </div>
  );
}
