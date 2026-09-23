-- ====================================================================
-- TEST D'HOMOLOGATION : NOUVEAU FONCTIONNEMENT DES CAMPAGNES (PARTIE 5)
-- Projet: Marché Agricole V1 Expérimentale
-- ====================================================================

DO $$
DECLARE
    v_comp_user_id UUID := gen_random_uuid();
    v_res_b_user_id UUID := gen_random_uuid();
    v_res_c_user_id UUID := gen_random_uuid();
    
    v_country_id UUID;
    v_prov_kin_id UUID;
    v_prov_kc_id UUID;
    
    v_company_id UUID;
    v_res_b_id UUID;
    v_res_c_id UUID;
    
    v_product_id UUID;
    v_company_product_id UUID;
    v_production_id UUID;
    v_campaign_id UUID;
    
    v_dest_kin_id UUID;
    v_dest_matadi_id UUID;
    v_depot_lemba_id UUID;
    v_depot_limete_id UUID;
    v_depot_matadi_id UUID;
    
    v_order_b_id UUID;
    v_order_res RECORD;
    v_order_check RECORD;
    v_report_res RECORD;
    v_updated_order RECORD;
    
    v_notifs_b_count INT;
    v_notifs_c_count INT;
    v_notif_msg TEXT;
    
    v_closed_camp RECORD;
    v_blocked_error_caught BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'DÉBUT DE LA VALIDATION DU NOUVEAU FONCTIONNEMENT DES CAMPAGNES';
    RAISE NOTICE '================================================================================';

    -- 0. Récupération des référentiels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_prov_kin_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kinshasa%' OR code = 'KIN') LIMIT 1;
    SELECT id INTO v_prov_kc_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kongo%' OR code = 'KC') LIMIT 1;
    SELECT id INTO v_product_id FROM public.products WHERE is_active = TRUE AND (name ILIKE '%Maïs%') LIMIT 1;

    IF v_country_id IS NULL OR v_prov_kin_id IS NULL OR v_prov_kc_id IS NULL OR v_product_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/provinces/produit manquants.';
    END IF;

    RAISE NOTICE 'ÉTAPE 0 : Référentiels validés (Pays RDC, Provinces Kinshasa et Kongo-Central, Produit Maïs)';

    -- 1. Société A
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_comp_user_id, 'societe_a_camp@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_comp_user_id, 'Directeur Société A', 'company');

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Société Agricole A', 'societe-agricole-a-' || substr(v_comp_user_id::text, 1, 8),
        'Producteur céréalier', v_country_id, v_prov_kin_id, 'Kinshasa', v_comp_user_id
    ) RETURNING id INTO v_company_id;

    -- Revendeur B (Kinshasa)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_res_b_user_id, 'revendeur_b_kin@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_res_b_user_id, 'Revendeur B Kinshasa', 'reseller');

    INSERT INTO public.resellers (
        profile_id, business_name, reseller_type, country_id, province_id, city
    ) VALUES (
        v_res_b_user_id, 'Maison Vivres B', 'wholesaler', v_country_id, v_prov_kin_id, 'Kinshasa'
    ) RETURNING id INTO v_res_b_id;

    -- Revendeur C (Matadi)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_res_c_user_id, 'revendeur_c_mat@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_res_c_user_id, 'Revendeur C Matadi', 'reseller');

    INSERT INTO public.resellers (
        profile_id, business_name, reseller_type, country_id, province_id, city
    ) VALUES (
        v_res_c_user_id, 'Comptoir Matadi C', 'retailer', v_country_id, v_prov_kc_id, 'Matadi'
    ) RETURNING id INTO v_res_c_id;

    RAISE NOTICE 'ÉTAPE 1 : Acteurs créés avec succès (Société A, Revendeur B Kinshasa, Revendeur C Matadi)';

    -- 2. Configuration produit et production de Maïs (statut harvested = RECOLTEE)
    INSERT INTO public.company_products (
        company_id, product_id, custom_name, unit
    ) VALUES (
        v_company_id, v_product_id, 'Maïs Grain Récolté', 'tonne'
    ) RETURNING id INTO v_company_product_id;

    INSERT INTO public.productions (
        company_id, company_product_id, product_id, title, status,
        expected_quantity, unit, is_public, harvest_start_date, harvest_end_date
    ) VALUES (
        v_company_id, v_company_product_id, v_product_id, 'Production Maïs Blanc Saison A', 'harvested',
        100, 'tonne', TRUE, '2026-09-01', '2026-09-10'
    ) RETURNING id INTO v_production_id;

    RAISE NOTICE 'ÉTAPE 2 : Production de Maïs RECOLTEE créée (100 tonnes, statut: harvested)';

    -- 3. Campagne commerciale multi-villes
    INSERT INTO public.campaigns (
        company_id, production_id, title, marketable_quantity, unit_price, currency,
        min_order_quantity, start_date, end_date, status
    ) VALUES (
        v_company_id, v_production_id, 'Campagne Maïs Multi-Villes Septembre', 50, 350, 'USD',
        2, CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'active'
    ) RETURNING id INTO v_campaign_id;

    INSERT INTO public.campaign_delivery_zones (campaign_id, province_id)
    VALUES (v_campaign_id, v_prov_kin_id), (v_campaign_id, v_prov_kc_id);

    -- VILLE 1 : Kinshasa (12 septembre)
    INSERT INTO public.campaign_destinations (
        campaign_id, province_id, city_name, expected_arrival_date
    ) VALUES (
        v_campaign_id, v_prov_kin_id, 'Kinshasa', '2026-09-12'
    ) RETURNING id INTO v_dest_kin_id;

    -- Dépôt Lemba
    INSERT INTO public.campaign_depots (
        destination_id, name, commune, quartier, address, complement
    ) VALUES (
        v_dest_kin_id, 'Dépôt Lemba', 'Lemba', 'Quartier Échangeur', '1ère Rue n°12', 'Près du rond-point'
    ) RETURNING id INTO v_depot_lemba_id;

    -- Dépôt Limete
    INSERT INTO public.campaign_depots (
        destination_id, name, commune, quartier, address, complement
    ) VALUES (
        v_dest_kin_id, 'Dépôt Limete', 'Limete', 'Industriel', '14ème Rue Poids Lourds', 'Face Bralima'
    ) RETURNING id INTO v_depot_limete_id;

    -- VILLE 2 : Matadi (15 septembre)
    INSERT INTO public.campaign_destinations (
        campaign_id, province_id, city_name, expected_arrival_date
    ) VALUES (
        v_campaign_id, v_prov_kc_id, 'Matadi', '2026-09-15'
    ) RETURNING id INTO v_dest_matadi_id;

    -- Dépôt Port Matadi
    INSERT INTO public.campaign_depots (
        destination_id, name, commune, quartier, address, complement
    ) VALUES (
        v_dest_matadi_id, 'Dépôt Port Matadi', 'Matadi', 'Kinkanda', 'Avenue du Port', 'Hangar 3'
    ) RETURNING id INTO v_depot_matadi_id;

    RAISE NOTICE 'ÉTAPE 3 : Campagne multi-villes créée (Kinshasa 12 sept: Lemba/Limete; Matadi 15 sept: Port)';

    -- 4. Commande du Revendeur B (Kinshasa, 10 tonnes, Dépôt Lemba)
    SELECT * INTO v_order_res FROM public.create_order_with_reservation(
        p_campaign_id => v_campaign_id,
        p_reseller_id => v_res_b_id,
        p_company_id => v_company_id,
        p_delivery_province_id => v_prov_kin_id,
        p_delivery_city => 'Kinshasa',
        p_delivery_address => 'Dépôt Lemba (1ère Rue n°12)',
        p_quantity => 10,
        p_notes => 'Enlèvement par nos camions',
        p_destination_id => v_dest_kin_id,
        p_depot_id => v_depot_lemba_id
    );

    v_order_b_id := v_order_res.order_id;
    IF v_order_b_id IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC: La commande de 10 tonnes n a pas pu être créée';
    END IF;

    -- Vérification des détails de la commande dans l'espace revendeur
    SELECT 
        order_number,
        expected_arrival_date_snapshot,
        destination_city_snapshot,
        depot_name_snapshot,
        destination_id,
        depot_id
    INTO v_order_check
    FROM public.orders
    WHERE id = v_order_b_id;

    IF v_order_check.destination_city_snapshot <> 'Kinshasa' THEN
        RAISE EXCEPTION 'ÉCHEC: destination_city_snapshot attendu "Kinshasa", obtenu "%"', v_order_check.destination_city_snapshot;
    END IF;

    IF v_order_check.expected_arrival_date_snapshot <> '2026-09-12' THEN
        RAISE EXCEPTION 'ÉCHEC: expected_arrival_date_snapshot attendu "2026-09-12", obtenu "%"', v_order_check.expected_arrival_date_snapshot;
    END IF;

    IF v_order_check.depot_name_snapshot <> 'Dépôt Lemba' THEN
        RAISE EXCEPTION 'ÉCHEC: depot_name_snapshot attendu "Dépôt Lemba", obtenu "%"', v_order_check.depot_name_snapshot;
    END IF;

    IF v_order_check.destination_id <> v_dest_kin_id OR v_order_check.depot_id <> v_depot_lemba_id THEN
        RAISE EXCEPTION 'ÉCHEC: Les liaisons destination_id et depot_id ne correspondent pas';
    END IF;

    RAISE NOTICE 'ÉTAPE 4 : Commande N° % passée avec succès. Snapshots : Ville=Kinshasa, Date=2026-09-12, Dépôt=Dépôt Lemba', v_order_check.order_number;

    -- 5. Société A modifie la date d'arrivée pour Kinshasa (12 sept -> 15 sept)
    SELECT * INTO v_report_res FROM public.update_destination_arrival_date(
        p_destination_id => v_dest_kin_id,
        p_new_arrival_date => '2026-09-15'
    );

    IF v_report_res.affected_orders_count < 1 THEN
        RAISE EXCEPTION 'ÉCHEC: Aucune commande active n a été mise à jour par le report de date';
    END IF;

    -- Vérification de la mise à jour sur la commande
    SELECT expected_arrival_date_snapshot INTO v_updated_order
    FROM public.orders WHERE id = v_order_b_id;

    IF v_updated_order.expected_arrival_date_snapshot <> '2026-09-15' THEN
        RAISE EXCEPTION 'ÉCHEC: La commande du revendeur B n a pas pris la nouvelle date "2026-09-15", trouvé: %', v_updated_order.expected_arrival_date_snapshot;
    END IF;

    RAISE NOTICE 'ÉTAPE 5 : Date d arrivée Kinshasa reportée au 15 septembre. Commande revendeur B actualisée avec succès';

    -- 6. Vérification de la notification ciblée au Revendeur B
    SELECT COUNT(*), message INTO v_notifs_b_count, v_notif_msg
    FROM public.notifications
    WHERE user_id = v_res_b_user_id AND type = 'DATE_ARRIVEE_MODIFIEE'
    GROUP BY message LIMIT 1;

    IF v_notifs_b_count IS NULL OR v_notifs_b_count = 0 THEN
        RAISE EXCEPTION 'ÉCHEC: Le revendeur B n a reçu AUCUNE notification DATE_ARRIVEE_MODIFIEE';
    END IF;

    RAISE NOTICE 'ÉTAPE 6 : Revendeur B a bien reçu la notification ciblée : "%"', v_notif_msg;

    -- 7. Vérification de l'étanchéité : Revendeur C (Matadi) ne doit RIEN avoir reçu
    SELECT COUNT(*) INTO v_notifs_c_count
    FROM public.notifications
    WHERE user_id = v_res_c_user_id AND type = 'DATE_ARRIVEE_MODIFIEE';

    IF v_notifs_c_count > 0 THEN
        RAISE EXCEPTION 'ÉCHEC DE CIBLAGE : Le revendeur C a reçu une notification alors que sa ville n a pas changé !';
    END IF;

    RAISE NOTICE 'ÉTAPE 7 : Isolation confirmée. Revendeur C (Matadi) n a reçu aucune notification (0 fuite inter-villes)';

    -- 8. Fin automatique de campagne
    -- Simulons l expiration en mettant end_date dans le passé
    UPDATE public.campaigns
    SET end_date = CURRENT_DATE - INTERVAL '1 day'
    WHERE id = v_campaign_id;

    PERFORM public.check_and_close_expired_campaigns();

    SELECT status INTO v_closed_camp FROM public.campaigns WHERE id = v_campaign_id;
    IF v_closed_camp.status <> 'completed' THEN
        RAISE EXCEPTION 'ÉCHEC: La campagne expirée ne s est pas clôturée automatiquement (statut: %)', v_closed_camp.status;
    END IF;

    -- Vérification du blocage de toute nouvelle commande
    BEGIN
        PERFORM public.create_order_with_reservation(
            p_campaign_id => v_campaign_id,
            p_reseller_id => v_res_b_id,
            p_company_id => v_company_id,
            p_delivery_province_id => v_prov_kin_id,
            p_delivery_city => 'Kinshasa',
            p_delivery_address => 'Dépôt Lemba',
            p_quantity => 2,
            p_destination_id => v_dest_kin_id,
            p_depot_id => v_depot_lemba_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_blocked_error_caught := TRUE;
    END;

    IF NOT v_blocked_error_caught THEN
        RAISE EXCEPTION 'ÉCHEC: Une commande a pu être passée sur une campagne completed !';
    END IF;

    RAISE NOTICE 'ÉTAPE 8 : Clôture automatique validée. Statut=completed. Nouvelles commandes formellement bloquées';

    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'TOUTES LES VÉRIFICATIONS DU SCÉNARIO SONT HOMOLOGUÉES AVEC SUCCÈS (100%%) !';
    RAISE NOTICE '================================================================================';

    -- Nettoyage des données de test
    DELETE FROM public.notifications WHERE user_id IN (v_res_b_user_id, v_res_c_user_id, v_comp_user_id);
    DELETE FROM public.stock_reservations WHERE campaign_id = v_campaign_id;
    DELETE FROM public.order_items WHERE order_id = v_order_b_id;
    DELETE FROM public.orders WHERE id = v_order_b_id;
    DELETE FROM public.campaign_depots WHERE id IN (v_depot_lemba_id, v_depot_limete_id, v_depot_matadi_id);
    DELETE FROM public.campaign_destinations WHERE id IN (v_dest_kin_id, v_dest_matadi_id);
    DELETE FROM public.campaign_delivery_zones WHERE campaign_id = v_campaign_id;
    DELETE FROM public.campaigns WHERE id = v_campaign_id;
    DELETE FROM public.productions WHERE id = v_production_id;
    DELETE FROM public.company_products WHERE id = v_company_product_id;
    DELETE FROM public.resellers WHERE id IN (v_res_b_id, v_res_c_id);
    DELETE FROM public.company_members WHERE company_id = v_company_id;
    DELETE FROM public.companies WHERE id = v_company_id;
    DELETE FROM public.profiles WHERE id IN (v_comp_user_id, v_res_b_user_id, v_res_c_user_id);
    DELETE FROM auth.users WHERE id IN (v_comp_user_id, v_res_b_user_id, v_res_c_user_id);

    RAISE NOTICE 'Données de test nettoyées proprement.';
END $$;
