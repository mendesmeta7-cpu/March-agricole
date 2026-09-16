import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  SkeletonFilterBar,
  SkeletonCardGrid,
} from "@/components/ui/Skeleton";

export default function CompanyCampaignsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={4} />
      <SkeletonFilterBar />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
