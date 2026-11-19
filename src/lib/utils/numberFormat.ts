/**
 * Formats communs des montants et des quantités (Lot UX/UI 3C, fiche SYS-05 ; décision du 2026-11-15).
 *
 *  - Montant : séparateurs français, toujours deux décimales, code devise (CDF ou USD) après le montant,
 *    séparé par une espace insécable pour ne jamais être coupé du chiffre : « 2 400 000,00 USD ».
 *  - Quantité : séparateurs français, au plus deux décimales. Les quantités sont stockées en
 *    NUMERIC(12,2) : aucune précision réelle n'est perdue, seul le bruit des calculs flottants est retiré.
 *  - Unité : libellé d'origine, jamais converti (BR-FIN-04). Pluriel à partir de 2, selon l'usage
 *    français, pour une liste fermée d'unités connues (tonne → tonnes) ; abréviations (kg, t, g, l) et
 *    unités inconnues inchangées. Le prix « par unité » garde le singulier (USD/tonne).
 *
 * Module pur, sans dépendance (importable par les tests node:test).
 */

type NumberInput = number | string | null | undefined;

const NBSP = " ";
const amountFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Valeur absente ou illisible affichée « — » plutôt que « NaN ». */
export const VALEUR_ABSENTE = "—";

function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Montant seul, deux décimales : « 2 400 000,00 » (la devise est affichée à part). */
export function formatAmount(value: NumberInput): string {
  const n = toNumber(value);
  return n === null ? VALEUR_ABSENTE : amountFormatter.format(n);
}

/** Montant et devise : « 2 400 000,00 USD ». */
export function formatMoney(value: NumberInput, currency: string | null | undefined): string {
  const amount = formatAmount(value);
  const code = (currency ?? "").trim();
  return code && amount !== VALEUR_ABSENTE ? `${amount}${NBSP}${code}` : amount;
}

/** Quantité seule : « 1 250,5 ». */
export function formatQuantity(value: NumberInput): string {
  const n = toNumber(value);
  return n === null ? VALEUR_ABSENTE : quantityFormatter.format(n);
}

// Liste fermée des unités connues et de leur pluriel (clé : libellé en minuscules).
const PLURIELS: Record<string, string> = {
  tonne: "tonnes",
  sac: "sacs",
  caisse: "caisses",
  cageot: "cageots",
  carton: "cartons",
  panier: "paniers",
  litre: "litres",
  "pièce": "pièces",
  "régime": "régimes",
  botte: "bottes",
  bidon: "bidons",
  "unité": "unités",
  kilogramme: "kilogrammes",
  gramme: "grammes",
};

/** Libellé d'unité accordé à la quantité (pluriel à partir de 2 pour les unités connues). */
export function unitLabel(unit: string | null | undefined, quantity?: NumberInput): string {
  const label = (unit ?? "").trim();
  if (!label) return "";
  const n = toNumber(quantity);
  if (n === null || Math.abs(n) < 2) return label;
  const plural = PLURIELS[label.toLowerCase()];
  if (!plural) return label;
  const first = label.charAt(0);
  return first !== first.toLowerCase() ? plural.charAt(0).toUpperCase() + plural.slice(1) : plural;
}

/** Quantité et unité accordée : « 12 tonnes », « 1,5 tonne », « 40 kg ». */
export function formatQuantityWithUnit(value: NumberInput, unit: string | null | undefined): string {
  const quantity = formatQuantity(value);
  const label = unitLabel(unit, value);
  return label && quantity !== VALEUR_ABSENTE ? `${quantity} ${label}` : quantity;
}
