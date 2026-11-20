import React from "react";
import { X } from "lucide-react";

export interface CritereActif {
  /** Identifiant stable du critère (clé React) */
  cle: string;
  /** Nom du critère, ex. « Statut » */
  libelle: string;
  /** Valeur choisie, telle qu'affichée dans le filtre, ex. « Récoltée » */
  valeur: string;
  /** Remet ce seul critère à sa valeur par défaut */
  retirer: () => void;
}

interface FiltresActifsProps {
  criteres: CritereActif[];
  className?: string;
}

/**
 * Rappel des critères de filtre actifs quand leurs commandes sont repliées ou dans un tiroir
 * (Lot UX/UI 6B, correctif NAV-06, arbitrage C) : chaque critère reste visible, nommé et
 * retirable d'un geste. Rien n'est affiché sans critère actif.
 */
export default function FiltresActifs({ criteres, className = "" }: FiltresActifsProps) {
  if (criteres.length === 0) return null;
  return (
    <div role="group" aria-label="Filtres actifs" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {criteres.map((c) => (
        <button
          key={c.cle}
          type="button"
          onClick={c.retirer}
          aria-label={`Retirer le filtre ${c.libelle} : ${c.valeur}`}
          className="inline-flex items-center gap-1.5 max-sm:min-h-11 px-3 py-1.5 rounded-xl border border-forest-200 bg-forest-50 text-forest-900 text-xs font-semibold hover:bg-forest-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
        >
          <span>
            {c.libelle} : {c.valeur}
          </span>
          <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
