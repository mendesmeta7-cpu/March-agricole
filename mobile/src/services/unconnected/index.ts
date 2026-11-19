/**
 * Implémentation « non connectée » des services (ADR-067, D-M3 refusée).
 *
 * Elle ne contient AUCUNE donnée et ne fait AUCUN accès réseau. Tant que la connexion aux données
 * réelles n'est pas autorisée, toute opération qui en aurait besoin renvoie NOT_CONNECTED et l'écran
 * l'indique explicitement (jamais une liste vide ni un zéro à la place d'une donnée non lue).
 */
import { fail, ok, type Services } from "../contracts";

export const NOT_CONNECTED_MESSAGE =
  "Les données Radiza ne sont pas encore connectées à l'application mobile. Cette fonction sera disponible après la validation de la sécurité.";

export function createUnconnectedServices(): Services {
  return {
    auth: {
      // Aucune session ne peut exister tant que l'authentification n'est pas branchée : réponse exacte.
      getSession: async () => ok(null),
      signInWithPassword: async () => fail("NOT_CONNECTED", NOT_CONNECTED_MESSAGE),
      signOut: async () => ok(undefined),
    },
  };
}
