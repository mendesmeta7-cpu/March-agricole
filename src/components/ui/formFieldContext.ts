"use client";

import { createContext, useContext } from "react";

/**
 * Lien entre un `FormField` et son champ (Lot UX/UI 5B, fiche A11-06) : le champ reçoit
 * automatiquement `aria-invalid` et `aria-describedby` (message d'erreur ou aide), et une liste
 * `Select` reçoit `aria-labelledby` (un `<label for>` ne nomme pas un élément `role="combobox"`).
 */
export interface FormFieldContextValue {
  /** Identifiants du message d'erreur et de l'aide affichés, séparés par une espace. */
  describedBy?: string;
  /** Vrai quand le champ affiche une erreur. */
  invalid: boolean;
  /** Identifiant du libellé du champ. */
  labelId?: string;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormFieldContext(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

/** Fusionne des listes d'identifiants (`aria-describedby`), sans doublon ; undefined si vide. */
export function mergeIds(...ids: Array<string | null | undefined | false>): string | undefined {
  const uniques = Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string").flatMap((id) => id.split(/\s+/)).filter(Boolean))
  );
  return uniques.length > 0 ? uniques.join(" ") : undefined;
}
