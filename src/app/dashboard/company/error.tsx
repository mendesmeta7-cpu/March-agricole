"use client";

import RouteErrorView from "@/components/ui/RouteErrorView";

export default function CompanyDashboardError({
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
      backHref="/dashboard/company"
      backLabel="Retour au tableau de bord"
      scopeLabel="votre espace société"
      compact
    />
  );
}
