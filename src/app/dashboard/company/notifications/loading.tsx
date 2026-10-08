export default function CompanyNotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Fil d'ariane skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-28 h-4 bg-gray-200 rounded-md" />
        <span className="text-gray-300">/</span>
        <div className="w-24 h-4 bg-gray-200 rounded-md" />
      </div>

      {/* 2. En-tête Héro skeleton */}
      <div className="rounded-3xl bg-forest-950/40 border border-forest-900/30 p-6 sm:p-8 space-y-4">
        <div className="w-48 h-6 bg-forest-800/60 rounded-full" />
        <div className="w-80 h-9 bg-forest-800/60 rounded-xl" />
        <div className="w-full max-w-xl h-4 bg-forest-800/40 rounded-lg" />
      </div>

      {/* 3. 4 Cartes métriques skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-20 h-3.5 bg-gray-200 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-gray-100" />
            </div>
            <div className="w-12 h-8 bg-gray-200 rounded-lg" />
            <div className="w-24 h-3 bg-gray-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* 4. Filtres tabs skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="w-20 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-24 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-32 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-36 h-9 bg-gray-200 rounded-xl shrink-0" />
        <div className="w-36 h-9 bg-gray-200 rounded-xl shrink-0" />
      </div>

      {/* 5. Cartes notifications skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gray-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-4 bg-gray-200 rounded-full" />
                  <div className="w-16 h-3 bg-gray-100 rounded-md" />
                </div>
                <div className="w-56 h-4 bg-gray-200 rounded-md" />
                <div className="w-full max-w-md h-3.5 bg-gray-100 rounded-md" />
              </div>
            </div>
            <div className="w-32 h-9 bg-gray-100 rounded-xl shrink-0 self-end sm:self-center" />
          </div>
        ))}
      </div>
    </div>
  );
}
