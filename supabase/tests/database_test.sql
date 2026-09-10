-- Script de Test et Validation Intégrale de la Database V1
-- Exécute les 14 tests minimaux exigés par le protocole V1
-- Toutes les données créées pour le test sont nettoyées à la fin (Aucune donnée permanente).

DO $$
DECLARE
    v_rdc_id UUID;
    v_kinshasa_id UUID;
    v_kasai_id UUID;
    v_company_user_id UUID := gen_random_uuid();
    v_reseller_user_id UUID := gen_random_uuid();
    v_company_id UUID;
    v_product_id UUID;
    v_production_id UUID;
    v_demand_id UUID;
    v_campaign_id UUID;
    v_order_id UUID;
    v_order_num VARCHAR;
    v_total_amt NUMERIC;
    v_res_qty NUMERIC;
    v_stock_record RECORD;
    v_agg_record RECORD;
    v_error_caught BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== DÉBUT DE LA SUITE DE TESTS DATABASE V1 ===';

    -- Récupération des IDs géographiques de référence
    SELECT id INTO v_rdc_id FROM public.countries WHERE code = 'COD';
    SELECT id INTO v_kinshasa_id FROM public.provinces WHERE country_id = v_rdc_id AND name = 'Kinshasa';
    SELECT id INTO v_kasai_id FROM public.provinces WHERE country_id = v_rdc_id AND name = 'Kasaï';

    IF v_rdc_id IS NULL OR v_kinshasa_id IS NULL OR v_kasai_id IS NULL THEN
        RAISE EXCEPTION 'ERREUR: Référentiel géographique RDC/Kinshasa/Kasaï incomplet';
    END IF;

    -- Création d'utilisateurs éphémères dans auth.users pour satisfaire la clé étrangère profiles.id
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES 
        (v_company_user_id, '00000000-0000-0000-0000-000000000000', 'test_company_' || SUBSTRING(v_company_user_id::text, 1, 6) || '@test.com', 'dummy_hash', NOW(), '{"provider":"email"}', '{}', NOW(), NOW(), 'authenticated', 'authenticated'),
        (v_reseller_user_id, '00000000-0000-0000-0000-000000000000', 'test_reseller_' || SUBSTRING(v_reseller_user_id::text, 1, 6) || '@test.com', 'dummy_hash', NOW(), '{"provider":"email"}', '{}', NOW(), NOW(), 'authenticated', 'authenticated');

    -- TEST 1: Création d'un profil utilisateur entreprise et de sa compagnie
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (v_company_user_id, 'company', 'AgriCongo Test Founder', '+243990000001');

    INSERT INTO public.companies (name, slug, country_id, province_id, created_by)
    VALUES ('Ferme Agro Test RDC', 'ferme-agro-test-rdc-' || SUBSTRING(gen_random_uuid()::text, 1, 6), v_rdc_id, v_kinshasa_id, v_company_user_id)
    RETURNING id INTO v_company_id;

    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (v_company_id, v_company_user_id, 'owner');

    RAISE NOTICE '[SUCCÈS] TEST 1: Profil Entreprise et Société créés (Company ID: %)', v_company_id;

    -- TEST 2: Création d'un profil revendeur avec localisation pivot
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (v_reseller_user_id, 'reseller', 'Grossiste Kin Test', '+243810000002');

    INSERT INTO public.resellers (id, business_name, country_id, province_id, city, reseller_type)
    VALUES (v_reseller_user_id, 'Maison Vivres Frais', v_rdc_id, v_kinshasa_id, 'Kinshasa', 'wholesaler');

    RAISE NOTICE '[SUCCÈS] TEST 2: Profil Revendeur créé avec Pays et Province (Reseller ID: %)', v_reseller_user_id;

    -- TEST 3: Création d'un produit dans le catalogue
    INSERT INTO public.products (name, category, default_unit)
    VALUES ('Maïs Blanc Grain Test ' || SUBSTRING(gen_random_uuid()::text, 1, 6), 'Céréales', 'tonne')
    RETURNING id INTO v_product_id;

    RAISE NOTICE '[SUCCÈS] TEST 3: Produit créé dans le catalogue (Product ID: %)', v_product_id;

    -- TEST 4: Association produit ↔ entreprise
    INSERT INTO public.company_products (company_id, product_id, custom_name)
    VALUES (v_company_id, v_product_id, 'Maïs Extra Sec du Plateau');

    RAISE NOTICE '[SUCCÈS] TEST 4: Produit associé à l''entreprise';

    -- TEST 5: Création d'une production agricole
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name, 
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_id, v_product_id, 'Récolte Maïs Saison A 2026',
        'https://storage.placeholder/test.jpg', 'Plateau de Bateke',
        500.00, 'tonne', '2026-10-01', '2026-11-30', 'planned', TRUE
    ) RETURNING id INTO v_production_id;

    RAISE NOTICE '[SUCCÈS] TEST 5: Production agricole enregistrée (500 tonnes, Production ID: %)', v_production_id;

    -- TEST 6: Création d'une demande par un revendeur
    INSERT INTO public.demands (
        reseller_id, product_id, quantity, unit, country_id, province_id, status
    ) VALUES (
        v_reseller_user_id, v_product_id, 150.00, 'tonne', v_rdc_id, v_kasai_id, 'active'
    ) RETURNING id INTO v_demand_id;

    RAISE NOTICE '[SUCCÈS] TEST 6: Demande formulée par le revendeur (150 tonnes au Kasaï)';

    -- TEST 7: Agrégation des demandes par province via la Vue SQL
    SELECT * INTO v_agg_record 
    FROM public.v_market_demands_aggregated 
    WHERE product_id = v_product_id AND province_id = v_kasai_id;

    IF v_agg_record.total_demanded_quantity <> 150.00 THEN
        RAISE EXCEPTION 'ERREUR TEST 7: Quantité agrégée incorrecte (Attendu: 150, Reçu: %)', v_agg_record.total_demanded_quantity;
    END IF;

    RAISE NOTICE '[SUCCÈS] TEST 7: Vue d''analyse territoriale vérifiée (Total demandé Kasaï: % t)', v_agg_record.total_demanded_quantity;

    -- TEST 8: Création d'une campagne commerciale (300 t sur les 500 t de la production)
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, 
        unit, unit_price, currency, min_order_quantity, start_date, status
    ) VALUES (
        v_company_id, v_production_id, v_product_id, 'Campagne Promo Maïs Kinshasa',
        300.00, 'tonne', 400.00, 'USD', 5.00, '2026-10-15', 'active'
    ) RETURNING id INTO v_campaign_id;

    RAISE NOTICE '[SUCCÈS] TEST 8: Campagne commerciale active créée (300 t à 400 USD/t)';

    -- TEST 9: Association campagne ↔ zones desservies (Kinshasa uniquement)
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_id, v_rdc_id, v_kinshasa_id);

    RAISE NOTICE '[SUCCÈS] TEST 9: Zones desservies configurées (Kinshasa couverte, Kasaï non couvert)';

    -- TEST 10 & 11: Création d'une commande valide avec réservation atomique de 100 tonnes
    SELECT * INTO v_order_id, v_order_num, v_total_amt, v_res_qty
    FROM public.create_order_with_reservation(
        v_reseller_user_id,
        v_campaign_id,
        100.00,
        v_kinshasa_id,
        'Kinshasa',
        'Marché Central de Kinshasa',
        'Livraison matinale demandée'
    );

    IF v_total_amt <> 40000.00 OR v_res_qty <> 100.00 THEN
        RAISE EXCEPTION 'ERREUR TEST 10/11: Montant ou quantité réservée erronée (Montant: %, Réservé: %)', v_total_amt, v_res_qty;
    END IF;

    -- Vérification du stock restant via get_campaign_stock_summary
    SELECT * INTO v_stock_record FROM public.get_campaign_stock_summary(v_campaign_id);
    IF v_stock_record.available_quantity <> 200.00 OR v_stock_record.reserved_quantity <> 100.00 THEN
        RAISE EXCEPTION 'ERREUR TEST 11: Stock erroné après réservation (Disponible: %, Réservé: %)', 
            v_stock_record.available_quantity, v_stock_record.reserved_quantity;
    END IF;

    RAISE NOTICE '[SUCCÈS] TEST 10 & 11: Commande créée et Stock réservé avec succès (Reste dispo: % t)', v_stock_record.available_quantity;

    -- TEST 12: Refus d'une commande dépassant le stock disponible (tente de commander 250 t alors qu'il reste 200 t)
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_user_id,
            v_campaign_id,
            250.00,
            v_kinshasa_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '[SUCCÈS] TEST 12: Exception correctement levée pour sur-réservation (Message: %)', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'ERREUR TEST 12: La sur-réservation aurait dû être rejetée';
    END IF;

    -- TEST 13: Refus de commande pour inéligibilité géographique (Kasaï non desservi par cette campagne)
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_user_id,
            v_campaign_id,
            10.00,
            v_kasai_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '[SUCCÈS] TEST 13: Exception correctement levée pour zone inéligible (Message: %)', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'ERREUR TEST 13: La commande hors zone aurait dû être rejetée';
    END IF;

    -- TEST 14: Annulation de commande et libération de réservation
    PERFORM public.cancel_order_and_release_reservation(v_order_id, 'Test annulation');

    SELECT * INTO v_stock_record FROM public.get_campaign_stock_summary(v_campaign_id);
    IF v_stock_record.available_quantity <> 300.00 OR v_stock_record.reserved_quantity <> 0.00 THEN
        RAISE EXCEPTION 'ERREUR TEST 14: La libération de stock a échoué (Dispo: %, Réservé: %)',
            v_stock_record.available_quantity, v_stock_record.reserved_quantity;
    END IF;

    RAISE NOTICE '[SUCCÈS] TEST 14: Annulation et libération de réservation confirmées (Stock dispo restitué: % t)', v_stock_record.available_quantity;

    -- NETTOYAGE COMPLET DES DONNÉES DE TEST
    DELETE FROM public.audit_logs WHERE entity_id = v_order_id OR actor_id IN (v_company_user_id, v_reseller_user_id);
    DELETE FROM public.stock_reservations WHERE campaign_id = v_campaign_id;
    DELETE FROM public.order_items WHERE order_id = v_order_id;
    DELETE FROM public.orders WHERE id = v_order_id;
    DELETE FROM public.campaign_delivery_zones WHERE campaign_id = v_campaign_id;
    DELETE FROM public.campaigns WHERE id = v_campaign_id;
    DELETE FROM public.demands WHERE id = v_demand_id;
    DELETE FROM public.productions WHERE id = v_production_id;
    DELETE FROM public.company_products WHERE company_id = v_company_id;
    DELETE FROM public.products WHERE id = v_product_id;
    DELETE FROM public.company_members WHERE company_id = v_company_id;
    DELETE FROM public.companies WHERE id = v_company_id;
    DELETE FROM public.resellers WHERE id = v_reseller_user_id;
    DELETE FROM public.profiles WHERE id IN (v_company_user_id, v_reseller_user_id);
    DELETE FROM auth.users WHERE id IN (v_company_user_id, v_reseller_user_id);

    RAISE NOTICE '=== TOUS LES 14 TESTS ONT RÉUSSI AVEC SUCCÈS. BASE PROPRE (0 DONNÉES FICTIVES PERSISTÉES) ===';
END $$;
