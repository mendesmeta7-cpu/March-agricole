import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  SkeletonFilterBar,
  SkeletonTable,
} from "@/components/ui/Skeleton";

export default function ResellerOrdersLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={3} />
      <SkeletonFilterBar />
      <SkeletonTable rows={6} />
    </div>
  );
}
