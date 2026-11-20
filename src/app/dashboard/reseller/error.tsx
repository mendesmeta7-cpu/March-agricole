"use client";

import RouteErrorView from "@/components/ui/RouteErrorView";

export default function ResellerDashboardError({
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
      backHref="/dashboard/reseller"
      backLabel="Retour au tableau de bord"
      scopeLabel="votre espace revendeur"
      compact
    />
  );
}
