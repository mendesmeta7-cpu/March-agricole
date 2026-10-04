import Link from "next/link";
import { Building2, Store, ArrowRight, ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Radiza — Créer un compte",
  description:
    "Choisissez votre profil pour rejoindre la plateforme : Société / Producteur ou Revendeur professionnel.",
};

export default function RegisterChoicePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-forest-50/60 via-white to-forest-50/40 py-8 px-4 sm:px-6 lg:px-8">
      {/* Haut de page : Navigation retour & Logo */}
      <div className="max-w-4xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-forest-800 hover:text-forest-950 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Retour à l&apos;accueil</span>
        </Link>
      </div>

      {/* Contenu Principal */}
      <main className="max-w-4xl mx-auto w-full my-auto py-4 sm:py-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-6">
            <BrandLogo variant="horizontal" height={44} priority />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-forest-950 tracking-tight mb-2 sm:mb-3">
            Créer un compte
          </h1>
          <p className="text-sm sm:text-base text-forest-900/70 max-w-lg mx-auto">
            Sélectionnez le type d&apos;acteur correspondant à votre activité pour accéder au formulaire d&apos;inscription dédié.
          </p>
        </div>

        {/* Grille des 2 options d'inscription */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
          {/* Option 1 : Société / Producteur */}
          <Link
            href="/register/company"
            className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border-2 border-forest-100 hover:border-forest-600 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-forest-100 text-forest-700 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-forest-700 group-hover:text-white transition-all">
                <Building2 className="w-7 h-7" />
              </div>

              <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-forest-50 text-forest-800 text-xs font-semibold uppercase tracking-wider mb-2">
                Production & Vente
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-forest-950 mb-2">
                Société / Producteur
              </h2>

              <p className="text-sm text-forest-900/80 leading-relaxed mb-6 font-normal">
                Vous produisez, transformez ou commercialisez des produits agricoles.
              </p>

              <div className="space-y-2 pt-4 border-t border-forest-100 text-xs text-forest-800">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />
                  <span>Fermes, plantations et coopératives</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />
                  <span>Publication et valorisation des récoltes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />
                  <span>Gestion des offres et des campagnes</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-forest-100/70 flex items-center justify-between text-forest-700 font-bold text-sm group-hover:text-forest-800">
              <span>Continuer l&apos;inscription</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Option 2 : Revendeur */}
          <Link
            href="/register/reseller"
            className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border-2 border-earth-100 hover:border-earth-600 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-earth-100 text-earth-700 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-earth-700 group-hover:text-white transition-all">
                <Store className="w-7 h-7" />
              </div>

              <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-earth-50 text-earth-800 text-xs font-semibold uppercase tracking-wider mb-2">
                Achat & Distribution
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-earth-950 mb-2">
                Revendeur
              </h2>

              <p className="text-sm text-earth-900/80 leading-relaxed mb-6 font-normal">
                Vous recherchez des productions agricoles pour votre activité commerciale.
              </p>

              <div className="space-y-2 pt-4 border-t border-earth-100 text-xs text-earth-800">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-earth-600" />
                  <span>Grossistes, détaillants et transformateurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-earth-600" />
                  <span>Expression des besoins d&apos;approvisionnement</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-earth-600" />
                  <span>Commandes fermes avec stock garanti</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-earth-100/70 flex items-center justify-between text-earth-700 font-bold text-sm group-hover:text-earth-800">
              <span>Continuer l&apos;inscription</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Lien de redirection vers la connexion */}
        <div className="mt-10 text-center">
          <p className="text-sm text-forest-900/70">
            Vous disposez déjà d&apos;un compte actif ?{" "}
            <Link
              href="/login"
              className="font-bold text-forest-700 hover:text-forest-900 underline underline-offset-4 transition-colors"
            >
              Se connecter ici
            </Link>
          </p>
        </div>
      </main>

      {/* Pied de page discret */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-forest-700/60 pt-6">
        Plateforme Numérique B2B Agricole — Inscription sécurisée
      </footer>
    </div>
  );
}
