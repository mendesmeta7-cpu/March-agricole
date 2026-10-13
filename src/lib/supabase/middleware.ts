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

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Protection des espaces Dashboard (AUTH-4.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    // 1a. Non authentifié → page de connexion
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return redirectWithCookies(url, supabaseResponse);
    }

    // 1b. Lecture du profil avec role ET onboarding_status (AUTH-4.2)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, onboarding_status")
      .eq("id", user.id)
      .single();

    // 1c. Profil absent ou erreur de lecture → /login sans accès par défaut
    if (profileError || !profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "profile_missing");
      return redirectWithCookies(url, supabaseResponse);
    }

    const userRole = profile.role as string;
    const onboardingStatus = profile.onboarding_status as string | undefined;

    // 1d. Rôle 'unassigned' OU onboarding incomplet → /onboarding (AUTH-4.2)
    //     S'applique quelle que soit la route /dashboard/* tentée.
    if (userRole === "unassigned" || onboardingStatus !== "completed") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return redirectWithCookies(url, supabaseResponse);
    }

    // 1e. Statut cohérent mais rôle non reconnu → /login avec erreur explicite
    if (!["company", "reseller", "admin"].includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "role_unknown");
      return redirectWithCookies(url, supabaseResponse);
    }

    // 1f. Aiguillage déterministe pour les routes génériques
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${userRole}`;
      return redirectWithCookies(url, supabaseResponse);
    }

    if (pathname === "/dashboard/notifications" || pathname === "/dashboard/notifications/") {
      const url = request.nextUrl.clone();
      url.pathname = userRole === "admin"
        ? "/dashboard/admin"
        : `/dashboard/${userRole}/notifications`;
      return redirectWithCookies(url, supabaseResponse);
    }

    // 1g. Contrôle RBAC strict : cloisonnement étanche par rôle
    //     Un admin ne peut accéder qu'à /dashboard/admin — jamais aux espaces company ou reseller.
    if (pathname.startsWith("/dashboard/company")) {
      if (userRole !== "company") {
        const url = request.nextUrl.clone();
        url.pathname = userRole === "admin" ? "/dashboard/admin" : "/unauthorized";
        return redirectWithCookies(url, supabaseResponse);
      }
    }

    if (pathname.startsWith("/dashboard/reseller")) {
      if (userRole !== "reseller") {
        const url = request.nextUrl.clone();
        url.pathname = userRole === "admin" ? "/dashboard/admin" : "/unauthorized";
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

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Protection de la route /onboarding (AUTH-4.2)
  //    - Non authentifié → /login
  //    - Déjà complété → redirection vers le dashboard métier correspondant
  //    - unassigned/pending → laisser passer (l'onboarding est en cours)
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname === "/onboarding" || pathname === "/onboarding/") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return redirectWithCookies(url, supabaseResponse);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, onboarding_status")
      .eq("id", user.id)
      .single();

    // Profil absent ou erreur → /login (pas d'accès par défaut)
    if (profileError || !profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "profile_missing");
      return redirectWithCookies(url, supabaseResponse);
    }

    const onbRole = profile.role as string;
    const onbStatus = profile.onboarding_status as string | undefined;

    // Onboarding déjà complété → renvoyer vers le dashboard métier
    if (onbStatus === "completed" && onbRole !== "unassigned") {
      const url = request.nextUrl.clone();
      if (onbRole === "company") url.pathname = "/dashboard/company";
      else if (onbRole === "reseller") url.pathname = "/dashboard/reseller";
      else if (onbRole === "admin") url.pathname = "/dashboard/admin";
      else {
        // Rôle inconnu malgré statut completed → /login sécuritaire
        url.pathname = "/login";
        url.searchParams.set("error", "role_unknown");
      }
      return redirectWithCookies(url, supabaseResponse);
    }

    // unassigned/pending → laisser accéder à /onboarding (AUTH-4.2)
    return supabaseResponse;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Redirection si déjà authentifié sur /login ou /register (AUTH-4.2)
  //    - unassigned/pending → /onboarding (ne pas laisser bloquer sur /login)
  //    - Complété → dashboard métier correspondant
  // ─────────────────────────────────────────────────────────────────────────
  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/register/"))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_status")
      .eq("id", user.id)
      .single();

    if (profile) {
      const url = request.nextUrl.clone();
      const loginRole = profile.role as string;
      const loginStatus = profile.onboarding_status as string | undefined;

      // Onboarding incomplet → /onboarding
      if (loginRole === "unassigned" || loginStatus !== "completed") {
        url.pathname = "/onboarding";
        return redirectWithCookies(url, supabaseResponse);
      }

      // Complété : aiguillage par rôle
      if (loginRole === "company") url.pathname = "/dashboard/company";
      else if (loginRole === "reseller") url.pathname = "/dashboard/reseller";
      else if (loginRole === "admin") url.pathname = "/dashboard/admin";
      else {
        // Rôle inconnu → ne pas rediriger, laisser sur /login
        return supabaseResponse;
      }
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}
