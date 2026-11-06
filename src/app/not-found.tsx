import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

export const metadata: Metadata = {
  title: "Page introuvable — Radiza",
};

/**
 * Page 404 globale aux couleurs Radiza (LOAD-01).
 * Utilisée pour les URL inconnues et pour tous les appels à notFound().
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-forest-50/50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6">
          <Link
            href="/"
            aria-label="Accueil Radiza"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
          >
            <BrandLogo variant="horizontal" height={36} />
          </Link>
        </div>

        <div
          className="w-14 h-14 rounded-2xl bg-forest-50 border border-forest-100 text-forest-700 flex items-center justify-center mx-auto mb-4"
          aria-hidden="true"
        >
          <Compass className="w-7 h-7" />
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-forest-700 mb-1">Erreur 404</p>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Page introuvable</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          La page demandée n&apos;existe pas, a été déplacée ou n&apos;est plus accessible avec votre compte.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-xl bg-forest-700 hover:bg-forest-800 text-white border border-forest-800/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2"
          >
            Accéder à mon espace
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-xl border border-gray-300/90 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
