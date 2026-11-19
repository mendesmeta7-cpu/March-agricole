/**
 * Consultation publique d'une campagne (`/campaigns/[id]`, Lot UX/UI 5B, ADR-058).
 *
 * Module pur, sans dépendance : il fixe la liste des colonnes lues et la forme publique d'une
 * campagne. Décisions du 2026-11-17 :
 * - seules les informations d'offre sont publiques : prix, devise, unité, quantité proposée
 *   (`marketable_quantity`, jamais le stock restant), commande minimum, période, description ;
 * - zones générales visibles : provinces desservies, villes de destination et dates ;
 * - aucune donnée de dépôt (nom, commune, quartier, adresse, repère) : la table `campaign_depots`
 *   n'est jamais interrogée et la forme publique est construite champ par champ (liste blanche),
 *   de sorte qu'une colonne lue en trop ne puisse pas atteindre la page.
 *
 * Masquer une donnée dans l'interface ne la protège pas : la protection des dépôts au niveau de
 * la base relève de la migration préparée `supabase/pending/` (non appliquée, voir ADR-061).
 */

/** Statuts de production lisibles publiquement (politique RLS `productions_select`). */
export const PUBLIC_PRODUCTION_STATUSES = ["planned", "growing", "harvested"] as const;

/**
 * Colonnes lues pour la page publique. Les jointures `!inner` et les filtres explicites de la
 * requête reproduisent ce qu'un visiteur non connecté peut lire, quel que soit le visiteur : une
 * campagne n'est jamais affichée parce que l'utilisateur connecté dispose de droits plus larges.
 * Colonnes de `companies` limitées à celles accordées au rôle `anon` (migration 030).
 */
export const PUBLIC_CAMPAIGN_SELECT = `
  id,
  company_id,
  production_id,
  title,
  description,
  marketable_quantity,
  unit,
  unit_price,
  currency,
  min_order_quantity,
  start_date,
  end_date,
  availability_period,
  status,
  company:companies!inner (
    id,
    name,
    logo_url,
    city,
    verification_status,
    is_active,
    provinces (name),
    countries (name)
  ),
  product:products!inner (
    name,
    category,
    image_url,
    is_global,
    is_active
  ),
  production:productions!inner (
    id,
    title,
    main_image_url,
    status,
    is_public
  ),
  delivery_zones:campaign_delivery_zones (
    id,
    provinces (name)
  ),
  destinations:campaign_destinations (
    id,
    city_name,
    expected_arrival_date,
    order_deadline_date,
    provinces (name)
  )
`;

export interface PublicCampaignDestination {
  id: string;
  city_name: string;
  province_name: string | null;
  expected_arrival_date: string | null;
  order_deadline_date: string | null;
}

export interface PublicCampaign {
  id: string;
  title: string;
  description: string | null;
  unit: string;
  unit_price: number;
  currency: string;
  /** Quantité proposée par l'offre, jamais le stock restant. */
  marketable_quantity: number;
  min_order_quantity: number;
  start_date: string | null;
  end_date: string | null;
  availability_period: string | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    verification_status: string | null;
    province_name: string | null;
    country_name: string | null;
  };
  product: {
    name: string;
    category: string | null;
  };
  production: {
    id: string;
    title: string;
  };
  /** Image publique : photo de la production, sinon image du produit (même règle que les tiroirs). */
  image_url: string | null;
  /** Provinces desservies (zones générales). */
  provinces: string[];
  destinations: PublicCampaignDestination[];
}

type Raw = Record<string, unknown> | null | undefined;

function one(value: unknown): Raw {
  if (Array.isArray(value)) return (value[0] as Raw) ?? null;
  return (value as Raw) ?? null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Nom d'une relation (province, pays), qu'elle arrive en objet ou en tableau. */
function relationName(value: unknown): string | null {
  return text(one(value)?.name);
}

/**
 * Construit la forme publique d'une campagne à partir de la ligne lue. Aucun champ n'est recopié
 * en bloc : tout champ absent de cette liste (dépôts, stock, identifiants internes) est ignoré.
 */
export function toPublicCampaign(raw: Record<string, unknown>): PublicCampaign {
  const company = one(raw.company) ?? {};
  const product = one(raw.product) ?? {};
  const production = one(raw.production) ?? {};

  const provinces = (Array.isArray(raw.delivery_zones) ? raw.delivery_zones : [])
    .map((zone) => relationName((zone as Raw)?.provinces))
    .filter((name): name is string => name !== null);

  const destinations = (Array.isArray(raw.destinations) ? raw.destinations : []).map((d) => {
    const dest = (d as Raw) ?? {};
    return {
      id: String(dest.id ?? ""),
      city_name: text(dest.city_name) ?? "",
      province_name: relationName(dest.provinces),
      expected_arrival_date: text(dest.expected_arrival_date),
      order_deadline_date: text(dest.order_deadline_date),
    };
  });

  return {
    id: String(raw.id ?? ""),
    title: text(raw.title) ?? "",
    description: text(raw.description),
    unit: text(raw.unit) ?? "",
    unit_price: num(raw.unit_price, 0),
    currency: text(raw.currency) ?? "",
    marketable_quantity: num(raw.marketable_quantity, 0),
    min_order_quantity: num(raw.min_order_quantity || 1, 1),
    start_date: text(raw.start_date),
    end_date: text(raw.end_date),
    availability_period: text(raw.availability_period),
    company: {
      id: String(company.id ?? ""),
      name: text(company.name) ?? "",
      logo_url: text(company.logo_url),
      city: text(company.city),
      verification_status: text(company.verification_status),
      province_name: relationName(company.provinces),
      country_name: relationName(company.countries),
    },
    product: {
      name: text(product.name) ?? "",
      category: text(product.category),
    },
    production: {
      id: String(production.id ?? ""),
      title: text(production.title) ?? "",
    },
    image_url: text(production.main_image_url) ?? text(product.image_url),
    provinces: Array.from(new Set(provinces)),
    destinations,
  };
}

/** Description courte pour l'aperçu de lien (réseaux sociaux, messageries). */
export function publicCampaignSummary(
  campaign: Pick<PublicCampaign, "description" | "product" | "company">,
  maxLength = 200
): string {
  const base =
    campaign.description ??
    `${campaign.product.name} proposé par ${campaign.company.name} sur Radiza.`;
  const flat = base.replace(/\s+/g, " ").trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1).trimEnd()}…` : flat;
}

/** Adresse publique d'une campagne, relative au site. */
export function publicCampaignPath(campaignId: string): string {
  return `/campaigns/${encodeURIComponent(campaignId)}`;
}
