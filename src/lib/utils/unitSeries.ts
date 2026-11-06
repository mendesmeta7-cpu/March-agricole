/**
 * Séries et agrégations de quantités ventilées par unité de mesure.
 *
 * Règle BR-FIN-04 / décision validée « une série par unité » :
 *  - des quantités exprimées dans des unités différentes (tonnes, kg, caisses, sacs,
 *    litres, pièces…) ne sont JAMAIS additionnées entre elles ;
 *  - aucune conversion implicite n'est appliquée (pas de kg → t, etc.) ;
 *  - les pourcentages sont calculés À L'INTÉRIEUR de chaque unité.
 *
 * La clé d'unité est normalisée (trim + minuscules) pour regrouper « Tonne » et
 * « tonne », mais le libellé d'affichage d'origine (premier rencontré) est conservé.
 * Une unité absente n'est jamais remplacée par une valeur supposée : elle forme son
 * propre groupe « unité non précisée ».
 *
 * Module pur, sans dépendance (importable par les tests node:test).
 */

/** Libellé affiché pour les quantités dont l'unité n'est pas renseignée. */
export const UNKNOWN_UNIT_LABEL = "unité non précisée";

type QuantityInput = number | string | null | undefined;
type UnitInput = string | null | undefined;

/** Clé d'unité normalisée : trim + minuscules. Chaîne vide si absente. */
export function normalizeUnit(unit: UnitInput): string {
  return (unit ?? "").trim().toLowerCase();
}

/** Libellé d'affichage d'une unité (valeur d'origine nettoyée, jamais convertie). */
export function unitDisplayLabel(unit: UnitInput): string {
  const label = (unit ?? "").trim();
  return label || UNKNOWN_UNIT_LABEL;
}

/** Arrondi anti-bruit flottant (3 décimales), sans conversion d'unité. */
function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toFiniteQuantity(value: QuantityInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, "fr", { sensitivity: "base" });
}

// ─── Totaux par unité ────────────────────────────────────────────────────────

export interface UnitTotal {
  /** Clé normalisée (trim + minuscules). */
  unitKey: string;
  /** Libellé d'affichage d'origine. */
  unitLabel: string;
  /** Somme des quantités de CETTE unité uniquement. */
  total: number;
  /** Nombre d'éléments ayant contribué. */
  count: number;
}

function sortUnitTotals<T extends { unitLabel: string; count: number }>(list: T[]): T[] {
  return list.sort((a, b) => b.count - a.count || compareLabels(a.unitLabel, b.unitLabel));
}

/**
 * Regroupe des quantités par unité, sans jamais additionner deux unités différentes.
 * Les quantités non numériques sont ignorées. Tri : nombre d'éléments décroissant,
 * puis libellé.
 */
export function groupQuantitiesByUnit<T>(
  items: readonly T[] | null | undefined,
  getQuantity: (item: T) => QuantityInput,
  getUnit: (item: T) => UnitInput
): UnitTotal[] {
  const map = new Map<string, UnitTotal>();
  for (const item of items ?? []) {
    const quantity = toFiniteQuantity(getQuantity(item));
    if (quantity === null) continue;
    const rawUnit = getUnit(item);
    const unitKey = normalizeUnit(rawUnit);
    const entry = map.get(unitKey) ?? {
      unitKey,
      unitLabel: unitDisplayLabel(rawUnit),
      total: 0,
      count: 0,
    };
    entry.total = roundQuantity(entry.total + quantity);
    entry.count += 1;
    map.set(unitKey, entry);
  }
  return sortUnitTotals(Array.from(map.values()));
}

/**
 * Formate une liste de totaux par unité : « 120 tonne · 40 caisses ».
 * Les totaux nuls sont omis ; chaîne vide si rien à afficher.
 */
export function formatUnitTotals(
  totals: readonly { unitLabel: string; total: number }[],
  separator = " · "
): string {
  return totals
    .filter((t) => Number.isFinite(t.total) && t.total !== 0)
    .map((t) => `${formatQuantity(t.total)} ${t.unitLabel}`)
    .join(separator);
}

/** Nombre au format français, 2 décimales maximum (aucune conversion). */
export function formatQuantity(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

// ─── Pourcentages ────────────────────────────────────────────────────────────

/**
 * Pourcentages entiers dont la somme vaut exactement 100 (méthode du plus fort
 * reste) lorsque le total est strictement positif ; tous à 0 sinon.
 */
export function percentagesSummingTo100(values: readonly number[]): number[] {
  const safe = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = safe.reduce((acc, v) => acc + v, 0);
  if (total <= 0) return safe.map(() => 0);

  const raw = safe.map((v) => (v / total) * 100);
  const floored = raw.map((r) => Math.floor(r));
  let remaining = 100 - floored.reduce((acc, v) => acc + v, 0);

  const order = raw
    .map((r, index) => ({ index, fraction: r - Math.floor(r) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of order) {
    if (remaining <= 0) break;
    floored[index] += 1;
    remaining -= 1;
  }
  return floored;
}

// ─── Séries mensuelles par unité ─────────────────────────────────────────────

export interface UnitTrendPoint {
  /** Date ISO (ou Date) de l'enregistrement. */
  date: string | Date;
  quantity: QuantityInput;
  unit: UnitInput;
}

export interface MonthlyUnitSeries {
  unitKey: string;
  unitLabel: string;
  /** Quantité par mois, alignée sur `monthKeys` (unité de la série uniquement). */
  values: number[];
  /** Nombre d'enregistrements par mois pour cette unité. */
  counts: number[];
  /** Total de la série sur la fenêtre (cette unité uniquement). */
  total: number;
  /** Nombre total d'enregistrements de la série sur la fenêtre. */
  count: number;
}

/** Clé de mois « AAAA-MM » en heure locale (même logique que l'axe du graphique). */
export function monthKeyOf(date: string | Date): string | null {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Les `count` derniers mois calendaires (ordre chronologique), mois courant inclus. */
export function lastMonthKeys(now: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKeyOf(d) as string);
  }
  return keys;
}

/**
 * Construit une série mensuelle par unité. Les points hors fenêtre sont ignorés ;
 * aucune quantité n'est convertie ni additionnée entre unités.
 * Tri des séries : nombre d'enregistrements décroissant, puis libellé.
 */
export function buildMonthlySeriesByUnit(
  points: readonly UnitTrendPoint[] | null | undefined,
  monthKeys: readonly string[]
): MonthlyUnitSeries[] {
  const indexByMonth = new Map<string, number>();
  monthKeys.forEach((key, i) => indexByMonth.set(key, i));

  const map = new Map<string, MonthlyUnitSeries>();
  for (const point of points ?? []) {
    const monthKey = monthKeyOf(point.date);
    if (monthKey === null) continue;
    const monthIndex = indexByMonth.get(monthKey);
    if (monthIndex === undefined) continue;

    const unitKey = normalizeUnit(point.unit);
    const series = map.get(unitKey) ?? {
      unitKey,
      unitLabel: unitDisplayLabel(point.unit),
      values: monthKeys.map(() => 0),
      counts: monthKeys.map(() => 0),
      total: 0,
      count: 0,
    };
    const quantity = toFiniteQuantity(point.quantity) ?? 0;
    series.values[monthIndex] = roundQuantity(series.values[monthIndex] + quantity);
    series.counts[monthIndex] += 1;
    series.total = roundQuantity(series.total + quantity);
    series.count += 1;
    map.set(unitKey, series);
  }
  return sortUnitTotals(Array.from(map.values()));
}

/** Nombre d'enregistrements par mois, toutes unités confondues (un décompte, pas un volume). */
export function countByMonth(
  points: readonly { date: string | Date }[] | null | undefined,
  monthKeys: readonly string[]
): number[] {
  const counts = monthKeys.map(() => 0);
  const indexByMonth = new Map<string, number>();
  monthKeys.forEach((key, i) => indexByMonth.set(key, i));
  for (const point of points ?? []) {
    const monthKey = monthKeyOf(point.date);
    if (monthKey === null) continue;
    const i = indexByMonth.get(monthKey);
    if (i !== undefined) counts[i] += 1;
  }
  return counts;
}

// ─── Répartition géographique par (province, unité) ─────────────────────────

export interface ProvinceUnitRow {
  provinceId: string;
  provinceName: string;
  quantity: QuantityInput;
  unit: UnitInput;
}

export interface ProvinceUnitShare {
  unitKey: string;
  unitLabel: string;
  /** Quantité de la province dans CETTE unité. */
  quantity: number;
  demandsCount: number;
  /** Part de la province dans le total de CETTE unité (entier, somme = 100 par unité). */
  percentage: number;
}

export interface ProvinceUnitBreakdown {
  provinceId: string;
  provinceName: string;
  /** Nombre total d'enregistrements de la province (décompte, toutes unités). */
  demandsCount: number;
  /** Une entrée par unité présente dans la province, dans l'ordre de `unitTotals`. */
  units: ProvinceUnitShare[];
}

export interface ProvinceBreakdownResult {
  provinces: ProvinceUnitBreakdown[];
  /** Totaux par unité, toutes provinces confondues (jamais d'addition entre unités). */
  unitTotals: UnitTotal[];
}

/**
 * Ventile des enregistrements par (province, unité). Les pourcentages sont calculés
 * à l'intérieur de chaque unité. Les provinces sont classées par nombre
 * d'enregistrements décroissant (critère indépendant des unités), puis par nom.
 * Une quantité non numérique compte comme enregistrement mais ajoute 0.
 */
export function buildProvinceBreakdownByUnit(
  rows: readonly ProvinceUnitRow[] | null | undefined
): ProvinceBreakdownResult {
  type Acc = {
    provinceId: string;
    provinceName: string;
    demandsCount: number;
    units: Map<string, { unitLabel: string; quantity: number; demandsCount: number }>;
  };
  const provinces = new Map<string, Acc>();
  const totals = new Map<string, UnitTotal>();

  for (const row of rows ?? []) {
    const quantity = toFiniteQuantity(row.quantity) ?? 0;
    const unitKey = normalizeUnit(row.unit);
    const unitLabel = unitDisplayLabel(row.unit);

    const province = provinces.get(row.provinceId) ?? {
      provinceId: row.provinceId,
      provinceName: row.provinceName,
      demandsCount: 0,
      units: new Map(),
    };
    province.demandsCount += 1;
    const share = province.units.get(unitKey) ?? { unitLabel, quantity: 0, demandsCount: 0 };
    share.quantity = roundQuantity(share.quantity + quantity);
    share.demandsCount += 1;
    province.units.set(unitKey, share);
    provinces.set(row.provinceId, province);

    const total = totals.get(unitKey) ?? { unitKey, unitLabel, total: 0, count: 0 };
    total.total = roundQuantity(total.total + quantity);
    total.count += 1;
    totals.set(unitKey, total);
  }

  const unitTotals = sortUnitTotals(Array.from(totals.values()));
  const unitOrder = new Map(unitTotals.map((u, i) => [u.unitKey, i]));

  const sortedProvinces = Array.from(provinces.values()).sort(
    (a, b) => b.demandsCount - a.demandsCount || compareLabels(a.provinceName, b.provinceName)
  );

  // Pourcentages par unité, calculés sur les seules provinces portant cette unité.
  const percentageByProvinceUnit = new Map<string, number>();
  for (const unit of unitTotals) {
    const holders = sortedProvinces.filter((p) => p.units.has(unit.unitKey));
    const percentages = percentagesSummingTo100(
      holders.map((p) => p.units.get(unit.unitKey)!.quantity)
    );
    holders.forEach((p, i) =>
      percentageByProvinceUnit.set(`${p.provinceId}\u0000${unit.unitKey}`, percentages[i])
    );
  }

  return {
    unitTotals,
    provinces: sortedProvinces.map((p) => ({
      provinceId: p.provinceId,
      provinceName: p.provinceName,
      demandsCount: p.demandsCount,
      units: Array.from(p.units.entries())
        .sort(([a], [b]) => (unitOrder.get(a) ?? 0) - (unitOrder.get(b) ?? 0))
        .map(([unitKey, share]) => ({
          unitKey,
          unitLabel: share.unitLabel,
          quantity: share.quantity,
          demandsCount: share.demandsCount,
          percentage: percentageByProvinceUnit.get(`${p.provinceId}\u0000${unitKey}`) ?? 0,
        })),
    })),
  };
}
