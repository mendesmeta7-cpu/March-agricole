import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    // Échange du code contre une session valide
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && authData.user) {
      // Récupération du rôle pour rediriger correctement
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
        
      if (profile?.role) {
        let dashboardPath = "/";
        if (profile.role === "company") dashboardPath = "/dashboard/company";
        else if (profile.role === "reseller") dashboardPath = "/dashboard/reseller";
        else if (profile.role === "admin") dashboardPath = "/dashboard/admin";
        
        return NextResponse.redirect(`${origin}${dashboardPath}`);
      }
      
      // Si la redirection dynamique échoue, utiliser "next"
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En cas d'erreur ou d'absence de code, renvoyer au login avec erreur
  return NextResponse.redirect(`${origin}/login?error=Invalid_or_expired_link`);
}
