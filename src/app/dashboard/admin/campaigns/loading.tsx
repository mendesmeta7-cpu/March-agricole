import {
  SkeletonPageHeader,
  SkeletonFilterBar,
  SkeletonCardGrid,
  Skeleton,
} from "@/components/ui/Skeleton";

export default function AdminCampaignsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36 rounded" />
      <SkeletonPageHeader />
      <SkeletonFilterBar />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
