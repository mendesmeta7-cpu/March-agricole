import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCompanyOrders } from "@/lib/queries/orders";
import { getCompanyGeneralDemands } from "@/lib/queries/demands";
import type { DemandItem } from "@/lib/queries/demands";
import CompanyDashboardHeader from "@/components/company/dashboard/CompanyDashboardHeader";
import CompanyOverviewMetrics from "@/components/company/dashboard/CompanyOverviewMetrics";
import CompanyDemandTrendChart from "@/components/company/dashboard/CompanyDemandTrendChart";
import type { DemandTrendPoint } from "@/components/company/dashboard/CompanyDemandTrendChart";
import CompanyDemandGeoChart from "@/components/company/dashboard/CompanyDemandGeoChart";
import type { ProvinceDemandData } from "@/components/company/dashboard/CompanyDemandGeoChart";
import CompanyPendingActions from "@/components/company/dashboard/CompanyPendingActions";
import type { PendingActionItem } from "@/components/company/dashboard/CompanyPendingActions";
import CompanyRecentActivity from "@/components/company/dashboard/CompanyRecentActivity";

export default async function CompanyDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ─── 1. Profil de l'entreprise ─────────────────────────────────────────────
  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, slug, description, address, city, phone, email, verification_status, logo_url, provinces(name), countries(name)"
    )
    .eq("created_by", user.id)
    .maybeSingle();

  if (!company?.id) {
    redirect("/onboarding");
  }

  const companyId = company.id;
  const locationInfo = [
    (company as any)?.provinces?.name,
    (company as any)?.countries?.name,
  ]
    .filter(Boolean)
    .join(", ");

  // ─── 2. Profil utilisateur (nom du gérant) ─────────────────────────────────
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  // ─── 3. Productions : statistiques réelles ─────────────────────────────────
  const { data: productionsRaw } = await supabase
    .from("productions")
    .select("id, status")
    .eq("company_id", companyId);

  const productions = productionsRaw || [];
  const productionsStats = {
    total: productions.length,
    growing: productions.filter((p) => p.status === "growing").length,
    harvested: productions.filter((p) => p.status === "harvested").length,
    planned: productions.filter((p) => p.status === "planned").length,
  };

  // ─── 4. Demandes du marché : statistiques réelles ──────────────────────────
  const activeDemands = await getCompanyGeneralDemands(companyId);
  const unansweredDemands = activeDemands.filter(
    (d) => !d.my_response || d.my_response === null
  );
  const totalDemandedQty = activeDemands.reduce(
    (acc, d) => acc + (d.quantity || 0),
    0
  );
  const demandsStats = {
    totalActive: activeDemands.length,
    needingResponse: unansweredDemands.length,
    totalDemandedQuantity: Math.round(totalDemandedQty),
    unit: activeDemands[0]?.unit || "tonne",
  };

  // ─── 5. Campagnes de vente : statistiques réelles ──────────────────────────
  const { data: campaignsRaw } = await supabase
    .from("campaigns")
    .select("id, status, marketable_quantity, reserved_quantity, unit")
    .eq("company_id", companyId);

  const campaigns = campaignsRaw || [];
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalMarketable = activeCampaigns.reduce(
    (acc, c) => acc + (Number(c.marketable_quantity) || 0),
    0
  );
  const totalReserved = activeCampaigns.reduce(
    (acc, c) => acc + (Number(c.reserved_quantity) || 0),
    0
  );
  const campaignsStats = {
    activeCount: activeCampaigns.length,
    totalMarketable,
    totalReserved,
    totalAvailable: totalMarketable - totalReserved,
    unit: activeCampaigns[0]?.unit || "tonne",
  };

  // ─── 6. Commandes reçues : statistiques réelles ────────────────────────────
  const recentOrders = await getCompanyOrders(companyId);
  const inProgressStatuses = ["pending", "confirmed", "preparing", "ready"];
  const ordersToProcess = recentOrders.filter((o) =>
    inProgressStatuses.includes(o.status)
  );
  const ordersDelivered = recentOrders.filter((o) => o.status === "delivered");
  const totalRevenue = recentOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const ordersStats = {
    total: recentOrders.length,
    toProcess: ordersToProcess.length,
    delivered: ordersDelivered.length,
    totalRevenue: Math.round(totalRevenue),
    currency: recentOrders[0]?.currency || "USD",
  };

  // ─── 7. Tendance des demandes : points pour le graphique ───────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: demandsTrendRaw } = await supabase
    .from("demands")
    .select("id, created_at, quantity, unit, product_id, products(id, name)")
    .eq("status", "active")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at", { ascending: true })
    .limit(500);

  // Extraction des produits uniques pour le filtre
  const productsMap = new Map<string, string>();
  (demandsTrendRaw || []).forEach((d: any) => {
    const prod = Array.isArray(d.products) ? d.products[0] : d.products;
    if (prod?.id && prod?.name) productsMap.set(prod.id, prod.name);
  });
  const availableProducts = Array.from(productsMap.entries()).map(
    ([id, name]) => ({ id, name })
  );

  // Construction des DemandTrendPoints
  const trendDemands: DemandTrendPoint[] = (demandsTrendRaw || []).map(
    (d: any) => {
      const prod = Array.isArray(d.products) ? d.products[0] : d.products;
      return {
        date: d.created_at,
        quantity: Number(d.quantity) || 0,
        unit: d.unit || "tonne",
        productId: d.product_id || prod?.id || "",
        productName: prod?.name || "Produit",
      };
    }
  );

  // ─── 8. Géographie des demandes : distribution par province ───────────────
  const { data: geoRaw } = await supabase
    .from("demands")
    .select(
      "id, province_id, quantity, unit, created_at, status, product_id, products(id, name, category, default_unit, image_url), provinces(id, name, code), countries(id, name, code)"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  // Groupement par province
  const provinceMap = new Map<
    string,
    {
      province_name: string;
      demands_count: number;
      total_quantity: number;
      unit: string;
      demands: DemandItem[];
    }
  >();

  (geoRaw || []).forEach((d: any) => {
    const provId = d.province_id;
    const provRaw = Array.isArray(d.provinces) ? d.provinces[0] : d.provinces;
    const prodRaw = Array.isArray(d.products) ? d.products[0] : d.products;
    const countryRaw = Array.isArray(d.countries)
      ? d.countries[0]
      : d.countries;
    const provName = provRaw?.name || "Province non identifiée";

    const existing = provinceMap.get(provId) || {
      province_name: provName,
      demands_count: 0,
      total_quantity: 0,
      unit: d.unit || "tonne",
      demands: [] as DemandItem[],
    };

    existing.demands_count += 1;
    existing.total_quantity += Number(d.quantity) || 0;

    // Reconstitution du DemandItem minimal pour le drawer de détail
    existing.demands.push({
      id: d.id,
      reseller_id: "",
      demand_type: "general",
      product_id: d.product_id || "",
      production_id: null,
      target_company_id: null,
      quantity: Number(d.quantity) || 0,
      unit: d.unit || "tonne",
      country_id: countryRaw?.id || "",
      province_id: provId,
      city: null,
      target_period_start: null,
      target_period_end: null,
      notes: null,
      status: "active",
      created_at: d.created_at,
      updated_at: d.created_at,
      product: prodRaw || {
        id: d.product_id || "",
        name: "Produit",
        category: "",
        default_unit: d.unit || "tonne",
        image_url: null,
      },
      province: provRaw || { id: provId, name: provName, code: "" },
      country: countryRaw || { id: "", name: "RDC", code: "CD" },
    });

    provinceMap.set(provId, existing);
  });

  const totalGeoQty = Array.from(provinceMap.values()).reduce(
    (acc, v) => acc + v.total_quantity,
    0
  );

  const provincesData: ProvinceDemandData[] = Array.from(
    provinceMap.entries()
  )
    .map(([provinceId, val]) => ({
      provinceId,
      provinceName: val.province_name,
      demandsCount: val.demands_count,
      totalQuantity: val.total_quantity,
      unit: val.unit,
      percentage:
        totalGeoQty > 0
          ? Math.round((val.total_quantity / totalGeoQty) * 100)
          : 0,
      demands: val.demands,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  // ─── 9. Actions en attente (alertes métier réelles) ────────────────────────
  const pendingActions: PendingActionItem[] = [];

  unansweredDemands.slice(0, 3).forEach((d) => {
    pendingActions.push({
      id: `demand-${d.id}`,
      type: "unanswered_demand",
      title: `Besoin non traité : ${d.product?.name || "Produit"}`,
      subtitle: `${d.quantity} ${d.unit} demandé(s) — Province : ${d.province?.name || "Non précisée"}`,
      badgeText: "Réponse requise",
      badgeVariant: "warning",
      href: `/dashboard/company/demands/${d.id}`,
      date: new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
      }).format(new Date(d.created_at)),
    });
  });

  ordersToProcess.slice(0, 3).forEach((o) => {
    pendingActions.push({
      id: `order-${o.id}`,
      type: "pending_order",
      title: `Commande ${o.order_number}`,
      subtitle: `${o.reseller?.business_name || "Revendeur"} — ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency || "USD" }).format(o.total_amount)}`,
      badgeText:
        o.status === "pending"
          ? "En attente"
          : o.status === "confirmed"
          ? "Confirmée"
          : "En préparation",
      badgeVariant: o.status === "pending" ? "warning" : "forest",
      href: `/dashboard/company/orders/${o.id}`,
      date: new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
      }).format(new Date(o.created_at)),
    });
  });

  // ─── 10. Rendu de la page ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Bloc identitaire de l'exploitation */}
      <CompanyDashboardHeader
        companyName={company.name || "Mon Exploitation"}
        userName={userProfile?.full_name || undefined}
        verificationStatus={
          (company.verification_status as
            | "verified"
            | "pending_verification"
            | "unverified") || "unverified"
        }
        locationInfo={locationInfo || undefined}
        logoUrl={company.logo_url}
      />

      {/* Vue d'ensemble métriques */}
      <CompanyOverviewMetrics
        productionsStats={productionsStats}
        demandsStats={demandsStats}
        campaignsStats={campaignsStats}
        ordersStats={ordersStats}
      />

      {/* Actions urgentes */}
      <CompanyPendingActions actions={pendingActions} />

      {/* Graphiques : Tendance + Géographie */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CompanyDemandTrendChart
          demands={trendDemands}
          availableProducts={availableProducts}
        />
        <CompanyDemandGeoChart provincesData={provincesData} />
      </div>

      {/* Activité récente */}
      <CompanyRecentActivity
        recentDemands={activeDemands.slice(0, 4)}
        recentOrders={recentOrders.slice(0, 4)}
      />
    </div>
  );
}
