import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log("=== CONNEXION ADMIN ===");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@marcheagricole.cd",
    password: "AdminAgri2026!",
  });

  if (authErr) {
    console.error("Erreur login admin:", authErr.message);
    return;
  }

  console.log("Connexion admin réussie ! User ID:", authData.user?.id);

  // Test requêtes en tant qu'admin
  const tables = ["products", "companies", "resellers", "company_products", "productions", "campaigns", "demands", "orders", "order_items", "stock_reservations"];
  for (const t of tables) {
    const { data, count, error } = await supabase.from(t).select("*", { count: "exact" });
    if (error) {
      console.log(`Table [${t}]: ERREUR -> ${error.message}`);
    } else {
      console.log(`Table [${t}]: ${count} lignes`);
      if (data && data.length > 0 && t !== "products") {
        console.log(`  Exemple [${t}]:`, JSON.stringify(data[0]));
      }
    }
  }
}

run().catch(console.error);
