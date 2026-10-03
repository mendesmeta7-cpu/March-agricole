import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "earth"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-forest-700 hover:bg-forest-800 text-white shadow-xs hover:shadow-md focus-visible:ring-forest-600 border border-forest-800/30",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/90 focus-visible:ring-slate-400",
  earth:
    "bg-earth-600 hover:bg-earth-700 text-white shadow-xs hover:shadow-md focus-visible:ring-earth-600 border border-earth-700/30",
  outline:
    "border border-gray-300/90 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 shadow-2xs focus-visible:ring-forest-600",
  ghost:
    "text-gray-700 hover:text-gray-950 hover:bg-gray-100/80 focus-visible:ring-gray-400",
  destructive:
    "bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow-md focus-visible:ring-rose-500 border border-rose-700/30",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md focus-visible:ring-emerald-500 border border-emerald-700/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs rounded-lg gap-1.5",
  sm: "px-3 py-1.5 text-xs sm:text-sm rounded-xl gap-1.5",
  md: "px-4 py-2.5 text-sm font-medium rounded-xl gap-2",
  lg: "px-5 py-3 text-base font-semibold rounded-2xl gap-2.5",
  icon: "p-2 sm:p-2.5 rounded-xl aspect-square flex items-center justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "motion-safe:active:scale-[0.98] transition-all duration-150 ease-out",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
