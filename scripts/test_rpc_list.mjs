import { createClient } from "@supabase/supabase-js";

import { getSupabaseScriptConfig, getAdminCredentials } from "./_supabase-env.mjs";

const { url: SUPABASE_URL } = getSupabaseScriptConfig({ writes: true });
const { anonKey: SUPABASE_ANON_KEY } = getSupabaseScriptConfig({ writes: true });

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function listAllRpc() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: getAdminCredentials().email,
    password: getAdminCredentials().password,
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
