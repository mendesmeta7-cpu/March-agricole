"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CompanyActionResult {
  success?: boolean;
  error?: string;
  logoUrl?: string | null;
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const LOGO_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function updateCompanyProfileAction(
  prevState: CompanyActionResult | null,
  formData: FormData
): Promise<CompanyActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const companyId = formData.get("companyId")?.toString().trim();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const city = formData.get("city")?.toString().trim();
  const removeLogo = formData.get("removeLogo")?.toString().trim() === "true";
  const logoFile = formData.get("logo") as File | null;

  if (!companyId) {
    return { error: "Identifiant d'entreprise manquant." };
  }

  // Droits vérifiés AVANT tout envoi de fichier (SEC-15) : propriétaire/admin
  // de l'entreprise, ou créateur de l'entreprise.
  const { data: member } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isMemberAdmin = !!member && (member.role === "owner" || member.role === "admin");

  let isCreator = false;
  if (!isMemberAdmin) {
    const { data: comp } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("created_by", user.id)
      .maybeSingle();
    isCreator = !!comp;
  }

  if (!isMemberAdmin && !isCreator) {
    return { error: "Vous n'avez pas les droits nécessaires pour modifier cette exploitation." };
  }

  try {
    let logoUrl: string | undefined = undefined;

    // Upload du logo si fourni : type et taille validés côté serveur, extension
    // dérivée du type MIME validé (jamais du nom de fichier envoyé).
    if (logoFile && logoFile.size > 0) {
      const extension = LOGO_MIME_EXTENSIONS[logoFile.type];
      if (!extension) {
        return { error: "Format de logo non supporté (utilisez JPG, PNG ou WebP)." };
      }
      if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
        return { error: "Le logo ne doit pas dépasser 5 Mo." };
      }

      const filePath = `logos/${user.id}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, logoFile, { upsert: false, contentType: logoFile.type });

      if (uploadError) {
        console.error("Erreur upload logo Storage:", uploadError);
        return { error: "Le téléchargement du logo a échoué. Vérifiez le format et la taille du fichier (JPG, PNG, WebP ≤ 5 Mo)." };
      }

      const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      logoUrl = publicUrl;
    }

    const updatePayload: Record<string, any> = {
      description: description || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      city: city || null,
      updated_at: new Date().toISOString(),
    };

    if (name && name.length >= 2) {
      updatePayload.name = name;
    }

    if (removeLogo) {
      updatePayload.logo_url = null;
    } else if (logoUrl) {
      updatePayload.logo_url = logoUrl;
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", companyId)
      .select("id");

    if (updateError || !updatedRows || updatedRows.length === 0) {
      console.error("Erreur mise à jour company:", updateError);
      return { error: "La mise à jour du profil de l'exploitation a échoué. Veuillez réessayer." };
    }

    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/admin/companies");
    revalidatePath("/dashboard/company/profile");

    return { success: true, logoUrl: removeLogo ? null : logoUrl };
  } catch (err: any) {
    console.error("Exception updateCompanyProfileAction:", err);
    return { error: "Une erreur inattendue est survenue. Veuillez réessayer." };
  }
}
