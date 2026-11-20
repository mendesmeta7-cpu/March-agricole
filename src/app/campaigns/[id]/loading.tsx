import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function PublicCampaignLoading() {
  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200/80">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <Skeleton className="h-52 sm:h-72 w-full rounded-none" />
          <div className="p-5 sm:p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-11 w-40 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <SkeletonText />
          <SkeletonText width="w-5/6" />
          <SkeletonText width="w-2/3" />
        </div>
      </div>
    </div>
  );
}
