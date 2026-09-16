import {
  SkeletonPageHeader,
  SkeletonFilterBar,
  SkeletonCardGrid,
} from "@/components/ui/Skeleton";

export default function CompanyProductsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonFilterBar />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
