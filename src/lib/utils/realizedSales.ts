/**
 * SOURCE UNIQUE DE VÉRITÉ — CALCUL DES VENTES RÉALISÉES & STATISTIQUES FINANCIÈRES
 * Plateforme Agricole Radiza — Règles Métier Prompts 2, 3 & 4
 *
 * RÈGLES FONDAMENTALES :
 * 1. NOTION 1 — VALEUR DES COMMANDES :
 *    - Somme des montants contractuels enregistrés pour les commandes passées pendant la période sélectionnée.
 *    - Basée obligatoirement sur la date de création : "created_at".
 *    - Exclut les commandes annulées (dont le stock est libéré).
 *    - Représente la valeur des engagements commerciaux, distincte des ventes livrées.
 *
 * 2. NOTION 2 — VENTES RÉALISÉES (LIVRAISONS CONFIRMÉES) :
 *    - Somme des montants contractuels enregistrés pour les commandes dont la livraison a été officiellement confirmée via confirm_order_delivery.
 *    - Basée obligatoirement sur la date réelle de livraison : "delivered_at" (et NON sur created_at).
 *    - "status === 'delivered'" OBLIGATOIRE.
 *    - Exclut strictement toutes les commandes non livrées (pending, confirmed, preparing, ready) et annulées.
 *    - Ne compte jamais deux fois une commande.
 *
 * 3. NOTION 3 — PAIEMENTS ENCAISSÉS :
 *    - Radiza V1 ne disposant d'aucun paiement en ligne revendeur, aucun montant encaissé n'est calculé.
 *
 * 4. SÉPARATION STRICTE DES DEVISES :
 *    - CDF et USD sont TOUJOURS présentés et calculés séparément.
 *    - Zéro conversion arbitraire, zéro somme combinée.
 *
 * 5. ZÉRO DONNÉE FICTIVE :
 *    - Les périodes sans commande affichent 0 CDF et 0 USD formatés de manière soignée.
 */

export interface OrderForSalesCalculation {
  status: string;
  total_amount: number;
  currency?: string | null;
  delivered_at?: string | null;
  delivered_quantity?: number | null;
  created_at?: string | null;
}

export interface CurrencySalesBreakdown {
  currency: string;
  deliveredCount: number;
  deliveredAmount: number;
  deliveredQuantity: number;
}

export interface RealizedSalesSummary {
  /** Nombre total de commandes livrées (toutes devises confondues) */
  totalDeliveredOrders: number;
  /** Ventilation par devise (CDF, USD) */
  byCurrency: Record<string, CurrencySalesBreakdown>;
  /** Prédicat de validation de vente livrée */
  isRealizedSale: (orderStatus: string) => boolean;
}

export type TimeFilterType = "today" | "this_week" | "this_month" | "custom" | "all";

export interface CurrencyMetric {
  currency: "CDF" | "USD" | string;
  amount: number;
  count: number;
}

export interface FinancialPeriodMetrics {
  period: {
    type: TimeFilterType;
    label: string;
    startDate: string | null;
    endDate: string | null;
  };
  // 1. Valeur des commandes (selon created_at dans la période)
  orderValue: {
    totalOrdersCount: number;
    byCurrency: Record<string, CurrencyMetric>;
  };
  // 2. Ventes livrées (selon delivered_at dans la période + status === 'delivered')
  deliveredSales: {
    totalOrdersCount: number;
    byCurrency: Record<string, CurrencyMetric>;
  };
}

/**
 * Prédicat strict : une commande constitue-t-elle une vente réalisée ?
 * Seul le statut "delivered" retourne true.
 */
export function isRealizedSale(status: string): boolean {
  return status === "delivered";
}

/**
 * Calcule les bornes temporelles locales précises pour un filtre donné
 */
export function getDateBounds(
  filter: TimeFilterType,
  customStart?: string,
  customEnd?: string
): { start: Date | null; end: Date | null; label: string } {
  const now = new Date();

  switch (filter) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const label = `Aujourd'hui (${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(now)})`;
      return { start, end, label };
    }

    case "this_week": {
      const day = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
      const label = `Cette semaine (${fmt.format(monday)} – ${fmt.format(sunday)})`;
      return { start: monday, end: sunday, label };
    }

    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = `Ce mois (${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(now)})`;
      return { start, end, label };
    }

    case "custom": {
      if (!customStart && !customEnd) {
        return { start: null, end: null, label: "Période personnalisée (complète)" };
      }
      let start: Date | null = null;
      let end: Date | null = null;
      if (customStart) {
        const [y, m, d] = customStart.split("-").map(Number);
        start = new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      if (customEnd) {
        const [y, m, d] = customEnd.split("-").map(Number);
        end = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
      const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
      const startStr = start ? fmt.format(start) : "Début";
      const endStr = end ? fmt.format(end) : "Aujourd'hui";
      return { start, end, label: `Du ${startStr} au ${endStr}` };
    }

    case "all":
    default:
      return { start: null, end: null, label: "Toutes les dates (Historique complet)" };
  }
}

/**
 * Calcule les statistiques financières complètes du tableau de bord société
 * selon les règles métier obligatoires du Prompt 4.
 */
export function calculateCompanyFinancialMetrics(
  orders: OrderForSalesCalculation[],
  filter: TimeFilterType = "this_month",
  customStart?: string,
  customEnd?: string
): FinancialPeriodMetrics {
  const { start, end, label } = getDateBounds(filter, customStart, customEnd);

  // Initialisation avec CDF et USD garantis
  const orderValueByCurrency: Record<string, CurrencyMetric> = {
    CDF: { currency: "CDF", amount: 0, count: 0 },
    USD: { currency: "USD", amount: 0, count: 0 },
  };

  const deliveredSalesByCurrency: Record<string, CurrencyMetric> = {
    CDF: { currency: "CDF", amount: 0, count: 0 },
    USD: { currency: "USD", amount: 0, count: 0 },
  };

  let totalOrdersCount = 0;
  let totalDeliveredOrdersCount = 0;

  for (const order of orders) {
    const currency = (order.currency || "USD").toUpperCase();
    const amount = Number(order.total_amount) || 0;

    // Assurer l'existence de la devise dans les dictionnaires
    if (!orderValueByCurrency[currency]) {
      orderValueByCurrency[currency] = { currency, amount: 0, count: 0 };
    }
    if (!deliveredSalesByCurrency[currency]) {
      deliveredSalesByCurrency[currency] = { currency, amount: 0, count: 0 };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. VALEUR DES COMMANDES : basée sur created_at
    // Exclut les commandes annulées (stock libéré)
    // ──────────────────────────────────────────────────────────────────────────
    if (order.status !== "cancelled" && order.created_at) {
      const orderDate = new Date(order.created_at);
      const inCreatedRange =
        (!start || orderDate >= start) && (!end || orderDate <= end);

      if (inCreatedRange) {
        totalOrdersCount += 1;
        orderValueByCurrency[currency].count += 1;
        orderValueByCurrency[currency].amount =
          Math.round((orderValueByCurrency[currency].amount + amount) * 100) / 100;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. VENTES LIVRÉES : basée sur delivered_at + status === 'delivered'
    // ──────────────────────────────────────────────────────────────────────────
    if (order.status === "delivered" && order.delivered_at) {
      const deliveryDate = new Date(order.delivered_at);
      const inDeliveredRange =
        (!start || deliveryDate >= start) && (!end || deliveryDate <= end);

      if (inDeliveredRange) {
        totalDeliveredOrdersCount += 1;
        deliveredSalesByCurrency[currency].count += 1;
        deliveredSalesByCurrency[currency].amount =
          Math.round((deliveredSalesByCurrency[currency].amount + amount) * 100) / 100;
      }
    }
  }

  return {
    period: {
      type: filter,
      label,
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
    },
    orderValue: {
      totalOrdersCount,
      byCurrency: orderValueByCurrency,
    },
    deliveredSales: {
      totalOrdersCount: totalDeliveredOrdersCount,
      byCurrency: deliveredSalesByCurrency,
    },
  };
}

/**
 * Calcul originel Prompt 3 (compatibilité ascendante)
 */
export function calculateRealizedSales(
  orders: OrderForSalesCalculation[]
): RealizedSalesSummary {
  const byCurrency: Record<string, CurrencySalesBreakdown> = {};
  let totalDeliveredOrders = 0;

  for (const order of orders) {
    if (!isRealizedSale(order.status)) {
      continue;
    }

    totalDeliveredOrders += 1;
    const currency = (order.currency || "USD").toUpperCase();

    if (!byCurrency[currency]) {
      byCurrency[currency] = {
        currency,
        deliveredCount: 0,
        deliveredAmount: 0,
        deliveredQuantity: 0,
      };
    }

    const amount = Number(order.total_amount) || 0;
    const quantity = Number(order.delivered_quantity) || 0;

    byCurrency[currency].deliveredCount += 1;
    byCurrency[currency].deliveredAmount =
      Math.round((byCurrency[currency].deliveredAmount + amount) * 100) / 100;
    byCurrency[currency].deliveredQuantity =
      Math.round((byCurrency[currency].deliveredQuantity + quantity) * 100) / 100;
  }

  return {
    totalDeliveredOrders,
    byCurrency,
    isRealizedSale,
  };
}
