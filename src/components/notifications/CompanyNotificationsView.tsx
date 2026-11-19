"use client";

import { useState, useTransition, useMemo } from "react";
import { NotificationItem, NotificationType } from "@/lib/queries/notifications";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/lib/actions/notifications";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  Bell,
  CheckCheck,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Filter,
  Search,
  RotateCcw,
  Layers,
  Sprout,
  Truck,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CompanyNotificationsViewProps {
  initialNotifications: NotificationItem[];
  unreadCount?: number;
  totalCount?: number;
}

type FilterCategory = "ALL" | "UNREAD" | "DEMANDS" | "ORDERS" | "CAMPAIGNS";

interface NotificationGroup {
  id: "TODAY" | "YESTERDAY" | "THIS_WEEK" | "OLDER";
  label: string;
  items: NotificationItem[];
}

function CompanyNotificationsContent({
  initialNotifications,
}: CompanyNotificationsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Synchronisation si initialNotifications change
  if (initialNotifications !== notifications && initialNotifications.length !== notifications.length) {
    setNotifications(initialNotifications);
  }

  // Marquer une notification spécifique comme lue
  const handleMarkAsRead = (notifId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setMarkingId(notifId);
    startTransition(async () => {
      try {
        const res = await markNotificationAsReadAction(notifId);
        if (res.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n))
          );
        } else {
          toast.error("Erreur", { description: res.error || "Impossible de marquer comme lue." });
        }
      } catch (err) {
        console.error("Erreur notification:", err);
        toast.error("Erreur", { description: "La requête n'a pas pu aboutir. Vérifiez votre connexion puis réessayez." });
      } finally {
        setMarkingId(null);
      }
    });
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      try {
        const res = await markAllNotificationsAsReadAction();
        if (res.success) {
          const now = new Date().toISOString();
          setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
          toast.success("Notifications à jour", {
            description: "Toutes les notifications de votre société ont été marquées comme lues.",
          });
          router.refresh();
        } else {
          toast.error("Erreur", { description: res.error || "Une erreur est survenue." });
        }
      } catch (err) {
        console.error("Erreur notifications:", err);
        toast.error("Erreur", { description: "La requête n'a pas pu aboutir. Vérifiez votre connexion puis réessayez." });
      }
    });
  };

  // Comptages réels (0 Mock Data)
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read_at).length;
  }, [notifications]);

  const stats = useMemo(() => {
    const demandsCount = notifications.filter((n) =>
      [
        "DEMANDE_GENERALE_RECUE",
        "DEMANDE_PRODUCTION_RECUE",
        "DEMANDE_REPONSE",
        "DEMANDE_ACCEPTEE",
        "DEMANDE_REFUSEE",
      ].includes(n.type)
    ).length;

    const ordersCount = notifications.filter((n) =>
      ["COMMANDE_CREEE"].includes(n.type)
    ).length;

    const campaignsCount = notifications.filter((n) =>
      ["CAMPAGNE_OUVERTE", "DATE_ARRIVEE_MODIFIEE"].includes(n.type)
    ).length;

    return {
      total: notifications.length,
      unread: unreadCount,
      demands: demandsCount,
      orders: ordersCount,
      campaigns: campaignsCount,
    };
  }, [notifications, unreadCount]);

  // Filtrage combiné (catégorie + recherche textuelle)
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // 1. Filtre de catégorie
      let matchesCategory = true;
      if (activeFilter === "UNREAD") {
        matchesCategory = !notif.read_at;
      } else if (activeFilter === "DEMANDS") {
        matchesCategory = [
          "DEMANDE_GENERALE_RECUE",
          "DEMANDE_PRODUCTION_RECUE",
          "DEMANDE_REPONSE",
          "DEMANDE_ACCEPTEE",
          "DEMANDE_REFUSEE",
        ].includes(notif.type);
      } else if (activeFilter === "ORDERS") {
        matchesCategory = ["COMMANDE_CREEE"].includes(notif.type);
      } else if (activeFilter === "CAMPAIGNS") {
        matchesCategory = ["CAMPAGNE_OUVERTE", "DATE_ARRIVEE_MODIFIEE"].includes(notif.type);
      }

      // 2. Recherche textuelle
      const q = searchQuery.trim().toLowerCase();
      let matchesSearch = true;
      if (q) {
        matchesSearch =
          notif.title.toLowerCase().includes(q) ||
          notif.message.toLowerCase().includes(q);
      }

      return matchesCategory && matchesSearch;
    });
  }, [notifications, activeFilter, searchQuery]);

  // Groupement temporel des notifications filtrées
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<NotificationGroup["id"], NotificationItem[]> = {
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      OLDER: [],
    };

    filteredNotifications.forEach((n) => {
      const d = new Date(n.created_at);
      if (d >= today) {
        groups.TODAY.push(n);
      } else if (d >= yesterday) {
        groups.YESTERDAY.push(n);
      } else if (d >= weekAgo) {
        groups.THIS_WEEK.push(n);
      } else {
        groups.OLDER.push(n);
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
      result.push({ id: "OLDER", label: "Plus anciennes", items: groups.OLDER });
    }

    return result;
  }, [filteredNotifications]);

  // Sanitisation stricte et construction de l'URL cible côté Société
  const getCompanyTargetUrl = (notif: NotificationItem): string => {
    let url = notif.action_url || "";

    // Sécurité absolue : interdire toute redirection vers l'espace revendeur
    if (url.startsWith("/dashboard/reseller/orders")) {
      url = url.replace("/dashboard/reseller/orders", "/dashboard/company/orders");
    } else if (url.startsWith("/dashboard/reseller/demands")) {
      url = "/dashboard/company/demands";
    } else if (url.startsWith("/dashboard/reseller")) {
      url = "/dashboard/company";
    }

    if (url && url.startsWith("/dashboard/company")) {
      return url;
    }

    // Fallbacks sécurisés selon le type d'entité réel
    switch (notif.type) {
      case "DEMANDE_GENERALE_RECUE":
      case "DEMANDE_PRODUCTION_RECUE":
      case "DEMANDE_REPONSE":
      case "DEMANDE_ACCEPTEE":
      case "DEMANDE_REFUSEE":
        return notif.related_entity_id
          ? `/dashboard/company/demands/${notif.related_entity_id}`
          : "/dashboard/company/demands";
      case "COMMANDE_CREEE":
        return notif.related_entity_id
          ? `/dashboard/company/orders/${notif.related_entity_id}`
          : "/dashboard/company/orders";
      case "DATE_ARRIVEE_MODIFIEE":
      case "CAMPAGNE_OUVERTE":
        // FUN-17 : aucune route de détail /dashboard/company/campaigns/[id]
        return "/dashboard/company/campaigns";
      default:
        return "/dashboard/company";
    }
  };

  // Icône et couleur de catégorie pour l'exploitation
  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case "COMMANDE_CREEE":
        return {
          icon: ShoppingBag,
          color: "text-blue-700 bg-blue-50 border-blue-200",
          badgeColor: "bg-blue-100 text-blue-800",
          categoryName: "Commande Reçue",
          accentBorder: "border-l-blue-600",
        };
      case "DEMANDE_PRODUCTION_RECUE":
        return {
          icon: Sprout,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          badgeColor: "bg-emerald-100 text-emerald-800",
          categoryName: "Demande Ciblée",
          accentBorder: "border-l-emerald-600",
        };
      case "DEMANDE_GENERALE_RECUE":
        return {
          icon: TrendingUp,
          color: "text-forest-800 bg-forest-50 border-forest-200",
          badgeColor: "bg-forest-100 text-forest-800",
          categoryName: "Demande du marché",
          accentBorder: "border-l-forest-700",
        };
      case "DEMANDE_REPONSE":
      case "DEMANDE_ACCEPTEE":
        return {
          icon: CheckCircle2,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          badgeColor: "bg-emerald-100 text-emerald-800",
          categoryName: "Proposition Acceptée",
          accentBorder: "border-l-emerald-600",
        };
      case "DEMANDE_REFUSEE":
        return {
          icon: RotateCcw,
          color: "text-amber-700 bg-amber-50 border-amber-200",
          badgeColor: "bg-amber-100 text-amber-800",
          categoryName: "Proposition Rejetée",
          accentBorder: "border-l-amber-600",
        };
      case "DATE_ARRIVEE_MODIFIEE":
        return {
          icon: Calendar,
          color: "text-indigo-700 bg-indigo-50 border-indigo-200",
          badgeColor: "bg-indigo-100 text-indigo-800",
          categoryName: "Logistique Dépôt",
          accentBorder: "border-l-indigo-600",
        };
      case "CAMPAGNE_OUVERTE":
        return {
          icon: Megaphone,
          color: "text-amber-700 bg-amber-50 border-amber-200",
          badgeColor: "bg-amber-100 text-amber-800",
          categoryName: "Campagne Active",
          accentBorder: "border-l-amber-600",
        };
      default:
        return {
          icon: Bell,
          color: "text-gray-700 bg-gray-50 border-gray-200",
          badgeColor: "bg-gray-100 text-gray-800",
          categoryName: "Notification",
          accentBorder: "border-l-gray-400",
        };
    }
  };

  // Libellé du bouton d'action selon le contexte
  const getActionLabel = (notif: NotificationItem) => {
    switch (notif.type) {
      case "COMMANDE_CREEE":
        return "Gérer la commande";
      case "DEMANDE_PRODUCTION_RECUE":
      case "DEMANDE_GENERALE_RECUE":
        return "Consulter la demande";
      case "DEMANDE_REPONSE":
      case "DEMANDE_ACCEPTEE":
      case "DEMANDE_REFUSEE":
        return "Voir mes propositions";
      case "DATE_ARRIVEE_MODIFIEE":
      case "CAMPAGNE_OUVERTE":
        return "Consulter la campagne";
      default:
        return "Consulter";
    }
  };

  // Formatage propre de date & heure
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

  const handleNotificationClick = (notif: NotificationItem) => {
    // Si la notification est non lue, la marquer comme lue au passage
    if (!notif.read_at) {
      handleMarkAsRead(notif.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. En-tête commun (Lot 6B, NAV-02) : la racine du fil d'Ariane porte le nom du menu */}
      <PageHeader
        breadcrumb={[{ href: "/dashboard/company", label: "Tableau de bord" }]}
        title="Notifications"
        description="Suivez en temps réel les commandes reçues, les demandes exprimées par les revendeurs et les alertes logistiques de vos campagnes."
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="md"
              onClick={handleMarkAllAsRead}
              isLoading={isPending && markingId === null}
              className="w-full sm:w-auto font-bold text-xs gap-2"
            >
              <CheckCheck className="w-4 h-4 text-forest-700" />
              <span>Tout marquer comme lu ({unreadCount})</span>
            </Button>
          ) : undefined
        }
      />

      {/* 3. Correctif NAV-06 (Lot 6B, arbitrage A) : les quatre cartes de compteurs (Total, Non lues,
          Demandes du marché, Commandes reçues) répétaient exactement les nombres des puces de filtre
          ci-dessous, toujours visibles ; elles sont retirées. Calculs inchangés (stats). Le sens de leurs
          légendes est repris dans les puces « Demandes du marché » et « Commandes reçues ». */}

      {/* 4. Barre de Filtres et Recherche */}
      <div className="space-y-3">
        {/* Onglets Filtres (Scrollable mobile) */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === "ALL"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "bg-white border border-gray-200/80 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span>Toutes</span>
              <span
                className={`px-1.5 py-px rounded-full text-[11px] font-black ${
                  activeFilter === "ALL" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("UNREAD")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === "UNREAD"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white border border-gray-200/80 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span>Non lues</span>
              {/* NAV-06 : nombre toujours affiché, y compris 0 (il n'est plus repris par une carte) */}
              <span
                className={`px-1.5 py-px rounded-full text-[11px] font-black ${
                  activeFilter === "UNREAD"
                    ? "bg-white/20 text-white"
                    : stats.unread > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.unread}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("DEMANDS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === "DEMANDS"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "bg-white border border-gray-200/80 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {/* NAV-06 : légende de l'ancienne carte reprise dans la puce, en forme compacte */}
              <span className="flex flex-col items-start text-left">
                <span>Demandes du marché</span>
                <span className="font-normal">exprimées par les revendeurs</span>
              </span>
              <span
                className={`px-1.5 py-px rounded-full text-[11px] font-black ${
                  activeFilter === "DEMANDS"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.demands}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("ORDERS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === "ORDERS"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white border border-gray-200/80 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {/* NAV-06 : sens de l'ancienne légende « Engagements fermes » (des commandes, pas des demandes),
                  sans formulation de garantie */}
              <span className="flex flex-col items-start text-left">
                <span>Commandes reçues</span>
                <span className="font-normal">passées par les revendeurs</span>
              </span>
              <span
                className={`px-1.5 py-px rounded-full text-[11px] font-black ${
                  activeFilter === "ORDERS"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.orders}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("CAMPAIGNS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === "CAMPAIGNS"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-white border border-gray-200/80 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span>Campagnes</span>
              <span
                className={`px-1.5 py-px rounded-full text-[11px] font-black ${
                  activeFilter === "CAMPAIGNS"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.campaigns}
              </span>
            </button>
          </div>

          {/* Recherche textuelle */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="Rechercher une notification"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une notification..."
              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-forest-500 placeholder:text-gray-500 text-gray-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Contenu : Liste groupée ou États Vides */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-14 text-center shadow-2xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
            {notifications.length === 0
              ? "Vous êtes à jour"
              : activeFilter === "UNREAD"
              ? "Aucune notification non lue"
              : "Aucune notification trouvée"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
            {notifications.length === 0
              ? "Aucune nouvelle notification pour le moment. Dès qu'un revendeur passera commande ou formulera une demande sur vos productions, vous serez alerté ici en temps réel."
              : activeFilter === "UNREAD"
              ? "Toutes les alertes et événements de votre société ont déjà été consultés."
              : "Aucune notification ne correspond aux filtres et termes de recherche sélectionnés."}
          </p>

          {activeFilter !== "ALL" || searchQuery ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveFilter("ALL");
                setSearchQuery("");
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </Button>
          ) : (
            <Link
              href="/dashboard/company/demands"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 transition-colors shadow-sm"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Observer la demande du marché</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.id} className="space-y-2.5">
              {/* En-tête de groupe chronologique */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  {group.label}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  ({group.items.length})
                </span>
                <div className="flex-1 h-px bg-gray-200/80" />
              </div>

              {/* Cartes de notifications */}
              <div className="space-y-2.5">
                {group.items.map((notif) => {
                  const meta = getTypeMeta(notif.type);
                  const Icon = meta.icon;
                  const targetUrl = getCompanyTargetUrl(notif);
                  const isUnread = !notif.read_at;
                  const isMarkingThis = markingId === notif.id;

                  return (
                    <div
                      key={notif.id}
                      className={`group relative rounded-2xl transition-all duration-150 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border overflow-hidden ${
                        isUnread
                          ? `bg-white border-forest-200/90 shadow-2xs ring-1 ring-forest-100 border-l-4 ${meta.accentBorder}`
                          : "bg-gray-50/70 border-gray-200/70 hover:bg-white hover:border-gray-300/80"
                      }`}
                    >
                      {/* Côté gauche : Icône + Contenu */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Icône de catégorie */}
                        <div
                          className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs ${meta.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Textes */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${meta.badgeColor}`}
                            >
                              {meta.categoryName}
                            </span>

                            {isUnread && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Non lue
                              </span>
                            )}

                            <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto sm:ml-0">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {formatDate(notif.created_at)}
                            </span>
                          </div>

                          <h3
                            className={`text-sm tracking-tight leading-snug line-clamp-2 ${
                              isUnread ? "font-bold text-gray-950" : "font-semibold text-gray-800"
                            }`}
                          >
                            {notif.title}
                          </h3>

                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-3">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      {/* Côté droit : Boutons d'action */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 w-full sm:w-auto justify-end">
                        {/* Bouton "Marquer comme lue" si non lue */}
                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            disabled={isPending}
                            className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-gray-200 transition-colors"
                            title="Marquer comme lue"
                            aria-label="Marquer comme lue"
                          >
                            {isMarkingThis ? (
                              <span className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin block" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Lien vers la ressource réelle */}
                        <Link
                          href={targetUrl}
                          onClick={() => handleNotificationClick(notif)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 active:scale-[0.98] text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all"
                        >
                          <span>{getActionLabel(notif)}</span>
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

export default function CompanyNotificationsView(props: CompanyNotificationsViewProps) {
  return (
    <ToastProvider>
      <CompanyNotificationsContent {...props} />
    </ToastProvider>
  );
}
