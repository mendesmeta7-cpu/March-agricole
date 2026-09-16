import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  SkeletonCardGrid,
} from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={4} />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
