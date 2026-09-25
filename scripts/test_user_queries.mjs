import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUserLogin() {
  console.log("=== TEST REQUÊTES EN TANT QUE UTILISATEUR CONNECTÉ ===");

  // Essayons de nous connecter avec les comptes connus
  // Du log: Synapta created_by: f87e07f8-6fa4-428a-846e-b2f05cb84a18
  // Voyons si on peut interroger les RPCs ou fonctions publiques
  console.log("--- TEST RPC ---");
  const { data: catData, error: catErr } = await supabase
    .from("products")
    .select("id, name, category, default_unit, is_active, is_global")
    .eq("is_global", true)
    .eq("is_active", true);

  console.log("Produits catalogue global accessibles:", catData?.length, "Erreur:", catErr?.message);

  // Test requête productions (Feed revendeur)
  console.log("--- TEST REQUÊTE PRODUCTIONS (FEED) ---");
  const { data: feedData, error: feedErr } = await supabase
    .from("productions")
    .select(`
      id,
      company_id,
      product_id,
      title,
      status,
      is_public
    `)
    .eq("is_public", true)
    .in("status", ["planned", "growing", "harvested"]);

  console.log("Productions dans le feed:", feedData?.length, "Erreur:", feedErr?.message);

  // Test requête company_products
  console.log("--- TEST REQUÊTE COMPANY_PRODUCTS ---");
  const { data: cpData, error: cpErr } = await supabase
    .from("company_products")
    .select("id, company_id, product_id, is_active");

  console.log("Company products:", cpData?.length, "Erreur:", cpErr?.message);

  // Test requête demands
  console.log("--- TEST REQUÊTE DEMANDS ---");
  const { data: demData, error: demErr } = await supabase
    .from("demands")
    .select("id, status");

  console.log("Demands:", demData?.length, "Erreur:", demErr?.message);

  // Test vue agrégée market demands
  console.log("--- TEST VUE AGRÉGÉE v_market_demands_aggregated ---");
  const { data: aggData, error: aggErr } = await supabase
    .from("v_market_demands_aggregated")
    .select("*");

  console.log("Demandes agrégées (analyse territoriale):", aggData?.length, "Erreur:", aggErr?.message);
}

testUserLogin().catch(console.error);
