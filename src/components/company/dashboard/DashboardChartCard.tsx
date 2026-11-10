"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Select from "@/components/ui/Select";

export interface DashboardChartCardProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Mention placée après le titre. */
  badge?: ReactNode;
  /** Information courte alignée à droite du titre. */
  aside?: ReactNode;
  /** Filtres, toujours sous le titre pour ne jamais le comprimer. */
  filters?: ReactNode;
  children: ReactNode;
}

/** Cadre et en-tête communs aux graphiques du tableau de bord Société. */
export default function DashboardChartCard({
  icon: Icon,
  title,
  description,
  badge,
  aside,
  filters,
  children,
}: DashboardChartCardProps) {
  return (
    <div
      data-chart-card
      className="min-w-0 bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="pb-4 border-b border-gray-100 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-base font-bold text-gray-950 flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-forest-700 shrink-0" />
                {title}
              </h3>
              {badge}
            </div>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
        {filters && <div className="flex flex-wrap items-center gap-2.5">{filters}</div>}
      </div>
      {children}
    </div>
  );
}

export interface ChartUnitSelectProps {
  units: readonly { unitKey: string; unitLabel: string }[];
  value: string;
  onChange: (unitKey: string) => void;
}

/** Choix de l'unité affichée : une seule à la fois, sans conversion (BR-FIN-04). */
export function ChartUnitSelect({ units, value, onChange }: ChartUnitSelectProps) {
  return (
    <div
      role="group"
      aria-label="Unité affichée"
      className="flex items-center gap-2 min-w-[9rem] flex-1 sm:flex-none"
    >
      <span className="text-xs font-semibold text-gray-600 shrink-0" aria-hidden="true">
        Unité
      </span>
      <div className="min-w-0 flex-1 sm:flex-none sm:w-40">
        <Select
          value={value}
          onValueChange={onChange}
          options={units.map((u) => ({ value: u.unitKey, label: u.unitLabel }))}
          searchable={false}
          selectSize="sm"
        />
      </div>
    </div>
  );
}
