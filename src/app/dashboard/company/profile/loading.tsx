import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyProfileLoading() {
  return (
    <div className="space-y-6 pb-24 sm:pb-12 max-w-7xl mx-auto animate-pulse">
      {/* 1. Fil d'Ariane skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32 rounded" />
        <span className="text-gray-300">/</span>
        <Skeleton className="h-4 w-44 rounded" />
      </div>

      {/* 2. Carte d'en-tête du profil skeleton */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {/* Avatar skeleton */}
            <div className="shrink-0">
              <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-forest-200/80 shadow-md" />
            </div>

            {/* Dénominations skeleton */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-7 w-52 sm:w-72 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-36 rounded" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="h-6 w-44 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Boutons actions skeleton */}
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Onglets skeleton */}
        <div className="border-t border-gray-100 pt-4 flex gap-2 overflow-x-hidden">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      {/* 4. Grille de contenu skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 space-y-4">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 space-y-4">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 space-y-3">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
