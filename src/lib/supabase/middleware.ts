import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Propage l'intégralité des cookies Supabase (sessions, tokens rafraîchis)
 * sur les réponses de redirection Next.js pour éviter toute perte d'état.
 */
function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Ne pas exécuter de code entre createServerClient et
  // supabase.auth.getUser(). Un appel à getUser() rafraîchit le token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. Protection des espaces Dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return redirectWithCookies(url, supabaseResponse);
    }

    // Récupération stricte du rôle dans la table profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role;

    if (!userRole) {
      // Profil absent ou corrompu
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "profile_missing");
      return redirectWithCookies(url, supabaseResponse);
    }

    // Aiguillage déterministe pour les routes génériques /dashboard et /dashboard/notifications
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${userRole}`;
      return redirectWithCookies(url, supabaseResponse);
    }

    if (pathname === "/dashboard/notifications" || pathname === "/dashboard/notifications/") {
      const url = request.nextUrl.clone();
      url.pathname = userRole === "admin" ? "/dashboard/admin" : `/dashboard/${userRole}/notifications`;
      return redirectWithCookies(url, supabaseResponse);
    }

    // Contrôle RBAC strict : cloisonnement étanche
    if (pathname.startsWith("/dashboard/company")) {
      if (userRole !== "company" && userRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return redirectWithCookies(url, supabaseResponse);
      }
    }

    if (pathname.startsWith("/dashboard/reseller")) {
      if (userRole !== "reseller" && userRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return redirectWithCookies(url, supabaseResponse);
      }
    }

    if (pathname.startsWith("/dashboard/admin")) {
      if (userRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return redirectWithCookies(url, supabaseResponse);
      }
    }
  }

  // 2. Redirection si déjà connecté sur les pages /login ou /register
  if (user && (pathname === "/login" || pathname === "/register" || pathname.startsWith("/register/"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const url = request.nextUrl.clone();
      if (profile.role === "company") url.pathname = "/dashboard/company";
      else if (profile.role === "reseller") url.pathname = "/dashboard/reseller";
      else if (profile.role === "admin") url.pathname = "/dashboard/admin";
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}
