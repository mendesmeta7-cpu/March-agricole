"use client";

import React, { useId } from "react";
import { AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormFieldContext, mergeIds } from "./formFieldContext";

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
  // A11-06 (Lot UX/UI 5B) : erreur et aide reliées au champ par aria-describedby.
  const baseId = useId();
  const labelId = label ? `${baseId}-label` : undefined;
  const descriptionId = description && !error ? `${baseId}-description` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;

  return (
    <FormFieldContext.Provider
      value={{ describedBy: mergeIds(errorId, descriptionId), invalid: Boolean(error), labelId }}
    >
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            id={labelId}
            htmlFor={htmlFor}
            className="block text-xs sm:text-sm font-semibold text-gray-800 tracking-tight"
          >
            {label}
            {required && <span className="text-rose-600 ml-1 font-bold">*</span>}
            {optional && (
              <span className="text-gray-500 font-normal text-xs ml-1.5">
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
        <p id={descriptionId} className="text-xs sm:text-xs text-gray-500 leading-relaxed">
          {description}
        </p>
      )}

      {error && (
        <div id={errorId} className="flex items-center gap-1.5 text-xs text-rose-600 font-medium animate-fade-in-up">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
    </FormFieldContext.Provider>
  );
}

export default FormField;
