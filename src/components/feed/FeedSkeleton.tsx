"use client";

interface FeedSkeletonProps {
  count?: number;
}

export default function FeedSkeleton({ count = 6 }: FeedSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Grille de cartes skeleton compactes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-2xs flex flex-col"
          >
            {/* 1. Zone image compacte 16/10 */}
            <div className="w-full aspect-16/10 bg-gray-200/70 relative">
              <div className="absolute top-2.5 left-2.5 w-14 h-5 rounded-lg bg-gray-300/80" />
              <div className="absolute top-2.5 right-2.5 w-20 h-5 rounded-full bg-gray-300/80" />
            </div>

            {/* 2. Corps de la carte compact */}
            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                {/* Exploitation */}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-gray-200" />
                  <div className="w-24 h-3.5 rounded-md bg-gray-200" />
                </div>

                {/* Titre */}
                <div className="w-3/4 h-4.5 rounded-md bg-gray-200" />

                {/* Localisation */}
                <div className="w-1/2 h-3 rounded-md bg-gray-100" />
              </div>

              {/* 3. Pied de carte & bouton */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-20 h-4 rounded-md bg-gray-200" />
                  <div className="w-14 h-3.5 rounded-md bg-gray-100" />
                </div>
                <div className="w-full h-8 sm:h-9 rounded-xl bg-gray-200/90" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
