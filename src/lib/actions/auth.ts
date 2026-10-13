"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAppUrl } from "@/lib/utils/url";

export interface AuthActionResult {
  success?: boolean;
  emailSent?: boolean;
  error?: string;
}

export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Veuillez renseigner votre email et votre mot de passe." };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (
      error.message.includes("Email not confirmed") ||
      error.message.includes("email_not_confirmed") ||
      error.message.toLowerCase().includes("not confirmed")
    ) {
      return {
        error:
          "Votre adresse email n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception ou vos spams pour activer votre compte.",
      };
    }
    return { error: "Email ou mot de passe incorrect." };
  }

  if (!data.user) {
    return { error: "Session introuvable après connexion." };
  }

  // AUTH-4.2 — Récupération stricte du profil : role ET onboarding_status
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_status")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil utilisateur non trouvé. Veuillez contacter le support." };
  }

  // Purge préventive du cache serveur Next.js pour reconstruire l'arbre pour ce rôle
  revalidatePath("/", "layout");

  // AUTH-4.2 — Onboarding incomplet : rôle transitoire ou statut pending
  //            → redirection vers /onboarding, jamais vers un dashboard métier
  if (profile.role === "unassigned" || profile.onboarding_status !== "completed") {
    redirect("/onboarding");
  }

  if (profile.role === "company") {
    redirect("/dashboard/company");
  } else if (profile.role === "reseller") {
    redirect("/dashboard/reseller");
  } else if (profile.role === "admin") {
    redirect("/dashboard/admin");
  } else {
    // Rôle inconnu malgré un statut completed : erreur explicite, pas d'accès par défaut
    return { error: "Compte incomplet ou non reconnu. Veuillez contacter le support." };
  }
}

export async function registerCompanyAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();

  // Validations obligatoires d'inscription initiale (formulaire court AUTH-4)
  if (!email || !password || !fullName) {
    return { error: "Veuillez renseigner votre nom complet, votre adresse email et votre mot de passe." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const supabase = createClient();

  // 1. Inscription Supabase Auth avec intention de rôle mémorisée dans user_metadata
  const emailRedirectTo = getAppUrl("/auth/callback?flow=signup");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        preferred_role: "company",
        full_name: fullName,
        phone: phone || null,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
      return { error: "Cette adresse email est déjà associée à un compte Radiza. Veuillez vous connecter ou réinitialiser votre mot de passe si vous l'avez oublié." };
    }
    if (authError.message.includes("Password") || authError.message.includes("password")) {
      return { error: "Le mot de passe doit comporter au moins 6 caractères." };
    }
    if (authError.message.includes("Invalid email") || authError.message.includes("invalid email")) {
      return { error: "L'adresse email saisie n'est pas valide." };
    }
    return { error: authError.message || "La création du compte a échoué. Veuillez vérifier vos informations et réessayer." };
  }

  if (!authData.user) {
    return { error: "Erreur lors de la création du compte." };
  }

  // Détection native Supabase Auth quand l'adresse est déjà associée à un compte confirmé (Email Enumeration Protection active).
  // Dans ce cas, authError est null mais user.identities est un tableau vide [].
  if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    return {
      error: "Cette adresse email est déjà associée à un compte Radiza. Veuillez vous connecter avec vos identifiants ou réinitialiser votre mot de passe si vous l'avez oublié.",
    };
  }

  // Si la session n'est pas active, confirmation d'email requise
  if (!authData.session) {
    return { success: true, emailSent: true };
  }

  redirect("/onboarding");
}

export async function registerResellerAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();

  // Validations obligatoires d'inscription initiale (formulaire court AUTH-4)
  if (!email || !password || !fullName) {
    return { error: "Veuillez renseigner votre nom et prénom, votre adresse email et votre mot de passe." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const supabase = createClient();

  // Inscription Supabase Auth avec intention de rôle mémorisée dans user_metadata
  const emailRedirectTo = getAppUrl("/auth/callback?flow=signup");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        preferred_role: "reseller",
        full_name: fullName,
        phone: phone || null,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
      return { error: "Cette adresse email est déjà associée à un compte Radiza. Veuillez vous connecter ou réinitialiser votre mot de passe si vous l'avez oublié." };
    }
    if (authError.message.includes("Password") || authError.message.includes("password")) {
      return { error: "Le mot de passe doit comporter au moins 6 caractères." };
    }
    if (authError.message.includes("Invalid email") || authError.message.includes("invalid email")) {
      return { error: "L'adresse email saisie n'est pas valide." };
    }
    return { error: authError.message || "La création du compte a échoué. Veuillez vérifier vos informations et réessayer." };
  }

  if (!authData.user) {
    return { error: "Erreur lors de la création du compte." };
  }

  // Détection native Supabase Auth quand l'adresse est déjà associée à un compte confirmé (Email Enumeration Protection active)
  if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    return {
      error: "Cette adresse email est déjà associée à un compte Radiza. Veuillez vous connecter avec vos identifiants ou réinitialiser votre mot de passe si vous l'avez oublié.",
    };
  }

  if (!authData.session) {
    return { success: true, emailSent: true };
  }

  redirect("/onboarding");
}

export async function logoutAction() {
  const supabase = createClient();
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (e) {
    console.error("Erreur signOut:", e);
  }

  // Purge explicite et exhaustive de TOUS les cookies Supabase (chunks sb-*, etc.)
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.includes("auth-token") ||
        cookie.name.includes("supabase")
      ) {
        cookieStore.delete(cookie.name);
        cookieStore.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    }
  } catch (e) {
    console.error("Erreur purge cookies:", e);
  }

  // Invalidation totale du cache serveur Next.js
  revalidatePath("/", "layout");

  redirect("/login");
}

/**
 * AUTH-3 — Demande de réinitialisation du mot de passe.
 *
 * Répond toujours avec un message générique pour éviter
 * toute énumération d'adresses e-mail (anti-account harvesting).
 * L'URL de redirection inclut explicitement flow=recovery pour
 * que /auth/callback identifie correctement le flux côté serveur.
 */
export async function requestPasswordResetAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();

  if (!email) {
    return { error: "Veuillez saisir votre adresse e-mail." };
  }

  // Validation syntaxique légère côté serveur
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "L'adresse e-mail saisie n'est pas valide." };
  }

  const supabase = createClient();

  // URL de callback explicitement marquée pour le flux recovery
  const emailRedirectTo = getAppUrl("/auth/callback?flow=recovery&type=recovery&next=/reset-password");

  await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo });
  // Quel que soit le résultat (compte existant ou non), on renvoie
  // toujours le même message pour ne pas révéler si l'adresse existe.

  return {
    success: true,
    emailSent: true,
  };
}

/**
 * AUTH-3 — Mise à jour du mot de passe depuis /reset-password.
 *
 * Exige une session active valide créée par le flux recovery.
 * Une fois le mot de passe changé, on déconnecte la session temporaire
 * et on redirige vers /login?password_updated=true.
 */
export async function resetPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!password) {
    return { error: "Veuillez saisir un nouveau mot de passe." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  if (password !== confirmPassword) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = createClient();

  // Vérification de la session côté serveur : l'utilisateur doit être
  // authentifié via le jeton PKCE du flux recovery.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Votre session de récupération est invalide ou a expiré. Veuillez recommencer depuis la page de connexion.",
    };
  }

  // Mise à jour du mot de passe
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    if (
      updateError.message.toLowerCase().includes("same") ||
      updateError.message.toLowerCase().includes("identical") ||
      updateError.message.toLowerCase().includes("différent")
    ) {
      return { error: "Le nouveau mot de passe doit être différent de l'ancien." };
    }
    return { error: "La mise à jour du mot de passe a échoué. Veuillez réessayer." };
  }

  // Déconnexion de la session temporaire de récupération
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (_) {
    // Non-bloquant
  }

  // Purge des cookies de session
  try {
    const cookieStore = cookies();
    cookieStore.getAll().forEach((cookie) => {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.includes("auth-token") ||
        cookie.name.includes("supabase")
      ) {
        cookieStore.delete(cookie.name);
        cookieStore.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    });
  } catch (_) {
    // Non-bloquant
  }

  revalidatePath("/", "layout");
  redirect("/login?password_updated=true");
}

/**
 * AUTH-4.3 — Finalisation de l'onboarding utilisateur via la RPC complete_user_onboarding.
 *
 * Permet à un utilisateur dont le profil est 'unassigned/pending' de choisir son rôle
 * ('company' ou 'reseller'), de renseigner ses données métier et sa localisation,
 * puis de basculer transactionnellement vers son espace tableau de bord.
 */
export async function completeOnboardingAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const role = formData.get("role")?.toString().trim();
  const countryId = formData.get("countryId")?.toString().trim();
  const provinceId = formData.get("provinceId")?.toString().trim();
  const city = formData.get("city")?.toString().trim() || null;

  // Contrôle commun obligatoire
  if (!role || (role !== "company" && role !== "reseller")) {
    return { error: "Veuillez sélectionner un type d'activité valide (Société agricole ou Revendeur professionnel)." };
  }

  if (!countryId || !provinceId) {
    return { error: "Veuillez sélectionner votre pays et votre province d'opération." };
  }

  // Paramètres selon le rôle
  let companyName: string | null = null;
  let companyDescription: string | null = null;
  let companyAddress: string | null = null;
  let companyPhone: string | null = null;

  let businessName: string | null = null;
  let resellerType: string | null = null;
  let deliveryAddress: string | null = null;

  if (role === "company") {
    companyName = formData.get("companyName")?.toString().trim() || null;
    companyDescription = formData.get("companyDescription")?.toString().trim() || null;
    companyAddress = formData.get("companyAddress")?.toString().trim() || null;
    companyPhone = formData.get("companyPhone")?.toString().trim() || null;

    if (!companyName) {
      return { error: "La dénomination ou le nom commercial de votre entreprise est obligatoire." };
    }
  } else if (role === "reseller") {
    businessName = formData.get("businessName")?.toString().trim() || null;
    resellerType = formData.get("resellerType")?.toString().trim() || "wholesaler";
    deliveryAddress = formData.get("deliveryAddress")?.toString().trim() || null;

    if (!["wholesaler", "semi_wholesaler", "retailer", "processor"].includes(resellerType)) {
      resellerType = "wholesaler";
    }
  }

  const supabase = createClient();

  // Vérification de la session active côté serveur
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Votre session a expiré ou est invalide. Veuillez vous reconnecter." };
  }

  // Appel de la procédure stockée RPC complete_user_onboarding (Migration 26)
  const { data: rpcData, error: rpcError } = await supabase.rpc("complete_user_onboarding", {
    p_role: role,
    p_country_id: countryId,
    p_province_id: provinceId,
    p_city: city,
    p_company_name: companyName,
    p_company_description: companyDescription,
    p_company_address: companyAddress,
    p_company_phone: companyPhone,
    p_business_name: businessName,
    p_reseller_type: resellerType,
    p_delivery_address: deliveryAddress,
  });

  if (rpcError) {
    console.error("Erreur complete_user_onboarding RPC:", rpcError);
    if (rpcError.message.includes("déjà été finalisé") || rpcError.message.includes("already finalized")) {
      revalidatePath("/", "layout");
      if (role === "company") redirect("/dashboard/company");
      else redirect("/dashboard/reseller");
    }
    return { error: rpcError.message || "Une erreur est survenue lors de l'enregistrement de votre profil." };
  }

  // Invalidation totale du cache serveur Next.js pour reconstruire l'arbre pour ce rôle
  revalidatePath("/", "layout");

  // Redirection immédiate vers le dashboard dédié
  if (role === "company") {
    redirect("/dashboard/company");
  } else {
    redirect("/dashboard/reseller");
  }
}


