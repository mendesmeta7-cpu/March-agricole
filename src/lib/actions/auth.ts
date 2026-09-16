"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    return { error: "Email ou mot de passe incorrect." };
  }

  if (!data.user) {
    return { error: "Session introuvable après connexion." };
  }

  // Récupération du profil et du rôle
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil utilisateur non trouvé. Veuillez contacter le support." };
  }

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

  // 1. Inscription Supabase Auth avec métadonnées sécurisées
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
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
    return { error: authError.message.includes("already registered") ? "Cet email est déjà utilisé." : authError.message };
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

  // Inscription Supabase Auth avec métadonnées sécurisées
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
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
    return { error: authError.message.includes("already registered") ? "Cet email est déjà utilisé." : authError.message };
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
  await supabase.auth.signOut();
  redirect("/login");
}
