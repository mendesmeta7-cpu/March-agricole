"use client";

/**
 * DashboardAlertCard — Carte d'informations dynamiques (Prompt 6)
 *
 * Affiche les alertes opérationnelles de l'exploitation dans la bannière verte du
 * dashboard Société. Si plusieurs alertes existent, elles se succèdent en rotation
 * douce toutes les 4 secondes. La rotation est désactivée si l'utilisateur a activé
 * "prefers-reduced-motion". Les points de navigation permettent toujours une
 * consultation manuelle.
 *
 * Règles :
 * - Aucune donnée fictive : toutes les alertes proviennent de props calculés côté serveur.
 * - Une campagne expirée ne génère jamais d'alerte "se termine bientôt".
 * - Le message neutre n'apparaît que si le tableau d'alertes est vide.
 * - Pas de clignotement, pas d'animation intrusive.
 * - Transitions CSS opacity uniquement (pas de transform pour éviter le motion sickness).
 */

import { useState, useEffect, useCallback } from "react";
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
  /** Lien optionnel — rend le texte du message cliquable */
  href?: string;
}

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
  const [currentIndex, setCurrentIndex] = useState(0);
  // `fading` contrôle l'opacité pendant la transition sortante (200 ms)
  const [fading, setFading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Détection initiale + écoute des changements de préférence système
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Transition vers un index donné
  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex === currentIndex || alerts.length <= 1) return;
      if (prefersReducedMotion) {
        // Sans animation : bascule immédiate
        setCurrentIndex(nextIndex);
        return;
      }
      setFading(true);
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setFading(false);
      }, 200);
    },
    [currentIndex, alerts.length, prefersReducedMotion]
  );

  const goToNext = useCallback(() => {
    goTo((currentIndex + 1) % alerts.length);
  }, [goTo, currentIndex, alerts.length]);

  // Rotation automatique toutes les 4 s (désactivée si reduced motion)
  useEffect(() => {
    if (prefersReducedMotion || alerts.length <= 1) return;
    const timer = setInterval(goToNext, 4000);
    return () => clearInterval(timer);
  }, [goToNext, prefersReducedMotion, alerts.length]);

  if (alerts.length === 0) return null;

  const alert = alerts[currentIndex];
  const { Icon, containerClass, iconClass } = CONFIG[alert.type];

  // Classe d'opacité (transition CSS pure, pas de JS pour le rendu)
  const opacityClass = prefersReducedMotion
    ? "opacity-100"
    : `transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`;

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-sm ${containerClass} ${opacityClass}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Icône contextuelle */}
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />

      {/* Message — cliquable si href fourni */}
      {alert.href ? (
        <Link
          href={alert.href}
          className="text-xs font-medium leading-snug flex-1 hover:underline underline-offset-2 decoration-current/40"
        >
          {alert.message}
        </Link>
      ) : (
        <span className="text-xs font-medium leading-snug flex-1">
          {alert.message}
        </span>
      )}

      {/* Points de navigation (visibles uniquement si >= 2 alertes) */}
      {alerts.length > 1 && (
        <div
          className="flex items-center gap-1 ml-1 shrink-0"
          aria-label="Navigation entre les alertes"
        >
          {alerts.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goTo(idx)}
              aria-label={`Afficher l'alerte ${idx + 1} sur ${alerts.length}`}
              aria-current={idx === currentIndex ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                idx === currentIndex
                  ? "bg-white w-3"
                  : "bg-white/40 w-1.5 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
