import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  SkeletonFilterBar,
  SkeletonCardGrid,
} from "@/components/ui/Skeleton";

export default function ResellerDemandsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={3} />
      <SkeletonFilterBar />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
