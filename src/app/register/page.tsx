import Link from "next/link";
import { Sprout, Building2, Store, ArrowRight } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-forest-50/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-white shadow-sm">
            <Sprout className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl text-forest-950">Marché Agricole</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Créer votre compte professionnel
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Choisissez le type d&apos;acteur correspondant à votre activité
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Carte Entreprise */}
          <Link
            href="/register/company"
            className="group relative p-8 rounded-2xl bg-white border-2 border-transparent hover:border-forest-600 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-700 mb-6 group-hover:scale-105 transition-transform">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Entreprise Agricole
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Fermes, plantations, coopératives agricoles et agro-industries.
                Valorisez vos productions réelles et accédez à la demande solvable par territoire.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-forest-700 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              Inscrire mon entreprise
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Carte Revendeur */}
          <Link
            href="/register/reseller"
            className="group relative p-8 rounded-2xl bg-white border-2 border-transparent hover:border-earth-600 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-earth-100 flex items-center justify-center text-earth-700 mb-6 group-hover:scale-105 transition-transform">
                <Store className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Revendeur Professionnel
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Grossistes, demi-grossistes, transformateurs et distributeurs.
                Exprimez vos besoins d&apos;approvisionnement et passez commande sur les campagnes actives.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-earth-700 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              Inscrire mon activité d&apos;achat
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-forest-700 hover:text-forest-800 underline">
              Connectez-vous ici
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
