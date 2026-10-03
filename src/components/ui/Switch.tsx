import React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, checked, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-start justify-between gap-3 select-none cursor-pointer py-1",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {(label || description) && (
          <div className="space-y-0.5 min-w-0 flex-1">
            {label && (
              <span className="text-xs sm:text-sm font-semibold text-gray-900 block tracking-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="text-[11px] sm:text-xs text-gray-500 block leading-relaxed">
                {description}
              </span>
            )}
          </div>
        )}

        <div className="relative inline-flex items-center shrink-0 pt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            aria-checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              "w-11 h-6 bg-gray-200 peer-focus-visible:ring-2 peer-focus-visible:ring-forest-600/30 rounded-full",
              "peer-checked:bg-forest-700 transition-colors duration-200 ease-in-out",
              "after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:shadow-xs after:transition-all after:duration-200",
              "peer-checked:after:translate-x-5 peer-checked:after:border-white"
            )}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";
export default Switch;
