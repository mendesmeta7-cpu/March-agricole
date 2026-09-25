import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function listAllRpc() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "admin@marcheagricole.cd",
    password: "AdminAgri2026!",
  });

  console.log("Connecté en tant que admin:", authData.user?.id);

  const functionsToTest = [
    "current_user_role",
    "check_and_close_expired_campaigns",
    "get_campaign_stock_summary",
    "lookup_order_for_delivery",
    "notify_company_on_demand_received",
    "notify_resellers_on_campaign_opened",
    "create_custom_product_and_associate",
    "confirm_order_delivery",
    "cancel_order_and_release_reservation"
  ];

  for (const fn of functionsToTest) {
    const { data, error } = await supabase.rpc(fn, {});
    console.log(`RPC [${fn}]:`, error ? `Erreur (${error.code}): ${error.message}` : `Succès: ${JSON.stringify(data)}`);
  }
}

listAllRpc().catch(console.error);
