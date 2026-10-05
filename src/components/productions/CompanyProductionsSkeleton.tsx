import React from "react";

export default function CompanyProductionsSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6 animate-pulse">
      {/* Fil d'Ariane */}
      <div className="h-4 w-40 bg-gray-200/80 rounded-md" />

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-2xs">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-80 max-w-full bg-gray-100 rounded-md" />
        </div>
        <div className="h-11 w-44 bg-forest-200/60 rounded-xl shrink-0" />
      </div>

      {/* 4 Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-gray-200 rounded-md" />
              <div className="h-6 w-12 bg-gray-300 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="h-10 flex-1 w-full bg-gray-100 rounded-xl" />
          <div className="h-10 w-44 bg-gray-100 rounded-xl shrink-0" />
          <div className="h-10 w-48 bg-gray-100 rounded-xl shrink-0" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-gray-100 rounded-lg" />
          <div className="h-7 w-24 bg-gray-100 rounded-lg" />
          <div className="h-7 w-24 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Grille de cartes productions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[16/10] bg-gray-200/80 w-full" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 rounded-md" />
                <div className="h-12 bg-gray-100 rounded-xl w-full" />
                <div className="h-3 w-1/2 bg-gray-100 rounded-md" />
                <div className="h-3 w-2/3 bg-gray-100 rounded-md" />
              </div>
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="h-8 w-20 bg-gray-100 rounded-lg" />
              <div className="h-8 w-20 bg-forest-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
