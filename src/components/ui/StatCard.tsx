import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  helper?: string;
  variant?: "default" | "forest" | "earth" | "amber";
}

export default function StatCard({
  label,
  value,
  icon,
  helper,
  variant = "default",
}: StatCardProps) {
  const iconBgStyles = {
    default: "bg-gray-100 text-gray-700",
    forest: "bg-forest-100 text-forest-800",
    earth: "bg-earth-100 text-earth-800",
    amber: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs sm:text-sm font-medium text-gray-500 line-clamp-1">
          {label}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgStyles[variant]}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950">
          {value}
        </div>
        {helper && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-1">
            {helper}
          </p>
        )}
      </div>
    </div>
  );
}
