import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyProductsSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6 animate-pulse">
      {/* Fil d'Ariane */}
      <div className="h-4 w-40 bg-gray-200/80 rounded-md" />

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-gray-200/70 rounded-md" />
        </div>
        <div className="h-11 w-44 bg-forest-200/60 rounded-xl shrink-0" />
      </div>

      {/* 4 Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-gray-200/80 space-y-2"
          >
            <div className="h-3.5 w-24 bg-gray-200 rounded-md" />
            <div className="h-7 w-16 bg-gray-300 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="p-3.5 rounded-2xl bg-white border border-gray-200/90 flex flex-col md:flex-row items-center gap-3">
        <div className="h-10 flex-1 w-full bg-gray-100 rounded-xl" />
        <div className="h-10 w-44 bg-gray-100 rounded-xl shrink-0" />
        <div className="h-10 w-56 bg-gray-100 rounded-xl shrink-0" />
      </div>

      {/* Grille de cartes produits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden space-y-3 p-4 flex flex-col justify-between h-96"
          >
            <div className="space-y-3">
              <div className="aspect-[16/10] bg-gray-200/80 rounded-xl w-full" />
              <div className="h-5 w-3/4 bg-gray-200 rounded-md" />
              <div className="h-4 w-1/2 bg-gray-100 rounded-md" />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="h-9 flex-1 bg-gray-200/80 rounded-xl" />
              <div className="h-9 flex-1 bg-gray-200/80 rounded-xl" />
              <div className="h-9 w-9 bg-gray-200/80 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
