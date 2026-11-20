import type { AuthService } from "./auth";

export type { AuthService, SignInInput } from "./auth";
export type { Result, ServiceError, ServiceErrorCode } from "./result";
export { ok, fail } from "./result";

/** Ensemble des services de l'application. Les suivants seront ajoutés écran par écran (guide §5.3). */
export interface Services {
  auth: AuthService;
}
