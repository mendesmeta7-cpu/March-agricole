import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuration de votre profil — Radiza",
  description:
    "Finalisez la configuration de votre profil professionnel pour accéder au marché agricole Radiza.",
};

export default async function OnboardingPage() {
  const supabase = createClient();

  // 1. Contrôle d'authentification serveur
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Récupération du profil utilisateur
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, phone, onboarding_status")
    .eq("id", user.id)
    .single();

  // 3. Si le compte a déjà été complété, redirection vers le tableau de bord approprié
  if (profile?.onboarding_status === "completed" && profile?.role !== "unassigned") {
    if (profile.role === "company") redirect("/dashboard/company");
    if (profile.role === "reseller") redirect("/dashboard/reseller");
    if (profile.role === "admin") redirect("/dashboard/admin");
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-50/70 via-white to-forest-50/40 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      {/* En-tête : Logo & Marque */}
      <header className="max-w-3xl mx-auto w-full mb-8">
        <div className="flex items-center justify-between">
          <BrandLogo variant="horizontal" height={42} priority />
          <div className="hidden sm:flex items-center gap-2 text-xs text-forest-800 font-semibold bg-forest-100/70 px-3 py-1.5 rounded-full border border-forest-200/60">
            <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
            <span>Étape finale d&apos;inscription</span>
          </div>
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="max-w-3xl mx-auto w-full my-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-forest-950 tracking-tight mb-3">
            Bienvenue sur Radiza
          </h1>
          <p className="text-sm sm:text-base text-forest-900/75 max-w-xl mx-auto leading-relaxed">
            Dernière étape avant d&apos;accéder au marché : configurez votre activité professionnelle pour activer votre espace de travail personnalisé.
          </p>
        </div>

        {/* Formulaire interactif multi-rôles */}
        <OnboardingForm
          userEmail={user.email}
          initialFullName={profile?.full_name}
          initialPhone={profile?.phone || undefined}
        />
      </main>

      {/* Pied de page */}
      <footer className="max-w-3xl mx-auto w-full mt-12 pt-6 border-t border-forest-100 text-center text-xs text-forest-900/60">
        <p>
          Radiza — Plateforme Numérique B2B du Marché Agricole • République Démocratique du Congo
        </p>
      </footer>
    </div>
  );
}
