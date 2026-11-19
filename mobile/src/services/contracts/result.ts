/**
 * Résultat commun à tous les services : aligné sur le format proposé pour les routes
 * /api/mobile/v1 (rapport du Lot 0) : { ok, data } ou { ok: false, error: { code, message } }.
 */
export type ServiceErrorCode =
  | "NOT_CONNECTED"
  | "NETWORK"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNKNOWN";

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: ServiceErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
