import React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ToolbarProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  backAction?: {
    label?: string;
    onClick?: () => void;
    href?: string;
  };
  searchSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  badge?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export function Toolbar({
  title,
  description,
  backAction,
  searchSlot,
  filterSlot,
  actionsSlot,
  badge,
  bordered = true,
  className,
}: ToolbarProps) {
  return (
    <div
      className={cn(
        "space-y-4 pb-4 sm:pb-5",
        bordered && "border-b border-gray-200/80 mb-5 sm:mb-6",
        className
      )}
    >
      {/* Ligne principale : Retour + Titre + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {backAction && (
            <div className="mb-1.5">
              {backAction.href ? (
                <Link
                  href={backAction.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-forest-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{backAction.label || "Retour"}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={backAction.onClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-forest-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{backAction.label || "Retour"}</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            {typeof title === "string" ? (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-950 truncate">
                {title}
              </h1>
            ) : (
              title
            )}
            {badge}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Slot pour actions principales (bouton nouveau, export, etc.) */}
        {actionsSlot && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {actionsSlot}
          </div>
        )}
      </div>

      {/* Ligne secondaire : Recherche & Filtres */}
      {(searchSlot || filterSlot) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {searchSlot && <div className="flex-1 min-w-0 max-w-md">{searchSlot}</div>}
          {filterSlot && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {filterSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Toolbar;
