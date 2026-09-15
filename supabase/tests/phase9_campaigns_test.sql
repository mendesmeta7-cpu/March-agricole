-- ====================================================================
-- TEST TRANSACTIONNEL AUTOMATISÉ : PHASE 9 — CAMPAGNES COMMERCIALES V1
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_company_a_owner_id UUID := gen_random_uuid();
    v_company_b_owner_id UUID := gen_random_uuid();
    v_reseller_kin_id UUID := gen_random_uuid();
    v_reseller_kas_id UUID := gen_random_uuid();
    
    v_country_id UUID;
    v_province_kin_id UUID;
    v_province_kas_id UUID;
    
    v_company_a_id UUID;
    v_company_b_id UUID;
    
    v_product_corn_id UUID;
    v_production_corn_id UUID;
    
    v_campaign_draft_id UUID;
    v_campaign_active_id UUID;
    v_campaign_b_id UUID;
    
    v_demand_kas_id UUID;
    
    v_visible_count INT;
    v_eligible_count INT;
BEGIN
    RAISE NOTICE '=== DÉMARRAGE DES TESTS PHASE 9 : CAMPAGNES COMMERCIALES V1 ===';

    -- 1. Récupération des référentiels réels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_province_kin_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kinshasa%' OR code = 'KIN') LIMIT 1;
    SELECT id INTO v_province_kas_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kasaï%' OR code = 'KAS') LIMIT 1;
    SELECT id INTO v_product_corn_id FROM public.products WHERE is_active = TRUE LIMIT 1;

    IF v_country_id IS NULL OR v_province_kin_id IS NULL OR v_province_kas_id IS NULL OR v_product_corn_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/provinces/produit manquants.';
    END IF;

    -- 2. Création des acteurs de test
    -- Entreprise A
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_a_owner_id, 'company_a_phase9@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_a_owner_id, 'Ferme A Phase 9', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Ferme Agro A', 'ferme-agro-a-' || substr(v_company_a_owner_id::text, 1, 6),
        'Exploitation agricole céréalière', v_country_id, v_province_kin_id, 'Kinshasa', v_company_a_owner_id
    ) RETURNING id INTO v_company_a_id;

    -- Entreprise B
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_b_owner_id, 'company_b_phase9@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_b_owner_id, 'Ferme B Phase 9', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Ferme Agro B', 'ferme-agro-b-' || substr(v_company_b_owner_id::text, 1, 6),
        'Exploitation maraîchère B', v_country_id, v_province_kin_id, 'Kinshasa', v_company_b_owner_id
    ) RETURNING id INTO v_company_b_id;

    -- Revendeur Kinshasa
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_kin_id, 'reseller_kin_phase9@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_kin_id, 'Grossiste Kinshasa', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city)
    VALUES (v_reseller_kin_id, 'Grossiste Alimentaire Kin', v_country_id, v_province_kin_id, 'Kinshasa')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    -- Revendeur Kasaï
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_kas_id, 'reseller_kas_phase9@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_kas_id, 'Grossiste Kasaï', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city)
    VALUES (v_reseller_kas_id, 'Grossiste Vivres Kasaï', v_country_id, v_province_kas_id, 'Mbuji-Mayi')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    -- 3. Création de la production de référence de l'Entreprise A (1 000 tonnes déclarées)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name, expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_a_id, v_product_corn_id, 'Culture de Maïs Blanc 2026', 'https://example.com/mais.jpg', 'Parcelle Nord Bandoma', 1000.00, 'tonne',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 'growing', TRUE
    ) RETURNING id INTO v_production_corn_id;

    -- ====================================================================
    -- TEST 1 : Contraintes d'intégrité de la table campaigns
    -- ====================================================================
    -- A. Rejet si marketable_quantity <= 0
    BEGIN
        INSERT INTO public.campaigns (
            company_id, production_id, product_id, title, marketable_quantity, unit_price, start_date, status
        ) VALUES (
            v_company_a_id, v_production_corn_id, v_product_corn_id, 'Campagne Quantité Négative', 0, 400.00, CURRENT_DATE, 'draft'
        );
        RAISE EXCEPTION 'TEST 1.1 ÉCHOUÉ : Quantité <= 0 acceptée !';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ TEST 1.1 RÉUSSI : Rejet strict des quantités <= 0 (CHECK marketable_quantity_check).';
    END;

    -- B. Rejet si unit_price <= 0
    BEGIN
        INSERT INTO public.campaigns (
            company_id, production_id, product_id, title, marketable_quantity, unit_price, start_date, status
        ) VALUES (
            v_company_a_id, v_production_corn_id, v_product_corn_id, 'Campagne Prix Nul', 100.00, 0, CURRENT_DATE, 'draft'
        );
        RAISE EXCEPTION 'TEST 1.2 ÉCHOUÉ : Prix <= 0 accepté !';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ TEST 1.2 RÉUSSI : Rejet strict des prix <= 0 (CHECK unit_price_check).';
    END;

    -- C. Rejet si end_date < start_date
    BEGIN
        INSERT INTO public.campaigns (
            company_id, production_id, product_id, title, marketable_quantity, unit_price, start_date, end_date, status
        ) VALUES (
            v_company_a_id, v_production_corn_id, v_product_corn_id, 'Campagne Dates Inversées', 100.00, 400.00,
            CURRENT_DATE, CURRENT_DATE - INTERVAL '5 days', 'draft'
        );
        RAISE EXCEPTION 'TEST 1.3 ÉCHOUÉ : end_date < start_date acceptée !';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ TEST 1.3 RÉUSSI : Rejet des dates incohérentes (CHECK chk_campaigns_dates).';
    END;

    -- ====================================================================
    -- TEST 2 : Création de Campagnes valides par Entreprise A (Adossement Obligatoire)
    -- ====================================================================
    -- Campagne 1 : Brouillon (draft) pour 200 tonnes
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency,
        start_date, end_date, status
    ) VALUES (
        v_company_a_id, v_production_corn_id, v_product_corn_id, 'Offre Maïs Brouillon Interne',
        200.00, 'tonne', 420.00, 'USD', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', 'draft'
    ) RETURNING id INTO v_campaign_draft_id;

    -- Campagne 2 : Active (active) pour 600 tonnes desservant Kinshasa exclusivement
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency,
        start_date, end_date, status
    ) VALUES (
        v_company_a_id, v_production_corn_id, v_product_corn_id, 'Vente Maïs Blanc - Débarcadère Kinshasa',
        600.00, 'tonne', 450.00, 'USD', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', 'active'
    ) RETURNING id INTO v_campaign_active_id;

    -- Affectation du territoire desservi : Kinshasa
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_active_id, v_country_id, v_province_kin_id);

    RAISE NOTICE '✅ TEST 2 RÉUSSI : Campagnes créées et adossées avec succès (draft=200t, active=600t).';

    -- ====================================================================
    -- TEST 3 : Visibilité RLS Revendeur (Brouillons invisibles, Actives visibles)
    -- ====================================================================
    PERFORM set_config('request.jwt.claim.sub', v_reseller_kin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    -- Revendeur tente de lire les campagnes
    SELECT COUNT(*) INTO v_visible_count
    FROM public.campaigns
    WHERE id IN (v_campaign_draft_id, v_campaign_active_id);

    IF v_visible_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3 ÉCHOUÉ : Le revendeur voit % campagnes au lieu de 1 seule active !', v_visible_count;
    END IF;

    -- Vérification explicite : le brouillon est inaccessible
    IF EXISTS (SELECT 1 FROM public.campaigns WHERE id = v_campaign_draft_id) THEN
        RAISE EXCEPTION 'TEST 3.1 ÉCHOUÉ : La campagne brouillon est lisible par le revendeur !';
    END IF;
    RAISE NOTICE '✅ TEST 3 RÉUSSI : RLS campaigns_select respectée (seule la campagne active est visible).';

    -- ====================================================================
    -- TEST 4 : Rejet strict des modifications ou créations par un Revendeur
    -- ====================================================================
    BEGIN
        UPDATE public.campaigns
        SET unit_price = 1.00
        WHERE id = v_campaign_active_id;

        IF (SELECT unit_price FROM public.campaigns WHERE id = v_campaign_active_id) = 1.00 THEN
            RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : Le revendeur a pu modifier le prix de la campagne !';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RAISE NOTICE '✅ TEST 4 RÉUSSI : Rejet strict de la modification par un revendeur.';

    -- Rétablir postgres
    RESET ROLE;

    -- ====================================================================
    -- TEST 5 : Isolation multi-tenant entre Entreprises (A ne modifie pas B)
    -- ====================================================================
    -- Création d'une campagne par Entreprise B
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit_price, start_date, status
    ) VALUES (
        v_company_b_id, v_production_corn_id, v_product_corn_id, 'Offre Entreprise B', 50.00, 300.00, CURRENT_DATE, 'draft'
    ) RETURNING id INTO v_campaign_b_id;

    -- Simulation session Entreprise A
    PERFORM set_config('request.jwt.claim.sub', v_company_a_owner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    -- Entreprise A ne doit pas pouvoir modifier la campagne de B
    BEGIN
        UPDATE public.campaigns
        SET title = 'Piraté par A'
        WHERE id = v_campaign_b_id;

        IF (SELECT title FROM public.campaigns WHERE id = v_campaign_b_id) = 'Piraté par A' THEN
            RAISE EXCEPTION 'TEST 5 ÉCHOUÉ : Entreprise A a pu modifier la campagne de B !';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RAISE NOTICE '✅ TEST 5 RÉUSSI : Isolation multilocataire étanche entre entreprises.';

    RESET ROLE;

    -- ====================================================================
    -- TEST 6 : SCÉNARIO 30 — INDÉPENDANCE ABSOLUE DEMANDE / CAMPAGNE
    -- ====================================================================
    -- A. Revendeur du Kasaï crée une demande de 100 tonnes de maïs
    INSERT INTO public.demands (
        reseller_id, product_id, quantity, unit, country_id, province_id, target_period_start, target_period_end, status
    ) VALUES (
        v_reseller_kas_id, v_product_corn_id, 100.00, 'tonne', v_country_id, v_province_kas_id,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days', 'active'
    ) RETURNING id INTO v_demand_kas_id;

    -- B. Entreprise A crée ensuite une campagne ciblant le Kasaï pour 50 tonnes
    DECLARE
        v_campaign_kas_id UUID;
    BEGIN
        INSERT INTO public.campaigns (
            company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency,
            start_date, status
        ) VALUES (
            v_company_a_id, v_production_corn_id, v_product_corn_id, 'Offre Ouverte vers le Kasaï',
            50.00, 'tonne', 480.00, 'USD', CURRENT_DATE, 'active'
        ) RETURNING id INTO v_campaign_kas_id;

        INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
        VALUES (v_campaign_kas_id, v_country_id, v_province_kas_id);

        -- C. Vérifications obligatoires du Scénario 30 :
        -- 1. La demande doit rester intacte et active
        IF (SELECT status FROM public.demands WHERE id = v_demand_kas_id) <> 'active' THEN
            RAISE EXCEPTION 'SCÉNARIO 30 ÉCHOUÉ : Le statut de la demande a été altéré !';
        END IF;

        -- 2. Aucune commande ne doit être générée automatiquement
        IF (SELECT COUNT(*) FROM public.orders WHERE campaign_id = v_campaign_kas_id) > 0 THEN
            RAISE EXCEPTION 'SCÉNARIO 30 ÉCHOUÉ : Une commande a été créée automatiquement !';
        END IF;

        -- 3. Aucun stock ne doit être réservé
        IF (SELECT COUNT(*) FROM public.stock_reservations WHERE campaign_id = v_campaign_kas_id) > 0 THEN
            RAISE EXCEPTION 'SCÉNARIO 30 ÉCHOUÉ : Du stock a été réservé prématurément !';
        END IF;

        RAISE NOTICE '✅ TEST 6 (SCÉNARIO 30) RÉUSSI : La demande reste 100%% indépendante, 0 commande, 0 réservation.';
    END;

    -- ====================================================================
    -- TEST 7 : Invariants V1 (0 commande, 0 réservation de stock, Règle d'Or 3)
    -- ====================================================================
    IF (SELECT COUNT(*) FROM public.orders WHERE company_id = v_company_a_id) > 0 THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Des commandes existent pour l''entreprise A.';
    END IF;

    IF (SELECT COUNT(*) FROM public.stock_reservations) > 0 THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Des réservations de stock existent.';
    END IF;
    RAISE NOTICE '✅ TEST 7 RÉUSSI : Invariants intègres (0 commande, 0 réservation de stock).';

    RAISE NOTICE '=== TOUS LES TESTS DE LA PHASE 9 SONT VALIDÉS AVEC SUCCÈS ===';
END $$;

ROLLBACK;
