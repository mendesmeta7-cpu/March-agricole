/**
 * Utilitaires pour la représentation saisonnière des cycles agricoles.
 *
 * CONCEPT MÉTIER : Une saison agricole est représentée par des mois récurrents (1-12),
 * indépendants de l'année civile. Ex: "Plantation : avril–juin" reste valide en 2027, 2028...
 *
 * SAISON CYCLIQUE : Une saison peut traverser l'année civile.
 * Ex: octobre→février est valide (10 > 2 n'est pas une erreur).
 */

export const MONTHS_FR = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

/**
 * Retourne le nom français d'un mois (1-12).
 * Retourne null si le mois est null/undefined/hors range.
 */
export function getMonthName(month: number | null | undefined): string | null {
  if (!month || month < 1 || month > 12) return null;
  return MONTHS_FR[month - 1].label;
}

/**
 * Retourne le nom abrégé (3 lettres) d'un mois en français.
 */
export function getMonthShortName(month: number | null | undefined): string | null {
  const name = getMonthName(month);
  if (!name) return null;
  return name.slice(0, 3).toLowerCase();
}

/**
 * Formate une période saisonnière en texte lisible.
 * Gère correctement les saisons qui traversent l'année civile.
 *
 * Exemples:
 *   formatSeasonalPeriod(4, 6) → "avril–juin"
 *   formatSeasonalPeriod(10, 2) → "octobre–février" (traversée d'année civile)
 *   formatSeasonalPeriod(8, null) → "août"
 *   formatSeasonalPeriod(null, null) → null
 */
export function formatSeasonalPeriod(
  startMonth: number | null | undefined,
  endMonth: number | null | undefined
): string | null {
  const start = getMonthName(startMonth);
  const end = getMonthName(endMonth);

  if (!start && !end) return null;
  if (start && !end) return start.toLowerCase();
  if (!start && end) return end.toLowerCase();
  if (start === end) return start!.toLowerCase();

  return `${start!.toLowerCase()}–${end!.toLowerCase()}`;
}

/**
 * Retourne true si la saison est cyclique (traverse l'année civile).
 * Ex: octobre(10) → février(2) = cyclique car 10 > 2.
 */
export function isSeasonCyclical(
  startMonth: number | null | undefined,
  endMonth: number | null | undefined
): boolean {
  if (!startMonth || !endMonth) return false;
  return startMonth > endMonth;
}

/**
 * Formate un calendrier cultural complet (plantation + récolte).
 * Retourne un objet avec les libellés formatés.
 */
export function formatProductionSeasonCalendar(production: {
  planting_start_month?: number | null;
  planting_end_month?: number | null;
  harvest_start_month?: number | null;
  harvest_end_month?: number | null;
}): {
  plantingPeriod: string | null;
  harvestPeriod: string | null;
  hasPlanting: boolean;
  hasHarvest: boolean;
} {
  const plantingPeriod = formatSeasonalPeriod(
    production.planting_start_month,
    production.planting_end_month
  );
  const harvestPeriod = formatSeasonalPeriod(
    production.harvest_start_month,
    production.harvest_end_month
  );

  return {
    plantingPeriod,
    harvestPeriod,
    hasPlanting: Boolean(plantingPeriod),
    hasHarvest: Boolean(harvestPeriod),
  };
}
