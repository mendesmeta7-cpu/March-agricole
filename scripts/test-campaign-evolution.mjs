import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gonerlgkdnbdewjbebvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmVybGdrZG5iZGV3amJlYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzQzOTgsImV4cCI6MjEwNDUxMDM5OH0.T1_nF5NQVUSFbQhQMfsG88oyjfAOFPFOBavCQqLfwmg";

async function runCampaignEvolutionSuite() {
  console.log("================================================================================");
  console.log("SUITE D'HOMOLOGATION : NOUVEAU FONCTIONNEMENT DES CAMPAGNES (PARTIE 5)");
  console.log("================================================================================");

  const testSuffix = Math.random().toString(36).substring(2, 8);
  const companyEmail = `agricom.test.${testSuffix}@gmail.com`;
  const resellerKinEmail = `reseller.kin.${testSuffix}@gmail.com`;
  const resellerMatadiEmail = `reseller.matadi.${testSuffix}@gmail.com`;
  const testPassword = "Password123!Secure";

  const clientAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let companyClient = null;
  let resellerKinClient = null;
  let resellerMatadiClient = null;

  let companyId = null;
  let resellerKinId = null;
  let resellerMatadiId = null;

  let provinceKinId = null;
  let provinceKongoCentralId = null;

  let productId = null;
  let companyProductId = null;
  let productionId = null;
  let campaignId = null;

  let destKinId = null;
  let destMatadiId = null;
  let depotLembaId = null;
  let depotLimeteId = null;
  let depotMatadi1Id = null;

  let orderKinId = null;

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Échec de l'assertion : ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 0. CHARGEMENT DU RÉFÉRENTIEL GÉOGRAPHIQUE & PRODUIT
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 0 : Initialisation Référentiel ---");
    const { data: kinProv } = await clientAnon
      .from("provinces")
      .select("id, name")
      .ilike("name", "%Kinshasa%")
      .single();

    assert(kinProv?.id, "Province Kinshasa trouvée");
    provinceKinId = kinProv.id;

    const { data: kcProv } = await clientAnon
      .from("provinces")
      .select("id, name")
      .ilike("name", "%Kongo%")
      .single();

    assert(kcProv?.id, "Province Kongo-Central trouvée");
    provinceKongoCentralId = kcProv.id;

    const { data: product } = await clientAnon
      .from("products")
      .select("id, name")
      .ilike("name", "%Maïs%")
      .limit(1)
      .single();

    assert(product?.id, `Produit Maïs trouvé (${product.name})`);
    productId = product.id;

    // -------------------------------------------------------------------------
    // 1. INSCRIPTION SOCIÉTÉ A + REVENDEUR KINSHASA + REVENDEUR MATADI
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 1 : Inscriptions des comptes réels (Isolation) ---");
    
    // Société A
    const { data: compAuth, error: compErr } = await clientAnon.auth.signUp({
      email: companyEmail,
      password: testPassword,
      options: {
        data: {
          role: "company",
          full_name: "Directeur Société A",
          company_name: `AgriSociété A ${testSuffix}`,
          province_id: provinceKinId,
          city: "Kinshasa",
        },
      },
    });
    assert(!compErr && compAuth.user, `Société A inscrite (${companyEmail})`);

    companyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: compLogin, error: cLogErr } = await companyClient.auth.signInWithPassword({
      email: companyEmail,
      password: testPassword,
    });
    assert(!cLogErr && compLogin.session, "Session Société A établie");

    const { data: compRow } = await companyClient
      .from("company_members")
      .select("company_id")
      .eq("user_id", compAuth.user.id)
      .single();
    companyId = compRow.company_id;
    assert(companyId, `Company ID résolu : ${companyId}`);

    // Revendeur B (Kinshasa)
    const { data: resKinAuth, error: resKinErr } = await clientAnon.auth.signUp({
      email: resellerKinEmail,
      password: testPassword,
      options: {
        data: {
          role: "reseller",
          full_name: "Revendeur B Kinshasa",
          province_id: provinceKinId,
          city: "Kinshasa",
        },
      },
    });
    assert(!resKinErr && resKinAuth.user, `Revendeur B (Kinshasa) inscrit (${resKinEmail})`);

    resellerKinClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: resKinLogin, error: rkLogErr } = await resellerKinClient.auth.signInWithPassword({
      email: resellerKinEmail,
      password: testPassword,
    });
    assert(!rkLogErr && resKinLogin.session, "Session Revendeur B établie");

    const { data: resKinRow } = await resellerKinClient
      .from("resellers")
      .select("id")
      .eq("profile_id", resKinAuth.user.id)
      .single();
    resellerKinId = resKinRow.id;
    assert(resellerKinId, `Reseller B ID résolu : ${resellerKinId}`);

    // Revendeur C (Matadi)
    const { data: resMatAuth, error: resMatErr } = await clientAnon.auth.signUp({
      email: resellerMatadiEmail,
      password: testPassword,
      options: {
        data: {
          role: "reseller",
          full_name: "Revendeur C Matadi",
          province_id: provinceKongoCentralId,
          city: "Matadi",
        },
      },
    });
    assert(!resMatErr && resMatAuth.user, `Revendeur C (Matadi) inscrit (${resellerMatadiEmail})`);

    resellerMatadiClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: resMatLogin, error: rmLogErr } = await resellerMatadiClient.auth.signInWithPassword({
      email: resellerMatadiEmail,
      password: testPassword,
    });
    assert(!rmLogErr && resMatLogin.session, "Session Revendeur C établie");

    const { data: resMatRow } = await resellerMatadiClient
      .from("resellers")
      .select("id")
      .eq("profile_id", resMatAuth.user.id)
      .single();
    resellerMatadiId = resMatRow.id;
    assert(resellerMatadiId, `Reseller C ID résolu : ${resellerMatadiId}`);

    // -------------------------------------------------------------------------
    // 2. CONFIGURATION PRODUIT & PRODUCTION RECOLTEE PAR SOCIÉTÉ A
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 2 : Création de la production de Maïs (Statut: harvested) ---");

    const { data: cpData, error: cpErr } = await companyClient
      .from("company_products")
      .insert({
        company_id: companyId,
        product_id: productId,
        custom_name: "Maïs Grain Blanc Récolté",
        unit: "tonne",
      })
      .select()
      .single();
    assert(!cpErr && cpData?.id, "Produit d'exploitation associé");
    companyProductId = cpData.id;

    const { data: prodData, error: prodErr } = await companyClient
      .from("productions")
      .insert({
        company_id: companyId,
        company_product_id: companyProductId,
        product_id: productId,
        title: "Maïs Récolte Saison A",
        status: "harvested", // STRICTEMENT RECOLTEE
        expected_quantity: 100,
        unit: "tonne",
        is_public: true,
        harvest_start_date: "2026-09-01",
        harvest_end_date: "2026-09-10",
      })
      .select()
      .single();
    assert(!prodErr && prodData?.id, "Production de Maïs RECOLTEE créée (100 tonnes)");
    productionId = prodData.id;

    // -------------------------------------------------------------------------
    // 3. CRÉATION D'UNE CAMPAGNE MULTI-VILLES AVEC DÉPÔTS
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 3 : Création de la campagne multi-villes et dépôts ---");
    // Kinshasa (12 sept, dépôts Lemba & Limete) + Matadi (15 sept, Dépôt 1)

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDateStr = tomorrow.toISOString().split("T")[0];

    const { data: campData, error: campErr } = await companyClient
      .from("campaigns")
      .insert({
        company_id: companyId,
        production_id: productionId,
        title: "Campagne Maïs Blanc Multi-Villes",
        marketable_quantity: 50,
        unit_price: 350,
        currency: "USD",
        min_order_quantity: 2,
        start_date: new Date().toISOString().split("T")[0],
        end_date: endDateStr,
        status: "active",
      })
      .select()
      .single();

    assert(!campErr && campData?.id, "Campagne commerciale active créée");
    campaignId = campData.id;

    // Zones de livraison
    await companyClient.from("campaign_delivery_zones").insert([
      { campaign_id: campaignId, province_id: provinceKinId },
      { campaign_id: campaignId, province_id: provinceKongoCentralId },
    ]);

    // Destination 1 : Kinshasa (12 septembre)
    const { data: destKin, error: destKinErr } = await companyClient
      .from("campaign_destinations")
      .insert({
        campaign_id: campaignId,
        province_id: provinceKinId,
        city_name: "Kinshasa",
        expected_arrival_date: "2026-09-12",
      })
      .select()
      .single();
    assert(!destKinErr && destKin?.id, "Destination Kinshasa enregistrée (12 septembre)");
    destKinId = destKin.id;

    // Dépôts Kinshasa : Lemba & Limete
    const { data: depotLemba, error: depLErr } = await companyClient
      .from("campaign_depots")
      .insert({
        destination_id: destKinId,
        name: "Dépôt Lemba",
        commune: "Lemba",
        quartier: "Quartier Échangeur",
        address: "1ère Rue n°12",
        complement: "Près du rond-point",
      })
      .select()
      .single();
    assert(!depLErr && depotLemba?.id, "Dépôt 1 Lemba créé");
    depotLembaId = depotLemba.id;

    const { data: depotLimete, error: depLimErr } = await companyClient
      .from("campaign_depots")
      .insert({
        destination_id: destKinId,
        name: "Dépôt Limete",
        commune: "Limete",
        quartier: "Industriel",
        address: "14ème Rue Poids Lourds",
        complement: "Face entrepôt Bralima",
      })
      .select()
      .single();
    assert(!depLimErr && depotLimete?.id, "Dépôt 2 Limete créé");
    depotLimeteId = depotLimete.id;

    // Destination 2 : Matadi (15 septembre)
    const { data: destMatadi, error: destMatErr } = await companyClient
      .from("campaign_destinations")
      .insert({
        campaign_id: campaignId,
        province_id: provinceKongoCentralId,
        city_name: "Matadi",
        expected_arrival_date: "2026-09-15",
      })
      .select()
      .single();
    assert(!destMatErr && destMatadi?.id, "Destination Matadi enregistrée (15 septembre)");
    destMatadiId = destMatadi.id;

    // Dépôt Matadi : Dépôt Port
    const { data: depotMat1, error: depMatErr } = await companyClient
      .from("campaign_depots")
      .insert({
        destination_id: destMatadiId,
        name: "Dépôt Port Matadi",
        commune: "Matadi",
        quartier: "Kinkanda",
        address: "Avenue du Port",
        complement: "Hangar n°3",
      })
      .select()
      .single();
    assert(!depMatErr && depotMat1?.id, "Dépôt Matadi créé");
    depotMatadi1Id = depotMat1.id;

    // -------------------------------------------------------------------------
    // 4. COMMANDE DU REVENDEUR B (KINSHASA, 10 TONNES, DÉPÔT LEMBA)
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 4 : Commande Revendeur B (10 tonnes, Kinshasa, Lemba) ---");

    const { data: orderRes, error: orderErr } = await resellerKinClient.rpc(
      "create_order_with_reservation",
      {
        p_campaign_id: campaignId,
        p_reseller_id: resellerKinId,
        p_company_id: companyId,
        p_delivery_province_id: provinceKinId,
        p_delivery_city: "Kinshasa",
        p_delivery_address: "Dépôt Lemba (1ère Rue n°12)",
        p_quantity: 10,
        p_notes: "Enlèvement prévu par nos camions",
        p_destination_id: destKinId,
        p_depot_id: depotLembaId,
      }
    );

    assert(!orderErr && orderRes, `Commande créée avec succès (N°: ${orderRes?.order_number})`);
    orderKinId = orderRes.order_id;

    // Vérification des snapshots immuables dans la commande
    const { data: orderDetail } = await resellerKinClient
      .from("orders")
      .select("id, order_number, expected_arrival_date_snapshot, destination_city_snapshot, depot_name_snapshot, destination_id, depot_id")
      .eq("id", orderKinId)
      .single();

    assert(orderDetail?.destination_city_snapshot === "Kinshasa", "Snapshot ville = Kinshasa");
    assert(orderDetail?.expected_arrival_date_snapshot === "2026-09-12", "Snapshot date d'arrivée = 2026-09-12");
    assert(orderDetail?.depot_name_snapshot === "Dépôt Lemba", "Snapshot dépôt = Dépôt Lemba");
    assert(orderDetail?.destination_id === destKinId, "Liaison destination_id OK");
    assert(orderDetail?.depot_id === depotLembaId, "Liaison depot_id OK");

    // -------------------------------------------------------------------------
    // 5. REPORT DE DATE POUR KINSHASA (12 SEPT -> 15 SEPT) PAR LA SOCIÉTÉ A
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 5 : Modification / Report de date par la société ---");

    const { data: reportResult, error: reportErr } = await companyClient.rpc(
      "update_destination_arrival_date",
      {
        p_destination_id: destKinId,
        p_new_arrival_date: "2026-09-15",
      }
    );

    assert(!reportErr, "Procédure update_destination_arrival_date exécutée sans erreur");
    assert(reportResult?.affected_orders_count >= 1, "Au moins 1 commande active mise à jour");

    // Vérification : la date de la commande Kinshasa est passée au 15 septembre
    const { data: updatedOrder } = await resellerKinClient
      .from("orders")
      .select("expected_arrival_date_snapshot")
      .eq("id", orderKinId)
      .single();

    assert(
      updatedOrder?.expected_arrival_date_snapshot === "2026-09-15",
      "La date de la commande du revendeur B est passée au 2026-09-15"
    );

    // -------------------------------------------------------------------------
    // 6. VÉRIFICATION DU CIBLAGE STRICT DES NOTIFICATIONS
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 6 : Vérification du ciblage des notifications ---");

    // Revendeur B (Kinshasa) : doit avoir reçu la notification DATE_ARRIVEE_MODIFIEE
    const { data: notifsKin } = await resellerKinClient
      .from("notifications")
      .select("type, title, message")
      .eq("type", "DATE_ARRIVEE_MODIFIEE");

    assert(
      notifsKin && notifsKin.length > 0,
      `Revendeur B a bien reçu la notification : "${notifsKin?.[0]?.message}"`
    );

    // Revendeur C (Matadi) : ne doit PAS avoir reçu cette notification
    const { data: notifsMatadi } = await resellerMatadiClient
      .from("notifications")
      .select("type")
      .eq("type", "DATE_ARRIVEE_MODIFIEE");

    assert(
      !notifsMatadi || notifsMatadi.length === 0,
      "Revendeur C (Matadi) n'a reçu AUCUNE notification de modification pour Kinshasa (Ciblage strict respecté)"
    );

    // -------------------------------------------------------------------------
    // 7. FIN AUTOMATIQUE DE CAMPAGNE (CLÔTURE À DATE D'EXPIRATION)
    // -------------------------------------------------------------------------
    console.log("\n--- ÉTAPE 7 : Clôture automatique de campagne à date échue ---");

    // Simulons une campagne dont end_date est hier
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    await companyClient
      .from("campaigns")
      .update({ end_date: yesterdayStr })
      .eq("id", campaignId);

    // Exécution de la RPC de vérification
    const { data: expiredCount, error: closeErr } = await clientAnon.rpc(
      "check_and_close_expired_campaigns"
    );

    assert(!closeErr, "Procédure check_and_close_expired_campaigns exécutée avec succès");

    const { data: closedCampaign } = await clientAnon
      .from("campaigns")
      .select("status")
      .eq("id", campaignId)
      .single();

    assert(
      closedCampaign?.status === "completed",
      "La campagne expirée est automatiquement passée au statut 'completed'"
    );

    // Vérifions qu'une nouvelle commande est maintenant bloquée
    const { error: blockOrderErr } = await resellerKinClient.rpc(
      "create_order_with_reservation",
      {
        p_campaign_id: campaignId,
        p_reseller_id: resellerKinId,
        p_company_id: companyId,
        p_delivery_province_id: provinceKinId,
        p_delivery_city: "Kinshasa",
        p_delivery_address: "Dépôt Lemba",
        p_quantity: 2,
        p_destination_id: destKinId,
        p_depot_id: depotLembaId,
      }
    );

    assert(
      Boolean(blockOrderErr),
      "Toute nouvelle commande est formellement bloquée sur la campagne terminée"
    );

    console.log("\n================================================================================");
    console.log(`RÉSULTAT GLOBAL : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS (100%)`);
    console.log("================================================================================");

  } catch (err) {
    console.error("\n❌ ERREUR LORS DE L'EXÉCUTION DU SCÉNARIO :", err);
    process.exit(1);
  }
}

runCampaignEvolutionSuite();
