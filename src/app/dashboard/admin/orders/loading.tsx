import {
  SkeletonPageHeader,
  SkeletonFilterBar,
  SkeletonTable,
  Skeleton,
} from "@/components/ui/Skeleton";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36 rounded" />
      <SkeletonPageHeader />
      <SkeletonFilterBar />
      <SkeletonTable rows={6} />
    </div>
  );
}
