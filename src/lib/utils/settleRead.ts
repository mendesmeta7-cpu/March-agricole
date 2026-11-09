import { unstable_rethrow } from "next/navigation";

/**
 * Résultat d'une lecture secondaire d'une page serveur.
 * `failed` permet à l'écran de signaler la panne : une liste de repli vide
 * ne doit jamais être présentée comme une absence réelle de données.
 */
export interface SettledRead<T> {
  data: T;
  failed: boolean;
}

/**
 * Isole une lecture dont la panne ne doit pas faire tomber toute la page.
 * Les signaux internes de Next.js (redirection, rendu dynamique) ne sont pas des
 * pannes et sont relancés tels quels.
 */
export async function settleRead<T>(read: Promise<T>, fallback: T): Promise<SettledRead<T>> {
  try {
    return { data: await read, failed: false };
  } catch (error) {
    unstable_rethrow(error);
    // Journal serveur limité au type et au message : jamais l'objet complet ni la pile.
    const detail = error instanceof Error ? `${error.name} : ${error.message}` : "exception non standard";
    console.error("[Radiza] Lecture isolée en échec —", detail);
    return { data: fallback, failed: true };
  }
}
