"use client";

import { useState, useTransition, useMemo } from "react";
import { NotificationItem, NotificationType } from "@/lib/queries/notifications";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/lib/actions/notifications";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  Bell,
  CheckCheck,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  ArrowRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Inbox,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface ResellerNotificationsViewProps {
  initialNotifications: NotificationItem[];
  unreadCount?: number;
  totalCount?: number;
}

type FilterCategory = "ALL" | "UNREAD" | "DEMANDS" | "CAMPAIGNS" | "ORDERS";

interface NotificationGroup {
  id: "TODAY" | "YESTERDAY" | "THIS_WEEK" | "OLDER";
  label: string;
  items: NotificationItem[];
}

export default function ResellerNotificationsView({
  initialNotifications,
}: ResellerNotificationsViewProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("ALL");
  const [isPending, startTransition] = useTransition();
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Synchronisation si initialNotifications change
  if (initialNotifications !== notifications && initialNotifications.length !== notifications.length) {
    setNotifications(initialNotifications);
  }

  // Marquer une notification comme lue
  const handleMarkAsRead = (notifId: string) => {
    setMarkingId(notifId);
    startTransition(async () => {
      const res = await markNotificationAsReadAction(notifId);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n))
        );
      } else {
        toast.error("Erreur", { description: res.error || "Impossible de marquer comme lue." });
      }
      setMarkingId(null);
    });
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        const now = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
        toast.success("Tout est à jour", {
          description: "Toutes vos notifications ont été marquées comme lues.",
        });
      } else {
        toast.error("Erreur", { description: res.error || "Une erreur est survenue." });
      }
    });
  };

  // Comptages réels (0 Mock Data)
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read_at).length;
  }, [notifications]);

  const stats = useMemo(() => {
    const demandsCount = notifications.filter((n) =>
      ["DEMANDE_REPONSE", "DEMANDE_ACCEPTEE", "DEMANDE_REFUSEE"].includes(n.type)
    ).length;

    const campaignsCount = notifications.filter((n) => n.type === "CAMPAGNE_OUVERTE").length;

    const ordersCount = notifications.filter((n) =>
      ["COMMANDE_CREEE", "DATE_ARRIVEE_MODIFIEE"].includes(n.type)
    ).length;

    return {
      total: notifications.length,
      unread: unreadCount,
      demands: demandsCount,
      campaigns: campaignsCount,
      orders: ordersCount,
    };
  }, [notifications, unreadCount]);

  // Filtrage
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "UNREAD") return !notif.read_at;
      if (activeFilter === "DEMANDS") {
        return ["DEMANDE_REPONSE", "DEMANDE_ACCEPTEE", "DEMANDE_REFUSEE"].includes(notif.type);
      }
      if (activeFilter === "CAMPAIGNS") return notif.type === "CAMPAGNE_OUVERTE";
      if (activeFilter === "ORDERS") {
        return ["COMMANDE_CREEE", "DATE_ARRIVEE_MODIFIEE"].includes(notif.type);
      }
      return true;
    });
  }, [notifications, activeFilter]);

  // Groupement chronologique visuel
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<"TODAY" | "YESTERDAY" | "THIS_WEEK" | "OLDER", NotificationItem[]> = {
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      OLDER: [],
    };

    filteredNotifications.forEach((notif) => {
      const notifDate = new Date(notif.created_at);
      if (notifDate >= today) {
        groups.TODAY.push(notif);
      } else if (notifDate >= yesterday) {
        groups.YESTERDAY.push(notif);
      } else if (notifDate >= weekAgo) {
        groups.THIS_WEEK.push(notif);
      } else {
        groups.OLDER.push(notif);
      }
    });

    const result: NotificationGroup[] = [];
    if (groups.TODAY.length > 0) {
      result.push({ id: "TODAY", label: "Aujourd'hui", items: groups.TODAY });
    }
    if (groups.YESTERDAY.length > 0) {
      result.push({ id: "YESTERDAY", label: "Hier", items: groups.YESTERDAY });
    }
    if (groups.THIS_WEEK.length > 0) {
      result.push({ id: "THIS_WEEK", label: "Cette semaine", items: groups.THIS_WEEK });
    }
    if (groups.OLDER.length > 0) {
      result.push({ id: "OLDER", label: "Plus ancien", items: groups.OLDER });
    }

    return result;
  }, [filteredNotifications]);

  // Icône thématique selon le type réel
  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case "DEMANDE_REPONSE":
        return {
          icon: <TrendingUp className="w-5 h-5 text-emerald-700" />,
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          tag: "Proposition de devis",
        };
      case "DEMANDE_ACCEPTEE":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" />,
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          tag: "Demande acceptée",
        };
      case "DEMANDE_REFUSEE":
        return {
          icon: <XCircle className="w-5 h-5 text-rose-700" />,
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          tag: "Offre refusée",
        };
      case "CAMPAGNE_OUVERTE":
        return {
          icon: <Megaphone className="w-5 h-5 text-amber-700" />,
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          tag: "Nouvelle offre",
        };
      case "COMMANDE_CREEE":
        return {
          icon: <ShoppingBag className="w-5 h-5 text-blue-700" />,
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          tag: "Commande confirmée",
        };
      case "DATE_ARRIVEE_MODIFIEE":
        return {
          icon: <Calendar className="w-5 h-5 text-indigo-700" />,
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          tag: "Logistique / Arrivage",
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-gray-700" />,
          bg: "bg-gray-50 text-gray-800 border-gray-200",
          tag: "Notification",
        };
    }
  };

  // URL cible sécurisée côté revendeur (sanitisation stricte anti-fuite inter-espaces)
  const getTargetUrl = (notif: NotificationItem) => {
    let url = notif.action_url || "";

    if (url.startsWith("/dashboard/company/orders")) {
      url = url.replace("/dashboard/company/orders", "/dashboard/reseller/orders");
    } else if (url.startsWith("/dashboard/company/demands")) {
      url = "/dashboard/reseller/demands";
    } else if (url.startsWith("/dashboard/company")) {
      url = "/dashboard/reseller";
    }

    if (url && url.startsWith("/dashboard/reseller")) {
      return url;
    }

    switch (notif.type) {
      case "DEMANDE_REPONSE":
      case "DEMANDE_ACCEPTEE":
      case "DEMANDE_REFUSEE":
        return "/dashboard/reseller/demands";
      case "CAMPAGNE_OUVERTE":
        return "/dashboard/reseller/campaigns";
      case "COMMANDE_CREEE":
      case "DATE_ARRIVEE_MODIFIEE":
        return notif.related_entity_id
          ? `/dashboard/reseller/orders/${notif.related_entity_id}`
          : "/dashboard/reseller/orders";
      default:
        return "/dashboard/reseller";
    }
  };

  // Libellé de l'action selon le type réel
  const getActionLabel = (notif: NotificationItem) => {
    switch (notif.type) {
      case "DEMANDE_REPONSE":
        return "Consulter la proposition";
      case "CAMPAGNE_OUVERTE":
        return "Découvrir l'offre";
      case "COMMANDE_CREEE":
        return "Détails de la commande";
      case "DATE_ARRIVEE_MODIFIEE":
        return "Voir la livraison";
      case "DEMANDE_ACCEPTEE":
      case "DEMANDE_REFUSEE":
        return "Voir mes demandes";
      default:
        return "Consulter";
    }
  };

  // Formatage de la date en français
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
      {/* Navigation fil d'Ariane */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Link
            href="/dashboard/reseller"
            className="hover:text-earth-900 flex items-center gap-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Flux des Productions
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-semibold">Notifications</span>
        </div>

        {unreadCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Tout est à jour
          </span>
        )}
      </div>

      {/* En-tête de Section */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-earth-100 text-earth-900 text-xs font-bold tracking-tight">
              <Bell className="w-3.5 h-3.5 text-earth-800" />
              <span>Centre d&apos;Alertes & Événements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Suivez en temps réel les propositions de devis adressées par les producteurs, l&apos;ouverture des campagnes commerciales et le suivi logistique de vos commandes.
            </p>
          </div>

          {unreadCount > 0 && (
            <div className="shrink-0 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                isLoading={isPending}
                leftIcon={<CheckCheck className="w-4 h-4 text-emerald-600" />}
                className="w-full sm:w-auto shadow-2xs font-semibold"
              >
                Tout marquer comme lu ({unreadCount})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cartouches de Statistiques Réelles (0 Mock Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-earth-50 text-earth-800 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-semibold truncate">Total alertes</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-950">{stats.total}</p>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-semibold truncate">Non lues</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-950">{stats.unread}</p>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-semibold truncate">Offres ouvertes</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-950">{stats.campaigns}</p>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-semibold truncate">Commandes</p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-950">{stats.orders}</p>
          </div>
        </div>
      </div>

      {/* Barre d'onglets de filtrage */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
        <button
          type="button"
          onClick={() => setActiveFilter("ALL")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeFilter === "ALL"
              ? "bg-earth-800 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Toutes ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("UNREAD")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilter === "UNREAD"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          Non lues ({unreadCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("DEMANDS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilter === "DEMANDS"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Propositions ({stats.demands})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("CAMPAIGNS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilter === "CAMPAIGNS"
              ? "bg-amber-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          Campagnes ({stats.campaigns})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("ORDERS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilter === "ORDERS"
              ? "bg-blue-700 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Commandes ({stats.orders})
        </button>
      </div>

      {/* Liste des Notifications ou États Vides */}
      {notifications.length === 0 ? (
        <EmptyState
          title="Aucune notification pour le moment"
          description="Vous recevrez ici des alertes instantanées dès qu'un exploitant agricole répond à vos demandes d'approvisionnement, lance une campagne dans votre région ou confirme une commande."
          icon={<Bell className="w-8 h-8 text-gray-400" />}
          action={
            <Link
              href="/dashboard/reseller"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-earth-800 text-white text-xs font-bold hover:bg-earth-900 transition-colors shadow-2xs"
            >
              <span>Explorer le flux des productions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : filteredNotifications.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-gray-200/90 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">
              {activeFilter === "UNREAD"
                ? "Toutes vos notifications sont lues"
                : "Aucune notification dans cette catégorie"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              {activeFilter === "UNREAD"
                ? "Vous êtes parfaitement à jour avec vos événements récents."
                : "Essayez de sélectionner un autre onglet pour afficher vos alertes."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveFilter("ALL")}>
            Afficher toutes les notifications
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  {group.label}
                </span>
                <div className="h-px bg-gray-200/80 flex-1" />
              </div>

              <div className="space-y-2.5">
                {group.items.map((notif) => {
                  const isRead = Boolean(notif.read_at);
                  const meta = getTypeMeta(notif.type);
                  const targetUrl = getTargetUrl(notif);
                  const actionLabel = getActionLabel(notif);
                  const isCurrentlyMarking = markingId === notif.id;

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isRead
                          ? "bg-white border-gray-200/80 hover:border-gray-300"
                          : "bg-emerald-50/25 border-emerald-300/80 hover:border-emerald-400 shadow-2xs border-l-4 border-l-emerald-600"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg}`}
                        >
                          {meta.icon}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {meta.tag}
                            </span>
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

                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                            {notif.message}
                          </p>

                          <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(notif.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(notif.id)}
                            disabled={isPending || isCurrentlyMarking}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isCurrentlyMarking ? "En cours..." : "Marquer lu"}
                          </button>
                        )}

                        <Link
                          href={targetUrl}
                          onClick={() => {
                            if (!isRead) handleMarkAsRead(notif.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-earth-800 hover:bg-earth-900 text-white text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          <span>{actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
