"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CompanyVerificationActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

type VerificationStatus = "pending" | "verified" | "rejected";

const ALLOWED_STATUSES: readonly VerificationStatus[] = ["pending", "verified", "rejected"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUCCESS_MESSAGES: Record<VerificationStatus, string> = {
  verified: "Entreprise vérifiée : le badge de vérification est désormais affiché.",
  rejected: "La vérification de l'entreprise a été rejetée.",
  pending: "L'entreprise a été remise en attente de vérification.",
};

/**
 * Vérifie que l'utilisateur connecté est bien administrateur
 * (même contrôle que les autres actions d'administration).
 */
async function checkAdminRole(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role === "admin";
}

/**
 * Traduit une erreur de la RPC `admin_set_company_verification` en message
 * affichable, sans exposer de détail technique.
 */
function mapVerificationError(error: { code?: string; message?: string }): string {
  const message = (error.message || "").toLowerCase();

  if (error.code === "PGRST202" || error.code === "42883") {
    // Fonction absente : la migration de sécurité n'est pas encore appliquée.
    return "La validation des entreprises n'est pas encore disponible sur ce serveur. Veuillez contacter l'équipe technique.";
  }
  if (message.includes("réservée aux administrateurs") || error.code === "42501") {
    return "Action non autorisée. Réservé aux administrateurs.";
  }
  if (message.includes("introuvable")) {
    return "Entreprise introuvable. Elle a peut-être été supprimée.";
  }
  if (message.includes("statut de vérification invalide")) {
    return "Statut de vérification invalide.";
  }
  return "La mise à jour de la vérification a échoué. Veuillez réessayer.";
}

/**
 * Met à jour le statut de vérification (badge) d'une entreprise — décision A6.
 * L'écriture passe exclusivement par la RPC `admin_set_company_verification`,
 * qui contrôle le rôle administrateur et journalise l'opération (audit_logs).
 */
export async function setCompanyVerificationAction(
  companyId: string,
  status: string
): Promise<CompanyVerificationActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const isAdmin = await checkAdminRole(supabase, user.id);
  if (!isAdmin) {
    return { error: "Action non autorisée. Réservé aux administrateurs." };
  }

  if (typeof companyId !== "string" || !UUID_PATTERN.test(companyId)) {
    return { error: "Identifiant d'entreprise invalide." };
  }

  if (!ALLOWED_STATUSES.includes(status as VerificationStatus)) {
    return { error: "Statut de vérification invalide." };
  }
  const nextStatus = status as VerificationStatus;

  const { error } = await supabase.rpc("admin_set_company_verification", {
    p_company_id: companyId,
    p_status: nextStatus,
  });

  if (error) {
    console.error("[admin:setCompanyVerification]", error);
    return { error: mapVerificationError(error) };
  }

  revalidatePath("/dashboard/admin/companies");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/dashboard/reseller/companies/${companyId}`);

  return { success: true, message: SUCCESS_MESSAGES[nextStatus] };
}
