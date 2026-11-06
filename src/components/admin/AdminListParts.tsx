import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

// ============================================================
// Briques partagées des listes d'administration (Server Components)
// ============================================================

export function AdminBackLink() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Link href="/dashboard/admin" className="hover:text-slate-800 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Retour à la vue générale
      </Link>
    </div>
  );
}

// ------------------------------------------------------------
// Filtres (formulaire GET : ?q=&status=, retour à la page 1)
// ------------------------------------------------------------

export interface AdminFilterOption {
  value: string;
  label: string;
}

interface AdminListFiltersProps {
  basePath: string;
  q: string;
  status: string | null;
  searchLabel?: string;
  searchPlaceholder?: string;
  statusLabel?: string;
  statusOptions?: AdminFilterOption[];
  allStatusesLabel?: string;
}

export function AdminListFilters({
  basePath,
  q,
  status,
  searchLabel = "Rechercher",
  searchPlaceholder = "Rechercher…",
  statusLabel = "Statut",
  statusOptions,
  allStatusesLabel = "Tous les statuts",
}: AdminListFiltersProps) {
  const hasFilters = Boolean(q || status);

  return (
    <form
      method="get"
      action={basePath}
      role="search"
      className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs"
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1 w-full">
          <label htmlFor="admin-list-q" className="block text-xs font-semibold text-gray-600 mb-1">
            {searchLabel}
          </label>
          <div className="relative">
            <Search
              className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="admin-list-q"
              type="search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {statusOptions && statusOptions.length > 0 && (
          <div className="w-full md:w-60">
            <label htmlFor="admin-list-status" className="block text-xs font-semibold text-gray-600 mb-1">
              {statusLabel}
            </label>
            <select
              id="admin-list-status"
              name="status"
              defaultValue={status ?? ""}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
            >
              <option value="">{allStatusesLabel}</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="submit"
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filtrer
          </button>
          {hasFilters && (
            <Link
              href={basePath}
              className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Réinitialiser
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}

// ------------------------------------------------------------
// Pagination (« Précédent / Suivant », « X–Y sur N »)
// ------------------------------------------------------------

export function buildAdminListHref(
  basePath: string,
  params: { q?: string; status?: string | null; page?: number }
): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

interface AdminPaginationProps {
  basePath: string;
  q: string;
  status: string | null;
  page: number;
  pageSize: number;
  total: number;
  rowsCount: number;
}

export function AdminPagination({ basePath, q, status, page, pageSize, total, rowsCount }: AdminPaginationProps) {
  if (total === 0 || rowsCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = start + rowsCount - 1;
  const hasPrevious = page > 1;
  const hasNext = page * pageSize < total;

  const linkClass =
    "px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium inline-flex items-center gap-1 transition-all";
  const enabledClass = "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900";
  const disabledClass = "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
    >
      <p className="text-xs sm:text-sm text-gray-600" aria-live="polite">
        <span className="font-semibold text-gray-900">
          {start.toLocaleString("fr-FR")}–{end.toLocaleString("fr-FR")}
        </span>{" "}
        sur <span className="font-semibold text-gray-900">{total.toLocaleString("fr-FR")}</span>
      </p>
      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link
            href={buildAdminListHref(basePath, { q, status, page: page - 1 })}
            className={cn(linkClass, enabledClass)}
            rel="prev"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Précédent
          </Link>
        ) : (
          <span className={cn(linkClass, disabledClass)} aria-disabled="true">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Précédent
          </span>
        )}
        {hasNext ? (
          <Link
            href={buildAdminListHref(basePath, { q, status, page: page + 1 })}
            className={cn(linkClass, enabledClass)}
            rel="next"
          >
            Suivant
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className={cn(linkClass, disabledClass)} aria-disabled="true">
            Suivant
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

// ------------------------------------------------------------
// Tableau responsive : tableau sur desktop, cartes empilées sur mobile
// ------------------------------------------------------------

export interface AdminColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

interface AdminDataTableProps<T> {
  caption: string;
  rows: T[];
  columns: AdminColumn<T>[];
  getRowKey: (row: T) => string;
}

/**
 * La première colonne sert de titre de carte sur mobile ; les suivantes sont
 * affichées sous forme de paires libellé / valeur.
 */
export function AdminDataTable<T>({ caption, rows, columns, getRowKey }: AdminDataTableProps<T>) {
  const [primary, ...secondary] = columns;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-gray-50/80 border-b border-gray-200/80">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap",
                      column.align === "right" ? "text-right" : "text-left"
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={getRowKey(row)} className="hover:bg-gray-50/60 transition-colors align-top">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-gray-700",
                        column.align === "right" ? "text-right" : "text-left",
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <ul className="md:hidden space-y-3" aria-label={caption}>
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 space-y-3"
          >
            <div className="text-sm">{primary.cell(row)}</div>
            {secondary.length > 0 && (
              <dl className="grid grid-cols-1 gap-2 text-xs border-t border-gray-100 pt-3">
                {secondary.map((column) => (
                  <div key={column.key} className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500 font-medium shrink-0">{column.header}</dt>
                    <dd className="text-gray-800 text-right min-w-0">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// ------------------------------------------------------------
// États : erreur explicite, vide, page hors limites
// ------------------------------------------------------------

export function AdminListError({ message, retryHref }: { message: string; retryHref: string }) {
  return (
    <Alert
      variant="error"
      title="Chargement impossible"
      action={
        <Link
          href={retryHref}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold underline underline-offset-2 hover:opacity-80"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Réessayer
        </Link>
      }
    >
      {message} Aucune donnée n&apos;est affichée tant que le chargement n&apos;a pas abouti.
    </Alert>
  );
}

interface AdminListEmptyProps {
  basePath: string;
  hasFilters: boolean;
  /** true si la page demandée dépasse le nombre total de lignes. */
  outOfRange: boolean;
  emptyTitle: string;
  emptyDescription: string;
  icon: React.ReactNode;
}

export function AdminListEmpty({
  basePath,
  hasFilters,
  outOfRange,
  emptyTitle,
  emptyDescription,
  icon,
}: AdminListEmptyProps) {
  if (outOfRange) {
    return (
      <EmptyState
        title="Cette page n'existe pas"
        description="La page demandée dépasse le nombre de résultats disponibles."
        icon={icon}
        action={
          <Link
            href={basePath}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-all shadow-xs"
          >
            Revenir à la première page
          </Link>
        }
      />
    );
  }

  if (hasFilters) {
    return (
      <EmptyState
        title="Aucun résultat pour ces critères"
        description="Essayez de modifier votre recherche ou de réinitialiser les filtres."
        icon={icon}
        action={
          <Link
            href={basePath}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Réinitialiser les filtres
          </Link>
        }
      />
    );
  }

  return <EmptyState title={emptyTitle} description={emptyDescription} icon={icon} />;
}
