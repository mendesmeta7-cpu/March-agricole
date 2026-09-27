"use client";

interface FeedSkeletonProps {
  count?: number;
}

export default function FeedSkeleton({ count = 6 }: FeedSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Grille de cartes skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs flex flex-col"
          >
            {/* 1. Zone image */}
            <div className="w-full aspect-16/10 bg-gray-200/70 relative">
              <div className="absolute top-3 left-3 w-16 h-6 rounded-xl bg-gray-300/80" />
              <div className="absolute top-3 right-3 w-24 h-6 rounded-full bg-gray-300/80" />
            </div>

            {/* 2. Corps de la carte */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Exploitation */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-200" />
                  <div className="w-28 h-4 rounded-md bg-gray-200" />
                </div>

                {/* Titre et culture */}
                <div className="space-y-1.5">
                  <div className="w-3/4 h-5 rounded-lg bg-gray-200" />
                  <div className="w-1/2 h-3.5 rounded-md bg-gray-100" />
                </div>

                {/* Localisation */}
                <div className="w-2/3 h-3.5 rounded-md bg-gray-100" />

                {/* Date */}
                <div className="w-1/2 h-3 rounded-md bg-gray-100" />
              </div>

              {/* 3. Pied de carte & bouton */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-5 rounded-md bg-gray-200" />
                  <div className="w-16 h-4 rounded-md bg-gray-100" />
                </div>
                <div className="w-full h-11 rounded-2xl bg-gray-200/90" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
