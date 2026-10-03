import { Skeleton } from "@/components/ui/Skeleton";

export default function ResellerDemandSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden flex flex-col justify-between shadow-2xs"
        >
          {/* Header de la carte */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-4 bg-gray-200 rounded-md" />
                    <div className="w-20 h-4 bg-gray-200 rounded-md" />
                  </div>
                  <div className="w-28 h-5 bg-gray-200 rounded-md" />
                </div>
              </div>
              <div className="w-20 h-6 bg-gray-200 rounded-full shrink-0" />
            </div>

            {/* Bloc volume et propositions */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-20 h-3 bg-gray-200 rounded-md" />
                <div className="w-24 h-5 bg-gray-200 rounded-md" />
              </div>
              <div className="w-24 h-7 bg-gray-200 rounded-lg" />
            </div>

            {/* Localisation et calendrier */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-gray-200 rounded-full" />
                <div className="w-36 h-4 bg-gray-200 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-gray-200 rounded-full" />
                <div className="w-44 h-4 bg-gray-200 rounded-md" />
              </div>
              <div className="w-full h-8 bg-gray-50 rounded-lg mt-1" />
            </div>
          </div>

          {/* Footer de la carte */}
          <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <div className="w-24 h-3 bg-gray-200 rounded-md" />
            <div className="flex items-center gap-2">
              <div className="w-16 h-7 bg-gray-200 rounded-lg" />
              <div className="w-16 h-7 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
