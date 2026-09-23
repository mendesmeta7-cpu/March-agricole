-- ====================================================================
-- TEST SUITE PHASE 21 : ÉLIGIBILITÉ RÉGIONALE DES COMMANDES REVENDEURS
-- ====================================================================
-- Date : 2026-09-23
-- Objectif :
--   Valider à 100% les scénarios d'éligibilité régionale et le test de contournement.
--   Section 14 : Matrice 3 Revendeurs x 3 Campagnes.
--   Section 15 : Tentative de contournement malveillant repoussée côté serveur.

DO $$
DECLARE
    v_country_id UUID;
    v_prov_kinshasa UUID;
    v_prov_kongo_central UUID;
    v_prov_haut_katanga UUID;

    v_company_user UUID := gen_random_uuid();
    v_company_id UUID;
    v_product_id UUID;
    v_production_id UUID;

    v_reseller_a_user UUID := gen_random_uuid();
    v_reseller_b_user UUID := gen_random_uuid();
    v_reseller_c_user UUID := gen_random_uuid();

    v_camp1_id UUID; -- Kinshasa + Haut-Katanga
    v_camp1_dest_kin UUID;
    v_camp1_dest_kat UUID;

    v_camp2_id UUID; -- Kongo-Central + Kinshasa
    v_camp2_dest_kongo UUID;
    v_camp2_dest_kin UUID;

    v_camp3_id UUID; -- Kongo-Central uniquement
    v_camp3_dest_kongo UUID;

    v_order_res RECORD;
    v_err_caught BOOLEAN;
    v_reserved_qty NUMERIC;
BEGIN
    RAISE NOTICE '>>> DÉBUT DES TESTS PHASE 21 : ÉLIGIBILITÉ RÉGIONALE DES COMMANDES <<<';

    -- 1. Récupération des provinces officielles RDC
    SELECT id, country_id INTO v_prov_kinshasa, v_country_id FROM public.provinces WHERE name ILIKE '%Kinshasa%' LIMIT 1;
    SELECT id INTO v_prov_kongo_central FROM public.provinces WHERE name ILIKE '%Kongo%' LIMIT 1;
    SELECT id INTO v_prov_haut_katanga FROM public.provinces WHERE name ILIKE '%Katanga%' LIMIT 1;

    ASSERT v_prov_kinshasa IS NOT NULL, 'Province Kinshasa introuvable';
    ASSERT v_prov_kongo_central IS NOT NULL, 'Province Kongo-Central introuvable';
    ASSERT v_prov_haut_katanga IS NOT NULL, 'Province Haut-Katanga introuvable';

    -- 2. Création de l'entreprise agricole et production récoltée
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_user, 'company_p21_' || substr(v_company_user::text, 1, 8) || '@test.com', '{"role":"company"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (v_company_user, 'company', 'Agri Test Company P21', '+243810000021')
    ON CONFLICT (id) DO UPDATE SET role = 'company', full_name = 'Agri Test Company P21';

    v_company_id := gen_random_uuid();
    INSERT INTO public.companies (id, name, slug, country_id, province_id, created_by, is_active, verification_status)
    VALUES (v_company_id, 'Agri Ferme P21', 'agri-ferme-p21-' || SUBSTRING(gen_random_uuid()::text, 1, 6), v_country_id, v_prov_kinshasa, v_company_user, true, 'verified');

    SELECT id INTO v_product_id FROM public.products LIMIT 1;
    ASSERT v_product_id IS NOT NULL, 'Aucun produit dans la base';

    v_production_id := gen_random_uuid();
    INSERT INTO public.productions (id, company_id, product_id, title, main_image_url, location_name, expected_quantity, unit, period_start, status)
    VALUES (v_production_id, v_company_id, v_product_id, 'Production Maïs P21', 'https://example.com/test-corn.jpg', 'Ferme de Kinshasa', 1000, 'tonne', CURRENT_DATE - 10, 'harvested');

    -- 3. Création des 3 Revendeurs
    -- REVENDEUR A : Kinshasa
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_a_user, 'reseller_a_kin_' || substr(v_reseller_a_user::text, 1, 8) || '@test.com', '{"role":"reseller"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, full_name) VALUES (v_reseller_a_user, 'reseller', 'Revendeur A (Kinshasa)')
    ON CONFLICT (id) DO UPDATE SET role = 'reseller', full_name = 'Revendeur A (Kinshasa)';

    INSERT INTO public.resellers (id, country_id, province_id, business_name, city)
    VALUES (v_reseller_a_user, v_country_id, v_prov_kinshasa, 'Ets Kinshasa A', 'Kinshasa')
    ON CONFLICT (id) DO UPDATE SET province_id = v_prov_kinshasa, business_name = 'Ets Kinshasa A';

    -- REVENDEUR B : Kongo-Central
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_b_user, 'reseller_b_kc_' || substr(v_reseller_b_user::text, 1, 8) || '@test.com', '{"role":"reseller"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, full_name) VALUES (v_reseller_b_user, 'reseller', 'Revendeur B (Kongo-Central)')
    ON CONFLICT (id) DO UPDATE SET role = 'reseller', full_name = 'Revendeur B (Kongo-Central)';

    INSERT INTO public.resellers (id, country_id, province_id, business_name, city)
    VALUES (v_reseller_b_user, v_country_id, v_prov_kongo_central, 'Ets Matadi B', 'Matadi')
    ON CONFLICT (id) DO UPDATE SET province_id = v_prov_kongo_central, business_name = 'Ets Matadi B';

    -- REVENDEUR C : Haut-Katanga
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_c_user, 'reseller_c_kat_' || substr(v_reseller_c_user::text, 1, 8) || '@test.com', '{"role":"reseller"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, full_name) VALUES (v_reseller_c_user, 'reseller', 'Revendeur C (Haut-Katanga)')
    ON CONFLICT (id) DO UPDATE SET role = 'reseller', full_name = 'Revendeur C (Haut-Katanga)';

    INSERT INTO public.resellers (id, country_id, province_id, business_name, city)
    VALUES (v_reseller_c_user, v_country_id, v_prov_haut_katanga, 'Ets Lubumbashi C', 'Lubumbashi')
    ON CONFLICT (id) DO UPDATE SET province_id = v_prov_haut_katanga, business_name = 'Ets Lubumbashi C';

    -- 4. Création des 3 Campagnes
    -- CAMPAGNE 1 : Kinshasa + Haut-Katanga
    v_camp1_id := gen_random_uuid();
    INSERT INTO public.campaigns (id, company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, min_order_quantity, start_date, status)
    VALUES (v_camp1_id, v_company_id, v_production_id, v_product_id, 'Campagne 1 (Kin + Kat)', 500, 'tonne', 450, 'USD', 1, CURRENT_DATE - 1, 'active');

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES
    (v_camp1_id, v_country_id, v_prov_kinshasa),
    (v_camp1_id, v_country_id, v_prov_haut_katanga);

    v_camp1_dest_kin := gen_random_uuid();
    INSERT INTO public.campaign_destinations (id, campaign_id, province_id, city_name, expected_arrival_date)
    VALUES (v_camp1_dest_kin, v_camp1_id, v_prov_kinshasa, 'Kinshasa', CURRENT_DATE + 5);

    v_camp1_dest_kat := gen_random_uuid();
    INSERT INTO public.campaign_destinations (id, campaign_id, province_id, city_name, expected_arrival_date)
    VALUES (v_camp1_dest_kat, v_camp1_id, v_prov_haut_katanga, 'Lubumbashi', CURRENT_DATE + 7);

    -- CAMPAGNE 2 : Kongo-Central + Kinshasa
    v_camp2_id := gen_random_uuid();
    INSERT INTO public.campaigns (id, company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, min_order_quantity, start_date, status)
    VALUES (v_camp2_id, v_company_id, v_production_id, v_product_id, 'Campagne 2 (Kongo + Kin)', 300, 'tonne', 420, 'USD', 1, CURRENT_DATE - 1, 'active');

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES
    (v_camp2_id, v_country_id, v_prov_kongo_central),
    (v_camp2_id, v_country_id, v_prov_kinshasa);

    v_camp2_dest_kongo := gen_random_uuid();
    INSERT INTO public.campaign_destinations (id, campaign_id, province_id, city_name, expected_arrival_date)
    VALUES (v_camp2_dest_kongo, v_camp2_id, v_prov_kongo_central, 'Matadi', CURRENT_DATE + 4);

    v_camp2_dest_kin := gen_random_uuid();
    INSERT INTO public.campaign_destinations (id, campaign_id, province_id, city_name, expected_arrival_date)
    VALUES (v_camp2_dest_kin, v_camp2_id, v_prov_kinshasa, 'Kinshasa', CURRENT_DATE + 6);

    -- CAMPAGNE 3 : Kongo-Central uniquement
    v_camp3_id := gen_random_uuid();
    INSERT INTO public.campaigns (id, company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, min_order_quantity, start_date, status)
    VALUES (v_camp3_id, v_company_id, v_production_id, v_product_id, 'Campagne 3 (Kongo seul)', 200, 'tonne', 400, 'USD', 1, CURRENT_DATE - 1, 'active');

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES
    (v_camp3_id, v_country_id, v_prov_kongo_central);

    v_camp3_dest_kongo := gen_random_uuid();
    INSERT INTO public.campaign_destinations (id, campaign_id, province_id, city_name, expected_arrival_date)
    VALUES (v_camp3_dest_kongo, v_camp3_id, v_prov_kongo_central, 'Boma', CURRENT_DATE + 3);

    -- ====================================================================
    -- TEST 1 : CAMPAGNE 1 (Kinshasa + Haut-Katanga)
    -- ====================================================================
    RAISE NOTICE '>>> TEST 1 : Campagne 1 (Kinshasa + Haut-Katanga)';

    -- 1.A. Revendeur A (Kinshasa) -> Doit réussir
    SELECT * INTO v_order_res FROM public.create_order_with_reservation(
        v_reseller_a_user, v_camp1_id, 10, v_prov_kinshasa, 'Kinshasa', 'Dépôt Limete', 'Test 1.A', v_camp1_dest_kin, NULL
    );
    ASSERT v_order_res.order_id IS NOT NULL, 'Échec Test 1.A : Revendeur A doit pouvoir commander sur Campagne 1';
    RAISE NOTICE '✅ 1.A : Revendeur A (Kinshasa) autorisé avec succès (CMD %)', v_order_res.order_number;

    -- 1.B. Revendeur B (Kongo-Central) -> Doit être REFUSÉ
    v_err_caught := false;
    BEGIN
        SELECT * INTO v_order_res FROM public.create_order_with_reservation(
            v_reseller_b_user, v_camp1_id, 10, v_prov_kongo_central, 'Matadi', 'Dépôt Port', 'Test 1.B', NULL, NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        ASSERT SQLERRM ILIKE '%pas disponible dans votre région%', 'Message inattendu: ' || SQLERRM;
    END;
    ASSERT v_err_caught, 'Échec Test 1.B : Revendeur B ne doit PAS pouvoir commander sur Campagne 1';
    RAISE NOTICE '✅ 1.B : Revendeur B (Kongo-Central) refusé avec succès';

    -- 1.C. Revendeur C (Haut-Katanga) -> Doit réussir
    SELECT * INTO v_order_res FROM public.create_order_with_reservation(
        v_reseller_c_user, v_camp1_id, 15, v_prov_haut_katanga, 'Lubumbashi', 'Dépôt Kenya', 'Test 1.C', v_camp1_dest_kat, NULL
    );
    ASSERT v_order_res.order_id IS NOT NULL, 'Échec Test 1.C : Revendeur C doit pouvoir commander sur Campagne 1';
    RAISE NOTICE '✅ 1.C : Revendeur C (Haut-Katanga) autorisé avec succès (CMD %)', v_order_res.order_number;

    -- ====================================================================
    -- TEST 2 : CAMPAGNE 2 (Kongo-Central + Kinshasa)
    -- ====================================================================
    RAISE NOTICE '>>> TEST 2 : Campagne 2 (Kongo-Central + Kinshasa)';

    -- 2.A. Revendeur A (Kinshasa) -> Doit réussir
    SELECT * INTO v_order_res FROM public.create_order_with_reservation(
        v_reseller_a_user, v_camp2_id, 5, v_prov_kinshasa, 'Kinshasa', 'Dépôt Gombe', 'Test 2.A', v_camp2_dest_kin, NULL
    );
    ASSERT v_order_res.order_id IS NOT NULL, 'Échec Test 2.A';
    RAISE NOTICE '✅ 2.A : Revendeur A (Kinshasa) autorisé sur Campagne 2';

    -- 2.B. Revendeur B (Kongo-Central) -> Doit réussir
    SELECT * INTO v_order_res FROM public.create_order_with_reservation(
        v_reseller_b_user, v_camp2_id, 8, v_prov_kongo_central, 'Matadi', 'Dépôt Centre', 'Test 2.B', v_camp2_dest_kongo, NULL
    );
    ASSERT v_order_res.order_id IS NOT NULL, 'Échec Test 2.B';
    RAISE NOTICE '✅ 2.B : Revendeur B (Kongo-Central) autorisé sur Campagne 2';

    -- 2.C. Revendeur C (Haut-Katanga) -> Doit être REFUSÉ
    v_err_caught := false;
    BEGIN
        SELECT * INTO v_order_res FROM public.create_order_with_reservation(
            v_reseller_c_user, v_camp2_id, 5, v_prov_haut_katanga, 'Lubumbashi', 'Dépôt', 'Test 2.C', NULL, NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        ASSERT SQLERRM ILIKE '%pas disponible dans votre région%', 'Message inattendu: ' || SQLERRM;
    END;
    ASSERT v_err_caught, 'Échec Test 2.C : Revendeur C ne doit pas commander sur Campagne 2';
    RAISE NOTICE '✅ 2.C : Revendeur C (Haut-Katanga) refusé avec succès sur Campagne 2';

    -- ====================================================================
    -- TEST 3 : CAMPAGNE 3 (Kongo-Central uniquement)
    -- ====================================================================
    RAISE NOTICE '>>> TEST 3 : Campagne 3 (Kongo-Central uniquement)';

    -- 3.A. Revendeur A (Kinshasa) -> Doit être REFUSÉ
    v_err_caught := false;
    BEGIN
        SELECT * INTO v_order_res FROM public.create_order_with_reservation(
            v_reseller_a_user, v_camp3_id, 5, v_prov_kinshasa, 'Kinshasa', 'Dépôt', 'Test 3.A', NULL, NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        ASSERT SQLERRM ILIKE '%pas disponible dans votre région%', 'Message inattendu: ' || SQLERRM;
    END;
    ASSERT v_err_caught, 'Échec Test 3.A';
    RAISE NOTICE '✅ 3.A : Revendeur A refusé avec succès sur Campagne 3';

    -- 3.B. Revendeur B (Kongo-Central) -> Doit réussir
    SELECT * INTO v_order_res FROM public.create_order_with_reservation(
        v_reseller_b_user, v_camp3_id, 12, v_prov_kongo_central, 'Boma', 'Dépôt Boma', 'Test 3.B', v_camp3_dest_kongo, NULL
    );
    ASSERT v_order_res.order_id IS NOT NULL, 'Échec Test 3.B';
    RAISE NOTICE '✅ 3.B : Revendeur B autorisé avec succès sur Campagne 3';

    -- 3.C. Revendeur C (Haut-Katanga) -> Doit être REFUSÉ
    v_err_caught := false;
    BEGIN
        SELECT * INTO v_order_res FROM public.create_order_with_reservation(
            v_reseller_c_user, v_camp3_id, 5, v_prov_haut_katanga, 'Lubumbashi', 'Dépôt', 'Test 3.C', NULL, NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        ASSERT SQLERRM ILIKE '%pas disponible dans votre région%', 'Message inattendu: ' || SQLERRM;
    END;
    ASSERT v_err_caught, 'Échec Test 3.C';
    RAISE NOTICE '✅ 3.C : Revendeur C refusé avec succès sur Campagne 3';

    -- ====================================================================
    -- TEST 4 : TEST DE CONTOURNEMENT MALVEILLANT (SECTION 15)
    -- ====================================================================
    RAISE NOTICE '>>> TEST 4 : Test de contournement malveillant';
    -- Revendeur B (Kongo-Central) tente de forcer une commande sur Campagne 1 (Kinshasa + Haut-Katanga)
    -- en injectant artificiellement l'UUID de destination de Kinshasa (v_camp1_dest_kin)
    v_err_caught := false;
    BEGIN
        SELECT * INTO v_order_res FROM public.create_order_with_reservation(
            v_reseller_b_user,
            v_camp1_id,
            20,
            v_prov_kinshasa, -- Fausse province client
            'Kinshasa',
            'Tentative d injection',
            'Bypass attempt',
            v_camp1_dest_kin, -- Destination de Kinshasa
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        RAISE NOTICE 'Contournement bloqué avec message : %', SQLERRM;
    END;

    ASSERT v_err_caught, 'CRITIQUE : Le serveur a laissé passer une tentative de contournement !';

    -- Vérification qu'aucune réservation fantôme n'a été créée pour ce contournement
    SELECT COUNT(*) INTO v_reserved_qty
    FROM public.orders
    WHERE reseller_id = v_reseller_b_user AND campaign_id = v_camp1_id;

    ASSERT v_reserved_qty = 0, 'CRITIQUE : Une commande fantôme a été insérée !';
    RAISE NOTICE '✅ TEST 4 : Tentative de contournement strictement repoussée par le serveur (0 commande créée, 0 stock réservé)';

    RAISE NOTICE '>>> TOUS LES TESTS DE LA PHASE 21 SONT VALIDÉS AVEC SUCCÈS À 100%% ! <<<';
END $$;
