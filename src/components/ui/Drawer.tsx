"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "./useFocusTrap";

export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";
export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  side?: DrawerSide;
  isDismissable?: boolean;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

const sizeWidthStyles: Record<DrawerSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  full: "sm:max-w-full",
};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  side = "right",
  isDismissable = true,
  showCloseButton = true,
  className,
  bodyClassName,
  footerClassName,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // A11Y-03 : focus initial, piège Tab/Maj+Tab, Échap (surface la plus haute
  // uniquement) et restauration du focus vers le déclencheur à la fermeture.
  useFocusTrap(panelRef, {
    isOpen,
    onEscape: onClose,
    escapeEnabled: isDismissable,
  });

  // Verrouillage du scroll arrière-plan
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isBottom = side === "bottom";
  const isLeft = side === "left";

  return (
    <div
      className="fixed inset-0 z-50 flex overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Backdrop sombre avec flou doux */}
      <div
        className="fixed inset-0 bg-gray-950/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
        onClick={() => isDismissable && onClose()}
        aria-hidden="true"
      />

      {/* Conteneur de positionnement */}
      <div
        className={cn(
          "relative z-10 flex w-full h-full pointer-events-none",
          isBottom
            ? "items-end justify-center"
            : isLeft
            ? "items-stretch justify-start"
            : "items-stretch justify-end"
        )}
      >
        {/* Panneau du Drawer */}
        <div
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            "pointer-events-auto focus:outline-none flex flex-col bg-white shadow-2xl border-gray-200/90 w-full transition-all ease-out",
            isBottom
              ? "max-h-[92vh] rounded-t-3xl border-t animate-slide-in-up"
              : isLeft
              ? "h-full border-r animate-fade-in-left " + sizeWidthStyles[size]
              : "h-full border-l animate-slide-in-right " + sizeWidthStyles[size],
            className
          )}
        >
          {/* Poignée de glissement pour mobile (Bottom sheet) */}
          {isBottom && (
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-gray-300/80" />
            </div>
          )}

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
                    <h2 id={titleId} className="text-base sm:text-lg font-bold text-gray-950 truncate tracking-tight">
                      {title}
                    </h2>
                  ) : title ? (
                    <div id={titleId} className="contents">
                      {title}
                    </div>
                  ) : null}
                </div>
                {description && (
                  <p id={descriptionId} className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 sm:p-2 -mr-1.5 -mt-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                  aria-label="Fermer le panneau"
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
    </div>
  );
}

export default Drawer;
