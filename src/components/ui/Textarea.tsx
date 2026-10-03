import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      showCount = false,
      maxLength,
      value,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="relative w-full space-y-1">
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            "w-full bg-white border text-gray-900 placeholder:text-gray-400 text-sm rounded-xl px-3.5 py-2.5 transition-all duration-150 ease-out resize-y",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200",
            hasError
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-950"
              : "border-gray-300/90 hover:border-gray-400 focus:border-forest-600 focus:ring-forest-600/20",
            className
          )}
          {...props}
        />

        {showCount && maxLength && (
          <div className="text-right text-[11px] text-gray-400 pr-1">
            {currentLength} / {maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
