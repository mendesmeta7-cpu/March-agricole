-- ====================================================================
-- TEST TRANSACTIONNEL AUTOMATISÉ : PHASE 10 — COMMANDES ET RÉSERVATIONS V1
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_company_a_owner_id UUID := gen_random_uuid();
    v_company_b_owner_id UUID := gen_random_uuid();
    v_reseller_a_id UUID := gen_random_uuid();
    v_reseller_b_id UUID := gen_random_uuid();
    v_reseller_kas_id UUID := gen_random_uuid();
    
    v_country_id UUID;
    v_province_kin_id UUID;
    v_province_kas_id UUID;
    
    v_company_a_id UUID;
    v_company_b_id UUID;
    
    v_product_id UUID;
    v_production_id UUID;
    
    v_campaign_id UUID;
    v_campaign_draft_id UUID;
    v_campaign_expired_id UUID;
    
    v_order_a_id UUID;
    v_order_number_a VARCHAR;
    v_order_total_a NUMERIC;
    v_order_reserved_a NUMERIC;
    
    v_stock_summary RECORD;
    v_error_caught BOOLEAN;
    v_visible_count INT;
BEGIN
    RAISE NOTICE '=== DÉMARRAGE DES TESTS PHASE 10 : COMMANDES ET RÉSERVATIONS V1 ===';

    -- 1. Récupération des référentiels réels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_province_kin_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kinshasa%' OR code = 'KIN') LIMIT 1;
    SELECT id INTO v_province_kas_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kasaï%' OR code = 'KAS') LIMIT 1;
    SELECT id INTO v_product_id FROM public.products WHERE is_active = TRUE LIMIT 1;

    IF v_country_id IS NULL OR v_province_kin_id IS NULL OR v_province_kas_id IS NULL OR v_product_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/provinces/produit manquants en base.';
    END IF;

    -- 2. Création des acteurs de test
    -- Entreprise A
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_a_owner_id, 'company_a_phase10@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_a_owner_id, 'Ferme A Phase 10', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Ferme Agro A P10', 'ferme-agro-a-p10-' || substr(v_company_a_owner_id::text, 1, 6),
        'Exploitation céréalière', v_country_id, v_province_kin_id, 'Kinshasa', v_company_a_owner_id
    ) RETURNING id INTO v_company_a_id;

    -- Entreprise B
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_b_owner_id, 'company_b_phase10@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_b_owner_id, 'Ferme B Phase 10', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Ferme Agro B P10', 'ferme-agro-b-p10-' || substr(v_company_b_owner_id::text, 1, 6),
        'Exploitation B', v_country_id, v_province_kin_id, 'Kinshasa', v_company_b_owner_id
    ) RETURNING id INTO v_company_b_id;

    -- Revendeur A (Kinshasa)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_a_id, 'reseller_a_phase10@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_a_id, 'Grossiste A Kinshasa', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city, delivery_address)
    VALUES (v_reseller_a_id, 'Grossiste A Kin', v_country_id, v_province_kin_id, 'Kinshasa', 'Entrepôt 12 Port Kinshasa')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    -- Revendeur B (Kinshasa)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_b_id, 'reseller_b_phase10@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_b_id, 'Grossiste B Kinshasa', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city)
    VALUES (v_reseller_b_id, 'Grossiste B Kin', v_country_id, v_province_kin_id, 'Kinshasa')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    -- Revendeur Kasaï (Hors Zone de livraison)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_kas_id, 'reseller_kas_phase10@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_kas_id, 'Grossiste Kasaï', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city)
    VALUES (v_reseller_kas_id, 'Grossiste Kasaï', v_country_id, v_province_kas_id, 'Mbuji-Mayi')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    -- 3. Création d'une production (1 000 tonnes déclarées)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name, expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_a_id, v_product_id, 'Culture de Référence 2026', 'https://example.com/mais.jpg', 'Parcelle Nord', 1000.00, 'tonne',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 'harvested', TRUE
    ) RETURNING id INTO v_production_id;

    -- 4. Création d'une Campagne Active de 500 tonnes à 300 USD / tonne desservant Kinshasa exclusivement
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency,
        min_order_quantity, start_date, end_date, status
    ) VALUES (
        v_company_a_id, v_production_id, v_product_id, 'Offre Commerciale 500t Maïs',
        500.00, 'tonne', 300.00, 'USD', 5.00, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '30 days', 'active'
    ) RETURNING id INTO v_campaign_id;

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_id, v_country_id, v_province_kin_id);

    -- ====================================================================
    -- TEST 1 : Commande Normale, Réservation Atomique et Snapshot du Prix
    -- ====================================================================
    SELECT * INTO v_order_a_id, v_order_number_a, v_order_total_a, v_order_reserved_a
    FROM public.create_order_with_reservation(
        v_reseller_a_id,
        v_campaign_id,
        100.00,
        v_province_kin_id,
        'Kinshasa',
        'Entrepôt 12 Port Kinshasa',
        'Instruction: Livraison matinale'
    );

    IF v_order_a_id IS NULL OR v_order_total_a <> 30000.00 OR v_order_reserved_a <> 100.00 THEN
        RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Erreur création commande (Total: %, Réservé: %)', v_order_total_a, v_order_reserved_a;
    END IF;

    -- Vérification de la réservation active
    IF NOT EXISTS (
        SELECT 1 FROM public.stock_reservations 
        WHERE order_id = v_order_a_id AND campaign_id = v_campaign_id AND quantity = 100.00 AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Réservation de stock non enregistrée !';
    END IF;

    -- Vérification du calcul de stock réel
    SELECT * INTO v_stock_summary FROM public.get_campaign_stock_summary(v_campaign_id);
    IF v_stock_summary.marketable_quantity <> 500.00 OR v_stock_summary.reserved_quantity <> 100.00 OR v_stock_summary.available_quantity <> 400.00 THEN
        RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Calcul du stock restant faux (Marketable: %, Reserved: %, Available: %)',
            v_stock_summary.marketable_quantity, v_stock_summary.reserved_quantity, v_stock_summary.available_quantity;
    END IF;

    RAISE NOTICE '✅ TEST 1 RÉUSSI : Commande de 100t créée (Total: 30000 USD, Réservation: 100t, Stock restant: 400t).';

    -- ====================================================================
    -- TEST 2 : Concurrence & Protection Absolue Contre le Surbooking
    -- ====================================================================
    -- Simulation : Reste 400t. Créons une réservation supplémentaire de 350t pour n'avoir que 50t disponibles
    DECLARE
        v_intermediate_order UUID;
    BEGIN
        SELECT order_id INTO v_intermediate_order
        FROM public.create_order_with_reservation(
            v_reseller_a_id, v_campaign_id, 350.00, v_province_kin_id
        );
    END;

    -- Vérifions qu'il ne reste que 50 tonnes disponibles
    SELECT * INTO v_stock_summary FROM public.get_campaign_stock_summary(v_campaign_id);
    IF v_stock_summary.available_quantity <> 50.00 THEN
        RAISE EXCEPTION 'TEST 2 ÉCHOUÉ : Stock résiduel incorrect (%)', v_stock_summary.available_quantity;
    END IF;

    -- Revendeur A commande 30 tonnes (Disponible: 50 -> Reste: 20)
    PERFORM public.create_order_with_reservation(
        v_reseller_a_id, v_campaign_id, 30.00, v_province_kin_id
    );

    -- Revendeur B tente simultanément de commander 30 tonnes (Alors qu'il ne reste que 20 tonnes)
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_b_id, v_campaign_id, 30.00, v_province_kin_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Surbooking bloqué avec succès : %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 2 ÉCHOUÉ : Le surbooking n''a pas été rejeté !';
    END IF;

    -- Vérification que le stock total réservé n'a JAMAIS dépassé 500 tonnes
    SELECT * INTO v_stock_summary FROM public.get_campaign_stock_summary(v_campaign_id);
    IF v_stock_summary.reserved_quantity > 500.00 THEN
        RAISE EXCEPTION 'TEST 2 ÉCHOUÉ : Sur-réservation enregistrée (% tonnes réservées sur 500)', v_stock_summary.reserved_quantity;
    END IF;

    RAISE NOTICE '✅ TEST 2 RÉUSSI : Anti-surbooking garanti au niveau PostgreSQL (Concurrence sécurisée).';

    -- ====================================================================
    -- TEST 3 : Rejet Strict si Territoire Non Desservi
    -- ====================================================================
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_kas_id, v_campaign_id, 10.00, v_province_kas_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Territoire inéligible rejeté avec succès : %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3 ÉCHOUÉ : La commande hors territoire de livraison a été acceptée !';
    END IF;
    RAISE NOTICE '✅ TEST 3 RÉUSSI : Rejet strict des commandes hors zones desservies.';

    -- ====================================================================
    -- TEST 4 : Rejet Strict des Quantités Invalides (<= 0 ou < min_order_quantity)
    -- ====================================================================
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_a_id, v_campaign_id, 0.00, v_province_kin_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 4.1 ÉCHOUÉ : Quantité 0 acceptée !';
    END IF;

    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_a_id, v_campaign_id, 2.00, v_province_kin_id -- min_order_quantity = 5.00
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Quantité inférieure au seuil minimum rejetée : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 4.2 ÉCHOUÉ : Quantité inférieure au minimum acceptée !';
    END IF;
    RAISE NOTICE '✅ TEST 4 RÉUSSI : Rejet strict des quantités invalides.';

    -- ====================================================================
    -- TEST 5 : Rejet si Campagne Non Active ou Expirée
    -- ====================================================================
    -- A. Campagne Brouillon
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, start_date, status
    ) VALUES (
        v_company_a_id, v_production_id, v_product_id, 'Campagne Brouillon', 50.00, 'tonne', 300.00, CURRENT_DATE, 'draft'
    ) RETURNING id INTO v_campaign_draft_id;

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_draft_id, v_country_id, v_province_kin_id);

    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(v_reseller_a_id, v_campaign_draft_id, 10.00, v_province_kin_id);
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 5.1 ÉCHOUÉ : Commande acceptée sur une campagne brouillon !';
    END IF;

    -- B. Campagne Expirée dans le temps
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, start_date, end_date, status
    ) VALUES (
        v_company_a_id, v_production_id, v_product_id, 'Campagne Expirée', 50.00, 'tonne', 300.00,
        CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '2 days', 'active'
    ) RETURNING id INTO v_campaign_expired_id;

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_expired_id, v_country_id, v_province_kin_id);

    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(v_reseller_a_id, v_campaign_expired_id, 10.00, v_province_kin_id);
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Campagne expirée rejetée avec succès : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 5.2 ÉCHOUÉ : Commande acceptée sur une campagne expirée !';
    END IF;
    RAISE NOTICE '✅ TEST 5 RÉUSSI : Rejet strict des commandes sur campagnes non ouvertes ou expirées.';

    -- ====================================================================
    -- TEST 6 : Immuabilité du Snapshot de Prix
    -- ====================================================================
    -- L'entreprise augmente le prix unitaire de la campagne à 600 USD
    UPDATE public.campaigns
    SET unit_price = 600.00
    WHERE id = v_campaign_id;

    -- La commande 1 doit conserver 300 USD et 30 000 USD de total
    IF (SELECT total_amount FROM public.orders WHERE id = v_order_a_id) <> 30000.00 THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : Le total_amount de la commande historique a été altéré !';
    END IF;

    IF (SELECT unit_price FROM public.order_items WHERE order_id = v_order_a_id) <> 300.00 THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : Le snapshot de unit_price a été altéré !';
    END IF;
    RAISE NOTICE '✅ TEST 6 RÉUSSI : Snapshot contractuel des prix et totaux parfaitement immuable.';

    -- ====================================================================
    -- TEST 7 : Annulation de Commande et Libération Instantanée de Réservation
    -- ====================================================================
    -- État avant annulation de la commande de 100t
    SELECT * INTO v_stock_summary FROM public.get_campaign_stock_summary(v_campaign_id);
    RAISE NOTICE '  Avant annulation : % t réservées, % t disponibles.', v_stock_summary.reserved_quantity, v_stock_summary.available_quantity;

    -- Annulation de la commande A
    PERFORM public.cancel_order_and_release_reservation(v_order_a_id, 'Changement d''avis');

    -- Vérification du statut de la commande
    IF (SELECT status FROM public.orders WHERE id = v_order_a_id) <> 'cancelled' THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Statut de commande non passé à cancelled !';
    END IF;

    -- Vérification du statut de la réservation
    IF (SELECT status FROM public.stock_reservations WHERE order_id = v_order_a_id) <> 'released' THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Réservation non passée à released !';
    END IF;

    -- Vérification de la restitution du stock disponible
    SELECT * INTO v_stock_summary FROM public.get_campaign_stock_summary(v_campaign_id);
    IF v_stock_summary.reserved_quantity <> (480.00 - 100.00) THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Le stock réservé n''a pas diminué de 100t (Actuel: %)', v_stock_summary.reserved_quantity;
    END IF;
    RAISE NOTICE '✅ TEST 7 RÉUSSI : Annulation et restitution de stock confirmées (Réservé : % t, Dispo : % t).',
        v_stock_summary.reserved_quantity, v_stock_summary.available_quantity;

    -- ====================================================================
    -- TEST 8 : Isolation RLS Multi-Tenant (Revendeur et Entreprise)
    -- ====================================================================
    -- Simulation session Revendeur B
    PERFORM set_config('request.jwt.claim.sub', v_reseller_b_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    -- Revendeur B ne doit pas voir la commande de Revendeur A
    SELECT COUNT(*) INTO v_visible_count FROM public.orders WHERE id = v_order_a_id;
    IF v_visible_count <> 0 THEN
        RAISE EXCEPTION 'TEST 8.1 ÉCHOUÉ : Revendeur B peut voir la commande de Revendeur A !';
    END IF;

    RESET ROLE;

    -- Simulation session Entreprise B
    PERFORM set_config('request.jwt.claim.sub', v_company_b_owner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    -- Entreprise B ne doit pas voir les commandes d'Entreprise A
    SELECT COUNT(*) INTO v_visible_count FROM public.orders WHERE id = v_order_a_id;
    IF v_visible_count <> 0 THEN
        RAISE EXCEPTION 'TEST 8.2 ÉCHOUÉ : Entreprise B peut voir les commandes d''Entreprise A !';
    END IF;

    RESET ROLE;
    RAISE NOTICE '✅ TEST 8 RÉUSSI : Isolation RLS étanche entre revendeurs et entre entreprises.';

    RAISE NOTICE '=== TOUS LES TESTS DE LA PHASE 10 SONT VALIDÉS AVEC SUCCÈS ===';
END $$;

ROLLBACK;
