export default function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col animate-pulse"
        >
          {/* Photo skeleton */}
          <div className="w-full aspect-16/10 sm:aspect-16/9 bg-gray-200" />

          {/* Body skeleton */}
          <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Entreprise */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-200" />
                <div className="h-3.5 bg-gray-200 rounded w-1/3" />
              </div>

              {/* Titre & Produit */}
              <div className="space-y-1.5">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>

              {/* Localisation */}
              <div className="h-3 bg-gray-200 rounded w-2/3" />

              {/* Période */}
              <div className="h-7 bg-gray-100 rounded-lg w-full" />
            </div>

            {/* Pied */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-2.5 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
              <div className="h-8 bg-gray-200 rounded-xl w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
