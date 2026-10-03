import React from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  variant?: "card" | "simple";
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  variant = "card",
  columns = 2,
  className,
  disabled = false,
}: RadioGroupProps) {
  const colClassMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div
      role="radiogroup"
      className={cn(
        variant === "card" ? `grid gap-2.5 sm:gap-3 ${colClassMap[columns]}` : "space-y-2",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const isDisabled = disabled || opt.disabled;

        if (variant === "card") {
          return (
            <label
              key={opt.value}
              className={cn(
                "relative flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border text-left cursor-pointer select-none transition-all duration-150 ease-out",
                isSelected
                  ? "border-forest-600 bg-forest-50/50 ring-2 ring-forest-600/20 shadow-xs"
                  : "border-gray-200/90 bg-white hover:border-gray-300 hover:bg-gray-50/60",
                isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />

              {opt.icon && (
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-forest-700 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {opt.icon}
                </div>
              )}

              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-semibold tracking-tight block truncate",
                      isSelected ? "text-forest-950" : "text-gray-900"
                    )}
                  >
                    {opt.label}
                  </span>

                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "border-forest-700 bg-forest-700"
                        : "border-gray-300 bg-white"
                    )}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {opt.description && (
                  <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {opt.description}
                  </p>
                )}
              </div>
            </label>
          );
        }

        // Mode standard 'simple'
        return (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-3 select-none cursor-pointer group py-1",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div
                className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                  isSelected
                    ? "border-forest-700 bg-forest-700"
                    : "border-gray-300 group-hover:border-gray-400 bg-white"
                )}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>

            <div className="space-y-0.5 flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-gray-900 block">
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[11px] sm:text-xs text-gray-500 block leading-relaxed">
                  {opt.description}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default RadioGroup;
