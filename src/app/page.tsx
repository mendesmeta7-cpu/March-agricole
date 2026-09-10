import Link from "next/link";
import { Sprout, ShoppingBag, ShieldCheck, ArrowRight, Building2, Store } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 max-w-5xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs sm:text-sm font-semibold mb-4 sm:mb-6 shadow-2xs">
        <Sprout className="w-4 h-4 text-forest-600 flex-shrink-0" />
        <span>Plateforme Numérique B2B Agricole</span>
      </div>

      <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-forest-950 mb-3 sm:mb-6 max-w-3xl leading-tight">
        Connecter la production agricole aux marchés réels
      </h1>

      <p className="text-sm sm:text-lg text-forest-900/80 mb-6 sm:mb-10 max-w-2xl leading-relaxed">
        Une infrastructure transactionnelle structurée pour valoriser l&apos;offre agricole,
        centraliser la demande solvable des revendeurs et sécuriser les approvisionnements par province.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-10 sm:mb-16 w-full max-w-md justify-center">
        <Link
          href="/register"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all min-h-[48px]"
        >
          <span>Créer un compte</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/login"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-forest-200 text-forest-900 hover:bg-forest-50 font-semibold text-sm sm:text-base transition-all shadow-2xs min-h-[48px]"
        >
          Se connecter
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full text-left">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-forest-100 shadow-sm hover:border-forest-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800 mb-3 sm:mb-4">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-xl font-bold text-forest-950 mb-1.5">Espace Entreprise Agricole</h3>
            <p className="text-forest-900/70 text-xs sm:text-sm leading-relaxed mb-4">
              Producteurs, coopératives et fermes. Publiez vos productions, analysez les demandes du marché national et lancez vos offres.
            </p>
          </div>
          <Link
            href="/register/company"
            className="text-forest-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-1 hover:underline min-h-[38px] items-center"
          >
            Inscrire une exploitation &rarr;
          </Link>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-earth-100 shadow-sm hover:border-earth-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-earth-100 flex items-center justify-center text-earth-800 mb-3 sm:mb-4">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-xl font-bold text-earth-950 mb-1.5">Espace Revendeur Professionnel</h3>
            <p className="text-earth-900/70 text-xs sm:text-sm leading-relaxed mb-4">
              Grossistes, détaillants et transformateurs. Exprimez vos besoins d&apos;approvisionnement par province et réservez vos volumes fermes.
            </p>
          </div>
          <Link
            href="/register/reseller"
            className="text-earth-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-1 hover:underline min-h-[38px] items-center"
          >
            Inscrire un revendeur &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
