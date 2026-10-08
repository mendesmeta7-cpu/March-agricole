"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Search, Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
  badge?: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string }; currentTarget: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean | string;
  selectSize?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  className?: string;
  menuClassName?: string;
}

const selectSizeStyles = {
  sm: "py-1.5 px-3 text-xs rounded-lg min-h-[34px]",
  md: "py-2.5 px-3.5 text-sm rounded-xl min-h-[42px]",
  lg: "py-3 px-4 text-base rounded-2xl min-h-[48px]",
};

/**
 * Palette de couleurs harmonieuse pour les badges de catégories agricoles
 */
function getBadgeColor(badge?: string): string {
  if (!badge) return "bg-gray-100 text-gray-700 border-gray-200";
  const b = badge.toLowerCase();
  if (b.includes("légume")) return "bg-emerald-50 text-emerald-800 border-emerald-200/80";
  if (b.includes("fruit")) return "bg-amber-50 text-amber-800 border-amber-200/80";
  if (b.includes("céréale") || b.includes("grain")) return "bg-orange-50 text-orange-800 border-orange-200/80";
  if (b.includes("tubercule") || b.includes("racine")) return "bg-stone-100 text-stone-800 border-stone-200";
  if (b.includes("épice") || b.includes("aromate")) return "bg-purple-50 text-purple-800 border-purple-200/80";
  if (b.includes("légumineuse")) return "bg-teal-50 text-teal-800 border-teal-200/80";
  return "bg-forest-50 text-forest-800 border-forest-200/80";
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      id,
      name,
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      options: optionsProp,
      children,
      placeholder = "Sélectionner...",
      searchPlaceholder = "Rechercher...",
      searchable,
      clearable = false,
      disabled = false,
      required = false,
      error,
      selectSize = "md",
      leftIcon,
      className,
      menuClassName,
    },
    ref
  ) => {
    // 1. Extraction tolérante des options (soit via prop options, soit via children <option>)
    const parsedOptions = useMemo<SelectOption[]>(() => {
      if (optionsProp && Array.isArray(optionsProp)) {
        return optionsProp.map((opt) => {
          let label = opt.label;
          let badge = opt.badge;

          // Détection automatique de motifs comme "Nom — [Catégorie : X]"
          if (!badge && typeof label === "string") {
            const match = label.match(/^(.*?)\s*—\s*\[Catégorie\s*:\s*(.*?)\]$/);
            if (match) {
              label = match[1].trim();
              badge = match[2].trim();
            }
          }

          return {
            ...opt,
            label,
            badge,
          };
        });
      }

      if (children) {
        const extracted: SelectOption[] = [];
        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child) && child.type === "option") {
            const val = child.props.value !== undefined ? child.props.value : child.props.children;
            let label = String(child.props.children || val || "");
            let badge: string | undefined = undefined;

            const match = label.match(/^(.*?)\s*—\s*\[Catégorie\s*:\s*(.*?)\]$/);
            if (match) {
              label = match[1].trim();
              badge = match[2].trim();
            }

            extracted.push({
              value: val,
              label,
              badge,
              disabled: Boolean(child.props.disabled),
            });
          }
        });
        return extracted;
      }

      return [];
    }, [optionsProp, children]);

    // 2. Gestion de l'état (contrôlé vs non-contrôlé)
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string | number>(() => {
      if (isControlled) return controlledValue;
      if (defaultValue !== undefined) return defaultValue;
      return "";
    });

    const currentValue = isControlled ? controlledValue : internalValue;

    // 3. États d'ouverture et de recherche
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Détermination automatique du mode recherche (activé si > 5 options ou si forcé)
    const isSearchable = searchable !== undefined ? searchable : parsedOptions.length > 5;

    // Option actuellement sélectionnée
    const selectedOption = useMemo(() => {
      return parsedOptions.find((opt) => String(opt.value) === String(currentValue));
    }, [parsedOptions, currentValue]);

    // Filtrage des options selon la recherche
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return parsedOptions;
      const q = searchQuery.toLowerCase().trim();
      return parsedOptions.filter((opt) => {
        const matchLabel = opt.label.toLowerCase().includes(q);
        const matchBadge = opt.badge?.toLowerCase().includes(q);
        const matchDesc = opt.description?.toLowerCase().includes(q);
        return matchLabel || matchBadge || matchDesc;
      });
    }, [parsedOptions, searchQuery]);

    // Émission du changement vers les gestionnaires externes
    const emitChange = useCallback(
      (newVal: string) => {
        if (!isControlled) {
          setInternalValue(newVal);
        }

        if (onValueChange) {
          onValueChange(newVal);
        }

        if (onChange) {
          const syntheticEvent = {
            target: { value: newVal, name: name || "" },
            currentTarget: { value: newVal, name: name || "" },
          };
          onChange(syntheticEvent as any);
        }
      },
      [isControlled, name, onChange, onValueChange]
    );

    const handleSelectOption = (opt: SelectOption) => {
      if (opt.disabled) return;
      emitChange(String(opt.value));
      setIsOpen(false);
      setSearchQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      emitChange("");
      setSearchQuery("");
    };

    // Fermeture lors d'un clic extérieur
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery("");
        }
      };
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Fermeture avec Échap et gestion focus
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === "Escape") {
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleSelectOption(filteredOptions[highlightedIndex]);
          }
        }
      };

      if (isOpen) {
        window.addEventListener("keydown", handleKeyDown);
      }
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filteredOptions, highlightedIndex]);

    // Autofocus sur le champ de recherche à l'ouverture
    useEffect(() => {
      if (isOpen && isSearchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
      setHighlightedIndex(0);
    }, [isOpen, isSearchable]);

    const hasError = Boolean(error);

    return (
      <div
        ref={containerRef}
        className="relative w-full select-none"
        data-select-id={id || name}
      >
        {/* Champ masqué pour intégration native aux formulaires / FormData */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={String(currentValue ?? "")}
          />
        )}

        {/* Input invisible pour validation native `required` */}
        <select
          name={name ? `_native_${name}` : undefined}
          value={String(currentValue ?? "")}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none"
          onChange={() => {}}
        >
          <option value="">{placeholder}</option>
          {parsedOptions.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Bouton Trigger interactif moderne Radiza */}
        <div
          ref={ref}
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className={cn(
            "w-full bg-white border cursor-pointer transition-all duration-150 ease-out flex items-center justify-between gap-2 text-left",
            "focus:outline-hidden focus:ring-2 focus:ring-offset-0",
            disabled && "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200",
            hasError
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-950"
              : isOpen
              ? "border-forest-600 ring-2 ring-forest-600/20 shadow-xs"
              : "border-gray-300 hover:border-gray-400 focus:border-forest-600 focus:ring-forest-600/20",
            selectSizeStyles[selectSize],
            className
          )}
        >
          {/* Côté gauche : Icône + Libellé sélectionné + Badge éventuel */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            {leftIcon && (
              <div className="text-gray-400 shrink-0 flex items-center justify-center">
                {leftIcon}
              </div>
            )}

            {selectedOption ? (
              <div className="flex items-center gap-2 min-w-0 truncate">
                {selectedOption.icon && (
                  <span className="shrink-0">{selectedOption.icon}</span>
                )}
                <span className="font-semibold text-gray-900 truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                      getBadgeColor(selectedOption.badge)
                    )}
                  >
                    {selectedOption.badge}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-400 font-normal truncate">
                {placeholder}
              </span>
            )}
          </div>

          {/* Côté droit : Bouton vider + Flèche animée */}
          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {clearable && currentValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Effacer la sélection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isOpen && "rotate-180 text-forest-700"
              )}
            />
          </div>
        </div>

        {/* Menu Déroulant Flottant Moderne (Custom Popover) */}
        {isOpen && (
          <div
            className={cn(
              "absolute top-full mt-1.5 left-0 right-0 z-50 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden",
              "animate-in fade-in zoom-in-95 duration-150 origin-top",
              menuClassName
            )}
          >
            {/* Barre de recherche intégrée si beaucoup d'options */}
            {isSearchable && (
              <div className="p-2 border-b border-gray-100 bg-gray-50/70 sticky top-0 z-10 backdrop-blur-xs">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-forest-600/30 focus:border-forest-600 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Liste scrollable des options */}
            <div
              ref={listRef}
              role="listbox"
              className="max-h-60 sm:max-h-72 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain"
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-gray-500 space-y-1">
                  <AlertCircle className="w-5 h-5 text-gray-400 mx-auto" />
                  <p className="font-medium text-gray-700">Aucun résultat trouvé</p>
                  {searchQuery && (
                    <p className="text-[11px] text-gray-400">
                      Aucune option pour &ldquo;{searchQuery}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = String(opt.value) === String(currentValue);
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={String(opt.value)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      onClick={() => handleSelectOption(opt)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "px-3 py-2 sm:py-2.5 rounded-xl cursor-pointer text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-colors",
                        opt.disabled
                          ? "opacity-50 cursor-not-allowed text-gray-400"
                          : isSelected
                          ? "bg-forest-100 text-forest-950 font-bold"
                          : isHighlighted
                          ? "bg-forest-50/80 text-forest-900"
                          : "text-gray-800 hover:bg-gray-50 hover:text-gray-950"
                      )}
                    >
                      {/* Libellé + Icône + Description */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {opt.icon && (
                          <span className="shrink-0 text-gray-500">{opt.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate">{opt.label}</span>
                            {opt.badge && (
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.2 rounded-full border shrink-0",
                                  getBadgeColor(opt.badge)
                                )}
                              >
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.description && (
                            <p className="text-[11px] text-gray-500 font-normal truncate mt-0.5">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Indicateur de sélection */}
                      {isSelected && (
                        <Check className="w-4 h-4 text-forest-700 shrink-0 font-black" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
