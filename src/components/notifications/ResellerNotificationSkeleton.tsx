import { Skeleton } from "@/components/ui/Skeleton";

export default function ResellerNotificationSkeleton() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-pulse">
      {/* Skeleton En-tête */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-7 shadow-xs space-y-3">
        <div className="w-32 h-5 bg-gray-200 rounded-full" />
        <div className="w-56 h-8 bg-gray-200 rounded-xl" />
        <div className="w-full max-w-md h-4 bg-gray-100 rounded-lg" />
      </div>

      {/* Skeleton Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 space-y-2">
            <div className="w-16 h-3 bg-gray-200 rounded-md" />
            <div className="w-12 h-6 bg-gray-200 rounded-md" />
          </div>
        ))}
      </div>

      {/* Skeleton Filtres */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <div className="w-24 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-28 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-36 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-32 h-9 bg-gray-200 rounded-xl shrink-0" />
      </div>

      {/* Skeleton Liste */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gray-200 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="w-48 h-4 bg-gray-200 rounded-md" />
                <div className="w-full max-w-lg h-3.5 bg-gray-100 rounded-md" />
                <div className="w-24 h-3 bg-gray-100 rounded-md" />
              </div>
            </div>
            <div className="w-32 h-9 bg-gray-200 rounded-xl shrink-0 self-end sm:self-center" />
          </div>
        ))}
      </div>
    </div>
  );
}
