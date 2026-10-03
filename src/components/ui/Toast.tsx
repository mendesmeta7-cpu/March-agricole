"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
  toast: {
    (title: string, options?: ToastOptions & { type?: ToastType }): string;
    success: (title: string, options?: ToastOptions | string) => string;
    error: (title: string, options?: ToastOptions | string) => string;
    warning: (title: string, options?: ToastOptions | string) => string;
    info: (title: string, options?: ToastOptions | string) => string;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", title, description, duration = 4000, action }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, description, duration, action };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Garder au maximum 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const toast = useMemo(() => {
    const fn = (title: string, options?: ToastOptions & { type?: ToastType }) => {
      return showToast({
        title,
        type: options?.type || "info",
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
      });
    };

    fn.success = (title: string, options?: ToastOptions | string) => {
      const opts = typeof options === "string" ? { description: options } : options;
      return showToast({
        title,
        type: "success",
        description: opts?.description,
        duration: opts?.duration,
        action: opts?.action,
      });
    };

    fn.error = (title: string, options?: ToastOptions | string) => {
      const opts = typeof options === "string" ? { description: options } : options;
      return showToast({
        title,
        type: "error",
        description: opts?.description,
        duration: opts?.duration ?? 5000,
        action: opts?.action,
      });
    };

    fn.warning = (title: string, options?: ToastOptions | string) => {
      const opts = typeof options === "string" ? { description: options } : options;
      return showToast({
        title,
        type: "warning",
        description: opts?.description,
        duration: opts?.duration,
        action: opts?.action,
      });
    };

    fn.info = (title: string, options?: ToastOptions | string) => {
      const opts = typeof options === "string" ? { description: options } : options;
      return showToast({
        title,
        type: "info",
        description: opts?.description,
        duration: opts?.duration,
        action: opts?.action,
      });
    };

    return fn;
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast doit être utilisé à l'intérieur d'un ToastProvider");
  }
  return context;
}

// -------------------------------------------------------------
// Conteneur et carte de Toast
// -------------------------------------------------------------

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[100] flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-forest-700 shrink-0" />,
  };

  const borderMap = {
    success: "border-emerald-200 bg-white",
    error: "border-rose-200 bg-white",
    warning: "border-amber-200 bg-white",
    info: "border-forest-200 bg-white",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-2xl border p-3.5 sm:p-4 shadow-xl flex items-start gap-3 transition-all duration-200",
        "animate-slide-in-up sm:animate-slide-in-down",
        borderMap[toast.type]
      )}
      role="status"
    >
      <div className="mt-0.5">{iconMap[toast.type]}</div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 tracking-tight leading-snug">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors shrink-0"
        aria-label="Fermer la notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastProvider;
