"use client";

import { useState, useTransition } from "react";
import { NotificationItem, NotificationType } from "@/lib/queries/notifications";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/lib/actions/notifications";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import {
  Bell,
  CheckCheck,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  userRole?: "reseller" | "company" | "admin";
}

export default function NotificationsView({
  initialNotifications,
  userRole = "reseller",
}: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<"ALL" | NotificationType>("ALL");
  const [isPending, startTransition] = useTransition();

  const handleMarkAsRead = (notifId: string) => {
    startTransition(async () => {
      const res = await markNotificationAsReadAction(notifId);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        const now = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
      }
    });
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === "ALL") return true;
    return notif.type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "DEMANDE_REPONSE":
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case "CAMPAGNE_OUVERTE":
        return <Megaphone className="w-5 h-5 text-amber-600" />;
      case "COMMANDE_CREEE":
        return <ShoppingBag className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTargetUrl = (notif: NotificationItem) => {
    if (notif.action_url) return notif.action_url;
    switch (notif.type) {
      case "DEMANDE_REPONSE":
        return userRole === "reseller"
          ? "/dashboard/reseller/demands"
          : "/dashboard/company/demands";
      case "CAMPAGNE_OUVERTE":
        return "/dashboard/reseller/campaigns";
      case "COMMANDE_CREEE":
        return userRole === "reseller"
          ? "/dashboard/reseller/orders"
          : "/dashboard/company/orders";
      default:
        return "/dashboard/reseller";
    }
  };

  const getActionLabel = (notif: NotificationItem) => {
    switch (notif.type) {
      case "DEMANDE_REPONSE":
        return "Consulter la proposition";
      case "CAMPAGNE_OUVERTE":
        return "Découvrir l'offre";
      case "COMMANDE_CREEE":
        return "Détails de la commande";
      default:
        return "Consulter";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <PageHeader
        title="Centre de Notifications"
        description="Suivez en temps réel les propositions reçues, les ouvertures de campagnes commerciales et vos commandes."
        action={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              Tout marquer comme lu ({unreadCount})
            </button>
          ) : undefined
        }
      />

      {/* Barre de filtres par type */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === "ALL"
              ? "bg-earth-800 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Toutes ({notifications.length})
        </button>

        <button
          onClick={() => setActiveFilter("DEMANDE_REPONSE")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "DEMANDE_REPONSE"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Propositions & Demandes
        </button>

        <button
          onClick={() => setActiveFilter("CAMPAGNE_OUVERTE")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "CAMPAGNE_OUVERTE"
              ? "bg-amber-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          Nouvelles Campagnes
        </button>

        <button
          onClick={() => setActiveFilter("COMMANDE_CREEE")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "COMMANDE_CREEE"
              ? "bg-blue-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Commandes
        </button>
      </div>

      {/* Liste des notifications ou état vide */}
      {notifications.length === 0 ? (
        <EmptyState
          title="Aucune notification pour le moment"
          description="Vous recevrez ici des alertes immédiates dès qu'un producteur répond à l'une de vos demandes, ouvre une campagne commerciale ou confirme une commande."
          icon={<Bell className="w-8 h-8 text-gray-400" />}
        />
      ) : filteredNotifications.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <p className="text-xs text-gray-600 font-medium">
            Aucune notification dans cette catégorie.
          </p>
          <button
            onClick={() => setActiveFilter("ALL")}
            className="text-xs font-semibold text-earth-700 underline"
          >
            Afficher toutes les notifications
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isRead = Boolean(notif.read_at);
            const targetUrl = getTargetUrl(notif);
            const actionLabel = getActionLabel(notif);

            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isRead
                    ? "bg-white border-gray-100 hover:border-gray-200"
                    : "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isRead ? "bg-gray-100" : "bg-white shadow-2xs"
                    }`}
                  >
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-xs sm:text-sm truncate ${
                          isRead ? "font-semibold text-gray-800" : "font-bold text-gray-950"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                    <span className="text-[11px] text-gray-400 block pt-0.5">
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id)}
                      disabled={isPending}
                      title="Marquer comme lu"
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Marquer lu
                    </button>
                  )}

                  <Link
                    href={targetUrl}
                    onClick={() => {
                      if (!isRead) handleMarkAsRead(notif.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-earth-800 hover:bg-earth-900 text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>{actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
