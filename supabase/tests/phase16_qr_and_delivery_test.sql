-- ============================================================================
-- SUITE DE TESTS SQL : PHASE 16 — QR CODE, RECHERCHE RAPIDE ET LIVRAISON V1
-- ============================================================================

BEGIN;

DO $$
DECLARE
    -- Acteurs
    v_company_a_owner_id UUID := gen_random_uuid();
    v_company_b_owner_id UUID := gen_random_uuid();
    v_reseller_id UUID := gen_random_uuid();

    -- Référentiels
    v_country_id UUID;
    v_province_kin_id UUID;
    v_product_id UUID;

    -- Entités
    v_company_a_id UUID;
    v_company_b_id UUID;
    v_production_id UUID;
    v_campaign_id UUID;
    v_order_id UUID;
    v_order_number VARCHAR;
    v_order_total NUMERIC;
    v_order_reserved NUMERIC;
    v_qr_token VARCHAR;
    v_reservation_id UUID;

    -- Variables de contrôle
    v_lookup_count INT;
    v_lookup_order_id UUID;
    v_order_status VARCHAR;
    v_delivered_at TIMESTAMPTZ;
    v_delivered_qty NUMERIC;
    v_delivered_by UUID;
    v_delivery_notes TEXT;
    v_res_status VARCHAR;
    v_audit_count INT;
    v_notif_count INT;
    v_error_caught BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== DÉBUT DES TESTS PHASE 16 : QR CODE & LIVRAISON V1 ===';

    -- 1. Récupération des référentiels réels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_province_kin_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kinshasa%' OR code = 'KIN') LIMIT 1;
    SELECT id INTO v_product_id FROM public.products WHERE is_active = TRUE LIMIT 1;

    IF v_country_id IS NULL OR v_province_kin_id IS NULL OR v_product_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/provinces/produit manquants en base.';
    END IF;

    -- 2. Création des acteurs de test
    -- Société Alpha
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_a_owner_id, 'company_a_p16@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_a_owner_id, 'Ferme Alpha Test Phase 16', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Ferme Alpha P16', 'ferme-alpha-p16-' || substr(v_company_a_owner_id::text, 1, 6),
        'Exploitation Alpha', v_country_id, v_province_kin_id, 'Kinshasa', v_company_a_owner_id
    ) RETURNING id INTO v_company_a_id;

    -- Société Beta
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_b_owner_id, 'company_b_p16@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_b_owner_id, 'Ferme Beta Test Phase 16', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Ferme Beta P16', 'ferme-beta-p16-' || substr(v_company_b_owner_id::text, 1, 6),
        'Exploitation Beta', v_country_id, v_province_kin_id, 'Kinshasa', v_company_b_owner_id
    ) RETURNING id INTO v_company_b_id;

    -- Revendeur
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_id, 'reseller_p16@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_id, 'Centrale Achat Revendeur P16', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city, delivery_address)
    VALUES (v_reseller_id, 'Centrale Achat P16', v_country_id, v_province_kin_id, 'Kinshasa', 'Entrepôt 12')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    -- 3. Création Production & Campagne
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name, expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_a_id, v_product_id, 'Production Manioc P16', 'https://example.com/manioc.jpg', 'Parcelle Nord', 500.00, 'tonne',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', 'harvested', TRUE
    ) RETURNING id INTO v_production_id;

    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency,
        min_order_quantity, start_date, end_date, status
    ) VALUES (
        v_company_a_id, v_production_id, v_product_id, 'Campagne Manioc P16',
        500.00, 'tonne', 200.00, 'USD', 5.00, CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE + INTERVAL '30 days', 'active'
    ) RETURNING id INTO v_campaign_id;

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_id, v_country_id, v_province_kin_id);

    -- ========================================================================
    -- TEST 1 : Création de la commande & Génération automatique du qr_code_token
    -- ========================================================================
    SELECT * INTO v_order_id, v_order_number, v_order_total, v_order_reserved
    FROM public.create_order_with_reservation(
        v_reseller_id,
        v_campaign_id,
        50.00,
        v_province_kin_id,
        'Kinshasa',
        'Entrepôt 12',
        'Instruction: Inspection par scanner QR'
    );

    SELECT qr_code_token INTO v_qr_token FROM public.orders WHERE id = v_order_id;
    SELECT id INTO v_reservation_id FROM public.stock_reservations WHERE order_id = v_order_id;

    IF v_qr_token IS NULL OR length(v_qr_token) < 10 THEN
        RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Le qr_code_token na pas été généré automatiquement (token: %)', v_qr_token;
    END IF;
    RAISE NOTICE 'TEST 1 RÉUSSI : Commande % créée avec token QR généré (%)', v_order_number, v_qr_token;

    -- ========================================================================
    -- TEST 2 : Recherche rapide par token QR (Société Alpha autorisée)
    -- ========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_company_a_owner_id::text, 'role', 'authenticated')::text, true);

    v_lookup_count := 0;
    v_lookup_order_id := NULL;
    SELECT count(*), (array_agg(order_id))[1]
    INTO v_lookup_count, v_lookup_order_id
    FROM public.lookup_order_for_delivery(v_qr_token);

    IF v_lookup_count <> 1 OR v_lookup_order_id <> v_order_id THEN
        RAISE EXCEPTION 'TEST 2 ÉCHOUÉ : lookup_order_for_delivery par token QR na pas retourné la commande.';
    END IF;
    RAISE NOTICE 'TEST 2 RÉUSSI : Commande retrouvée avec succès par token QR.';

    -- ========================================================================
    -- TEST 3 : Recherche rapide par numéro de commande (Société Alpha autorisée)
    -- ========================================================================
    v_lookup_count := 0;
    v_lookup_order_id := NULL;
    SELECT count(*), (array_agg(order_id))[1]
    INTO v_lookup_count, v_lookup_order_id
    FROM public.lookup_order_for_delivery(v_order_number);

    IF v_lookup_count <> 1 OR v_lookup_order_id <> v_order_id THEN
        RAISE EXCEPTION 'TEST 3 ÉCHOUÉ : lookup_order_for_delivery par numéro de commande a échoué.';
    END IF;
    RAISE NOTICE 'TEST 3 RÉUSSI : Commande retrouvée avec succès par numéro de commande (%).', v_order_number;

    -- ========================================================================
    -- TEST 4 : Isolation stricte multi-tenant (Société Beta vs Commande Société Alpha)
    -- ========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_company_b_owner_id::text, 'role', 'authenticated')::text, true);

    SELECT count(*)
    INTO v_lookup_count
    FROM public.lookup_order_for_delivery(v_qr_token);

    IF v_lookup_count <> 0 THEN
        RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : Faille de sécurité ! La société Beta a accédé à la commande de la société Alpha par QR.';
    END IF;

    SELECT count(*)
    INTO v_lookup_count
    FROM public.lookup_order_for_delivery(v_order_number);

    IF v_lookup_count <> 0 THEN
        RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : Faille de sécurité ! La société Beta a accédé à la commande de la société Alpha par N°.';
    END IF;
    RAISE NOTICE 'TEST 4 RÉUSSI : Isolation multilocataire stricte validée (zéro fuite de données).';

    -- ========================================================================
    -- TEST 5 : Confirmation de livraison atomique (confirm_order_delivery)
    -- ========================================================================
    -- Rétablir la session de la Société Alpha
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_company_a_owner_id::text, 'role', 'authenticated')::text, true);

    PERFORM public.confirm_order_delivery(
        p_order_id => v_order_id,
        p_notes => 'Remis au chauffeur du revendeur'
    );

    SELECT status, delivered_at, delivered_quantity, delivered_by, delivery_notes
    INTO v_order_status, v_delivered_at, v_delivered_qty, v_delivered_by, v_delivery_notes
    FROM public.orders
    WHERE id = v_order_id;

    IF v_order_status <> 'delivered' OR v_delivered_at IS NULL OR v_delivered_qty <> 50.00 OR v_delivered_by <> v_company_a_owner_id THEN
        RAISE EXCEPTION 'TEST 5 ÉCHOUÉ : La commande na pas été mise à jour avec les attributs de livraison.';
    END IF;

    SELECT status INTO v_res_status FROM public.stock_reservations WHERE id = v_reservation_id;
    IF v_res_status <> 'confirmed' THEN
        RAISE EXCEPTION 'TEST 5 ÉCHOUÉ : La réservation de stock na pas été passée à "confirmed" (statut: %).', v_res_status;
    END IF;

    SELECT count(*) INTO v_audit_count
    FROM public.audit_logs
    WHERE entity_type = 'order' AND entity_id = v_order_id AND action = 'ORDER_DELIVERED';

    IF v_audit_count <> 1 THEN
        RAISE EXCEPTION 'TEST 5 ÉCHOUÉ : Aucun journal daudit créé pour ORDER_DELIVERED.';
    END IF;

    SELECT count(*) INTO v_notif_count
    FROM public.notifications
    WHERE user_id = v_reseller_id AND type = 'COMMANDE_LIVREE';

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 5 ÉCHOUÉ : Aucune notification COMMANDE_LIVREE envoyée au revendeur.';
    END IF;

    RAISE NOTICE 'TEST 5 RÉUSSI : Livraison confirmée avec succès (statut delivered, réservation confirmed, audit log et notification créés).';

    -- ========================================================================
    -- TEST 6 : Règle anti-double livraison (Exception attendue)
    -- ========================================================================
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.confirm_order_delivery(
            p_order_id => v_order_id,
            p_notes => 'Tentative de re-livraison'
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE 'Exception anti-double livraison interceptée avec succès : %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : confirm_order_delivery aurait dû lever une exception sur une commande déjà livrée.';
    END IF;
    RAISE NOTICE 'TEST 6 RÉUSSI : Règle anti-double livraison respectée.';

    -- ========================================================================
    -- TEST 7 : Recherche d''un identifiant invalide (zéro fuite)
    -- ========================================================================
    SELECT count(*)
    INTO v_lookup_count
    FROM public.lookup_order_for_delivery('CODE-INCONNU-9999');

    IF v_lookup_count <> 0 THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : La recherche dun code invalide naurait pas dû renvoyer de ligne.';
    END IF;
    RAISE NOTICE 'TEST 7 RÉUSSI : Code invalide géré sans erreur ni fuite.';

    RAISE NOTICE '>>> TOUS LES TESTS DE LA PHASE 16 SONT VALIDÉS AVEC SUCCÈS (7/7) <<<';
END $$;

ROLLBACK;
