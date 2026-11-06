"use client";

import RouteErrorView from "@/components/ui/RouteErrorView";

export default function AdminDashboardError({
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
      backHref="/dashboard/admin"
      backLabel="Retour à l'administration"
      scopeLabel="l'espace d'administration"
      compact
    />
  );
}
