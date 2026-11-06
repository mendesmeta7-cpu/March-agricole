import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentCompanyId, getCurrentProfile, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { sumByCurrency, sumByUnit } from "@/lib/utils/currencyTotals";
import { getCompanyOrders, getCompanyOrdersForFinancials } from "@/lib/queries/orders";
import { getCompanyGeneralDemands } from "@/lib/queries/demands";
import type { DemandItem } from "@/lib/queries/demands";
import { getEffectiveCampaignStatus } from "@/lib/utils/campaignStatus";
import type { DashboardAlert } from "@/components/company/dashboard/DashboardAlertCard";
import CompanyDashboardHeader from "@/components/company/dashboard/CompanyDashboardHeader";
import CompanyOverviewMetrics from "@/components/company/dashboard/CompanyOverviewMetrics";
import CompanyDemandTrendChart from "@/components/company/dashboard/CompanyDemandTrendChart";
import type { DemandTrendPoint } from "@/components/company/dashboard/CompanyDemandTrendChart";
import CompanyDemandGeoChart from "@/components/company/dashboard/CompanyDemandGeoChart";
import type { ProvinceDemandData } from "@/components/company/dashboard/CompanyDemandGeoChart";
import CompanyPendingActions from "@/components/company/dashboard/CompanyPendingActions";
import type { PendingActionItem } from "@/components/company/dashboard/CompanyPendingActions";
import CompanyRecentActivity from "@/components/company/dashboard/CompanyRecentActivity";
import CompanyFinancialMetrics from "@/components/company/dashboard/CompanyFinancialMetrics";
import { isConsumingReservation } from "@/lib/utils/stockRules";
import { buildProvinceBreakdownByUnit } from "@/lib/utils/unitSeries";
import type { ProvinceUnitRow } from "@/lib/utils/unitSeries";

export default async function CompanyDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // ─── Entreprise rattachée (membre ou créateur) ─────────────────────────────
  // FUN-18 : résolution mutualisée (company_members puis companies.created_by) et
  // mise en cache pour la requête. Sans entreprise : message explicite, pas de
  // redirection vers /onboarding (qui bouclait pour un collaborateur non créateur).
  const resolvedCompanyId = await getCurrentCompanyId();
  if (!resolvedCompanyId) {
    return <CompanyAccountMissing />;
  }

  const supabase = await createClient();

  // ─── Profil entreprise ───────────────────────────────────────────────────────
  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, slug, description, address, city, phone, email, verification_status, logo_url, provinces(name), countries(name)"
    )
    .eq("id", resolvedCompanyId)
    .maybeSingle();

  if (!company?.id) {
    return <CompanyAccountMissing />;
  }

  const companyId = company.id;
  const locationInfo = [
    (company as any)?.provinces?.name,
    (company as any)?.countries?.name,
  ]
    .filter(Boolean)
    .join(", ");

  // ─── Profil utilisateur ──────────────────────────────────────────────────────
  const userProfile = await getCurrentProfile();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // ─── Requêtes parallèles ─────────────────────────────────────────────────────
  const [
    productionsResult,
    campaignsResult,
    trendResult,
    geoResult,
    activeDemands,
    recentOrders,
    financialOrdersResult,
  ] = await Promise.all([
    supabase
      .from("productions")
      .select("id, status")
      .eq("company_id", companyId),

    // FUN-05 : la colonne campaigns.reserved_quantity n'existe pas. Le réservé est
    // calculé depuis stock_reservations (statut 'active'), comme dans queries/campaigns.ts.
    supabase
      .from("campaigns")
      .select(`
        id,
        title,
        status,
        marketable_quantity,
        unit,
        start_date,
        end_date,
        campaign_destinations (
          id,
          city_name,
          order_deadline_date
        ),
        stock_reservations (
          quantity,
          status
        )
      `)
      .eq("company_id", companyId),

    supabase
      .from("demands")
      .select("id, created_at, quantity, unit, product_id, products(id, name)")
      .eq("status", "active")
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true })
      .limit(500),

    supabase
      .from("demands")
      .select(
        "id, province_id, quantity, unit, created_at, status, product_id, products(id, name, category, default_unit, image_url), provinces(id, name, code), countries(id, name, code)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(500),

    getCompanyGeneralDemands(companyId),
    getCompanyOrders(companyId),
    // Requête dédiée aux métriques financières : léger, sans limite de résultats,
    // garantit l'exhaustivité de l'historique pour les calculs CDF/USD.
    getCompanyOrdersForFinancials(companyId),
  ]);

  // ─── Productions ─────────────────────────────────────────────────────────────
  // Une erreur de requête n'est jamais convertie en zéros silencieux (anti faux zéro).
  if (productionsResult.error) {
    console.error("Erreur chargement productions (dashboard):", productionsResult.error);
  }
  const productionsError = productionsResult.error
    ? "chargement des productions impossible"
    : null;
  const productions = productionsResult.data || [];
  const productionsStats = {
    error: productionsError,
    total: productions.length,
    growing: productions.filter((p) => p.status === "growing").length,
    harvested: productions.filter((p) => p.status === "harvested").length,
    planned: productions.filter((p) => p.status === "planned").length,
    draft: productions.filter((p) => p.status === "draft").length,
  };

  // ─── Demandes ────────────────────────────────────────────────────────────────
  const unansweredDemands = activeDemands.filter(
    (d) => !d.my_response || d.my_response === null
  );
  // FUN-04 : volumes ventilés par unité (jamais d'addition entre unités différentes).
  const demandsStats = {
    totalActive: activeDemands.length,
    needingResponse: unansweredDemands.length,
    demandedByUnit: sumByUnit(activeDemands, (d) => d.quantity, (d) => d.unit),
  };

  // ─── Campagnes ───────────────────────────────────────────────────────────────
  if (campaignsResult.error) {
    console.error("Erreur chargement campagnes (dashboard):", campaignsResult.error);
  }
  const campaignsError = campaignsResult.error
    ? "chargement des campagnes impossible"
    : null;
  const rawCampaigns = campaignsResult.data || [];
  const campaigns = rawCampaigns.map((c: any) => {
    const reservedQty = ((c.stock_reservations || []) as any[])
      .filter((sr) => isConsumingReservation(sr.status))
      .reduce((acc: number, sr) => acc + (Number(sr.quantity) || 0), 0);
    const marketableQty = Number(c.marketable_quantity) || 0;
    return {
      ...c,
      reservedQty,
      availableQty: Math.max(0, marketableQty - reservedQty),
      effectiveStatus: getEffectiveCampaignStatus(c),
    };
  });
  const activeCampaigns = campaigns.filter((c) => c.effectiveStatus === "active");
  const campaignsStats = {
    activeCount: activeCampaigns.length,
    totalCount: campaigns.length,
    reservedByUnit: sumByUnit(activeCampaigns, (c) => c.reservedQty, (c) => c.unit),
    availableByUnit: sumByUnit(activeCampaigns, (c) => c.availableQty, (c) => c.unit),
    error: campaignsError,
  };

  // ─── Commandes ───────────────────────────────────────────────────────────────
  const inProgressStatuses = ["pending", "confirmed", "preparing", "ready"];
  const ordersToProcess = recentOrders.filter((o) =>
    inProgressStatuses.includes(o.status)
  );
  // FUN-04 : les indicateurs de commandes s'appuient sur la requête financière exhaustive
  // (avec erreur explicite) ; l'engagement est ventilé par devise, CDF et USD jamais additionnés.
  const financialOrders = financialOrdersResult.orders;
  const ordersStats = {
    total: financialOrders.length,
    toProcess: financialOrders.filter((o) => inProgressStatuses.includes(o.status)).length,
    delivered: financialOrders.filter((o) => o.status === "delivered").length,
    revenueByCurrency: sumByCurrency(
      financialOrders.filter((o) => o.status !== "cancelled"),
      (o) => o.total_amount,
      (o) => o.currency
    ),
    error: financialOrdersResult.error,
  };

  // ─── Alertes dynamiques du dashboard (Prompt 6) ─────────────────────────────
  /**
   * Utilitaire de calcul de jours restants.
   * Compare deux dates en UTC jour entier pour éviter les erreurs de timezone.
   * Résultat positif = dans le futur. 0 = aujourd'hui. Négatif = passé.
   */
  function daysUntil(dateStr: string): number {
    const todayMs = new Date(
      new Date().toISOString().split("T")[0] + "T00:00:00Z"
    ).getTime();
    const targetMs = new Date(dateStr + "T00:00:00Z").getTime();
    return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
  }

  function dayLabel(days: number): string {
    if (days === 0) return "aujourd'hui";
    if (days === 1) return "demain";
    return `dans ${days} jour${days > 1 ? "s" : ""}`;
  }

  const dashboardAlerts: DashboardAlert[] = [];

  // Priorité 1 — Commandes en attente de confirmation
  const pendingOrdersCount = recentOrders.filter((o) => o.status === "pending").length;
  if (pendingOrdersCount > 0) {
    dashboardAlerts.push({
      id: "pending-orders",
      type: "pending_orders",
      message:
        pendingOrdersCount === 1
          ? "1 commande attend votre confirmation"
          : `${pendingOrdersCount} commandes attendent votre confirmation`,
      href: "/dashboard/company/orders",
    });
  }

  // Priorité 2a — Campagne active dont la date de fin globale approche (<= 7 j)
  // Seules les campagnes effectivement actives sont candidates (une campagne expirée
  // ne peut jamais générer une alerte "se termine bientôt").
  const campaignsEndingSoon = activeCampaigns
    .filter((c: any) => {
      if (!c.end_date) return false;
      const d = daysUntil(c.end_date);
      return d >= 0 && d <= 7; // >= 0 : la date est aujourd'hui ou dans le futur
    })
    .sort((a: any, b: any) => {
      // La plus urgente en premier
      return daysUntil(a.end_date) - daysUntil(b.end_date);
    });

  if (campaignsEndingSoon.length > 0) {
    const c = campaignsEndingSoon[0] as any;
    const days = daysUntil(c.end_date);
    dashboardAlerts.push({
      id: `campaign-ending-${c.id}`,
      type: "campaign_ending",
      message: `Campagne "${c.title || "Sans titre"}" se termine ${dayLabel(days)}`,
      href: "/dashboard/company/campaigns",
    });
  }

  // Priorité 2b — Destination dont le délai de commande arrive bientôt (<= 5 j)
  // Uniquement si aucune alerte de fin de campagne n'a été générée.
  if (!dashboardAlerts.some((a) => a.type === "campaign_ending")) {
    let destAlert: DashboardAlert | null = null;
    let minDays = Infinity;

    for (const campaign of activeCampaigns as any[]) {
      for (const dest of campaign.campaign_destinations || []) {
        if (!dest.order_deadline_date) continue;
        const d = daysUntil(dest.order_deadline_date);
        if (d >= 0 && d <= 5 && d < minDays) {
          minDays = d;
          destAlert = {
            id: `dest-deadline-${campaign.id}-${dest.id}`,
            type: "destination_deadline",
            message: `Clôture des commandes pour "${dest.city_name || "une destination"}" ${dayLabel(d)}`,
            href: "/dashboard/company/campaigns",
          };
        }
      }
    }

    if (destAlert) dashboardAlerts.push(destAlert);
  }

  // Priorité 3 — Campagnes actives en cours (informatif, sans urgence de date)
  // N'apparaît que si aucune alerte de date (campaign_ending / destination_deadline) n'est présente.
  const hasDateAlert = dashboardAlerts.some(
    (a) => a.type === "campaign_ending" || a.type === "destination_deadline"
  );
  if (!hasDateAlert && activeCampaigns.length > 0) {
    dashboardAlerts.push({
      id: "active-campaigns",
      type: "active_campaigns",
      message:
        activeCampaigns.length === 1
          ? "1 campagne commerciale active sur le marché"
          : `${activeCampaigns.length} campagnes commerciales actives sur le marché`,
      href: "/dashboard/company/campaigns",
    });
  }

  // Priorité 4 — Message neutre si aucune alerte n'a été générée
  if (dashboardAlerts.length === 0) {
    dashboardAlerts.push({
      id: "welcome",
      type: "welcome",
      message:
        "Tout est à jour. Votre exploitation est opérationnelle sur Radiza.",
    });
  }

  // ─── Tendance demandes (graphique) ───────────────────────────────────────────
  const demandsTrendRaw = trendResult.data || [];
  const productsMap = new Map<string, string>();
  demandsTrendRaw.forEach((d: any) => {
    const prod = Array.isArray(d.products) ? d.products[0] : d.products;
    if (prod?.id && prod?.name) productsMap.set(prod.id, prod.name);
  });
  const availableProducts = Array.from(productsMap.entries()).map(
    ([id, name]) => ({ id, name })
  );
  const trendDemands: DemandTrendPoint[] = demandsTrendRaw.map((d: any) => {
    const prod = Array.isArray(d.products) ? d.products[0] : d.products;
    return {
      date: d.created_at,
      quantity: Number(d.quantity) || 0,
      // Unité d'origine conservée (aucune unité supposée, aucune conversion).
      unit: d.unit || "",
      productId: d.product_id || prod?.id || "",
      productName: prod?.name || "Produit",
    };
  });

  // ─── Géographie demandes ─────────────────────────────────────────────────────
  // BR-FIN-04 : ventilation par (province, unité). Aucune addition entre unités
  // différentes, aucune conversion ; les pourcentages sont calculés dans chaque unité.
  const geoRaw = geoResult.data || [];
  const demandsByProvince = new Map<string, DemandItem[]>();
  const geoRows: ProvinceUnitRow[] = [];

  geoRaw.forEach((d: any) => {
    const provId: string = d.province_id || "";
    const provRaw = Array.isArray(d.provinces) ? d.provinces[0] : d.provinces;
    const prodRaw = Array.isArray(d.products) ? d.products[0] : d.products;
    const countryRaw = Array.isArray(d.countries) ? d.countries[0] : d.countries;
    const provName = provRaw?.name || "Province non identifiée";
    const unit: string = d.unit || "";

    geoRows.push({
      provinceId: provId,
      provinceName: provName,
      quantity: d.quantity,
      unit,
    });

    const list = demandsByProvince.get(provId) || [];
    list.push({
      id: d.id,
      reseller_id: "",
      demand_type: "general",
      product_id: d.product_id || "",
      production_id: null,
      target_company_id: null,
      quantity: Number(d.quantity) || 0,
      unit,
      country_id: countryRaw?.id || "",
      province_id: provId,
      city: null,
      target_period_start: null,
      target_period_end: null,
      notes: null,
      status: "active",
      created_at: d.created_at,
      updated_at: d.created_at,
      product: prodRaw || { id: d.product_id || "", name: "Produit", category: "", default_unit: unit, image_url: null },
      province: provRaw || { id: provId, name: provName, code: "" },
      country: countryRaw || { id: "", name: "RDC", code: "CD" },
    });
    demandsByProvince.set(provId, list);
  });

  const geoBreakdown = buildProvinceBreakdownByUnit(geoRows);
  const provincesData: ProvinceDemandData[] = geoBreakdown.provinces.map((p) => ({
    provinceId: p.provinceId,
    provinceName: p.provinceName,
    demandsCount: p.demandsCount,
    quantitiesByUnit: p.units,
    demands: demandsByProvince.get(p.provinceId) || [],
  }));
  const geoUnitTotals = geoBreakdown.unitTotals;

  // ─── Actions en attente ──────────────────────────────────────────────────────
  const pendingActions: PendingActionItem[] = [];
  unansweredDemands.slice(0, 3).forEach((d) => {
    pendingActions.push({
      id: `demand-${d.id}`,
      type: "unanswered_demand",
      title: `${d.product?.name || "Produit"} recherché`,
      subtitle: `${d.quantity} ${d.unit} — ${d.province?.name || "Province non précisée"}`,
      badgeText: "À traiter",
      badgeVariant: "warning",
      href: `/dashboard/company/demands/${d.id}`,
      date: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d.created_at)),
    });
  });
  ordersToProcess.slice(0, 3).forEach((o) => {
    pendingActions.push({
      id: `order-${o.id}`,
      type: "pending_order",
      title: `Commande ${o.order_number}`,
      subtitle: `${o.reseller?.business_name || "Revendeur"} — ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency || "USD" }).format(o.total_amount)}`,
      badgeText:
        o.status === "pending" ? "En attente" :
        o.status === "confirmed" ? "Confirmée" : "En préparation",
      badgeVariant: o.status === "pending" ? "warning" : "forest",
      href: `/dashboard/company/orders/${o.id}`,
      date: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(o.created_at)),
    });
  });

  // ─── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Zone d'accueil */}
      <CompanyDashboardHeader
        companyName={company.name || "Mon Exploitation"}
        userName={userProfile?.full_name || undefined}
        verificationStatus={
          (company.verification_status as "verified" | "pending_verification" | "unverified") || "unverified"
        }
        locationInfo={locationInfo || undefined}
        alerts={dashboardAlerts}
      />

      {/* 4 cartes KPI */}
      <CompanyOverviewMetrics
        productionsStats={productionsStats}
        demandsStats={demandsStats}
        campaignsStats={campaignsStats}
        ordersStats={ordersStats}
      />

      {/* Statistiques Financières & Commandes (Prompt 4 & 4.2 - Pagination exhaustive & Séparation CDF/USD) */}
      {/* Alimenté par getCompanyOrdersForFinancials : pagination par blocs de 1 000, sans troncature silencieuse */}
      <CompanyFinancialMetrics
        orders={financialOrdersResult.orders}
        error={financialOrdersResult.error}
      />

      {/* Alertes métier urgentes */}
      <CompanyPendingActions actions={pendingActions} />

      {/* Graphiques côte à côte */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CompanyDemandTrendChart
          demands={trendDemands}
          availableProducts={availableProducts}
        />
        <CompanyDemandGeoChart provincesData={provincesData} unitTotals={geoUnitTotals} />
      </div>

      {/* Activité récente */}
      <CompanyRecentActivity
        recentDemands={activeDemands.slice(0, 4)}
        recentOrders={recentOrders.slice(0, 4)}
      />
    </div>
  );
}
