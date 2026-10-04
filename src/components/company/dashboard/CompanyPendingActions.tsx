"use client";

import Link from "next/link";
import {
  AlertCircle,
  Clock,
  ShoppingBag,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
    <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-950">
              Actions Requérant une Attention Immédiate
            </h3>
            <p className="text-xs text-gray-500">
              Événements métier en attente d&apos;arbitrage ou de traitement logistique.
            </p>
          </div>
        </div>

        {hasActions ? (
          <Badge variant="warning" size="sm">
            {actions.length} action(s) requise(s)
          </Badge>
        ) : (
          <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Opérations à jour
          </Badge>
        )}
      </div>

      {!hasActions ? (
        <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 flex items-center gap-3.5 text-emerald-900">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              Aucune action urgente en attente
            </h4>
            <p className="text-xs text-emerald-800/80 mt-0.5">
              Toutes les demandes ont reçu une réponse, aucune commande n&apos;est bloquée et vos campagnes sont équilibrées.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((act) => {
            const Icon =
              act.type === "unanswered_demand"
                ? TrendingUp
                : act.type === "pending_order"
                ? ShoppingBag
                : Megaphone;

            return (
              <Link
                key={act.id}
                href={act.href}
                className="group p-4 rounded-2xl border border-gray-100 hover:border-forest-200 bg-gray-50/40 hover:bg-forest-50/20 transition-all flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      act.type === "unanswered_demand"
                        ? "bg-amber-100 text-amber-800"
                        : act.type === "pending_order"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-950 truncate group-hover:text-forest-900 transition-colors">
                        {act.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {act.subtitle}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={act.badgeVariant} size="sm">
                        {act.badgeText}
                      </Badge>
                      {act.date && (
                        <span className="text-[10px] text-gray-400">
                          {act.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-forest-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
