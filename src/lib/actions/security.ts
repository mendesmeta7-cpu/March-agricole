"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface PasswordActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  otherSessionsRevoked?: boolean;
}

export interface UserSecurityStatus {
  hasPassword: boolean;
  isOAuthOnly: boolean;
  email?: string;
  error?: string;
}

/**
 * AUTH-6.2.4 — Vérification de l'état de sécurité du compte utilisateur actif.
 *
 * Exigences de sécurité strictes (Fail-Closed) :
 * 1. Une réponse booléenne `true` du RPC `auth_user_has_password()` confirme la présence d'un mot de passe.
 * 2. Une réponse booléenne `false` confirme que le compte n'a pas encore de mot de passe (ex. Google OAuth).
 * 3. En cas d'erreur RPC, réponse non booléenne, exception réseau ou absence de session,
 *    l'opération est REFUSÉE DE MANIÈRE SÉCURISÉE (fail-closed).
 * 4. Aucun repli permissif sur `app_metadata.providers` n'est toléré.
 */
export async function getUserSecurityStatusAction(): Promise<UserSecurityStatus> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return {
      hasPassword: false,
      isOAuthOnly: false,
      error: "Session invalide ou expirée. Veuillez vous reconnecter.",
    };
  }

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("auth_user_has_password");

    // Règle FAIL-CLOSED stricte
    if (rpcError || typeof rpcResult !== "boolean") {
      return {
        hasPassword: false,
        isOAuthOnly: false,
        email: user.email,
        error: "Impossible de vérifier la configuration de sécurité de votre compte.",
      };
    }

    return {
      hasPassword: rpcResult,
      isOAuthOnly: !rpcResult,
      email: user.email,
    };
  } catch {
    // Échec de la RPC : refus sécurisé systématique, aucun repli permissif
    return {
      hasPassword: false,
      isOAuthOnly: false,
      email: user.email,
      error: "Impossible de vérifier la configuration de sécurité de votre compte.",
    };
  }
}

/**
 * AUTH-6.2.4 — Étape 2 (Option A) : Demande d'un OTP de réauthentification par e-mail.
 *
 * Déclenche l'envoi d'un code OTP (nonce de réauthentification) pour les comptes OAuth
 * ne disposant pas encore d'un mot de passe Radiza.
 *
 * Règles :
 * - Vérification stricte de l'utilisateur actif via getUser().
 * - Contrôle fail-closed via RPC auth_user_has_password().
 * - Refus si le compte possède déjà un mot de passe (doit passer par le flux standard).
 * - ZÉRO log de code OTP, tokens ou identifiants.
 */
export async function requestPasswordSetupOtpAction(): Promise<PasswordActionResult> {
  const supabase = createClient();

  // 1. Vérification de la session active
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { error: "Session invalide ou expirée. Veuillez vous reconnecter." };
  }

  // 2. Vérification fail-closed de l'état de sécurité du compte
  try {
    const { data: hasPassword, error: rpcError } = await supabase.rpc("auth_user_has_password");

    if (rpcError || typeof hasPassword !== "boolean") {
      return { error: "Impossible de vérifier l'état de sécurité de votre compte. Opération refusée." };
    }

    if (hasPassword === true) {
      return {
        error: "Ce compte possède déjà un mot de passe. Veuillez utiliser le formulaire de modification avec mot de passe actuel.",
      };
    }
  } catch {
    return { error: "Impossible de vérifier l'état de sécurité de votre compte. Opération refusée." };
  }

  // 3. Appel de l'API de réauthentification GoTrue supportée (@supabase/auth-js reauthenticate)
  try {
    const { error: reauthError } = await supabase.auth.reauthenticate();

    if (reauthError) {
      const msg = reauthError.message?.toLowerCase() || "";
      if (msg.includes("rate") || msg.includes("limit") || msg.includes("too many")) {
        return { error: "Trop de tentatives d'envoi. Veuillez patienter avant de demander un nouveau code." };
      }
      return { error: "Échec de l'envoi du code de vérification. Veuillez réessayer." };
    }

    return {
      success: true,
      message: `Un code de vérification a été envoyé à l'adresse e-mail associée à votre compte.`,
    };
  } catch {
    return { error: "Une erreur inattendue est survenue lors de l'envoi du code." };
  }
}

/**
 * AUTH-6.2.4 — Modification d'un mot de passe existant ou configuration initiale (Option A).
 *
 * Gère deux parcours distincts et strictement cloisonnés :
 * - Cas A (hasPassword = true) : exige le mot de passe actuel, vérifié via client temporaire isolé.
 * - Cas B (hasPassword = false) : exige le nonce/OTP de réauthentification envoyé par e-mail.
 *
 * Garanties :
 * - Fail-closed systématique en cas d'erreur RPC.
 * - Double vérification de session `getUser()` avant modification.
 * - Détection et rapport fidèle de l'état de révocation des autres sessions.
 * - ZÉRO log de secrets, mots de passe, nonces ou tokens.
 */
export async function changePasswordAction(
  prevState: PasswordActionResult | null,
  formData: FormData
): Promise<PasswordActionResult> {
  const currentPassword = formData.get("currentPassword")?.toString();
  const otp = formData.get("otp")?.toString()?.trim();
  const newPassword = formData.get("newPassword")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  // 1. Validation syntaxique préliminaire du nouveau mot de passe
  if (!newPassword || !confirmPassword) {
    return { error: "Veuillez renseigner et confirmer votre nouveau mot de passe." };
  }

  if (newPassword.length < 6) {
    return { error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
  }

  // 2. Vérification de la session active sur le client principal
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { error: "Votre session a expiré ou est invalide. Veuillez vous reconnecter." };
  }

  // 3. Détermination stricte et fail-closed de la présence d'un mot de passe
  let hasPassword = true;
  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("auth_user_has_password");
    if (rpcErr || typeof rpcResult !== "boolean") {
      return {
        error: "Impossible de vérifier l'état de sécurité de votre compte. L'opération est refusée par mesure de protection.",
      };
    }
    hasPassword = rpcResult;
  } catch {
    return {
      error: "Impossible de vérifier l'état de sécurité de votre compte. L'opération est refusée par mesure de protection.",
    };
  }

  // 4. Exécution selon le parcours applicable
  if (hasPassword) {
    // -----------------------------------------------------------------
    // PARCOURS 1 : Compte avec mot de passe existant
    // -----------------------------------------------------------------
    if (!currentPassword) {
      return { error: "Veuillez renseigner votre mot de passe actuel." };
    }

    if (currentPassword === newPassword) {
      return { error: "Le nouveau mot de passe doit être différent de l'actuel." };
    }

    // Vérification du mot de passe actuel via un client temporaire non-persistant
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: "Configuration serveur incomplète. Veuillez contacter le support." };
    }

    const verificationClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { error: signInError } = await verificationClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    // ZÉRO log de signInError ou de tokens
    if (signInError) {
      return { error: "Le mot de passe actuel renseigné est incorrect." };
    }

    // Re-vérification stricte de l'identité sur le client principal
    const {
      data: { user: recheckedUser },
      error: recheckError,
    } = await supabase.auth.getUser();

    if (recheckError || !recheckedUser || recheckedUser.id !== user.id) {
      return { error: "Conflit de session détecté. Veuillez vous reconnecter." };
    }

    // Mise à jour du mot de passe sur le client principal
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      const errorMsg = updateError.message?.toLowerCase() || "";
      if (
        errorMsg.includes("same") ||
        errorMsg.includes("identical") ||
        errorMsg.includes("different") ||
        errorMsg.includes("différent")
      ) {
        return { error: "Le nouveau mot de passe doit être différent de l'ancien." };
      }
      return { error: "La mise à jour du mot de passe a échoué. Veuillez réessayer." };
    }
  } else {
    // -----------------------------------------------------------------
    // PARCOURS 2 : Compte sans mot de passe (Option A : Google OAuth)
    // -----------------------------------------------------------------
    // Nonce / OTP de réauthentification strictement requis
    if (!otp) {
      return {
        error: "Veuillez renseigner le code de vérification reçu par e-mail pour définir votre mot de passe.",
      };
    }

    if (otp.length < 6 || !/^[a-zA-Z0-9_-]+$/.test(otp)) {
      return {
        error: "Le format du code de vérification est invalide (au moins 6 caractères attendus).",
      };
    }

    // Re-vérification stricte de l'identité sur le client principal
    const {
      data: { user: recheckedUser },
      error: recheckError,
    } = await supabase.auth.getUser();

    if (recheckError || !recheckedUser || recheckedUser.id !== user.id) {
      return { error: "Conflit de session détecté. Veuillez vous reconnecter." };
    }

    // Mise à jour du mot de passe avec validation du nonce par GoTrue
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: otp,
    });

    if (updateError) {
      const errorMsg = updateError.message?.toLowerCase() || "";
      if (
        errorMsg.includes("nonce") ||
        errorMsg.includes("reauth") ||
        errorMsg.includes("otp") ||
        errorMsg.includes("expired") ||
        errorMsg.includes("invalid")
      ) {
        return {
          error: "Le code de vérification est invalide ou a expiré. Veuillez demander un nouveau code.",
        };
      }
      return {
        error: "La configuration du mot de passe a échoué. Veuillez vérifier votre code et réessayer.",
      };
    }
  }

  // 5. Révocation des autres sessions concurrentes
  let otherSessionsRevoked = false;
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    otherSessionsRevoked = !signOutError;
  } catch {
    otherSessionsRevoked = false;
  }

  revalidatePath("/", "layout");

  if (hasPassword) {
    if (otherSessionsRevoked) {
      return {
        success: true,
        otherSessionsRevoked: true,
        message: "Votre mot de passe a été modifié avec succès et vos autres sessions ont été révoquées.",
      };
    } else {
      return {
        success: true,
        otherSessionsRevoked: false,
        message:
          "Votre mot de passe a été modifié avec succès. La révocation automatique des autres sessions n'a pas pu être confirmée ; vous pouvez vous déconnecter manuellement de vos autres appareils si nécessaire.",
      };
    }
  } else {
    if (otherSessionsRevoked) {
      return {
        success: true,
        otherSessionsRevoked: true,
        message:
          "Votre mot de passe Radiza a été défini avec succès. Vous pouvez désormais vous connecter par e-mail ou par Google.",
      };
    } else {
      return {
        success: true,
        otherSessionsRevoked: false,
        message:
          "Votre mot de passe Radiza a été défini avec succès. Vous pouvez désormais vous connecter par e-mail ou par Google. (La révocation automatique des autres sessions n'a pas pu être confirmée).",
      };
    }
  }
}

/**
 * Alias dédié pour la définition initiale avec OTP (Option A).
 */
export async function setupPasswordWithOtpAction(
  prevState: PasswordActionResult | null,
  formData: FormData
): Promise<PasswordActionResult> {
  return changePasswordAction(prevState, formData);
}
