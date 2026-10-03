import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean | string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      checked,
      disabled,
      error,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-start gap-3 select-none cursor-pointer group py-0.5",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              "w-5 h-5 rounded-md border bg-white flex items-center justify-center transition-all duration-150 ease-out shadow-2xs",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-forest-600/30 peer-focus-visible:ring-offset-1",
              hasError
                ? "border-rose-400"
                : "border-gray-300 group-hover:border-gray-400 peer-checked:border-forest-700 peer-checked:bg-forest-700"
            )}
          >
            <Check
              className={cn(
                "w-3.5 h-3.5 text-white stroke-[2.5] transition-transform duration-150 ease-out",
                checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
              )}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="space-y-0.5 min-w-0 flex-1">
            {label && (
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium block tracking-tight",
                  hasError ? "text-rose-900" : "text-gray-900"
                )}
              >
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
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
