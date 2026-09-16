import {
  SkeletonPageHeader,
  SkeletonStatGrid,
  Skeleton,
} from "@/components/ui/Skeleton";

export default function ResellerDashboardLoading() {
  return (
    <div className="space-y-8">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
          <Skeleton className="h-6 w-52 rounded-lg" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
