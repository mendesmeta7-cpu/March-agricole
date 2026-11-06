// Utilitaires de mise en forme partagés par les listes d'administration (fr-FR).

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Les colonnes DATE (sans heure) sont formatées en UTC pour éviter tout décalage d'un jour.
const dateOnlyFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatAdminDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

export function formatAdminDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "—" : dateOnlyFormatter.format(date);
}

export function formatAdminQuantity(value: number, unit: string | null | undefined): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

export function formatAdminAmount(value: number, currency: string | null | undefined): string {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${
    currency ? ` ${currency}` : ""
  }`;
}

export const RESELLER_TYPE_LABELS: Record<string, string> = {
  wholesaler: "Grossiste",
  semi_wholesaler: "Demi-grossiste",
  retailer: "Détaillant",
  processor: "Transformateur",
};

export const DEMAND_TYPE_LABELS: Record<string, string> = {
  general: "Demande générale",
  production: "Sur production",
};

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: "En attente",
  verified: "Vérifiée",
  rejected: "Rejetée",
};

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  planned: "Planifiée",
  growing: "En culture",
  harvested: "Récoltée",
  cancelled: "Annulée",
};

export const DEMAND_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  converted: "Convertie en commande",
  cancelled: "Annulée",
  expired: "Expirée",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};
