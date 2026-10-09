import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyDashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate-pulse">
      {/* ── 1. En-tête Héro ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 sm:h-10 w-72 sm:w-96 rounded-2xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-36 rounded-xl" />
            <Skeleton className="h-11 w-44 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ── 2. 4 Cartes KPI ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-11 h-11 rounded-2xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* ── 2b. Section Statistiques Financières (Prompt 4) ────────── */}
      <div className="space-y-4">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64 rounded-xl" />
            <Skeleton className="h-4 w-44 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-5 w-44 rounded-lg" />
                </div>
                <Skeleton className="w-10 h-10 rounded-2xl" />
              </div>
              <Skeleton className="h-8 w-28 rounded-xl" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Actions Requérant Attention ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-56 rounded-lg" />
              <Skeleton className="h-3.5 w-80 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Graphiques Côte à Côte ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Graphique Tendance */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-3.5 w-60 rounded-md" />
            </div>
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>

        {/* Graphique Répartition Géographique */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-56 rounded-md" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Activité Récente (2 colonnes) ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, col) => (
          <div
            key={col}
            className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-2xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-44 rounded-lg" />
                  <Skeleton className="h-3.5 w-56 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-7 w-20 rounded-xl" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-40 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
