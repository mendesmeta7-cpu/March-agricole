"use client";

import "./globals.css";
import RouteErrorView from "@/components/ui/RouteErrorView";

/**
 * Frontière d'erreur racine (LOAD-01) : remplace le layout racine lorsqu'une
 * erreur survient dans celui-ci. Elle doit donc rendre ses propres <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="antialiased font-sans min-h-screen text-gray-900 bg-gray-50">
        <title>Erreur — Radiza</title>
        <RouteErrorView
          error={error}
          reset={reset}
          backHref="/"
          backLabel="Retour à l'accueil"
          reloadPageOnRetry
        />
      </body>
    </html>
  );
}
