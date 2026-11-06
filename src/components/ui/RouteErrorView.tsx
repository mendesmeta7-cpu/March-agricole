"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import BrandLogo from "./BrandLogo";
import Button from "./Button";

/**
 * Vue d'erreur partagée par les frontières `error.tsx` (LOAD-01).
 *
 * Règles :
 * - Jamais de message brut, de pile d'appels ni de détail technique affiché ;
 * - Seul `error.digest` (identifiant opaque généré par Next.js) est journalisé
 *   et proposé comme référence au support ;
 * - Bouton « Réessayer » branché sur `reset()` + lien de retour.
 */
export interface RouteErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  backHref: string;
  backLabel: string;
  /** Contexte affiché dans le titre (ex. « votre espace société ») */
  scopeLabel?: string;
  /** Affichage dans un shell de dashboard (pas de logo, hauteur réduite) */
  compact?: boolean;
}

export default function RouteErrorView({
  error,
  reset,
  backHref,
  backLabel,
  scopeLabel,
  compact = false,
}: RouteErrorViewProps) {
  useEffect(() => {
    // Journalisation minimale : uniquement l'identifiant opaque.
    console.error("[Radiza] Erreur de rendu", error.digest ? `(digest: ${error.digest})` : "");
  }, [error.digest]);

  // Dans un shell de dashboard, le header porte déjà un titre de niveau 1.
  const Heading = compact ? "h2" : "h1";

  return (
    <div
      className={
        compact
          ? "flex items-center justify-center px-4 py-12 sm:py-16"
          : "min-h-screen flex items-center justify-center px-4 py-12 bg-forest-50/50"
      }
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 text-center">
        {!compact && (
          <div className="flex justify-center mb-6">
            <Link href="/" aria-label="Accueil Radiza" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600">
              <BrandLogo variant="horizontal" height={36} />
            </Link>
          </div>
        )}

        <div className="w-14 h-14 rounded-2xl bg-earth-50 border border-earth-100 text-earth-700 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <Heading className="text-xl font-bold text-gray-900 tracking-tight mb-2">
          Une erreur inattendue est survenue
        </Heading>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {scopeLabel
            ? `Le chargement de ${scopeLabel} n'a pas pu aboutir.`
            : "Cette page n'a pas pu être affichée."}{" "}
          Vous pouvez réessayer ou revenir en arrière.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            onClick={() => reset()}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="min-h-[44px]"
          >
            Réessayer
          </Button>
          <Link
            href={backHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-xl border border-gray-300/90 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {backLabel}
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-[11px] text-gray-500">
            Référence de l&apos;incident : <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
