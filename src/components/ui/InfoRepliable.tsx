import React from "react";
import { Info, ChevronDown } from "lucide-react";

type Tone = "amber" | "forest" | "earth" | "neutral";

const TONES: Record<Tone, { box: string; summary: string; icon: string; body: string }> = {
  amber: {
    box: "bg-amber-50/50 border-amber-200/80",
    summary: "text-amber-900",
    icon: "text-amber-600",
    body: "text-amber-800",
  },
  forest: {
    box: "bg-forest-50/60 border-forest-200/70",
    summary: "text-forest-900",
    icon: "text-forest-700",
    body: "text-forest-800",
  },
  earth: {
    box: "bg-earth-50/60 border-earth-200/70",
    summary: "text-earth-900",
    icon: "text-earth-700",
    body: "text-earth-800",
  },
  neutral: {
    box: "bg-gray-50 border-gray-200/80",
    summary: "text-gray-900",
    icon: "text-gray-500",
    body: "text-gray-700",
  },
};

interface InfoRepliableProps {
  /** Intitulé toujours visible (zone de 44 px) */
  summary: string;
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

/**
 * Encadré d'explication générale replié par défaut (Lot UX/UI 6B, fiches TXT-04 et NAV-06).
 * Les règles qui bloquent une action restent affichées à l'endroit où elles bloquent ;
 * seules les explications générales passent dans cet encadré. Élément natif <details> :
 * clavier (Entrée, Espace) et lecteurs d'écran pris en charge sans script.
 */
export default function InfoRepliable({ summary, children, tone = "forest", className = "" }: InfoRepliableProps) {
  const t = TONES[tone];
  return (
    <details className={`group rounded-2xl border ${t.box} ${className}`}>
      <summary
        className={`flex items-center gap-2.5 min-h-11 px-4 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-xs sm:text-sm font-semibold rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 ${t.summary}`}
      >
        <Info className={`w-4 h-4 shrink-0 ${t.icon}`} aria-hidden="true" />
        <span className="flex-1">{summary}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 ${t.icon} motion-safe:transition-transform group-open:rotate-180`}
          aria-hidden="true"
        />
      </summary>
      <div className={`px-4 pb-4 pl-[2.625rem] text-xs leading-relaxed space-y-1.5 ${t.body}`}>{children}</div>
    </details>
  );
}
