"use client";

interface FeedSkeletonProps {
  count?: number;
}

export default function FeedSkeleton({ count = 6 }: FeedSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Grille de cartes skeleton — alignée sur la grille réelle */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-2xs flex flex-col"
          >
            {/* 1. Zone image — aspect-ratio 4/3 comme la vraie carte */}
            <div className="w-full bg-gray-200/70 relative" style={{ aspectRatio: "4/3" }}>
              <div className="absolute top-1.5 left-1.5 w-12 h-4 rounded-md bg-gray-300/80" />
              <div className="absolute top-1.5 right-1.5 w-16 h-4 rounded-full bg-gray-300/80" />
            </div>

            {/* 2. Corps compact */}
            <div className="p-2 sm:p-3 flex-1 flex flex-col gap-1.5 sm:gap-2">
              {/* Société */}
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-md bg-gray-200" />
                <div className="w-16 sm:w-20 h-3 rounded-md bg-gray-200" />
              </div>

              {/* Titre produit */}
              <div className="space-y-1">
                <div className="w-full h-3.5 rounded-md bg-gray-200" />
                <div className="w-3/4 h-3 rounded-md bg-gray-100" />
              </div>

              {/* Pied de carte */}
              <div className="pt-1.5 border-t border-gray-100 flex flex-col gap-1.5 mt-auto">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-14 h-3.5 rounded-md bg-gray-200" />
                  <div className="w-10 h-3 rounded-md bg-gray-100" />
                </div>
                <div className="w-full h-7 rounded-lg bg-gray-200/90" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
