/**
 * test-prompt6-dashboard-alert-card.mjs
 * Validation des règles logiques et d'alertes du Prompt 6 pour le Dashboard Société Radiza.
 */

import assert from "node:assert/strict";

console.log("🧪 Démarrage des tests unitaires du PROMPT 6 — DashboardAlertCard...\n");

// Helper identique à page.tsx
function daysUntil(dateStr, referenceTodayStr) {
  const todayMs = new Date(
    (referenceTodayStr || new Date().toISOString().split("T")[0]) + "T00:00:00Z"
  ).getTime();
  const targetMs = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

function dayLabel(days) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jour${days > 1 ? "s" : ""}`;
}

function computeAlerts({
  recentOrders = [],
  activeCampaigns = [],
  referenceTodayStr = "2026-10-09",
}) {
  const dashboardAlerts = [];

  // Priorité 1 — Commandes pending
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

  // Priorité 2a — Campagne active finissant <= 7 jours
  const campaignsEndingSoon = activeCampaigns
    .filter((c) => {
      if (!c.end_date) return false;
      const d = daysUntil(c.end_date, referenceTodayStr);
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => daysUntil(a.end_date, referenceTodayStr) - daysUntil(b.end_date, referenceTodayStr));

  if (campaignsEndingSoon.length > 0) {
    const c = campaignsEndingSoon[0];
    const days = daysUntil(c.end_date, referenceTodayStr);
    dashboardAlerts.push({
      id: `campaign-ending-${c.id}`,
      type: "campaign_ending",
      message: `Campagne "${c.title || "Sans titre"}" se termine ${dayLabel(days)}`,
      href: "/dashboard/company/campaigns",
    });
  }

  // Priorité 2b — Destination deadline <= 5 jours
  if (!dashboardAlerts.some((a) => a.type === "campaign_ending")) {
    let destAlert = null;
    let minDays = Infinity;

    for (const campaign of activeCampaigns) {
      for (const dest of campaign.campaign_destinations || []) {
        if (!dest.order_deadline_date) continue;
        const d = daysUntil(dest.order_deadline_date, referenceTodayStr);
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

  // Priorité 3 — Campagnes actives sans urgence
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

  // Priorité 4 — Message neutre
  if (dashboardAlerts.length === 0) {
    dashboardAlerts.push({
      id: "welcome",
      type: "welcome",
      message: "Tout est à jour. Votre exploitation est opérationnelle sur Radiza.",
    });
  }

  return dashboardAlerts;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

// Test 1 : Aucune commande, aucune campagne -> Message neutre
{
  const alerts = computeAlerts({});
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "welcome");
  assert.equal(alerts[0].message, "Tout est à jour. Votre exploitation est opérationnelle sur Radiza.");
  console.log("✓ Test 1 passé : Message neutre quand aucune donnée");
}

// Test 2 : 1 commande pending -> Alerte singulier
{
  const alerts = computeAlerts({
    recentOrders: [{ id: "1", status: "pending" }],
  });
  assert.equal(alerts[0].type, "pending_orders");
  assert.equal(alerts[0].message, "1 commande attend votre confirmation");
  assert.equal(alerts[0].href, "/dashboard/company/orders");
  console.log("✓ Test 2 passé : 1 commande pending -> singulier");
}

// Test 3 : 5 commandes pending -> Alerte pluriel
{
  const alerts = computeAlerts({
    recentOrders: [
      { id: "1", status: "pending" },
      { id: "2", status: "pending" },
      { id: "3", status: "pending" },
      { id: "4", status: "confirmed" },
      { id: "5", status: "delivered" },
      { id: "6", status: "cancelled" },
    ],
  });
  assert.equal(alerts[0].type, "pending_orders");
  assert.equal(alerts[0].message, "3 commandes attendent votre confirmation");
  console.log("✓ Test 3 passé : Multiples commandes pending -> pluriel (exclut confirmed/delivered/cancelled)");
}

// Test 4 : Campagne se terminant aujourd'hui (0 jour)
{
  const alerts = computeAlerts({
    activeCampaigns: [
      { id: "c1", title: "Maïs Blanc", end_date: "2026-10-09" }
    ],
    referenceTodayStr: "2026-10-09",
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "campaign_ending");
  assert.equal(alerts[0].message, 'Campagne "Maïs Blanc" se termine aujourd\'hui');
  console.log("✓ Test 4 passé : Campagne se terminant aujourd'hui");
}

// Test 5 : Campagne se terminant demain (1 jour)
{
  const alerts = computeAlerts({
    activeCampaigns: [
      { id: "c1", title: "Manioc", end_date: "2026-10-10" }
    ],
    referenceTodayStr: "2026-10-09",
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "campaign_ending");
  assert.equal(alerts[0].message, 'Campagne "Manioc" se termine demain');
  console.log("✓ Test 5 passé : Campagne se terminant demain");
}

// Test 6 : Campagne se terminant dans 4 jours
{
  const alerts = computeAlerts({
    activeCampaigns: [
      { id: "c1", title: "Tomates", end_date: "2026-10-13" }
    ],
    referenceTodayStr: "2026-10-09",
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "campaign_ending");
  assert.equal(alerts[0].message, 'Campagne "Tomates" se termine dans 4 jours');
  console.log("✓ Test 6 passé : Campagne se terminant dans 4 jours");
}

// Test 7 : Campagne expirée (date dépassée) ne doit JAMAIS générer d'alerte de fin
{
  const alerts = computeAlerts({
    activeCampaigns: [
      // Si par anomalie une campagne passée était là
      { id: "c_old", title: "Ancien Haricot", end_date: "2026-10-05" }
    ],
    referenceTodayStr: "2026-10-09",
  });
  // Ne doit PAS générer d'alerte de fin
  assert.ok(!alerts.some(a => a.type === "campaign_ending"));
  console.log("✓ Test 7 passé : Campagne avec date passée ne génère JAMAIS d'alerte se termine bientôt");
}

// Test 8 : Destination deadline <= 5 jours
{
  const alerts = computeAlerts({
    activeCampaigns: [
      {
        id: "c1",
        title: "Campagne Riz",
        end_date: "2026-11-30", // loin dans le temps
        campaign_destinations: [
          { id: "d1", city_name: "Matadi", order_deadline_date: "2026-10-11" } // dans 2 jours
        ]
      }
    ],
    referenceTodayStr: "2026-10-09",
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "destination_deadline");
  assert.equal(alerts[0].message, 'Clôture des commandes pour "Matadi" dans 2 jours');
  console.log("✓ Test 8 passé : Destination deadline proche déclenchée");
}

// Test 9 : Destination passée ne génère pas d'alerte
{
  const alerts = computeAlerts({
    activeCampaigns: [
      {
        id: "c1",
        title: "Campagne Riz",
        end_date: "2026-11-30",
        campaign_destinations: [
          { id: "d1", city_name: "Boma", order_deadline_date: "2026-10-01" } // dépassé
        ]
      }
    ],
    referenceTodayStr: "2026-10-09",
  });
  assert.ok(!alerts.some(a => a.type === "destination_deadline"));
  // Doit basculer vers Priority 3 (active campaigns)
  assert.equal(alerts[0].type, "active_campaigns");
  console.log("✓ Test 9 passé : Destination expirée ignorée, bascule vers campagne active");
}

// Test 10 : Priorités multiples combinées (commandes pending + date proche)
{
  const alerts = computeAlerts({
    recentOrders: [{ id: "o1", status: "pending" }],
    activeCampaigns: [
      { id: "c1", title: "Maïs", end_date: "2026-10-12" } // dans 3 jours
    ],
    referenceTodayStr: "2026-10-09",
  });
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].type, "pending_orders");
  assert.equal(alerts[1].type, "campaign_ending");
  console.log("✓ Test 10 passé : Deux alertes générées avec ordre de priorité pending_orders puis campaign_ending");
}

console.log("\n🎉 Tous les 10 tests unitaires du Prompt 6 sont validés à 100% !");
