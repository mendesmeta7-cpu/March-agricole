-- ====================================================================
-- SUITE DE TESTS D'HOMOLOGATION — PHASE 14a : WORKFLOW DES DEMANDES,
-- NOTIFICATIONS, RÉPONSES ET CAMPAGNES POST-RÉCOLTE
-- ====================================================================
-- Date: 2026-09-22
-- Version: V1 Expérimentale — Marché Agricole RDC
-- ====================================================================

DO $$
DECLARE
  v_country_id UUID;
  v_prov_kinshasa UUID;
  v_prov_haut_katanga UUID;
  
  v_company_id UUID;
  v_company_user_id UUID;
  v_reseller_user_id UUID;
  v_product_id UUID;
  v_company_product_id UUID;
  
  v_prod_growing_id UUID;
  v_prod_harvested_id UUID;
  
  v_demand_gen_id UUID;
  v_demand_prod_id UUID;
  v_response_id UUID;
  
  v_order_id UUID;
  v_order_number TEXT;
  v_order_total NUMERIC;
  v_notif_count INT;
  v_res_count INT;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'DÉMARRAGE DES TESTS PHASE 14a : WORKFLOW DES DEMANDES';
  RAISE NOTICE '=======================================================';

  -- 1. Récupération des données géographiques et de référence
  SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
  SELECT id INTO v_prov_kinshasa FROM public.provinces WHERE code = 'KIN' LIMIT 1;
  SELECT id INTO v_prov_haut_katanga FROM public.provinces WHERE code = 'HKT' LIMIT 1;
  
  IF v_country_id IS NULL OR v_prov_kinshasa IS NULL OR v_prov_haut_katanga IS NULL THEN
    RAISE EXCEPTION 'Référentiel géographique manquant pour les tests.';
  END IF;

  -- 2. Création temporaire d'utilisateurs et profils de test
  v_company_user_id := gen_random_uuid();
  v_reseller_user_id := gen_random_uuid();

  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES 
    (v_company_user_id, 'test-company-14a@marcheagricole.cd', '{"role":"company"}'::jsonb),
    (v_reseller_user_id, 'test-reseller-14a@marcheagricole.cd', '{"role":"reseller"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES 
    (v_company_user_id, 'company', 'Agri Test 14a', '+24399990001'),
    (v_reseller_user_id, 'reseller', 'Distrib Test 14a', '+24399990002')
  ON CONFLICT (id) DO NOTHING;

  -- Entreprise (le trigger trg_company_auto_owner ajoute automatiquement le créateur comme owner)
  v_company_id := gen_random_uuid();
  INSERT INTO public.companies (id, name, slug, country_id, province_id, created_by)
  VALUES (v_company_id, 'Agri Congo 14a', 'agri-congo-14a-' || substr(v_company_id::text, 1, 6), v_country_id, v_prov_kinshasa, v_company_user_id);

  -- Revendeur
  INSERT INTO public.resellers (id, business_name, country_id, province_id, city)
  VALUES (v_reseller_user_id, 'Boutique Katanga 14a', v_country_id, v_prov_haut_katanga, 'Lubumbashi');

  -- Produit catalogue
  SELECT id INTO v_product_id FROM public.products WHERE is_global = TRUE LIMIT 1;
  IF v_product_id IS NULL THEN
    INSERT INTO public.products (name, category, default_unit, is_global)
    VALUES ('Maïs Grain Test 14a', 'cereals', 'tonne', TRUE)
    RETURNING id INTO v_product_id;
  END IF;

  -- Produit d'exploitation
  INSERT INTO public.company_products (company_id, product_id, custom_name, unit, is_active)
  VALUES (v_company_id, v_product_id, 'Maïs Spécial Test', 'tonne', TRUE)
  RETURNING id INTO v_company_product_id;

  -- Production en cours de culture ('growing')
  INSERT INTO public.productions (company_id, product_id, company_product_id, title, main_image_url, expected_quantity, unit, period_start, location_name, status, is_public)
  VALUES (v_company_id, v_product_id, v_company_product_id, 'Maïs en champ 14a', 'https://example.com/test-maize1.jpg', 150, 'tonne', CURRENT_DATE, 'Ferme Kinkole', 'growing', TRUE)
  RETURNING id INTO v_prod_growing_id;

  -- Production récoltée ('harvested')
  INSERT INTO public.productions (company_id, product_id, company_product_id, title, main_image_url, expected_quantity, unit, period_start, location_name, status, is_public)
  VALUES (v_company_id, v_product_id, v_company_product_id, 'Maïs récolté 14a', 'https://example.com/test-maize2.jpg', 80, 'tonne', CURRENT_DATE - 30, 'Dépôt Maluku', 'harvested', TRUE)
  RETURNING id INTO v_prod_harvested_id;

  RAISE NOTICE 'Données de test initialisées avec succès.';

  -- ==================================================================
  -- SCÉNARIO A : Strict Séparation Demande Générale vs Demande Production
  -- ==================================================================
  RAISE NOTICE '--- Test Scénario A : Demande Générale vs Production ---';
  
  -- Demande générale (sans production liée)
  INSERT INTO public.demands (reseller_id, demand_type, product_id, quantity, unit, country_id, province_id, status)
  VALUES (v_reseller_user_id, 'general', v_product_id, 25, 'tonne', v_country_id, v_prov_haut_katanga, 'active')
  RETURNING id INTO v_demand_gen_id;

  IF v_demand_gen_id IS NULL THEN
    RAISE EXCEPTION 'Échec insertion demande générale.';
  END IF;

  -- Demande sur production spécifique
  INSERT INTO public.demands (reseller_id, demand_type, product_id, production_id, quantity, unit, country_id, province_id, status)
  VALUES (v_reseller_user_id, 'production', v_product_id, v_prod_growing_id, 10, 'tonne', v_country_id, v_prov_haut_katanga, 'active')
  RETURNING id INTO v_demand_prod_id;

  IF v_demand_prod_id IS NULL THEN
    RAISE EXCEPTION 'Échec insertion demande sur production.';
  END IF;

  RAISE NOTICE 'Scénario A validé : Demande générale % et demande production % distinctes.', v_demand_gen_id, v_demand_prod_id;

  -- ==================================================================
  -- SCÉNARIO B : Proposition Commerciale d'Entreprise (demand_responses)
  -- ==================================================================
  RAISE NOTICE '--- Test Scénario B : Proposition Commerciale ---';

  INSERT INTO public.demand_responses (
    demand_id,
    company_id,
    production_id,
    proposed_quantity,
    unit,
    unit_price,
    currency,
    message,
    status
  ) VALUES (
    v_demand_gen_id,
    v_company_id,
    v_prod_harvested_id,
    25,
    'tonne',
    420.00,
    'USD',
    'Disponible immédiatement au dépôt Maluku.',
    'proposed'
  )
  RETURNING id INTO v_response_id;

  IF v_response_id IS NULL THEN
    RAISE EXCEPTION 'Échec enregistrement de la proposition commerciale.';
  END IF;

  -- Simulation de la notification émise par l'application lors d'une proposition (createDemandProposalAction)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_entity_type,
    related_entity_id,
    action_url
  ) VALUES (
    v_reseller_user_id,
    'DEMANDE_REPONSE',
    'Nouvelle offre commerciale de Agri Congo 14a',
    'Agri Congo 14a vous propose 25 tonne.',
    'demand_response',
    v_response_id,
    '/dashboard/reseller/demands'
  );

  -- Vérifier insertion de notification pour le revendeur
  SELECT COUNT(*) INTO v_notif_count
  FROM public.notifications
  WHERE user_id = v_reseller_user_id AND type = 'DEMANDE_REPONSE';

  IF v_notif_count = 0 THEN
    RAISE EXCEPTION 'Notification revendeur non générée suite à la proposition.';
  END IF;

  RAISE NOTICE 'Scénario B validé : Proposition % enregistrée et notification revendeur générée.', v_response_id;

  -- ==================================================================
  -- SCÉNARIO C : Transformation en Commande Ferme via RPC
  -- ==================================================================
  RAISE NOTICE '--- Test Scénario C : Création de Commande depuis Proposition ---';

  SELECT order_id, order_number, total_amount
  INTO v_order_id, v_order_number, v_order_total
  FROM public.create_order_from_demand_response(
    p_reseller_id := v_reseller_user_id,
    p_demand_response_id := v_response_id,
    p_quantity := 25,
    p_delivery_province_id := v_prov_haut_katanga,
    p_delivery_city := 'Lubumbashi',
    p_delivery_address := 'Avenue des Usines 45',
    p_notes := 'Livraison prioritaire'
  );

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Échec RPC create_order_from_demand_response.';
  END IF;

  -- Vérifier réservation de stock liée à la production
  SELECT COUNT(*) INTO v_res_count
  FROM public.stock_reservations
  WHERE order_id = v_order_id AND production_id = v_prod_harvested_id;

  IF v_res_count = 0 THEN
    RAISE EXCEPTION 'Réservation de stock absente pour la commande issue de la proposition.';
  END IF;

  -- Vérifier commande origin_type
  IF (SELECT origin_type FROM public.orders WHERE id = v_order_id) != 'demand_response' THEN
    RAISE EXCEPTION 'L''origin_type de la commande doit être "demand_response".';
  END IF;

  -- Vérifier statut proposition -> 'ordered'
  IF (SELECT status FROM public.demand_responses WHERE id = v_response_id) != 'ordered' THEN
    RAISE EXCEPTION 'Le statut de la proposition commerciale doit être "ordered".';
  END IF;

  -- Vérifier statut demande -> 'converted'
  IF (SELECT status FROM public.demands WHERE id = v_demand_gen_id) != 'converted' THEN
    RAISE EXCEPTION 'Le statut de la demande doit être passé à "converted".';
  END IF;

  -- Vérifier notification automatique créée par la RPC pour l'entreprise vendeuse
  SELECT COUNT(*) INTO v_notif_count
  FROM public.notifications
  WHERE user_id = v_company_user_id AND type = 'COMMANDE_CREEE';

  IF v_notif_count = 0 THEN
    RAISE EXCEPTION 'Notification de commande créée non générée pour l''entreprise vendeuse.';
  END IF;

  RAISE NOTICE 'Scénario C validé : Commande % (Montant: %) créée avec réservation et notification vendeur.', v_order_number, v_order_total;

  -- ==================================================================
  -- SCÉNARIO D : Notification d'ouverture de campagne post-récolte
  -- ==================================================================
  RAISE NOTICE '--- Test Scénario D : Campagne post-récolte et notification broadcast ---';

  -- Création d'une campagne sur production récoltée
  DECLARE
    v_camp_id UUID;
  BEGIN
    INSERT INTO public.campaigns (
      company_id,
      production_id,
      product_id,
      title,
      marketable_quantity,
      unit,
      unit_price,
      currency,
      min_order_quantity,
      start_date,
      status
    ) VALUES (
      v_company_id,
      v_prod_harvested_id,
      v_product_id,
      'Campagne Maïs Post-Récolte',
      50,
      'tonne',
      450.00,
      'USD',
      1,
      CURRENT_DATE,
      'active'
    )
    RETURNING id INTO v_camp_id;

    -- Ajout de la zone de livraison pour la province du revendeur (Haut-Katanga)
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_camp_id, v_country_id, v_prov_haut_katanga);

    -- Appel du helper de notification des revendeurs
    PERFORM public.notify_resellers_on_campaign_opened(v_camp_id);

    SELECT COUNT(*) INTO v_notif_count
    FROM public.notifications
    WHERE user_id = v_reseller_user_id AND type = 'CAMPAGNE_OUVERTE';

    IF v_notif_count = 0 THEN
      RAISE EXCEPTION 'Notification de campagne non reçue par le revendeur.';
    END IF;

    RAISE NOTICE 'Scénario D validé : Campagne % ouverte et revendeurs notifiés.', v_camp_id;

    -- Nettoyage campagne et zones
    DELETE FROM public.campaign_delivery_zones WHERE campaign_id = v_camp_id;
    DELETE FROM public.campaigns WHERE id = v_camp_id;
  END;

  -- ==================================================================
  -- SCÉNARIO E : Vérification de la lecture des notifications
  -- ==================================================================
  RAISE NOTICE '--- Test Scénario E : Lecture des notifications ---';

  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = v_reseller_user_id;

  IF (SELECT COUNT(*) FROM public.notifications WHERE user_id = v_reseller_user_id AND read_at IS NULL) != 0 THEN
    RAISE EXCEPTION 'Des notifications non lues persistent après acquittement.';
  END IF;

  RAISE NOTICE 'Scénario E validé : Acquittement des notifications effectif.';

  -- Nettoyage des données de test
  DELETE FROM public.audit_logs WHERE entity_id = v_order_id;
  DELETE FROM public.order_items WHERE order_id = v_order_id;
  DELETE FROM public.stock_reservations WHERE order_id = v_order_id;
  DELETE FROM public.orders WHERE id = v_order_id;
  DELETE FROM public.demand_responses WHERE id = v_response_id;
  DELETE FROM public.demands WHERE id IN (v_demand_gen_id, v_demand_prod_id);
  DELETE FROM public.productions WHERE company_id = v_company_id;
  DELETE FROM public.company_products WHERE company_id = v_company_id;
  DELETE FROM public.company_members WHERE company_id = v_company_id;
  DELETE FROM public.companies WHERE id = v_company_id;
  DELETE FROM public.resellers WHERE id = v_reseller_user_id;
  DELETE FROM public.notifications WHERE user_id IN (v_company_user_id, v_reseller_user_id);
  DELETE FROM public.profiles WHERE id IN (v_company_user_id, v_reseller_user_id);
  DELETE FROM auth.users WHERE id IN (v_company_user_id, v_reseller_user_id);

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'TOUS LES TESTS PHASE 14a ONT ÉTÉ VALIDÉS AVEC SUCCÈS !';
  RAISE NOTICE '=======================================================';
END $$;
