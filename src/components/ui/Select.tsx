import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options?: SelectOption[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
  error?: boolean | string;
  selectSize?: "sm" | "md" | "lg";
}

const selectSizeStyles = {
  sm: "py-1.5 pl-3 pr-8 text-xs sm:text-sm rounded-lg",
  md: "py-2.5 pl-3.5 pr-10 text-sm rounded-xl",
  lg: "py-3 pl-4 pr-11 text-base rounded-2xl",
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options,
      placeholder,
      leftIcon,
      error,
      selectSize = "md",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3 sm:left-3.5 flex items-center justify-center text-gray-400 pointer-events-none shrink-0">
            {leftIcon}
          </div>
        )}

        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full bg-white border text-gray-900 appearance-none cursor-pointer transition-all duration-150 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200",
            hasError
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-950"
              : "border-gray-300/90 hover:border-gray-400 focus:border-forest-600 focus:ring-forest-600/20",
            leftIcon ? "pl-9 sm:pl-10" : "",
            selectSizeStyles[selectSize],
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options
            ? options.map((opt) => (
                <option
                  key={String(opt.value)}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 sm:right-3.5 flex items-center justify-center text-gray-400 pointer-events-none shrink-0">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
