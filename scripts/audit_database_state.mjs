import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAudit() {
  console.log("=== AUDIT BASE SUPABASE (ANON CLIENT) ===");

  // 1. Tables counts
  const tables = ["products", "company_products", "productions", "campaigns", "demands", "companies", "resellers", "profiles"];
  for (const table of tables) {
    const { count, error, data } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`Table [${table}]: ERROR -> ${error.message} (code: ${error.code})`);
    } else {
      console.log(`Table [${table}]: ${count} records (accessible via anon)`);
    }
  }

  // 2. Inspect products
  console.log("\n--- PRODUITS (products) ---");
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, category, default_unit, is_global, is_active, created_by_company_id")
    .limit(10);
  if (prodErr) {
    console.error("Erreur products:", prodErr.message);
  } else {
    console.log(`Trouvé ${products?.length} produits (échantillon):`);
    console.log(JSON.stringify(products?.slice(0, 5), null, 2));
  }

  // 3. Inspect companies
  console.log("\n--- SOCIÉTÉS (companies) ---");
  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, name, slug, province_id, created_by")
    .limit(10);
  if (compErr) {
    console.error("Erreur companies:", compErr.message);
  } else {
    console.log(`Trouvé ${companies?.length} sociétés:`);
    console.log(JSON.stringify(companies, null, 2));
  }

  // 4. Inspect company_products
  console.log("\n--- PRODUITS SOCIÉTÉS (company_products) ---");
  const { data: companyProducts, error: cpErr } = await supabase
    .from("company_products")
    .select("id, company_id, product_id, custom_name, is_active, created_at")
    .limit(10);
  if (cpErr) {
    console.error("Erreur company_products:", cpErr.message);
  } else {
    console.log(`Trouvé ${companyProducts?.length} company_products:`);
    console.log(JSON.stringify(companyProducts, null, 2));
  }

  // 5. Inspect productions
  console.log("\n--- PRODUCTIONS (productions) ---");
  const { data: productions, error: prodnErr } = await supabase
    .from("productions")
    .select("id, company_id, product_id, title, status, is_public, created_at")
    .limit(10);
  if (prodnErr) {
    console.error("Erreur productions:", prodnErr.message);
  } else {
    console.log(`Trouvé ${productions?.length} productions:`);
    console.log(JSON.stringify(productions, null, 2));
  }

  // 6. Inspect campaigns
  console.log("\n--- CAMPAGNES (campaigns) ---");
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, company_id, production_id, title, status, marketable_quantity, unit_price, end_date")
    .limit(10);
  if (campErr) {
    console.error("Erreur campaigns:", campErr.message);
  } else {
    console.log(`Trouvé ${campaigns?.length} campaigns:`);
    console.log(JSON.stringify(campaigns, null, 2));
  }
}

runAudit().catch(console.error);
