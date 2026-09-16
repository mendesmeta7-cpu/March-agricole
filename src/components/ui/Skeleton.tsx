import React from "react";

/**
 * Composant élémentaire Skeleton avec animation de pulsation subtile
 */
export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 rounded-lg ${className}`}
      {...props}
    />
  );
}

/**
 * Ligne de texte squelette
 */
export function SkeletonText({
  className = "",
  width = "w-full",
  height = "h-4",
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return <Skeleton className={`${height} ${width} rounded ${className}`} />;
}

/**
 * Squelette d'en-tête de page calqué sur PageHeader
 */
export function SkeletonPageHeader({
  hasAction = true,
  hasBadge = true,
}: {
  hasAction?: boolean;
  hasBadge?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-gray-200/80 mb-6 sm:mb-8">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 sm:h-8 w-48 sm:w-72 rounded-xl" />
          {hasBadge && <Skeleton className="h-6 w-24 rounded-full" />}
        </div>
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      {hasAction && (
        <div className="flex-shrink-0">
          <Skeleton className="h-10 w-36 sm:w-44 rounded-xl" />
        </div>
      )}
    </div>
  );
}

/**
 * Squelette d'une carte de statistique calquée sur StatCard
 */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-3.5 w-32 rounded" />
      </div>
    </div>
  );
}

/**
 * Grille de 4 cartes de statistiques
 */
export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/**
 * Squelette de barre de recherche et de filtres
 */
export function SkeletonFilterBar() {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
      <div className="flex-1 w-full sm:max-w-md">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Squelette d'une carte de contenu individuelle (produit, récolte, campagne, offre)
 */
export function SkeletonContentCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm flex flex-col justify-between p-5 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Grille de cartes de contenu
 */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonContentCard key={i} />
      ))}
    </div>
  );
}

/**
 * Squelette de tableau de données (commandes, listes administratives)
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
      {/* En-tête de tableau */}
      <div className="p-4 bg-gray-50/80 border-b border-gray-200/80 flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Lignes */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-44 max-w-full rounded" />
                <Skeleton className="h-3 w-28 max-w-full rounded" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Squelette de vue détaillée (détail commande, détail production, profil entreprise)
 */
export function SkeletonDetailView() {
  return (
    <div className="space-y-6">
      {/* Bouton retour */}
      <Skeleton className="h-4 w-36 rounded" />

      {/* En-tête */}
      <SkeletonPageHeader />

      {/* Disposition en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-4/5 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Squelette de profil d'entreprise ou revendeur
 */
export function SkeletonProfileView() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40 rounded" />
      <SkeletonPageHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne fiche d'identité */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4 flex flex-col items-center text-center">
          <Skeleton className="w-24 h-24 rounded-2xl" />
          <Skeleton className="h-6 w-40 rounded-lg" />
          <Skeleton className="h-4 w-28 rounded-full" />
          <div className="w-full pt-4 border-t border-gray-100 space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>

        {/* Colonne coordonnées et détails légaux */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100 space-y-2">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-5 w-36 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
