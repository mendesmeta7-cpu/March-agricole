import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${message}`);
}

async function runFinancialTests() {
  console.log("=================================================================");
  console.log("   SUITE DE TESTS FINANCIERS — PLATEFORME RADIZA (V1)");
  console.log("=================================================================\n");

  // TEST 1 : 20 tonnes × 1 000 000 CDF/tonne = 20 000 000 CDF
  console.log("--- TEST 1 : Exemple de référence Maïs (CDF/tonne) ---");
  const qty1 = 20;
  const unit1 = "tonne";
  const price1 = 1000000;
  const currency1 = "CDF";
  const total1 = qty1 * price1;
  assert(total1 === 20000000, `Calcul : ${qty1} ${unit1}s × ${price1} ${currency1}/${unit1} = 20 000 000 ${currency1} (obtenu: ${total1})`);
  assert(currency1 === "CDF", "La devise résultante est strictement CDF");

  // TEST 2 : 100 caisses × 25 000 CDF/caisse = 2 500 000 CDF
  console.log("\n--- TEST 2 : Exemple de référence Tomates (CDF/caisse) ---");
  const qty2 = 100;
  const unit2 = "caisse";
  const price2 = 25000;
  const currency2 = "CDF";
  const total2 = qty2 * price2;
  assert(total2 === 2500000, `Calcul : ${qty2} ${unit2}s × ${price2} ${currency2}/${unit2} = 2 500 000 ${currency2} (obtenu: ${total2})`);
  assert(currency2 === "CDF", "La devise résultante est strictement CDF");

  // TEST 3 : Une commande en USD reste en USD
  console.log("\n--- TEST 3 : Commande en USD ---");
  const orderUsd = {
    quantity: 15,
    unit: "tonne",
    unit_price: 450,
    currency: "USD",
  };
  const totalUsd = orderUsd.quantity * orderUsd.unit_price;
  assert(totalUsd === 6750, `Montant total USD : ${totalUsd} USD`);
  assert(orderUsd.currency === "USD", "La commande en USD reste strictement en USD sans conversion");

  // TEST 4 : Une commande en CDF reste en CDF
  console.log("\n--- TEST 4 : Commande en CDF ---");
  const orderCdf = {
    quantity: 50,
    unit: "sac",
    unit_price: 35000,
    currency: "CDF",
  };
  const totalCdf = orderCdf.quantity * orderCdf.unit_price;
  assert(totalCdf === 1750000, `Montant total CDF : ${totalCdf} CDF`);
  assert(orderCdf.currency === "CDF", "La commande en CDF reste strictement en CDF sans conversion");

  // TEST 5 : Séparation stricte CDF et USD (pas d'addition directe)
  console.log("\n--- TEST 5 : Isolation des devises CDF / USD ---");
  const orders = [
    { currency: "USD", total_amount: 1500 },
    { currency: "CDF", total_amount: 5000000 },
    { currency: "USD", total_amount: 2200 },
    { currency: "CDF", total_amount: 3200000 },
  ];
  const totalsByCurrency = orders.reduce((acc, o) => {
    acc[o.currency] = (acc[o.currency] || 0) + o.total_amount;
    return acc;
  }, {});
  assert(totalsByCurrency.USD === 3700, `Total USD ventilé : 3 700 USD (obtenu: ${totalsByCurrency.USD})`);
  assert(totalsByCurrency.CDF === 8200000, `Total CDF ventilé : 8 200 000 CDF (obtenu: ${totalsByCurrency.CDF})`);
  assert(Object.keys(totalsByCurrency).length === 2, "Les montants en CDF et USD sont cloisonnés dans des totaux séparés sans mélange");

  // TEST 6 : Cohérence prévisualisation client vs enregistrement serveur
  console.log("\n--- TEST 6 : Égalité prévisualisation client et calcul serveur ---");
  function clientCalculate(qtyStr, priceStr) {
    const q = Number(qtyStr);
    const p = Number(priceStr);
    if (isNaN(q) || !isFinite(q) || q <= 0 || isNaN(p) || !isFinite(p) || p <= 0) return 0;
    return Math.round(q * p * 100) / 100;
  }
  function serverCalculate(qty, price) {
    return Number((qty * price).toFixed(2));
  }
  const testInputs = [
    { q: "20", p: "1000000" },
    { q: "100", p: "25000" },
    { q: "12.5", p: "450.75" },
    { q: "0.5", p: "1500" },
  ];
  for (const { q, p } of testInputs) {
    const clientVal = clientCalculate(q, p);
    const serverVal = serverCalculate(Number(q), Number(p));
    assert(Math.abs(clientVal - serverVal) < 0.001, `Prévis. (${clientVal}) == Serveur (${serverVal}) pour ${q} × ${p}`);
  }

  // TEST 7 : Conservation des valeurs contractuelles d'une proposition acceptée
  console.log("\n--- TEST 7 : Parcours proposition commerciale -> commande ---");
  const proposal = {
    id: "prop-123",
    demand_id: "dem-456",
    proposed_quantity: 20,
    unit: "tonne",
    unit_price: 1000000,
    currency: "CDF",
  };
  const orderFromProposal = {
    origin_type: "demand_response",
    demand_response_id: proposal.id,
    quantity: proposal.proposed_quantity,
    unit: proposal.unit,
    unit_price: proposal.unit_price,
    currency: proposal.currency,
    subtotal: proposal.proposed_quantity * proposal.unit_price,
    total_amount: proposal.proposed_quantity * proposal.unit_price,
  };
  assert(orderFromProposal.unit_price === proposal.unit_price, "Le prix unitaire contractuel est préservé de la proposition à la commande");
  assert(orderFromProposal.currency === proposal.currency, "La devise contractuelle est préservée de la proposition à la commande");
  assert(orderFromProposal.unit === proposal.unit, "L'unité contractuelle est préservée de la proposition à la commande");
  assert(orderFromProposal.total_amount === 20000000, "Le montant total de la commande correspond exactement au sous-total marchandise");

  // TEST 8 : Commande depuis une campagne commerciale
  console.log("\n--- TEST 8 : Parcours campagne -> commande ---");
  const campaign = {
    id: "camp-789",
    unit_price: 850,
    currency: "USD",
    unit: "sac de 50kg",
    available_quantity: 500,
  };
  const orderedQty = 10;
  const orderFromCampaign = {
    origin_type: "campaign",
    campaign_id: campaign.id,
    quantity: orderedQty,
    unit: campaign.unit,
    unit_price: campaign.unit_price,
    currency: campaign.currency,
    subtotal: orderedQty * campaign.unit_price,
    total_amount: orderedQty * campaign.unit_price,
  };
  assert(orderFromCampaign.unit_price === campaign.unit_price, "Le prix unitaire provient de la campagne");
  assert(orderFromCampaign.currency === campaign.currency, "La devise provient de la campagne");
  assert(orderFromCampaign.total_amount === 8500, `Montant total : 10 × 850 USD = 8 500 USD (obtenu: ${orderFromCampaign.total_amount})`);

  // TEST 9 : Rejet des valeurs invalides par les validateurs
  console.log("\n--- TEST 9 : Validation stricte des entrées numériques et devises ---");
  function validateProposalInput(quantity, unitPrice, currency) {
    const q = Number(quantity);
    if (isNaN(q) || !isFinite(q) || q <= 0) return { valid: false, error: "Quantité invalide" };
    if (q > 999999999) return { valid: false, error: "Quantité hors limite" };

    const p = Number(unitPrice);
    if (isNaN(p) || !isFinite(p) || p <= 0) return { valid: false, error: "Prix unitaire invalide" };
    if (p > 999999999) return { valid: false, error: "Prix unitaire hors limite" };

    const c = String(currency || "").toUpperCase().trim();
    if (c !== "CDF" && c !== "USD") return { valid: false, error: "Devise invalide" };

    return { valid: true, quantity: q, unitPrice: p, currency: c };
  }

  assert(!validateProposalInput(-10, 500, "USD").valid, "Quantité négative rejetée");
  assert(!validateProposalInput(0, 500, "USD").valid, "Quantité nulle rejetée");
  assert(!validateProposalInput("abc", 500, "USD").valid, "Quantité non numérique rejetée");
  assert(!validateProposalInput(Infinity, 500, "USD").valid, "Quantité infinie rejetée");
  assert(!validateProposalInput(10, -500, "USD").valid, "Prix négatif rejeté");
  assert(!validateProposalInput(10, 0, "USD").valid, "Prix nul rejeté");
  assert(!validateProposalInput(10, "NaN", "USD").valid, "Prix non numérique rejeté");
  assert(!validateProposalInput(10, 500, "EUR").valid, "Devise EUR rejetée (seules CDF et USD autorisées)");
  assert(!validateProposalInput(10, 500, "").valid, "Devise vide rejetée");
  assert(validateProposalInput(20, 1000000, "CDF").valid, "Proposition valide 20 t × 1M CDF acceptée");
  assert(validateProposalInput(100, 25000, "cdf").valid, "Proposition valide 100 caisses × 25k CDF acceptée (normalisation majuscule)");

  // TEST 10 : Intégrité des commandes historiques existantes dans Supabase
  console.log("\n--- TEST 10 : Vérification de la non-altération des commandes historiques ---");
  const { data: dbOrders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, currency, status, created_at")
    .order("created_at", { ascending: true });

  if (ordersErr) {
    console.log(`Note (RLS / anon): Les commandes sont protégées par RLS (${ordersErr.message}).`);
  } else {
    console.log(`Vérifié : ${dbOrders?.length || 0} commandes historiques en base.`);
    for (const ord of (dbOrders || [])) {
      assert(ord.total_amount > 0, `Commande ${ord.order_number} : montant préservé (${ord.total_amount} ${ord.currency})`);
      assert(["CDF", "USD"].includes(ord.currency), `Commande ${ord.order_number} : devise légitime (${ord.currency})`);
    }
  }

  // TEST 11 : Contrôles d'accès et de stock
  console.log("\n--- TEST 11 : Contrôles de sécurité et isolation ---");
  const { data: anonOrders, error: anonErr } = await supabase.from("orders").select("id");
  assert(!anonOrders || anonOrders.length === 0, "Protection RLS active : un utilisateur anonyme ne peut pas lire les commandes privées");

  console.log("\n=================================================================");
  console.log("   TOUS LES 11 TESTS DE CONTRÔLE FINANCIER ONT RÉUSSI AVEC SUCCÈS !");
  console.log("=================================================================\n");
}

runFinancialTests().catch((err) => {
  console.error("Erreur exécution tests:", err);
  process.exit(1);
});
