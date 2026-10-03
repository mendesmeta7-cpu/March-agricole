import React from "react";
import { AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  description?: React.ReactNode;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required = false,
  optional = false,
  description,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={htmlFor}
            className="block text-xs sm:text-sm font-semibold text-gray-800 tracking-tight"
          >
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
            {optional && (
              <span className="text-gray-400 font-normal text-xs ml-1.5">
                (optionnel)
              </span>
            )}
          </label>

          {hint && (
            <div
              className="flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-help"
              title={hint}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}

      {children}

      {description && !error && (
        <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
          {description}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium animate-fade-in-up">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default FormField;
