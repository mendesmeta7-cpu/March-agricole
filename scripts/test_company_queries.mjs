import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCompanyUser() {
  console.log("=== TEST COMPANY PRODUCTS & PRODUCTIONS POUR SYNAPTA ===");

  const companyId = "68b5c8e5-5da4-4858-bd1a-53d3e096673a";

  // 1. Récupération des company_products pour Synapta
  const { data: cpData, error: cpErr } = await supabase
    .from("company_products")
    .select(`
      id,
      company_id,
      product_id,
      custom_name,
      description,
      image_url,
      unit,
      notes,
      is_active,
      created_at,
      updated_at,
      product:products (
        id,
        name,
        category,
        description,
        default_unit,
        image_url,
        is_active,
        is_global,
        created_by_company_id
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  console.log("Company products pour Synapta:", cpData?.length, "Erreur:", cpErr?.message);
  if (cpData && cpData.length > 0) {
    console.log("Détails des produits Synapta:", JSON.stringify(cpData.map(p => ({
      id: p.id,
      custom_name: p.custom_name,
      product_name: p.product?.name,
      is_active: p.is_active
    })), null, 2));
  }

  // 2. Récupération des productions pour Synapta
  const { data: prodData, error: prodErr } = await supabase
    .from("productions")
    .select(`
      id,
      company_id,
      title,
      status,
      is_public,
      expected_quantity,
      unit,
      product:products(name)
    `)
    .eq("company_id", companyId);

  console.log("Productions de Synapta:", prodData?.length, "Erreur:", prodErr?.message);
  if (prodData && prodData.length > 0) {
    console.log("Détails des productions Synapta:", JSON.stringify(prodData, null, 2));
  }

  // 3. Récupération du feed public des revendeurs
  const { data: feedData, error: feedErr } = await supabase
    .from("productions")
    .select(`
      id,
      title,
      status,
      is_public,
      product:products!inner(name, category),
      company:companies!inner(name, city)
    `)
    .eq("is_public", true)
    .in("status", ["planned", "growing", "harvested"]);

  console.log("Productions visibles dans le flux revendeur (feed public):", feedData?.length, "Erreur:", feedErr?.message);
  if (feedData && feedData.length > 0) {
    console.log("Productions dans le feed:", JSON.stringify(feedData, null, 2));
  }
}

testCompanyUser().catch(console.error);
