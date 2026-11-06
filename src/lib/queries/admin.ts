import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveCampaignStatus } from "@/lib/utils/campaignStatus";
import type { CampaignStatus } from "@/lib/queries/campaigns";
import type { OrderStatus } from "@/lib/queries/orders";
import type { DemandStatus, DemandType } from "@/lib/queries/demands";
import type { ProductionStatus } from "@/lib/queries/productions";

// ============================================================
// LECTURES ADMINISTRATEUR (supervision en lecture seule — décision A6)
// ------------------------------------------------------------
// - Listes paginées (25 lignes), ordre stable `created_at desc, id desc`.
// - Colonnes explicites (aucun `select("*")`).
// - Une erreur n'est JAMAIS convertie silencieusement en liste vide :
//   `error` est renseigné et la page affiche un état d'erreur explicite.
// - L'accès repose sur les politiques RLS (profiles.role = 'admin').
// ============================================================

export const ADMIN_PAGE_SIZE = 25;

export type CompanyVerificationStatus = "pending" | "verified" | "rejected";
export type ResellerType = "wholesaler" | "semi_wholesaler" | "retailer" | "processor";

export const COMPANY_VERIFICATION_STATUSES: readonly CompanyVerificationStatus[] = [
  "pending",
  "verified",
  "rejected",
];
export const RESELLER_TYPES: readonly ResellerType[] = [
  "wholesaler",
  "semi_wholesaler",
  "retailer",
  "processor",
];
export const PRODUCTION_STATUSES: readonly ProductionStatus[] = [
  "draft",
  "planned",
  "growing",
  "harvested",
  "cancelled",
];
export const DEMAND_STATUSES: readonly DemandStatus[] = ["active", "converted", "cancelled", "expired"];
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export interface AdminListParams {
  page: number;
  q: string;
  status: string | null;
}

export interface AdminListResult<T> {
  rows: T[];
  /** Nombre total de lignes correspondant aux filtres (null si inconnu suite à une erreur). */
  total: number | null;
  page: number;
  pageSize: number;
  /** Message d'erreur affichable (français, sans détail technique). */
  error: string | null;
  /** Avertissement non bloquant (donnée secondaire indisponible). */
  warning?: string | null;
}

// ------------------------------------------------------------
// Paramètres d'URL (?q=, ?status=, ?page=)
// ------------------------------------------------------------

type RawSearchParams = Record<string, string | string[] | undefined> | undefined;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Normalise les paramètres d'URL d'une liste administrateur.
 * Le statut n'est retenu que s'il appartient à la liste autorisée.
 */
export function parseAdminListParams(
  searchParams: RawSearchParams,
  allowedStatuses: readonly string[] = []
): AdminListParams {
  const rawPage = Number.parseInt(firstValue(searchParams?.page), 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 100000) : 1;
  const q = firstValue(searchParams?.q).trim().slice(0, 100);
  const rawStatus = firstValue(searchParams?.status).trim();
  const status = allowedStatuses.includes(rawStatus) ? rawStatus : null;
  return { page, q, status };
}

/** Échappe les caractères spéciaux d'un motif ILIKE (%, _, \). */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function pageRange(page: number): { from: number; to: number } {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  return { from, to: from + ADMIN_PAGE_SIZE - 1 };
}

/** PostgREST renvoie PGRST103 lorsque la page demandée dépasse le nombre de lignes. */
function isRangeNotSatisfiable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST103";
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function logQueryError(scope: string, error: unknown) {
  // Journal serveur uniquement : aucun détail technique n'est renvoyé à l'interface.
  console.error(`[admin:${scope}]`, error);
}

// ------------------------------------------------------------
// Contrôle d'accès (défense en profondeur, en plus du layout admin)
// ------------------------------------------------------------

export type AdminAccess = "ok" | "unauthenticated" | "forbidden";

export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "unauthenticated";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? "ok" : "forbidden";
}

// ------------------------------------------------------------
// Fonction générique de pagination
// ------------------------------------------------------------

type PagedQueryResult = {
  data: unknown[] | null;
  count: number | null;
  error: { code?: string; message?: string } | null;
};

/**
 * Exécute une requête paginée. Si la page demandée est hors limites (PGRST103),
 * renvoie une liste vide accompagnée du total réel (obtenu par comptage) afin que
 * l'interface propose de revenir à une page valide.
 */
async function runPaged<T>(
  scope: string,
  page: number,
  errorMessage: string,
  run: (range: { from: number; to: number }) => PromiseLike<PagedQueryResult>,
  countOnly: () => PromiseLike<{ count: number | null; error: unknown }>,
  mapRow: (raw: any) => T
): Promise<AdminListResult<T>> {
  const base = { page, pageSize: ADMIN_PAGE_SIZE };
  const { data, count, error } = await run(pageRange(page));

  if (error) {
    if (isRangeNotSatisfiable(error)) {
      const countRes = await countOnly();
      if (countRes.error) {
        logQueryError(scope, countRes.error);
        return { ...base, rows: [], total: null, error: errorMessage };
      }
      return { ...base, rows: [], total: countRes.count ?? 0, error: null };
    }
    logQueryError(scope, error);
    return { ...base, rows: [], total: null, error: errorMessage };
  }

  return {
    ...base,
    rows: (data ?? []).map(mapRow),
    total: count ?? 0,
    error: null,
  };
}

// ============================================================
// ENTREPRISES
// ============================================================

export interface AdminCompanyRow {
  id: string;
  name: string;
  city: string | null;
  provinceName: string | null;
  verificationStatus: CompanyVerificationStatus;
  isActive: boolean;
  createdAt: string;
  ownerName: string | null;
}

export async function getAdminCompanies(params: AdminListParams): Promise<AdminListResult<AdminCompanyRow>> {
  const supabase = await createClient();

  const applyFilters = (query: any) => {
    let q = query;
    if (params.q) q = q.ilike("name", `%${escapeLikePattern(params.q)}%`);
    if (params.status) q = q.eq("verification_status", params.status);
    return q;
  };

  const result = await runPaged<AdminCompanyRow & { createdBy: string | null }>(
    "companies",
    params.page,
    "Impossible de charger la liste des entreprises.",
    ({ from, to }) =>
      applyFilters(
        supabase
          .from("companies")
          .select(
            "id, name, city, verification_status, is_active, created_at, created_by, province:provinces(name)",
            { count: "exact" }
          )
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    () => applyFilters(supabase.from("companies").select("id", { count: "exact", head: true })),
    (raw) => ({
      id: raw.id,
      name: raw.name,
      city: raw.city ?? null,
      provinceName: one<{ name: string }>(raw.province)?.name ?? null,
      verificationStatus: raw.verification_status,
      isActive: Boolean(raw.is_active),
      createdAt: raw.created_at,
      createdBy: raw.created_by ?? null,
      ownerName: null,
    })
  );

  if (result.error || result.rows.length === 0) {
    return { ...result, rows: result.rows.map(({ createdBy: _c, ...row }) => row) };
  }

  // Nom du compte fondateur (profiles.full_name) — donnée secondaire.
  const ownerIds = Array.from(
    new Set(result.rows.map((r) => r.createdBy).filter((id): id is string => Boolean(id)))
  );
  let warning: string | null = null;
  const ownerNames = new Map<string, string>();

  if (ownerIds.length > 0) {
    const { data: owners, error: ownersError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);

    if (ownersError) {
      logQueryError("companies.owners", ownersError);
      warning = "Les noms des responsables n'ont pas pu être chargés.";
    } else {
      for (const owner of owners ?? []) {
        if (owner?.id && owner?.full_name) ownerNames.set(owner.id, owner.full_name);
      }
    }
  }

  return {
    ...result,
    warning,
    rows: result.rows.map(({ createdBy, ...row }) => ({
      ...row,
      ownerName: createdBy ? ownerNames.get(createdBy) ?? null : null,
    })),
  };
}

export type CompanyVerificationCounts = Record<CompanyVerificationStatus, number>;

/** Répartition des entreprises par statut de vérification (null si indisponible). */
export async function getAdminCompanyVerificationCounts(): Promise<CompanyVerificationCounts | null> {
  const supabase = await createClient();
  const results = await Promise.all(
    COMPANY_VERIFICATION_STATUSES.map((status) =>
      supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", status)
    )
  );

  if (results.some((r) => r.error)) {
    results.forEach((r) => r.error && logQueryError("companies.counts", r.error));
    return null;
  }

  return {
    pending: results[0].count ?? 0,
    verified: results[1].count ?? 0,
    rejected: results[2].count ?? 0,
  };
}

// ============================================================
// REVENDEURS
// ============================================================

export interface AdminResellerRow {
  id: string;
  businessName: string | null;
  resellerType: ResellerType;
  city: string | null;
  provinceName: string | null;
  createdAt: string;
}

/** Pour les revendeurs, le filtre `status` porte sur la typologie (reseller_type). */
export async function getAdminResellers(params: AdminListParams): Promise<AdminListResult<AdminResellerRow>> {
  const supabase = await createClient();

  const applyFilters = (query: any) => {
    let q = query;
    if (params.q) q = q.ilike("business_name", `%${escapeLikePattern(params.q)}%`);
    if (params.status) q = q.eq("reseller_type", params.status);
    return q;
  };

  return runPaged<AdminResellerRow>(
    "resellers",
    params.page,
    "Impossible de charger la liste des revendeurs.",
    ({ from, to }) =>
      applyFilters(
        supabase
          .from("resellers")
          .select("id, business_name, reseller_type, city, created_at, province:provinces(name)", {
            count: "exact",
          })
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    () => applyFilters(supabase.from("resellers").select("id", { count: "exact", head: true })),
    (raw) => ({
      id: raw.id,
      businessName: raw.business_name ?? null,
      resellerType: raw.reseller_type,
      city: raw.city ?? null,
      provinceName: one<{ name: string }>(raw.province)?.name ?? null,
      createdAt: raw.created_at,
    })
  );
}

// ============================================================
// PRODUCTIONS
// ============================================================

export interface AdminProductionRow {
  id: string;
  title: string;
  companyName: string | null;
  productName: string | null;
  status: ProductionStatus;
  isPublic: boolean;
  expectedQuantity: number;
  unit: string;
  createdAt: string;
}

export async function getAdminProductions(params: AdminListParams): Promise<AdminListResult<AdminProductionRow>> {
  const supabase = await createClient();

  const applyFilters = (query: any) => {
    let q = query;
    if (params.q) q = q.ilike("title", `%${escapeLikePattern(params.q)}%`);
    if (params.status) q = q.eq("status", params.status);
    return q;
  };

  return runPaged<AdminProductionRow>(
    "productions",
    params.page,
    "Impossible de charger la liste des productions.",
    ({ from, to }) =>
      applyFilters(
        supabase
          .from("productions")
          .select(
            "id, title, status, is_public, expected_quantity, unit, created_at, company:companies(name), product:products(name)",
            { count: "exact" }
          )
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    () => applyFilters(supabase.from("productions").select("id", { count: "exact", head: true })),
    (raw) => ({
      id: raw.id,
      title: raw.title,
      companyName: one<{ name: string }>(raw.company)?.name ?? null,
      productName: one<{ name: string }>(raw.product)?.name ?? null,
      status: raw.status,
      isPublic: Boolean(raw.is_public),
      expectedQuantity: toNumber(raw.expected_quantity),
      unit: raw.unit,
      createdAt: raw.created_at,
    })
  );
}

// ============================================================
// DEMANDES
// ============================================================

export interface AdminDemandRow {
  id: string;
  productName: string | null;
  resellerName: string | null;
  quantity: number;
  unit: string;
  provinceName: string | null;
  status: DemandStatus;
  demandType: DemandType;
  createdAt: string;
}

/** La recherche textuelle porte sur le nom du produit demandé. */
export async function getAdminDemands(params: AdminListParams): Promise<AdminListResult<AdminDemandRow>> {
  const supabase = await createClient();
  // Jointure interne uniquement lors d'une recherche (product_id est NOT NULL).
  // Sans alias pour que le filtre sur la ressource imbriquée (`products.name`) soit sans ambiguïté.
  const productEmbed = params.q ? "products!inner(name)" : "product:products(name)";

  const applyFilters = (query: any) => {
    let q = query;
    if (params.q) q = q.ilike("products.name", `%${escapeLikePattern(params.q)}%`);
    if (params.status) q = q.eq("status", params.status);
    return q;
  };

  return runPaged<AdminDemandRow>(
    "demands",
    params.page,
    "Impossible de charger la liste des demandes.",
    ({ from, to }) =>
      applyFilters(
        supabase
          .from("demands")
          .select(
            `id, quantity, unit, status, demand_type, created_at, ${productEmbed}, province:provinces(name), reseller:resellers(business_name)`,
            { count: "exact" }
          )
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    () =>
      applyFilters(
        supabase.from("demands").select(params.q ? "id, products!inner(name)" : "id", {
          count: "exact",
          head: true,
        })
      ),
    (raw) => ({
      id: raw.id,
      productName: one<{ name: string }>(raw.product ?? raw.products)?.name ?? null,
      resellerName: one<{ business_name: string | null }>(raw.reseller)?.business_name ?? null,
      quantity: toNumber(raw.quantity),
      unit: raw.unit,
      provinceName: one<{ name: string }>(raw.province)?.name ?? null,
      status: raw.status,
      demandType: raw.demand_type,
      createdAt: raw.created_at,
    })
  );
}

// ============================================================
// CAMPAGNES
// ============================================================

export interface AdminCampaignRow {
  id: string;
  title: string;
  companyName: string | null;
  /** Statut persisté en base. */
  storedStatus: CampaignStatus;
  /** Statut effectif (dates de fin et dates limites des destinations). */
  effectiveStatus: CampaignStatus;
  marketableQuantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export async function getAdminCampaigns(params: AdminListParams): Promise<AdminListResult<AdminCampaignRow>> {
  const supabase = await createClient();

  const applyFilters = (query: any) => {
    let q = query;
    if (params.q) q = q.ilike("title", `%${escapeLikePattern(params.q)}%`);
    return q;
  };

  return runPaged<AdminCampaignRow>(
    "campaigns",
    params.page,
    "Impossible de charger la liste des campagnes.",
    ({ from, to }) =>
      applyFilters(
        supabase
          .from("campaigns")
          .select(
            "id, title, status, marketable_quantity, unit, unit_price, currency, start_date, end_date, created_at, company:companies(name), destinations:campaign_destinations(order_deadline_date)",
            { count: "exact" }
          )
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    () => applyFilters(supabase.from("campaigns").select("id", { count: "exact", head: true })),
    (raw) => ({
      id: raw.id,
      title: raw.title,
      companyName: one<{ name: string }>(raw.company)?.name ?? null,
      storedStatus: raw.status,
      effectiveStatus: getEffectiveCampaignStatus({
        status: raw.status,
        start_date: raw.start_date,
        end_date: raw.end_date,
        destinations: Array.isArray(raw.destinations) ? raw.destinations : [],
      }),
      marketableQuantity: toNumber(raw.marketable_quantity),
      unit: raw.unit,
      unitPrice: toNumber(raw.unit_price),
      currency: raw.currency,
      startDate: raw.start_date ?? null,
      endDate: raw.end_date ?? null,
      createdAt: raw.created_at,
    })
  );
}

/**
 * Nombre de campagnes EFFECTIVEMENT actives (statut 'active' en base, date de fin
 * non dépassée et au moins une destination encore ouverte), calculé avec
 * `getEffectiveCampaignStatus`. Renvoie null si le comptage est impossible.
 */
export async function countAdminEffectiveActiveCampaigns(): Promise<number | null> {
  const supabase = await createClient();
  const batchSize = 1000;
  let offset = 0;
  let activeCount = 0;

  // Lecture par lots pour ne pas dépendre de la limite de lignes de PostgREST.
  for (;;) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, status, start_date, end_date, destinations:campaign_destinations(order_deadline_date)")
      .eq("status", "active")
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      if (isRangeNotSatisfiable(error)) break;
      logQueryError("campaigns.activeCount", error);
      return null;
    }

    const rows = data ?? [];
    for (const raw of rows as any[]) {
      const effective = getEffectiveCampaignStatus({
        status: raw.status,
        start_date: raw.start_date,
        end_date: raw.end_date,
        destinations: Array.isArray(raw.destinations) ? raw.destinations : [],
      });
      if (effective === "active") activeCount++;
    }

    if (rows.length < batchSize) break;
    offset += batchSize;
  }

  return activeCount;
}

// ============================================================
// COMMANDES
// ============================================================

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  companyName: string | null;
  resellerName: string | null;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

/** La recherche textuelle porte sur le numéro de commande. */
export async function getAdminOrders(params: AdminListParams): Promise<AdminListResult<AdminOrderRow>> {
  const supabase = await createClient();

  const applyFilters = (query: any) => {
    let q = query;
    if (params.q) q = q.ilike("order_number", `%${escapeLikePattern(params.q)}%`);
    if (params.status) q = q.eq("status", params.status);
    return q;
  };

  return runPaged<AdminOrderRow>(
    "orders",
    params.page,
    "Impossible de charger la liste des commandes.",
    ({ from, to }) =>
      applyFilters(
        supabase
          .from("orders")
          .select(
            "id, order_number, status, total_amount, currency, created_at, company_name_snapshot, company:companies(name), reseller:resellers(business_name)",
            { count: "exact" }
          )
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    () => applyFilters(supabase.from("orders").select("id", { count: "exact", head: true })),
    (raw) => ({
      id: raw.id,
      orderNumber: raw.order_number,
      companyName: one<{ name: string }>(raw.company)?.name ?? raw.company_name_snapshot ?? null,
      resellerName: one<{ business_name: string | null }>(raw.reseller)?.business_name ?? null,
      status: raw.status,
      totalAmount: toNumber(raw.total_amount),
      currency: raw.currency,
      createdAt: raw.created_at,
    })
  );
}
