import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error" | "neutral";

export interface AlertProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; title: string }
> = {
  info: {
    container: "bg-forest-50/80 border-forest-200/90 text-forest-900",
    icon: "text-forest-700",
    title: "text-forest-950",
  },
  success: {
    container: "bg-emerald-50/80 border-emerald-200/90 text-emerald-900",
    icon: "text-emerald-600",
    title: "text-emerald-950",
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200/90 text-amber-900",
    icon: "text-amber-600",
    title: "text-amber-950",
  },
  error: {
    container: "bg-rose-50/80 border-rose-200/90 text-rose-900",
    icon: "text-rose-600",
    title: "text-rose-950",
  },
  neutral: {
    container: "bg-gray-50 border-gray-200/90 text-gray-800",
    icon: "text-gray-500",
    title: "text-gray-950",
  },
};

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle2 className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  neutral: <Info className="w-5 h-5" />,
};

export function Alert({
  variant = "info",
  title,
  children,
  icon,
  action,
  onDismiss,
  className,
}: AlertProps) {
  const styles = variantStyles[variant];
  const renderedIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border p-3.5 sm:p-4 flex items-start gap-3 transition-all duration-150",
        styles.container,
        className
      )}
    >
      {renderedIcon && (
        <div className={cn("mt-0.5 shrink-0", styles.icon)}>
          {renderedIcon}
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <h4
            className={cn(
              "text-xs sm:text-sm font-semibold tracking-tight leading-snug",
              styles.title
            )}
          >
            {title}
          </h4>
        )}
        <div className="text-xs sm:text-sm leading-relaxed opacity-95">
          {children}
        </div>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 -mr-1 -mt-1 opacity-70 hover:opacity-100 rounded-lg transition-opacity shrink-0"
          aria-label="Fermer l'alerte"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
