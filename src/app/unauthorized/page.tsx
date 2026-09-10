import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-gray-50 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Accès Non Autorisé
      </h1>

      <p className="text-gray-600 max-w-md mb-8 text-sm sm:text-base leading-relaxed">
        Votre profil utilisateur ou votre rôle ne dispose pas des privilèges nécessaires pour accéder à cet espace.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-forest-700 text-white font-medium hover:bg-forest-800 transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Se reconnecter avec un autre compte
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
        >
          Page d&apos;accueil
        </Link>
      </div>
    </div>
  );
}
