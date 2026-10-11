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

  // Récupération stricte du profil et du rôle
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil utilisateur non trouvé. Veuillez contacter le support." };
  }

  // Purge préventive du cache serveur Next.js pour reconstruire l'arbre pour ce rôle
  revalidatePath("/", "layout");

  if (profile.role === "company") {
    redirect("/dashboard/company");
  } else if (profile.role === "reseller") {
    redirect("/dashboard/reseller");
  } else if (profile.role === "admin") {
    redirect("/dashboard/admin");
  } else {
    return { error: "Rôle utilisateur non reconnu." };
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

  const companyName = formData.get("companyName")?.toString().trim();
  const companyDescription = formData.get("companyDescription")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  const countryId = formData.get("countryId")?.toString().trim();
  const provinceId = formData.get("provinceId")?.toString().trim();
  const city = formData.get("city")?.toString().trim();
  const logoFile = formData.get("logo") as File | null;

  // Validations obligatoires
  if (!email || !password || !fullName || !companyName || !countryId || !provinceId) {
    return { error: "Veuillez remplir tous les champs obligatoires (nom, email, mot de passe, entreprise, pays, province)." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const supabase = createClient();

  // 1. Inscription Supabase Auth avec métadonnées sécurisées et URL de callback explicite
  const emailRedirectTo = getAppUrl("/auth/callback?flow=signup");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        role: "company",
        full_name: fullName,
        phone: phone || null,
        company_name: companyName,
        company_description: companyDescription || null,
        company_address: address || null,
        country_id: countryId,
        province_id: provinceId,
        city: city || null,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
      return { error: "Cet email est déjà utilisé par un autre compte Radiza." };
    }
    if (authError.message.includes("Password") || authError.message.includes("password")) {
      return { error: "Le mot de passe doit comporter au moins 6 caractères." };
    }
    if (authError.message.includes("Invalid email") || authError.message.includes("invalid email")) {
      return { error: "L'adresse email saisie n'est pas valide." };
    }
    return { error: "La création du compte a échoué. Veuillez vérifier vos informations et réessayer." };
  }

  if (!authData.user) {
    return { error: "Erreur lors de la création du compte." };
  }

  // Upload du logo vers Storage public-assets et mise à jour de companies.logo_url
  if (logoFile && logoFile.size > 0 && logoFile.name) {
    try {
      const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const fileExt = logoFile.name.split(".").pop();
      const filePath = `logos/${authData.user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("public-assets")
        .upload(filePath, logoFile, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("public-assets")
          .getPublicUrl(filePath);

        // Mettre à jour l'URL du logo sur l'entreprise
        const { error: updateError } = await supabaseAdmin
          .from("companies")
          .update({ logo_url: publicUrl })
          .eq("created_by", authData.user.id);

        if (updateError) {
          console.error("Erreur mise à jour companies.logo_url:", updateError);
        }
      } else {
        console.error("Erreur upload Storage public-assets:", uploadError);
      }
    } catch (e) {
      console.warn("Upload logo échoué:", e);
    }
  }

  // Si la session n'est pas active, cela signifie que la confirmation d'email est requise
  if (!authData.session) {
    return { success: true, emailSent: true };
  }

  redirect("/dashboard/company");
}

export async function registerResellerAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();

  const businessName = formData.get("businessName")?.toString().trim();
  const resellerType = formData.get("resellerType")?.toString().trim() || "wholesaler";
  const countryId = formData.get("countryId")?.toString().trim();
  const provinceId = formData.get("provinceId")?.toString().trim();
  const city = formData.get("city")?.toString().trim();
  const deliveryAddress = formData.get("deliveryAddress")?.toString().trim();

  if (!email || !password || !fullName || !countryId || !provinceId) {
    return { error: "Veuillez remplir tous les champs obligatoires (nom, email, mot de passe, pays, province)." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const supabase = createClient();

  // Inscription Supabase Auth avec métadonnées sécurisées et URL de callback explicite
  const emailRedirectTo = getAppUrl("/auth/callback?flow=signup");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        role: "reseller",
        full_name: fullName,
        phone: phone || null,
        business_name: businessName || fullName,
        reseller_type: resellerType,
        country_id: countryId,
        province_id: provinceId,
        city: city || null,
        delivery_address: deliveryAddress || null,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
      return { error: "Cet email est déjà utilisé par un autre compte Radiza." };
    }
    if (authError.message.includes("Password") || authError.message.includes("password")) {
      return { error: "Le mot de passe doit comporter au moins 6 caractères." };
    }
    if (authError.message.includes("Invalid email") || authError.message.includes("invalid email")) {
      return { error: "L'adresse email saisie n'est pas valide." };
    }
    return { error: "La création du compte a échoué. Veuillez vérifier vos informations et réessayer." };
  }

  if (!authData.user) {
    return { error: "Erreur lors de la création du compte." };
  }

  if (!authData.session) {
    return { success: true, emailSent: true };
  }

  redirect("/dashboard/reseller");
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

