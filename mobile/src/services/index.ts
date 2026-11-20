/**
 * Point d'accès unique aux services. Les écrans passent par les hooks et ce module,
 * jamais par une implémentation directement : remplacer l'implémentation ne touche aucun écran.
 */
import type { Services } from "./contracts";
import { createUnconnectedServices } from "./unconnected";

export const services: Services = createUnconnectedServices();

export type { Services } from "./contracts";
export type { Result, ServiceError, ServiceErrorCode } from "./contracts";
