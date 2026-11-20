import { SkeletonPageHeader, SkeletonFormField, Skeleton } from "@/components/ui/Skeleton";

export default function NewCampaignLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 space-y-5">
        <SkeletonFormField />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonFormField />
          <SkeletonFormField />
        </div>
        <SkeletonFormField />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>
    </div>
  );
}
