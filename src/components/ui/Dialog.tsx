"use client";

import React, { useEffect, useCallback } from "react";
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "./Button";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DialogSize;
  isDismissable?: boolean;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

const sizeWidthStyles: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl sm:max-w-2xl",
  "2xl": "max-w-xl sm:max-w-3xl",
  full: "max-w-5xl",
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  isDismissable = true,
  showCloseButton = true,
  className,
  bodyClassName,
  footerClassName,
}: DialogProps) {
  // Gestion de la touche Échap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDismissable) {
        onClose();
      }
    },
    [isDismissable, onClose]
  );

  // Verrouillage du scroll arrière-plan
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop sombre avec flou doux */}
      <div
        className="fixed inset-0 bg-gray-950/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
        onClick={() => isDismissable && onClose()}
        aria-hidden="true"
      />

      {/* Conteneur de la modale */}
      <div
        className={cn(
          "relative z-10 w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/90 overflow-hidden flex flex-col my-auto max-h-[90vh]",
          "animate-modal-pop",
          sizeWidthStyles[size],
          className
        )}
      >
        {/* En-tête */}
        {(title || showCloseButton) && (
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 bg-white">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2.5">
                {icon && (
                  <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                {typeof title === "string" ? (
                  <h2 className="text-base sm:text-lg font-bold text-gray-950 truncate tracking-tight">
                    {title}
                  </h2>
                ) : (
                  title
                )}
              </div>
              {description && (
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 -mr-1.5 -mt-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                aria-label="Fermer la boîte de dialogue"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Corps défilable */}
        <div
          className={cn(
            "flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-6 space-y-4",
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Pied de page optionnel */}
        {footer && (
          <div
            className={cn(
              "px-5 py-3.5 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50/70 shrink-0 flex items-center justify-end gap-3",
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Composant d'aide pour les dialogues de confirmation
// -------------------------------------------------------------

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "info" | "success";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "destructive",
  isLoading = false,
}: ConfirmDialogProps) {
  const iconMap = {
    destructive: <AlertTriangle className="w-5 h-5 text-rose-600" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-forest-700" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
  };

  const bgMap = {
    destructive: "bg-rose-50",
    warning: "bg-amber-50",
    info: "bg-forest-50",
    success: "bg-emerald-50",
  };

  const buttonVariant =
    variant === "destructive"
      ? "destructive"
      : variant === "success"
      ? "success"
      : variant === "warning"
      ? "earth"
      : "primary";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      isDismissable={!isLoading}
      showCloseButton={!isLoading}
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 pt-1">
        <div
          className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs",
            bgMap[variant]
          )}
        >
          {iconMap[variant]}
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-950 tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Dialog>
  );
}

export { Dialog as Modal, type DialogProps as ModalProps };
export default Dialog;
