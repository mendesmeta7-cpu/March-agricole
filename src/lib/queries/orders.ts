import { createClient } from "@/lib/supabase/server";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export interface OrderItemDetail {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  product_name_snapshot?: string | null;
  created_at: string;
  product: {
    id: string;
    name: string;
    category: string;
    default_unit: string;
    image_url: string | null;
  };
}

export interface OrderReservationDetail {
  id: string;
  campaign_id: string;
  quantity: number;
  status: "active" | "released" | "confirmed";
}

export interface OrderDetail {
  id: string;
  order_number: string;
  reseller_id: string;
  company_id: string;
  campaign_id: string | null;
  production_id?: string | null;
  origin_type?: string;
  total_amount: number;
  currency: string;
  delivery_province_id: string;
  delivery_city: string | null;
  delivery_address: string | null;
  status: OrderStatus;
  notes: string | null;
  qr_code_token: string;
  delivered_at: string | null;
  delivered_quantity: number | null;
  delivered_by: string | null;
  delivery_notes: string | null;
  company_name_snapshot?: string | null;
  campaign_title_snapshot?: string | null;
  production_title_snapshot?: string | null;
  destination_id?: string | null;
  depot_id?: string | null;
  expected_arrival_date_snapshot?: string | null;
  destination_city_snapshot?: string | null;
  depot_name_snapshot?: string | null;
  destination?: {
    id: string;
    city_name: string;
    expected_arrival_date: string;
    previous_arrival_date?: string | null;
  } | null;
  depot?: {
    id: string;
    name: string;
    commune: string;
    quartier?: string | null;
    address: string;
    complement?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    city: string | null;
    provinces?: { name: string } | null;
    countries?: { name: string } | null;
  };
  reseller: {
    id: string;
    business_name: string;
    city: string | null;
    delivery_address: string | null;
    provinces?: { name: string } | null;
    countries?: { name: string } | null;
  };
  delivery_province?: {
    id: string;
    name: string;
    code: string;
  } | null;
  campaign: {
    id: string;
    title: string;
    unit: string;
    unit_price: number;
    currency: string;
    marketable_quantity: number;
    production?: {
      id: string;
      title: string;
      main_image_url: string | null;
    } | null;
  };
  order_items: OrderItemDetail[];
  stock_reservation?: OrderReservationDetail | null;
}

export interface OrderFilterParams {
  status?: string;
  campaignId?: string;
  search?: string;
}

/**
 * Récupère les commandes d'un revendeur avec pagination et filtres
 */
export async function getResellerOrders(
  resellerId: string,
  filters: OrderFilterParams = {}
): Promise<OrderDetail[]> {
  const supabase = createClient();

  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      reseller_id,
      company_id,
      campaign_id,
      production_id,
      origin_type,
      total_amount,
      currency,
      delivery_province_id,
      delivery_city,
      delivery_address,
      status,
      notes,
      qr_code_token,
      delivered_at,
      delivered_quantity,
      delivered_by,
      delivery_notes,
      company_name_snapshot,
      campaign_title_snapshot,
      production_title_snapshot,
      destination_id,
      depot_id,
      expected_arrival_date_snapshot,
      destination_city_snapshot,
      depot_name_snapshot,
      destination:campaign_destinations (
        id,
        city_name,
        expected_arrival_date,
        previous_arrival_date
      ),
      depot:campaign_depots (
        id,
        name,
        commune,
        quartier,
        address,
        complement
      ),
      created_at,
      updated_at,
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        provinces (name),
        countries (name)
      ),
      reseller:resellers!inner (
        id,
        business_name,
        city,
        delivery_address,
        provinces (name),
        countries (name)
      ),
      delivery_province:provinces!orders_delivery_province_id_fkey (
        id,
        name,
        code
      ),
      campaign:campaigns (
        id,
        title,
        unit,
        unit_price,
        currency,
        marketable_quantity,
        production:productions (
          id,
          title,
          main_image_url
        )
      ),
      order_items:order_items (
        id,
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal,
        product_name_snapshot,
        created_at,
        product:products (
          id,
          name,
          category,
          default_unit,
          image_url
        )
      ),
      stock_reservations (
        id,
        campaign_id,
        quantity,
        status
      )
    `)
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur récupération commandes revendeur:", error);
    return [];
  }

  return (data || []).map((item: any) => formatOrderRecord(item));
}

/**
 * Récupère le détail complet d'une commande revendeur
 */
export async function getResellerOrderById(
  orderId: string,
  resellerId: string
): Promise<OrderDetail | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      reseller_id,
      company_id,
      campaign_id,
      production_id,
      origin_type,
      total_amount,
      currency,
      delivery_province_id,
      delivery_city,
      delivery_address,
      status,
      notes,
      qr_code_token,
      delivered_at,
      delivered_quantity,
      delivered_by,
      delivery_notes,
      company_name_snapshot,
      campaign_title_snapshot,
      production_title_snapshot,
      destination_id,
      depot_id,
      expected_arrival_date_snapshot,
      destination_city_snapshot,
      depot_name_snapshot,
      destination:campaign_destinations (
        id,
        city_name,
        expected_arrival_date,
        previous_arrival_date
      ),
      depot:campaign_depots (
        id,
        name,
        commune,
        quartier,
        address,
        complement
      ),
      created_at,
      updated_at,
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        provinces (name),
        countries (name)
      ),
      reseller:resellers!inner (
        id,
        business_name,
        city,
        delivery_address,
        provinces (name),
        countries (name)
      ),
      delivery_province:provinces!orders_delivery_province_id_fkey (
        id,
        name,
        code
      ),
      campaign:campaigns (
        id,
        title,
        unit,
        unit_price,
        currency,
        marketable_quantity,
        production:productions (
          id,
          title,
          main_image_url
        )
      ),
      order_items:order_items (
        id,
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal,
        product_name_snapshot,
        created_at,
        product:products (
          id,
          name,
          category,
          default_unit,
          image_url
        )
      ),
      stock_reservations (
        id,
        campaign_id,
        quantity,
        status
      )
    `)
    .eq("id", orderId)
    .eq("reseller_id", resellerId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération détail commande revendeur:", error);
    return null;
  }

  return formatOrderRecord(data);
}

/**
 * Récupère l'ensemble des commandes reçues par une entreprise agricole
 */
export async function getCompanyOrders(
  companyId: string,
  filters: OrderFilterParams = {}
): Promise<OrderDetail[]> {
  const supabase = createClient();

  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      reseller_id,
      company_id,
      campaign_id,
      production_id,
      origin_type,
      total_amount,
      currency,
      delivery_province_id,
      delivery_city,
      delivery_address,
      status,
      notes,
      qr_code_token,
      delivered_at,
      delivered_quantity,
      delivered_by,
      delivery_notes,
      company_name_snapshot,
      campaign_title_snapshot,
      production_title_snapshot,
      destination_id,
      depot_id,
      expected_arrival_date_snapshot,
      destination_city_snapshot,
      depot_name_snapshot,
      destination:campaign_destinations (
        id,
        city_name,
        expected_arrival_date,
        previous_arrival_date
      ),
      depot:campaign_depots (
        id,
        name,
        commune,
        quartier,
        address,
        complement
      ),
      created_at,
      updated_at,
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        provinces (name),
        countries (name)
      ),
      reseller:resellers!inner (
        id,
        business_name,
        city,
        delivery_address,
        provinces (name),
        countries (name)
      ),
      delivery_province:provinces!orders_delivery_province_id_fkey (
        id,
        name,
        code
      ),
      campaign:campaigns (
        id,
        title,
        unit,
        unit_price,
        currency,
        marketable_quantity,
        production:productions (
          id,
          title,
          main_image_url
        )
      ),
      order_items:order_items (
        id,
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal,
        product_name_snapshot,
        created_at,
        product:products (
          id,
          name,
          category,
          default_unit,
          image_url
        )
      ),
      stock_reservations (
        id,
        campaign_id,
        quantity,
        status
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.campaignId && filters.campaignId !== "all") {
    query = query.eq("campaign_id", filters.campaignId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur récupération commandes entreprise:", error);
    return [];
  }

  return (data || []).map((item: any) => formatOrderRecord(item));
}

/**
 * Récupère le détail d'une commande reçue par l'entreprise agricole
 */
export async function getCompanyOrderById(
  orderId: string,
  companyId: string
): Promise<OrderDetail | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      reseller_id,
      company_id,
      campaign_id,
      production_id,
      origin_type,
      total_amount,
      currency,
      delivery_province_id,
      delivery_city,
      delivery_address,
      status,
      notes,
      qr_code_token,
      delivered_at,
      delivered_quantity,
      delivered_by,
      delivery_notes,
      company_name_snapshot,
      campaign_title_snapshot,
      production_title_snapshot,
      destination_id,
      depot_id,
      expected_arrival_date_snapshot,
      destination_city_snapshot,
      depot_name_snapshot,
      destination:campaign_destinations (
        id,
        city_name,
        expected_arrival_date,
        previous_arrival_date
      ),
      depot:campaign_depots (
        id,
        name,
        commune,
        quartier,
        address,
        complement
      ),
      created_at,
      updated_at,
      company:companies!inner (
        id,
        name,
        slug,
        logo_url,
        city,
        provinces (name),
        countries (name)
      ),
      reseller:resellers!inner (
        id,
        business_name,
        city,
        delivery_address,
        provinces (name),
        countries (name)
      ),
      delivery_province:provinces!orders_delivery_province_id_fkey (
        id,
        name,
        code
      ),
      campaign:campaigns (
        id,
        title,
        unit,
        unit_price,
        currency,
        marketable_quantity,
        production:productions (
          id,
          title,
          main_image_url
        )
      ),
      order_items:order_items (
        id,
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal,
        product_name_snapshot,
        created_at,
        product:products (
          id,
          name,
          category,
          default_unit,
          image_url
        )
      ),
      stock_reservations (
        id,
        campaign_id,
        quantity,
        status
      )
    `)
    .eq("id", orderId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erreur récupération détail commande entreprise:", error);
    return null;
  }

  return formatOrderRecord(data);
}

/**
 * Calcule le stock disponible réel d'une campagne via la fonction RPC PostgreSQL
 */
export async function getCampaignAvailableStock(campaignId: string): Promise<{
  marketable_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_campaign_stock_summary", {
    p_campaign_id: campaignId,
  });

  if (error || !data || data.length === 0) {
    console.error("Erreur calcul stock disponible:", error);
    return {
      marketable_quantity: 0,
      reserved_quantity: 0,
      available_quantity: 0,
    };
  }

  const record = data[0];
  return {
    marketable_quantity: Number(record.marketable_quantity),
    reserved_quantity: Number(record.reserved_quantity),
    available_quantity: Number(record.available_quantity),
  };
}

/**
 * Helper de mise en forme des enregistrements de commande
 */
function formatOrderRecord(item: any): OrderDetail {
  const rawCompany = Array.isArray(item.company) ? item.company[0] : item.company;
  const rawReseller = Array.isArray(item.reseller) ? item.reseller[0] : item.reseller;
  const rawCampaign = Array.isArray(item.campaign) ? item.campaign[0] : item.campaign;
  const rawDeliveryProvince = Array.isArray(item.delivery_province)
    ? item.delivery_province[0]
    : item.delivery_province;

  const rawReservation = Array.isArray(item.stock_reservations)
    ? item.stock_reservations[0]
    : item.stock_reservations;

  const orderItems: OrderItemDetail[] = (item.order_items || []).map((oi: any) => {
    const rawProd = Array.isArray(oi.product) ? oi.product[0] : oi.product;
    return {
      id: oi.id,
      order_id: oi.order_id,
      product_id: oi.product_id,
      quantity: Number(oi.quantity),
      unit: oi.unit,
      unit_price: Number(oi.unit_price),
      subtotal: Number(oi.subtotal),
      product_name_snapshot: oi.product_name_snapshot || null,
      created_at: oi.created_at,
      product: rawProd || {
        id: oi.product_id,
        name: oi.product_name_snapshot || "Produit agricole",
        category: "Agricole",
        default_unit: oi.unit,
        image_url: null,
      },
    };
  });

  const company = {
    ...rawCompany,
    name: rawCompany?.name || item.company_name_snapshot || "Entreprise agricole",
    provinces: Array.isArray(rawCompany?.provinces)
      ? rawCompany.provinces[0]
      : rawCompany?.provinces,
    countries: Array.isArray(rawCompany?.countries)
      ? rawCompany.countries[0]
      : rawCompany?.countries,
  };

  const reseller = {
    ...rawReseller,
    provinces: Array.isArray(rawReseller?.provinces)
      ? rawReseller.provinces[0]
      : rawReseller?.provinces,
    countries: Array.isArray(rawReseller?.countries)
      ? rawReseller.countries[0]
      : rawReseller?.countries,
  };

  const campaign = {
    id: rawCampaign?.id || item.campaign_id || "",
    title: rawCampaign?.title || item.campaign_title_snapshot || "Offre commerciale",
    unit: rawCampaign?.unit || item.order_items?.[0]?.unit || "tonne",
    currency: rawCampaign?.currency || item.currency || "USD",
    unit_price: Number(rawCampaign?.unit_price || item.order_items?.[0]?.unit_price || 0),
    marketable_quantity: Number(rawCampaign?.marketable_quantity || 0),
    production: Array.isArray(rawCampaign?.production)
      ? rawCampaign.production[0]
      : rawCampaign?.production || (item.production_title_snapshot ? {
          id: item.production_id || "",
          title: item.production_title_snapshot,
          main_image_url: null,
        } : null),
  };

  const rawDest = Array.isArray(item.destination) ? item.destination[0] : item.destination;
  const rawDepot = Array.isArray(item.depot) ? item.depot[0] : item.depot;

  return {
    id: item.id,
    order_number: item.order_number,
    reseller_id: item.reseller_id,
    company_id: item.company_id,
    campaign_id: item.campaign_id || null,
    production_id: item.production_id || null,
    origin_type: item.origin_type || "campaign",
    total_amount: Number(item.total_amount),
    currency: item.currency,
    delivery_province_id: item.delivery_province_id,
    delivery_city: item.destination_city_snapshot || item.delivery_city,
    delivery_address: item.delivery_address,
    destination_id: item.destination_id || null,
    depot_id: item.depot_id || null,
    expected_arrival_date_snapshot: item.expected_arrival_date_snapshot || rawDest?.expected_arrival_date || null,
    destination_city_snapshot: item.destination_city_snapshot || rawDest?.city_name || item.delivery_city || null,
    depot_name_snapshot: item.depot_name_snapshot || (rawDepot ? `${rawDepot.name} (${rawDepot.commune})` : null),
    destination: rawDest || null,
    depot: rawDepot || null,
    status: item.status,
    notes: item.notes,
    qr_code_token: item.qr_code_token || "",
    delivered_at: item.delivered_at || null,
    delivered_quantity: item.delivered_quantity ? Number(item.delivered_quantity) : null,
    delivered_by: item.delivered_by || null,
    delivery_notes: item.delivery_notes || null,
    company_name_snapshot: item.company_name_snapshot || null,
    campaign_title_snapshot: item.campaign_title_snapshot || null,
    production_title_snapshot: item.production_title_snapshot || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
    company,
    reseller,
    delivery_province: rawDeliveryProvince,
    campaign,
    order_items: orderItems,
    stock_reservation: rawReservation
      ? {
          id: rawReservation.id,
          campaign_id: rawReservation.campaign_id,
          quantity: Number(rawReservation.quantity),
          status: rawReservation.status,
        }
      : null,
  };
}
