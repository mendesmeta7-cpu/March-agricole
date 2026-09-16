import {
  SkeletonPageHeader,
  SkeletonFilterBar,
  SkeletonCardGrid,
  Skeleton,
} from "@/components/ui/Skeleton";

export default function ResellerFeedLoading() {
  return (
    <div className="space-y-6">
      {/* Lien retour */}
      <Skeleton className="h-4 w-36 rounded" />

      {/* En-tête */}
      <SkeletonPageHeader />

      {/* Filtres de recherche */}
      <SkeletonFilterBar />

      {/* Grille de productions */}
      <SkeletonCardGrid count={6} />
    </div>
  );
}
