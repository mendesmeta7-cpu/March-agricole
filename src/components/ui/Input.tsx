import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean | string;
  inputSize?: "sm" | "md" | "lg";
  clearable?: boolean;
  onClear?: () => void;
}

const inputSizeStyles = {
  sm: "py-1.5 px-3 text-xs sm:text-sm rounded-lg",
  md: "py-2.5 px-3.5 text-sm rounded-xl",
  lg: "py-3 px-4 text-base rounded-2xl",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      leftIcon,
      rightIcon,
      error,
      inputSize = "md",
      clearable = false,
      onClear,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const showClear = clearable && Boolean(value) && !disabled && Boolean(onClear);

    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3 sm:left-3.5 flex items-center justify-center text-gray-400 pointer-events-none shrink-0">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          type={type}
          disabled={disabled}
          value={value}
          className={cn(
            "w-full bg-white border text-gray-900 placeholder:text-gray-400 transition-all duration-150 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200",
            hasError
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-950"
              : "border-gray-300/90 hover:border-gray-400 focus:border-forest-600 focus:ring-forest-600/20",
            leftIcon ? "pl-9 sm:pl-10" : "",
            rightIcon || showClear ? "pr-9 sm:pr-10" : "",
            inputSizeStyles[inputSize],
            className
          )}
          {...props}
        />

        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
            tabIndex={-1}
            aria-label="Effacer le contenu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {!showClear && rightIcon && (
          <div className="absolute right-3 sm:right-3.5 flex items-center justify-center text-gray-400 pointer-events-none shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
