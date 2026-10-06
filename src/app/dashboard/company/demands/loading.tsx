import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  SkeletonFilterBar,
  SkeletonCardGrid,
  Skeleton,
} from "@/components/ui/Skeleton";

export default function CompanyDemandsLoading() {
  return (
    <div className="space-y-6">
      {/* Fil d'Ariane */}
      <Skeleton className="h-4 w-48 rounded-lg" />

      {/* En-tête héro */}
      <Skeleton className="h-36 sm:h-44 w-full rounded-3xl" />

      {/* 4 cartes de métriques */}
      <SkeletonStatGrid count={4} />

      {/* Cartouche pédagogique */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* Onglets */}
      <div className="flex gap-3 border-b border-gray-200 pb-px">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-10 w-52 rounded-xl" />
      </div>

      {/* Barre de filtres */}
      <SkeletonFilterBar />

      {/* Grille de cartes de demandes */}
      <SkeletonCardGrid count={6} />
    </div>
  );
}
