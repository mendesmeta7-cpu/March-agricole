import { createClient } from "@/lib/supabase/server";
import { ProductionStatus } from "@/lib/queries/productions";
import { FeedProduct } from "@/lib/queries/feed";

export interface PublicCompanyProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  verification_status: "pending" | "verified" | "rejected";
  is_active: boolean;
  created_at: string;
  provinces?: { name: string } | null;
  countries?: { name: string } | null;
}

export interface CompanyPublicProductionItem {
  id: string;
  company_id: string;
  product_id: string;
  title: string;
  description: string | null;
  main_image_url: string;
  location_name: string;
  expected_quantity: number;
  unit: string;
  period_start: string;
  period_end: string | null;
  status: ProductionStatus;
  created_at: string;
  product: FeedProduct;
}

/**
 * Récupère les données publiques d'une entreprise agricole active.
 * Ne charge AUCUNE donnée administrative privée (membres, email privé, téléphone privé, documents RCCM).
 */
export async function getPublicCompanyProfile(
  companyId: string
): Promise<PublicCompanyProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      slug,
      description,
      logo_url,
      city,
      verification_status,
      is_active,
      created_at,
      provinces (name),
      countries (name)
    `)
    .eq("id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération profil public entreprise:", error);
    return null;
  }

  const rawItem = data as any;
  return {
    ...rawItem,
    provinces: Array.isArray(rawItem?.provinces) ? rawItem.provinces[0] : rawItem?.provinces,
    countries: Array.isArray(rawItem?.countries) ? rawItem.countries[0] : rawItem?.countries,
  } as PublicCompanyProfile;
}

/**
 * Récupère exclusivement les productions publiques et actives d'une entreprise agricole.
 * RLS et filtres stricts : `is_public = TRUE` et statuts `planned`, `growing`, `harvested`.
 * Les brouillons (`draft`) et productions annulées (`cancelled`) sont rigoureusement exclus.
 */
export async function getCompanyPublicProductions(
  companyId: string
): Promise<CompanyPublicProductionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("productions")
    .select(`
      id,
      company_id,
      product_id,
      title,
      description,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      period_start,
      period_end,
      status,
      created_at,
      product:products!inner (
        id,
        name,
        category,
        default_unit,
        image_url
      )
    `)
    .eq("company_id", companyId)
    .eq("is_public", true)
    .in("status", ["planned", "growing", "harvested"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération productions publiques entreprise:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    expected_quantity: Number(item.expected_quantity),
    product: Array.isArray(item.product) ? item.product[0] : item.product,
  })) as CompanyPublicProductionItem[];
}
