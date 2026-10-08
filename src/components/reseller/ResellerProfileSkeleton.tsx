import { Skeleton } from "@/components/ui/Skeleton";

export default function ResellerProfileSkeleton() {
  return (
    <div className="space-y-6 pb-24 sm:pb-12 animate-pulse">
      {/* 1. Fil d'Ariane skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-4 w-44 rounded-md" />
      </div>

      {/* 2. Header Card skeleton */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar + Identité */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-300 border-2 border-forest-200/80 shadow-md shrink-0" />
            <div className="space-y-2 pt-1 sm:pt-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 sm:h-7 w-56 sm:w-72 rounded-lg" />
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40 rounded-md" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-36 rounded-full" />
              </div>
            </div>
          </div>

          {/* Boutons d'actions skeleton */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
            <Skeleton className="h-10 flex-1 sm:flex-initial sm:w-36 rounded-xl" />
            <Skeleton className="h-10 flex-1 sm:flex-initial sm:w-44 rounded-xl" />
          </div>
        </div>

        {/* 4. Bandeau de statistiques rapides réelles */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-2xl bg-gray-50/80 space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Grille principale 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Établissement Commercial */}
          <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-5 w-48 rounded-md" />
              </div>
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-gray-50/60 space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-5 w-40 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Card Territoire d'Opération Pivot */}
          <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-5 w-52 rounded-md" />
              </div>
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-gray-50/60 space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-5 w-32 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite (1/3) */}
        <div className="space-y-6">
          {/* Card Compte & Sécurité */}
          <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-5 w-36 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Card Raccourcis Rapides */}
          <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-3">
            <Skeleton className="h-4 w-32 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Section Déconnexion */}
      <Skeleton className="h-20 w-full rounded-3xl" />
    </div>
  );
}
