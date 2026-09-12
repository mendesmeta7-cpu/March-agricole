"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CompanyActionResult {
  success?: boolean;
  error?: string;
}

export async function updateCompanyProfileAction(
  prevState: CompanyActionResult | null,
  formData: FormData
): Promise<CompanyActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const companyId = formData.get("companyId")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const city = formData.get("city")?.toString().trim();
  const logoFile = formData.get("logo") as File | null;

  if (!companyId) {
    return { error: "Identifiant d'entreprise manquant." };
  }

  try {
    let logoUrl: string | undefined = undefined;

    // Upload du logo si fourni
    if (logoFile && logoFile.size > 0 && logoFile.name) {
      const fileExt = logoFile.name.split(".").pop();
      const filePath = `logos/${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) {
        console.error("Erreur upload logo Storage:", uploadError);
        return { error: `Échec du téléchargement du logo: ${uploadError.message}` };
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

    if (logoUrl) {
      updatePayload.logo_url = logoUrl;
    }

    const { error: updateError } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", companyId)
      .eq("created_by", user.id);

    if (updateError) {
      console.error("Erreur mise à jour company:", updateError);
      return { error: `Erreur lors de la mise à jour: ${updateError.message}` };
    }

    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/company/profile");

    return { success: true };
  } catch (err: any) {
    console.error("Exception updateCompanyProfileAction:", err);
    return { error: err?.message || "Une erreur inattendue est survenue." };
  }
}
