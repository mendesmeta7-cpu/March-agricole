import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "pills" | "underline" | "cards";
  size?: "sm" | "md";
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "pills",
  size = "md",
  className,
}: TabsProps) {
  const isPills = variant === "pills";
  const isUnderline = variant === "underline";
  const isCards = variant === "cards";

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none",
        isUnderline && "border-b border-gray-200/80 gap-6",
        isCards && "bg-gray-100/80 p-1 rounded-2xl gap-1 border border-gray-200/50",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = Boolean(tab.disabled);

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 font-semibold whitespace-nowrap transition-all duration-150 ease-out shrink-0",
              size === "sm"
                ? "text-xs py-1.5 px-3 rounded-xl"
                : "text-xs sm:text-sm py-2 px-3.5 rounded-xl",
              isDisabled && "opacity-40 cursor-not-allowed",

              // Style Pills
              isPills &&
                (isActive
                  ? "bg-forest-700 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:text-gray-950 hover:bg-gray-100 border border-gray-200/80"),

              // Style Underline
              isUnderline &&
                cn(
                  "rounded-none px-1 py-3 -mb-px border-b-2 font-medium",
                  isActive
                    ? "border-forest-700 text-forest-900 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                ),

              // Style Cards / Segmented
              isCards &&
                (isActive
                  ? "bg-white text-gray-950 shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900")
            )}
          >
            {tab.icon && (
              <span
                className={cn(
                  "shrink-0",
                  isActive && isPills ? "text-white" : "text-gray-500"
                )}
              >
                {tab.icon}
              </span>
            )}

            <span>{tab.label}</span>

            {tab.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0",
                  isActive && isPills
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
