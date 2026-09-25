import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function testRPC() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "admin@marcheagricole.cd",
    password: "AdminAgri2026!",
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
