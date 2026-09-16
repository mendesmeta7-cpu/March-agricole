import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  SkeletonCardGrid,
} from "@/components/ui/Skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={4} />
      <SkeletonStatGrid count={4} />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
