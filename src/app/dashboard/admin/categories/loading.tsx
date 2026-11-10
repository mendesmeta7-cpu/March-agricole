import { SkeletonPageHeader, SkeletonCardGrid, Skeleton } from "@/components/ui/Skeleton";

export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36 rounded" />
      <SkeletonPageHeader />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
