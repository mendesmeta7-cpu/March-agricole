import {
  Skeleton,
  SkeletonStatGrid,
  SkeletonFilterBar,
} from "@/components/ui/Skeleton";

export default function CompanyOrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Squelette Fil d'Ariane */}
      <Skeleton className="h-4 w-44 rounded-md" />

      {/* Squelette Hero Header */}
      <div className="h-44 sm:h-48 rounded-3xl bg-forest-950/20 border border-forest-900/10 p-6 sm:p-8 flex flex-col justify-between">
        <div className="space-y-2.5 max-w-lg">
          <Skeleton className="h-5 w-48 rounded-full bg-forest-900/30" />
          <Skeleton className="h-8 w-64 rounded-xl bg-forest-900/40" />
          <Skeleton className="h-4 w-96 rounded-md bg-forest-900/20" />
        </div>
      </div>

      {/* Squelette 4 Cartes Métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="w-9 h-9 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Squelette Lookup Widget */}
      <Skeleton className="h-28 w-full rounded-3xl" />

      {/* Squelette Onglets et Barre de Filtres */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-xl" />
          ))}
        </div>
        <SkeletonFilterBar />
      </div>

      {/* Squelette Grille de Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="flex gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
