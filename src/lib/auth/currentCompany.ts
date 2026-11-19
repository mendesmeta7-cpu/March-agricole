import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMultipleRowsError } from "@/lib/utils/readErrors";

/**
 * Résolution mutualisée de l'utilisateur courant et de son entreprise (FUN-18 / PERF-02).
 *
 * Les fonctions sont enveloppées dans React `cache()` : au sein d'une même requête
 * serveur (layout + page + composants serveur), chaque lecture n'est faite qu'une fois.
 * Le cache est propre à la requête : aucune donnée n'est partagée entre utilisateurs.
 */

/** Utilisateur authentifié (vérifié auprès de Supabase Auth), ou null. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

export interface CurrentProfile {
  role: string | null;
  full_name: string | null;
}

/** Rôle et nom du profil de l'utilisateur courant, ou null. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  return data ? { role: data.role ?? null, full_name: data.full_name ?? null } : null;
});

/**
 * Identifiant de l'entreprise de l'utilisateur courant.
 * Même logique que les helpers `getCompanyIdForUser` des Server Actions :
 * 1. rattachement via `company_members` (collaborateurs) ;
 * 2. à défaut, entreprise créée par l'utilisateur (`companies.created_by`).
 * Retourne null si aucune entreprise n'est trouvée (les politiques RLS restent la garantie d'isolation).
 *
 * Lot 2C : une panne de lecture lève une erreur (écran « Réessayer ») au lieu
 * d'afficher un faux « compte sans société ». Exception conservée à l'identique :
 * un membre de plusieurs sociétés reçoit de `maybeSingle()` l'erreur « plusieurs
 * lignes », qui n'est pas une panne et garde le repli existant (étape 2, puis null).
 */
export const getCurrentCompanyId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: memberData, error: memberError } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError && !isMultipleRowsError(memberError)) {
    console.error("Erreur lecture du rattachement à l'exploitation:", memberError);
    throw new Error("Lecture du rattachement à l'exploitation impossible");
  }

  if (memberData?.company_id) {
    return memberData.company_id as string;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("created_by", user.id)
    .maybeSingle();

  if (companyError && !isMultipleRowsError(companyError)) {
    console.error("Erreur lecture de l'exploitation créée par l'utilisateur:", companyError);
    throw new Error("Lecture de l'exploitation de l'utilisateur impossible");
  }

  return (company?.id as string | undefined) ?? null;
});

/** Message affiché lorsqu'aucune entreprise n'est rattachée au compte (sans redirection). */
export const NO_COMPANY_MESSAGE =
  "Aucune exploitation n'est rattachée à votre compte. Si vous êtes collaborateur, demandez au responsable de l'exploitation de vérifier votre rattachement.";
