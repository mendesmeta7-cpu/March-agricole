import { createClient } from "@supabase/supabase-js";

import { getSupabaseScriptConfig, getAdminCredentials } from "./_supabase-env.mjs";

const { url: SUPABASE_URL } = getSupabaseScriptConfig({ writes: true });
const { anonKey: SUPABASE_ANON_KEY } = getSupabaseScriptConfig({ writes: true });

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function testRPC() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: getAdminCredentials().email,
    password: getAdminCredentials().password,
  });

  console.log("Connecté en tant que:", authData.user?.email);

  // Test check_and_close_expired_campaigns
  const { data: closeRes, error: closeErr } = await supabase.rpc("check_and_close_expired_campaigns");
  console.log("RPC check_and_close_expired_campaigns:", closeRes, "Erreur:", closeErr?.message);

  // Test current_user_role
  const { data: roleRes, error: roleErr } = await supabase.rpc("current_user_role");
  console.log("RPC current_user_role:", roleRes, "Erreur:", roleErr?.message);
}

testRPC().catch(console.error);
