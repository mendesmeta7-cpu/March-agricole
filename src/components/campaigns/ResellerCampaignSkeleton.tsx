import { Skeleton } from "@/components/ui/Skeleton";

export default function ResellerCampaignSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden flex flex-col justify-between shadow-2xs"
        >
          {/* Zone visuelle */}
          <div className="h-44 w-full bg-gray-200 relative">
            <div className="absolute top-3 left-3 w-28 h-6 bg-gray-300 rounded-lg" />
            <div className="absolute top-3 right-3 w-20 h-6 bg-gray-300 rounded-lg" />
            <div className="absolute bottom-3 left-3 w-24 h-5 bg-gray-300 rounded-md" />
          </div>

          {/* Corps de la carte */}
          <div className="p-4 space-y-3.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gray-200 shrink-0" />
              <div className="w-32 h-4 bg-gray-200 rounded-md" />
            </div>

            <div className="space-y-1.5">
              <div className="w-3/4 h-5 bg-gray-200 rounded-md" />
              <div className="w-1/2 h-3 bg-gray-200 rounded-md" />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="space-y-1">
                <div className="w-16 h-3 bg-gray-200 rounded-md" />
                <div className="w-20 h-5 bg-gray-200 rounded-md" />
              </div>
              <div className="space-y-1">
                <div className="w-16 h-3 bg-gray-200 rounded-md" />
                <div className="w-20 h-5 bg-gray-200 rounded-md" />
              </div>
            </div>

            <div className="w-full h-8 bg-gray-100 rounded-lg" />
            <div className="w-full h-10 bg-gray-50 rounded-lg" />
          </div>

          {/* Pied */}
          <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
            <div className="w-24 h-8 bg-gray-200 rounded-xl" />
            <div className="w-28 h-8 bg-gray-300 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
