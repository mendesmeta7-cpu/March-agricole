import { Skeleton } from "@/components/ui/Skeleton";

export default function ResellerOrderSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Fil d'Ariane skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-4 w-48 rounded-md" />
      </div>

      {/* 2. En-tête skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* 3. Cartes statistiques skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* 4. Barre de recherche & filtres skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* 5. Grille de cartes de commandes skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-gray-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
          >
            {/* Header carte */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-36 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>

            {/* Corps carte */}
            <div className="p-4 space-y-4 flex-1">
              {/* Vendeur */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-6 h-6 rounded-lg" />
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                </div>
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>

              {/* Produit */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20 rounded-md ml-auto" />
                  <Skeleton className="h-3 w-16 rounded-md ml-auto" />
                </div>
              </div>

              {/* Arrivée & Dépôt */}
              <div className="p-2.5 rounded-xl bg-forest-50/40 border border-forest-100/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                </div>
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>

              {/* Stepper progression */}
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-2.5 w-12 rounded-md" />
                  <Skeleton className="h-2.5 w-14 rounded-md" />
                  <Skeleton className="h-2.5 w-12 rounded-md" />
                </div>
              </div>

              {/* Montant */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-forest-50/50 border border-forest-100">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>

            {/* Footer carte */}
            <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
