/**
 * Agrégations ventilées par devise et par unité.
 *
 * Règles BR-FIN-06 / BR-FIN-07 : les montants CDF et USD ne sont jamais additionnés
 * entre eux, et aucune conversion n'est appliquée. De même, des quantités exprimées
 * dans des unités différentes (tonnes, caisses, sacs…) ne sont jamais sommées.
 */

export type SupportedCurrency = "CDF" | "USD";

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ["CDF", "USD"];

export type CurrencyTotals = Record<SupportedCurrency, number>;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Somme des montants, ventilée par devise. Les lignes dont la devise n'est ni CDF
 * ni USD, ou dont le montant n'est pas un nombre fini, sont ignorées.
 */
export function sumByCurrency<T>(
  items: readonly T[] | null | undefined,
  getAmount: (item: T) => number | string | null | undefined,
  getCurrency: (item: T) => string | null | undefined
): CurrencyTotals {
  const totals: CurrencyTotals = { CDF: 0, USD: 0 };
  for (const item of items ?? []) {
    const currency = (getCurrency(item) || "").toUpperCase();
    if (currency !== "CDF" && currency !== "USD") continue;
    const amount = Number(getAmount(item));
    if (!Number.isFinite(amount)) continue;
    totals[currency] = roundMoney(totals[currency] + amount);
  }
  return totals;
}

/**
 * Somme des quantités, ventilée par unité (clé = unité normalisée en minuscules).
 */
export function sumByUnit<T>(
  items: readonly T[] | null | undefined,
  getQuantity: (item: T) => number | string | null | undefined,
  getUnit: (item: T) => string | null | undefined
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items ?? []) {
    const unit = (getUnit(item) || "").trim().toLowerCase();
    if (!unit) continue;
    const quantity = Number(getQuantity(item));
    if (!Number.isFinite(quantity)) continue;
    totals[unit] = roundMoney((totals[unit] ?? 0) + quantity);
  }
  return totals;
}

/** Devises effectivement présentes (montant non nul), dans l'ordre CDF puis USD. */
export function nonZeroCurrencies(totals: CurrencyTotals): SupportedCurrency[] {
  return SUPPORTED_CURRENCIES.filter((c) => totals[c] !== 0);
}
