"use client";

/**
 * DashboardAlertCard — Alertes opérationnelles du tableau de bord Société
 *
 * Affiche les alertes de la société dans la bannière verte du tableau de bord.
 *
 * Lot UX/UI 6B (fiche A11-09, décision D3) : les alertes ne tournent plus. Elles forment une
 * liste statique : les trois premières sont visibles, les suivantes s'affichent avec un bouton.
 * Rien ne disparaît seul, aucune minuterie, aucune animation : le réglage « mouvement réduit »
 * est respecté par construction.
 *
 * Règles :
 * - Aucune donnée fictive : toutes les alertes proviennent de props calculés côté serveur.
 * - Une campagne expirée ne génère jamais d'alerte "se termine bientôt".
 * - Le message neutre n'apparaît que si le tableau d'alertes est vide.
 */

import { useId, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Megaphone, Clock, Sparkles } from "lucide-react";

// ─── Types exportés ────────────────────────────────────────────────────────────

export type DashboardAlertType =
  | "pending_orders"
  | "campaign_ending"
  | "destination_deadline"
  | "active_campaigns"
  | "welcome";

export interface DashboardAlert {
  id: string;
  type: DashboardAlertType;
  message: string;
  /** Lien optionnel — rend l'alerte cliquable */
  href?: string;
}

/** Nombre d'alertes visibles avant le bouton « Afficher … » (décision D3). */
export const VISIBLE_ALERTS = 3;

// ─── Configuration visuelle par type ──────────────────────────────────────────

const CONFIG: Record<
  DashboardAlertType,
  {
    Icon: React.ElementType;
    containerClass: string;
    iconClass: string;
  }
> = {
  pending_orders: {
    Icon: ShoppingBag,
    containerClass: "bg-amber-500/20 border-amber-400/30 text-amber-100",
    iconClass: "text-amber-300",
  },
  campaign_ending: {
    Icon: Clock,
    containerClass: "bg-orange-500/15 border-orange-400/30 text-orange-100",
    iconClass: "text-orange-300",
  },
  destination_deadline: {
    Icon: Clock,
    containerClass: "bg-orange-500/15 border-orange-400/30 text-orange-100",
    iconClass: "text-orange-300",
  },
  active_campaigns: {
    Icon: Megaphone,
    containerClass: "bg-emerald-500/15 border-emerald-400/30 text-emerald-100",
    iconClass: "text-emerald-300",
  },
  welcome: {
    Icon: Sparkles,
    containerClass: "bg-white/10 border-white/15 text-forest-100",
    iconClass: "text-emerald-300",
  },
};

// ─── Composant principal ───────────────────────────────────────────────────────

interface DashboardAlertCardProps {
  alerts: DashboardAlert[];
}

export default function DashboardAlertCard({ alerts }: DashboardAlertCardProps) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();

  if (alerts.length === 0) return null;

  const hiddenCount = Math.max(0, alerts.length - VISIBLE_ALERTS);
  const shown = showAll ? alerts : alerts.slice(0, VISIBLE_ALERTS);

  return (
    <div className="space-y-1.5">
      <ul id={listId} aria-label="Alertes de la société" className="space-y-1.5">
        {shown.map((alert) => {
          const { Icon, containerClass, iconClass } = CONFIG[alert.type];
          const rowClass = `flex items-center gap-2.5 px-3.5 py-2.5 max-sm:min-h-11 rounded-xl border backdrop-blur-sm ${containerClass}`;
          const content = (
            <>
              <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
              <span className="text-xs font-medium leading-snug flex-1">{alert.message}</span>
            </>
          );
          return (
            <li key={alert.id}>
              {alert.href ? (
                <Link
                  href={alert.href}
                  className={`${rowClass} hover:underline underline-offset-2 decoration-[color:color-mix(in_srgb,currentColor_40%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                >
                  {content}
                </Link>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          aria-controls={listId}
          className="inline-flex items-center min-h-11 px-1 text-xs font-semibold text-emerald-200 hover:text-white underline underline-offset-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {showAll
            ? "Afficher moins d'alertes"
            : hiddenCount === 1
            ? "Afficher l'autre alerte"
            : `Afficher les ${hiddenCount} autres alertes`}
        </button>
      )}
    </div>
  );
}
