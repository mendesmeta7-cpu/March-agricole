"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Onglets accessibles (Lot UX/UI 6B, fiche A11-08).
 *
 * Modèle « tablist » du WAI-ARIA :
 * - chaque onglet est relié à son panneau (`aria-controls` / `aria-labelledby`, voir `TabPanel`) ;
 * - un seul onglet est atteignable par Tab (tabulation itinérante), les flèches gauche/droite
 *   (et haut/bas) passent à l'onglet voisin, Début et Fin au premier et au dernier ;
 * - l'onglet qui reçoit le focus est aussi activé (activation automatique) ;
 * - disposition `wrap` par défaut : les onglets passent à la ligne au lieu d'être masqués
 *   hors de l'écran ; `scroll` garde l'ancien défilement horizontal ; `grid` (Lot 7, D6) : grille
 *   de 2 colonnes sous 640 px (4 onglets sur 2 lignes, aucun masqué), ligne simple au-delà ;
 * - cible de 44 px minimum sous 640 px (décision D9).
 */

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
  /** Préfixe commun aux identifiants des onglets et des panneaux (voir `TabPanel`). */
  idBase: string;
  /** Nom de la liste d'onglets, annoncé par les lecteurs d'écran. */
  ariaLabel: string;
  /** `ghost` : onglet actif plein, onglets inactifs sans bordure (profil Société). */
  variant?: "pills" | "underline" | "cards" | "ghost";
  size?: "sm" | "md";
  layout?: "wrap" | "scroll" | "grid";
  className?: string;
}

export const tabElementId = (idBase: string, id: string) => `${idBase}-onglet-${id}`;
export const tabPanelElementId = (idBase: string, id: string) => `${idBase}-panneau-${id}`;

export function Tabs({
  tabs,
  activeTab,
  onChange,
  idBase,
  ariaLabel,
  variant = "pills",
  size = "md",
  layout = "wrap",
  className,
}: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isPills = variant === "pills";
  const isUnderline = variant === "underline";
  const isCards = variant === "cards";
  const isGhost = variant === "ghost";
  const filled = isPills || isGhost;
  const enabled = tabs.filter((t) => !t.disabled);
  const isGrid = layout === "grid";

  function select(id: string) {
    onChange(id);
    refs.current[id]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, currentId: string) {
    if (enabled.length === 0) return;
    const index = enabled.findIndex((t) => t.id === currentId);
    let next: TabItem | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = enabled[(index + 1) % enabled.length];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = enabled[(index - 1 + enabled.length) % enabled.length];
        break;
      case "Home":
        next = enabled[0];
        break;
      case "End":
        next = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next) select(next.id);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cn(
        "gap-1.5 select-none",
        isGrid
          ? "grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center"
          : cn("flex items-center", layout === "wrap" ? "flex-wrap" : "overflow-x-auto no-scrollbar"),
        isUnderline && "border-b border-gray-200/80 gap-x-6",
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
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={tabElementId(idBase, tab.id)}
            // Seul le panneau actif existe dans la page (voir TabPanel)
            aria-controls={isActive ? tabPanelElementId(idBase, tab.id) : undefined}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={cn(
              "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-150 ease-out shrink-0 max-sm:min-h-11",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2",
              // Grille mobile : le libellé peut passer sur 2 lignes plutôt que de déborder de sa case
              isGrid && "max-sm:whitespace-normal max-sm:leading-tight max-sm:text-center max-sm:px-2 max-sm:gap-1.5 min-w-0",
              size === "sm"
                ? "text-xs py-1.5 px-3 rounded-xl"
                : "text-xs sm:text-sm py-2 px-3.5 rounded-xl",
              isDisabled && "opacity-40 cursor-not-allowed",

              // Style Pills
              isPills &&
                (isActive
                  ? "bg-forest-700 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:text-gray-950 hover:bg-gray-100 border border-gray-200/80"),

              // Style Ghost (sm:py-2.5 : 40 px de haut sur ordinateur, comme la barre d'origine du profil)
              isGhost &&
                cn(
                  "font-bold sm:py-2.5",
                  isActive
                    ? "bg-forest-800 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                ),

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
                aria-hidden="true"
                className={cn(
                  "shrink-0",
                  isActive && filled ? "text-white" : isGhost ? "text-current" : "text-gray-500"
                )}
              >
                {tab.icon}
              </span>
            )}

            <span>{tab.label}</span>

            {tab.count !== undefined && (
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0",
                  isActive && filled
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
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

export interface TabPanelProps {
  idBase: string;
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

/** Panneau relié à son onglet ; seul le panneau actif est rendu. */
export function TabPanel({ idBase, tabId, activeTab, children, className }: TabPanelProps) {
  if (activeTab !== tabId) return null;
  return (
    <div
      role="tabpanel"
      id={tabPanelElementId(idBase, tabId)}
      aria-labelledby={tabElementId(idBase, tabId)}
      tabIndex={0}
      className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 rounded-3xl", className)}
    >
      {children}
    </div>
  );
}

export default Tabs;
