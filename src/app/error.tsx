"use client";

import RouteErrorView from "@/components/ui/RouteErrorView";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      backHref="/"
      backLabel="Retour à l'accueil"
    />
  );
}
