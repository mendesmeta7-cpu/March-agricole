"use client";

import Link from "next/link";
import {
  AlertCircle,
  TrendingUp,
  ShoppingBag,
  Megaphone,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

export interface PendingActionItem {
  id: string;
  type: "unanswered_demand" | "pending_order" | "critical_campaign";
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant: "warning" | "danger" | "forest";
  href: string;
  date?: string;
}

export interface CompanyPendingActionsProps {
  actions: PendingActionItem[];
}

export default function CompanyPendingActions({
  actions,
}: CompanyPendingActionsProps) {
  const hasActions = actions.length > 0;

  return (
    <section className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-4 transition-all">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              hasActions
                ? "bg-amber-100 text-amber-900 ring-4 ring-amber-50"
                : "bg-emerald-100 text-emerald-900 ring-4 ring-emerald-50"
            }`}
          >
            {hasActions ? (
              <AlertCircle className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-950">
                Actions Requérant une Attention
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              {hasActions
                ? "Demandes d'acheteurs en attente de réponse et commandes à traiter."
                : "Suivi opérationnel en direct de votre exploitation."}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          {hasActions ? (
            <Badge variant="warning" size="sm">
              {actions.length} action{actions.length > 1 ? "s" : ""} requise{actions.length > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge
              variant="success"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Toutes opérations à jour
            </Badge>
          )}
        </div>
      </div>

      {/* État vide soigné (aucune action urgente) */}
      {!hasActions ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Aucune action urgente en attente
              </h4>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Toutes les demandes ont reçu une réponse, aucune commande n&apos;est en attente de confirmation et vos offres sont à jour.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/company/demands"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1.5 shrink-0 self-end sm:self-center group"
          >
            <span>Explorer le marché</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      ) : (
        /* Grille des actions en attente */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {actions.map((act) => {
            const Icon =
              act.type === "unanswered_demand"
                ? TrendingUp
                : act.type === "pending_order"
                ? ShoppingBag
                : Megaphone;

            const iconTheme =
              act.type === "unanswered_demand"
                ? "bg-amber-100 text-amber-900 group-hover:bg-amber-200"
                : act.type === "pending_order"
                ? "bg-blue-100 text-blue-900 group-hover:bg-blue-200"
                : "bg-rose-100 text-rose-900 group-hover:bg-rose-200";

            return (
              <Link
                key={act.id}
                href={act.href}
                className="group relative p-4 rounded-2xl border border-gray-200/70 hover:border-forest-300 bg-gray-50/50 hover:bg-white hover:shadow-xs transition-all flex items-start justify-between gap-3 overflow-hidden"
              >
                {/* Accent bar sur le bord gauche */}
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    act.badgeVariant === "danger"
                      ? "bg-rose-500"
                      : act.badgeVariant === "warning"
                      ? "bg-amber-500"
                      : "bg-forest-600"
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-start gap-3 min-w-0 pl-1.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${iconTheme}`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-950 truncate group-hover:text-forest-900 transition-colors">
                      {act.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                      {act.subtitle}
                    </p>

                    <div className="flex items-center gap-2 mt-2.5">
                      <Badge variant={act.badgeVariant} size="sm">
                        {act.badgeText}
                      </Badge>
                      {act.date && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          {act.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-forest-50 flex items-center justify-center text-gray-400 group-hover:text-forest-700 transition-all shrink-0 mt-1 self-start">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
