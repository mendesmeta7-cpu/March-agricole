import React from "react";
import { FolderKanban } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  phaseBadge?: string;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  phaseBadge,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 mb-4 shadow-sm">
        {icon || <FolderKanban className="w-7 h-7 text-gray-400" />}
      </div>

      {phaseBadge && (
        <div className="mb-3">
          <Badge variant="forest" size="sm">
            {phaseBadge}
          </Badge>
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>

      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
