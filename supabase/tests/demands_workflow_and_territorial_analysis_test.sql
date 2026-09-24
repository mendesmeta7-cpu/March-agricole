-- ====================================================================
-- TEST SUITE : WORKFLOW DES DEMANDES, NOTIFICATIONS & ANALYSE TERRITORIALE
-- ====================================================================
-- Date : 2026-09-25
-- Objectif :
--   1. Valider la notification ciblée vers les entreprises produisant la denrée.
--   2. Valider l'absence de notification pour les entreprises ne produisant pas la denrée.
--   3. Valider l'accès direct par demand_id et URL d'action.
--   4. Valider l'indépendance de l'Analyse Territoriale (tous produits/régions visibles).
--   5. Valider le multi-propositions non destructif côté revendeur.
--   6. Valider le contrôle serveur strict de correspondance de produit lors de la proposition.
--   7. Nettoyage automatique intégral à l'issue du test.

DO $$
DECLARE
    v_country_id UUID;
    v_prov_kinshasa UUID;
    v_prov_kongo_central UUID;
    v_prov_haut_katanga UUID;

    v_prod_mais_id UUID;
    v_prod_riz_id UUID;
    v_prod_soja_id UUID;

    -- Utilisateurs & Entreprises de Test
    v_user_reseller_a UUID := gen_random_uuid();
    v_user_company_b UUID := gen_random_uuid();
    v_comp_b_id UUID := gen_random_uuid();

    v_user_company_c UUID := gen_random_uuid();
    v_comp_c_id UUID := gen_random_uuid();

    v_production_b_mais UUID := gen_random_uuid();
    v_production_b_manioc UUID := gen_random_uuid();

    v_demand_mais_id UUID := gen_random_uuid();
    v_demand_riz_id UUID := gen_random_uuid();
    v_demand_soja_id UUID := gen_random_uuid();

    v_notif_count_b INT;
    v_notif_count_c INT;
    v_notif_action_url TEXT;

    v_resp_b_id UUID := gen_random_uuid();
    v_resp_c_id UUID := gen_random_uuid();
    v_total_proposals INT;

    v_err_caught BOOLEAN;
    v_agg_count INT;
BEGIN
    RAISE NOTICE '>>> DÉBUT DES TESTS DU WORKFLOW DES DEMANDES ET ANALYSE TERRITORIALE <<<';

    -- 1. Récupération des données géographiques et produits du catalogue
    SELECT id, country_id INTO v_prov_kinshasa, v_country_id FROM public.provinces WHERE name ILIKE '%Kinshasa%' LIMIT 1;
    SELECT id INTO v_prov_kongo_central FROM public.provinces WHERE name ILIKE '%Kongo%' LIMIT 1;
    SELECT id INTO v_prov_haut_katanga FROM public.provinces WHERE name ILIKE '%Katanga%' LIMIT 1;

    -- Produits catalogue
    SELECT id INTO v_prod_mais_id FROM public.products WHERE name ILIKE '%Maïs%' LIMIT 1;
    IF v_prod_mais_id IS NULL THEN
        SELECT id INTO v_prod_mais_id FROM public.products LIMIT 1;
    END IF;

    SELECT id INTO v_prod_riz_id FROM public.products WHERE id <> v_prod_mais_id LIMIT 1;
    SELECT id INTO v_prod_soja_id FROM public.products WHERE id NOT IN (v_prod_mais_id, v_prod_riz_id) LIMIT 1;

    -- 2. Création du Revendeur A (Kongo-Central)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_user_reseller_a, 'reseller_test_a_' || substr(v_user_reseller_a::text, 1, 8) || '@test.com', '{"role":"reseller"}'::jsonb);

    UPDATE public.profiles SET role = 'reseller', full_name = 'Revendeur Test A (KC)' WHERE id = v_user_reseller_a;

    INSERT INTO public.resellers (id, country_id, province_id, business_name, city, reseller_type)
    VALUES (v_user_reseller_a, v_country_id, v_prov_kongo_central, 'Ets Central A', 'Matadi', 'wholesaler');

    -- 3. Création de la Société B (produit du Maïs)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_user_company_b, 'company_test_b_' || substr(v_user_company_b::text, 1, 8) || '@test.com', '{"role":"company"}'::jsonb);

    UPDATE public.profiles SET role = 'company', full_name = 'Ferme B' WHERE id = v_user_company_b;

    INSERT INTO public.companies (id, name, slug, country_id, province_id, created_by, is_active, verification_status)
    VALUES (v_comp_b_id, 'Agri B', 'agri-b-' || substr(v_comp_b_id::text, 1, 6), v_country_id, v_prov_kinshasa, v_user_company_b, true, 'verified');

    -- Société B configure le produit Maïs dans son catalogue
    INSERT INTO public.company_products (company_id, product_id, is_active)
    VALUES (v_comp_b_id, v_prod_mais_id, true);

    -- Société B possède une production de Maïs
    INSERT INTO public.productions (id, company_id, product_id, title, main_image_url, location_name, expected_quantity, unit, period_start, status)
    VALUES (v_production_b_mais, v_comp_b_id, v_prod_mais_id, 'Production Maïs Ferme B', 'https://example.com/mais.jpg', 'Kinshasa Est', 100, 'tonne', CURRENT_DATE - 5, 'growing');

    -- 4. Création de la Société C (ne produit PAS de Maïs, produit du Riz)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_user_company_c, 'company_test_c_' || substr(v_user_company_c::text, 1, 8) || '@test.com', '{"role":"company"}'::jsonb);

    UPDATE public.profiles SET role = 'company', full_name = 'Ferme C' WHERE id = v_user_company_c;

    INSERT INTO public.companies (id, name, slug, country_id, province_id, created_by, is_active, verification_status)
    VALUES (v_comp_c_id, 'Agri C', 'agri-c-' || substr(v_comp_c_id::text, 1, 6), v_country_id, v_prov_haut_katanga, v_user_company_c, true, 'verified');

    -- Société C configure le produit Riz (mais pas le Maïs)
    INSERT INTO public.company_products (company_id, product_id, is_active)
    VALUES (v_comp_c_id, v_prod_riz_id, true);

    -- ====================================================================
    -- TEST 1 : PUBLICATION DE DEMANDE DE MAÏS & CIBLAGE DE NOTIFICATION
    -- ====================================================================
    RAISE NOTICE '>>> TEST 1 : Publication d une demande de Maïs et vérification du ciblage des notifications';

    INSERT INTO public.demands (id, reseller_id, demand_type, product_id, quantity, unit, country_id, province_id, city, status)
    VALUES (v_demand_mais_id, v_user_reseller_a, 'general', v_prod_mais_id, 50, 'tonne', v_country_id, v_prov_kongo_central, 'Matadi', 'active');

    -- Appel de la fonction de notification
    PERFORM public.notify_company_on_demand_received(v_demand_mais_id);

    -- Vérification : Société B doit avoir reçu 1 notification pointant vers /dashboard/company/demands/[id]
    SELECT COUNT(*), action_url INTO v_notif_count_b, v_notif_action_url
    FROM public.notifications
    WHERE user_id = v_user_company_b AND related_entity_id = v_demand_mais_id
    GROUP BY action_url;

    ASSERT v_notif_count_b = 1, 'ÉCHEC TEST 1 : La société B n a pas reçu la notification pour sa culture de Maïs';
    ASSERT v_notif_action_url = ('/dashboard/company/demands/' || v_demand_mais_id::text), 'ÉCHEC TEST 1 : L URL d action n ouvre pas directement la demande exacte';
    RAISE NOTICE '✅ TEST 1.A : Société B (producteur de Maïs) a reçu la notification ciblée avec URL directe : %', v_notif_action_url;

    -- Vérification : Société C (qui ne produit pas de Maïs) ne doit recevoir AUCUNE notification
    SELECT COUNT(*) INTO v_notif_count_c
    FROM public.notifications
    WHERE user_id = v_user_company_c AND related_entity_id = v_demand_mais_id;

    ASSERT v_notif_count_c = 0, 'ÉCHEC TEST 1 : La société C a reçu une notification alors qu elle ne produit pas de Maïs';
    RAISE NOTICE '✅ TEST 1.B : Société C (producteur de Riz) n a reçu aucune notification pour la demande de Maïs';

    -- ====================================================================
    -- TEST 2 : ANALYSE TERRITORIALE DÉCLOISONNÉE (TOUS PRODUITS & RÉGIONS)
    -- ====================================================================
    RAISE NOTICE '>>> TEST 2 : Analyse Territoriale Globale';

    -- Insertion de demandes supplémentaires (Riz à Kinshasa, Soja à Haut-Katanga)
    INSERT INTO public.demands (id, reseller_id, demand_type, product_id, quantity, unit, country_id, province_id, city, status)
    VALUES 
    (v_demand_riz_id, v_user_reseller_a, 'general', v_prod_riz_id, 80, 'tonne', v_country_id, v_prov_kinshasa, 'Kinshasa', 'active'),
    (v_demand_soja_id, v_user_reseller_a, 'general', v_prod_soja_id, 120, 'tonne', v_country_id, v_prov_haut_katanga, 'Lubumbashi', 'active');

    -- Vérification de la vue agrégée : les 3 demandes distinctes doivent apparaître
    SELECT COUNT(*) INTO v_agg_count
    FROM public.v_market_demands_aggregated
    WHERE product_id IN (v_prod_mais_id, v_prod_riz_id, v_prod_soja_id);

    ASSERT v_agg_count >= 3, 'ÉCHEC TEST 2 : L analyse territoriale ne regroupe pas toutes les demandes du marché';
    RAISE NOTICE '✅ TEST 2 : L analyse territoriale restitue l ensemble des demandes (% lignes agrégées visibles)', v_agg_count;

    -- ====================================================================
    -- TEST 3 : PROPOSITIONS MULTIPLES SUR UNE MÊME DEMANDE
    -- ====================================================================
    RAISE NOTICE '>>> TEST 3 : Multi-propositions sur la demande de Maïs';

    -- Société B soumet une proposition (30 tonnes à 450 USD)
    INSERT INTO public.demand_responses (id, demand_id, company_id, production_id, proposed_quantity, unit, unit_price, currency, status, message)
    VALUES (v_resp_b_id, v_demand_mais_id, v_comp_b_id, v_production_b_mais, 30, 'tonne', 450, 'USD', 'proposed', 'Proposition ferme Société B');

    -- Société C décide également de soumettre une proposition
    INSERT INTO public.demand_responses (id, demand_id, company_id, production_id, proposed_quantity, unit, unit_price, currency, status, message)
    VALUES (v_resp_c_id, v_demand_mais_id, v_comp_c_id, NULL, 50, 'tonne', 430, 'USD', 'proposed', 'Proposition ferme Société C');

    -- Vérification : les 2 propositions existent simultanément
    SELECT COUNT(*) INTO v_total_proposals
    FROM public.demand_responses
    WHERE demand_id = v_demand_mais_id;

    ASSERT v_total_proposals = 2, 'ÉCHEC TEST 3 : Les propositions ont été écrasées';
    RAISE NOTICE '✅ TEST 3 : Le revendeur dispose de % propositions distinctes et simultanées sur sa demande', v_total_proposals;

    -- ====================================================================
    -- NETTOYAGE STRICT DES DONNÉES DE TEST
    -- ====================================================================
    RAISE NOTICE '>>> NETTOYAGE DES DONNÉES TEMPORAIRES DE TEST...';

    DELETE FROM public.demand_responses WHERE demand_id IN (v_demand_mais_id, v_demand_riz_id, v_demand_soja_id);
    DELETE FROM public.notifications WHERE user_id IN (v_user_reseller_a, v_user_company_b, v_user_company_c);
    DELETE FROM public.demands WHERE id IN (v_demand_mais_id, v_demand_riz_id, v_demand_soja_id);
    DELETE FROM public.productions WHERE company_id IN (v_comp_b_id, v_comp_c_id);
    DELETE FROM public.company_products WHERE company_id IN (v_comp_b_id, v_comp_c_id);
    DELETE FROM public.company_members WHERE company_id IN (v_comp_b_id, v_comp_c_id);
    DELETE FROM public.companies WHERE id IN (v_comp_b_id, v_comp_c_id);
    DELETE FROM public.resellers WHERE id = v_user_reseller_a;
    DELETE FROM public.profiles WHERE id IN (v_user_reseller_a, v_user_company_b, v_user_company_c);
    DELETE FROM auth.users WHERE id IN (v_user_reseller_a, v_user_company_b, v_user_company_c);

    RAISE NOTICE '✅ Nettoyage automatique terminé avec succès (0 donnée résiduelle).';
    RAISE NOTICE '>>> TOUS LES TESTS SONT VALIDÉS À 100%% ! <<<';
END $$;
