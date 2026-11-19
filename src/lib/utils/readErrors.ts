/**
 * Lot 2C — distinguer une absence réelle d'une panne de lecture.
 *
 * Règle : une erreur renvoyée par Supabase n'est jamais présentée comme une
 * absence de données (« introuvable », liste vide, compteur à zéro). Seuls deux
 * cas précis, qui ne sont pas des pannes, gardent leur comportement d'origine :
 * - plusieurs lignes reçues par `maybeSingle()` ;
 * - identifiant d'URL mal formé (la ligne demandée ne peut pas exister).
 *
 * Module sans dépendance : utilisable par le serveur et par les tests unitaires.
 */

/** Forme minimale d'une erreur PostgREST. */
export interface ReadErrorLike {
  code?: string | null;
}

/**
 * Code produit par supabase-js (postgrest-js 2.x) lorsqu'une requête
 * `maybeSingle()` reçoit plusieurs lignes. Pour une lecture, ce code est créé
 * par le client à partir d'une réponse reçue sans erreur : ce n'est pas une panne.
 */
export const MULTIPLE_ROWS_ERROR_CODE = "PGRST116";

/**
 * Code PostgreSQL « invalid_text_representation » : la valeur d'un filtre ne peut
 * pas être convertie dans le type de la colonne (ex. identifiant d'URL qui n'est
 * pas un UUID). Aucune ligne ne peut correspondre : c'est une absence réelle.
 */
export const MALFORMED_VALUE_ERROR_CODE = "22P02";

/** `maybeSingle()` a trouvé plusieurs lignes. */
export function isMultipleRowsError(error: ReadErrorLike | null | undefined): boolean {
  return error?.code === MULTIPLE_ROWS_ERROR_CODE;
}

/** Identifiant mal formé : la ligne demandée n'existe pas. */
export function isMalformedIdError(error: ReadErrorLike | null | undefined): boolean {
  return error?.code === MALFORMED_VALUE_ERROR_CODE;
}

/** Résultat brut d'une requête Supabase. */
interface RawRead<T> {
  data: T | null;
  error: unknown;
}

/**
 * Lecture directe d'une liste : renvoie les lignes, ou lève une erreur en cas de
 * panne (à isoler avec `settleRead` quand la lecture est secondaire).
 * Une liste réellement vide reste une liste vide.
 */
export async function readRows<T>(query: PromiseLike<RawRead<T[]>>, label: string): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(`Lecture impossible : ${label}`);
  return data ?? [];
}

/**
 * Lecture directe d'une ligne facultative (`maybeSingle()`) : renvoie la ligne ou
 * null si elle n'existe pas, et lève une erreur en cas de panne.
 */
export async function readOptionalRow<T>(query: PromiseLike<RawRead<T>>, label: string): Promise<T | null> {
  const { data, error } = await query;
  if (error) throw new Error(`Lecture impossible : ${label}`);
  return data ?? null;
}
