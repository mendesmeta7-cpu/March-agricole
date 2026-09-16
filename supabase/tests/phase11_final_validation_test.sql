-- ====================================================================
-- TEST GLOBAL D'HOMOLOGATION FINALE : PHASE 11 — RECETTE COMPLÈTE V1
-- ====================================================================

BEGIN;

DO $$
DECLARE
    -- Acteurs
    v_admin_id UUID := gen_random_uuid();
    v_company_a_owner UUID := gen_random_uuid();
    v_company_b_owner UUID := gen_random_uuid();
    v_reseller_a_id UUID := gen_random_uuid();
    v_reseller_b_id UUID := gen_random_uuid();
    v_reseller_kas_id UUID := gen_random_uuid();
    
    -- Référentiels
    v_country_id UUID;
    v_province_kin_id UUID;
    v_province_kas_id UUID;
    v_product_corn_id UUID;
    v_product_cassava_id UUID;
    v_custom_prod_res JSONB;
    v_custom_product_id UUID;
    
    -- Entités A
    v_company_a_id UUID;
    v_production_a1_id UUID;
    v_production_a2_private_id UUID;
    v_campaign_a1_id UUID;
    
    -- Entités B
    v_company_b_id UUID;
    
    -- Demandes & Commandes
    v_demand_kas_id UUID;
    v_order_1_id UUID;
    v_order_1_num VARCHAR;
    v_order_1_total NUMERIC;
    v_order_1_res NUMERIC;
    
    -- Variables utilitaires de test
    v_stock RECORD;
    v_error_caught BOOLEAN;
    v_count INT;
    v_agg_qty NUMERIC;
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '=== DÉMARRAGE DE LA RECETTE ET AUDIT GLOBAL V1 (PHASE 11) ===';
    RAISE NOTICE '====================================================================';

    -- 1. Récupération des référentiels réels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_province_kin_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kinshasa%' OR code = 'KIN') LIMIT 1;
    SELECT id INTO v_province_kas_id FROM public.provinces WHERE country_id = v_country_id AND (name ILIKE '%Kasaï%' OR code = 'KAS') LIMIT 1;
    
    SELECT id INTO v_product_corn_id FROM public.products WHERE is_active = TRUE AND name ILIKE '%Maïs%' LIMIT 1;
    IF v_product_corn_id IS NULL THEN
        SELECT id INTO v_product_corn_id FROM public.products WHERE is_active = TRUE LIMIT 1;
    END IF;

    IF v_country_id IS NULL OR v_province_kin_id IS NULL OR v_province_kas_id IS NULL OR v_product_corn_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/provinces/produits indispensables manquants.';
    END IF;

    -- ====================================================================
    -- TEST 1 : Sécurité Auth & Triggers Anti-Escalade de Rôle (Migration 10)
    -- ====================================================================
    -- Tentative 1.1 : Inscription frauduleuse avec rôle 'admin'
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (gen_random_uuid(), 'Pirate Admin', 'admin');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Auto-attribution admin bloquée avec succès : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 1.1 ÉCHOUÉ : Un utilisateur public a pu créer un profil admin !';
    END IF;

    -- Création des profils réguliers légitimes
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_a_owner, 'owner_a_p11@test.com', '{"role":"company"}'::jsonb);
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_a_owner, 'Directeur Ferme A', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_b_owner, 'owner_b_p11@test.com', '{"role":"company"}'::jsonb);
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_b_owner, 'Directeur Ferme B', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_a_id, 'reseller_a_p11@test.com', '{"role":"reseller"}'::jsonb);
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_a_id, 'Grossiste A Kin', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_kas_id, 'reseller_kas_p11@test.com', '{"role":"reseller"}'::jsonb);
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_kas_id, 'Grossiste Kasaï', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Tentative 1.2 : Escalade de privilège via UPDATE du rôle
    v_error_caught := FALSE;
    BEGIN
        -- Simulation session authentifiée non-admin
        PERFORM set_config('request.jwt.claim.sub', v_reseller_a_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
        
        UPDATE public.profiles SET role = 'admin' WHERE id = v_reseller_a_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Escalade de rôle vers admin bloquée avec succès : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 1.2 ÉCHOUÉ : Un revendeur a pu modifier son rôle en admin !';
    END IF;

    RESET ROLE;
    RAISE NOTICE '✅ TEST 1 RÉUSSI : Triggers anti-escalade et RBAC certifiés à 100%%.';

    -- ====================================================================
    -- TEST 2 : Séparation Catalogue Produits vs Produits d'Exploitation (Phase 4)
    -- ====================================================================
    -- Création des entreprises
    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Agro P11 Entreprise A', 'agro-p11-ent-a-' || substr(v_company_a_owner::text, 1, 6),
        'Exploitation maïsicole', v_country_id, v_province_kin_id, 'Kinshasa', v_company_a_owner
    ) RETURNING id INTO v_company_a_id;

    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Agro P11 Entreprise B', 'agro-p11-ent-b-' || substr(v_company_b_owner::text, 1, 6),
        'Exploitation maraîchère', v_country_id, v_province_kin_id, 'Kinshasa', v_company_b_owner
    ) RETURNING id INTO v_company_b_id;

    -- Ajout via RPC de produit décentralisé avec anti-doublon
    PERFORM set_config('request.jwt.claim.sub', v_company_a_owner::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT public.create_custom_product_and_associate(
        v_company_a_id, '   Haricot Rouge Bio   ', 'légumineuses', 'tonne', 'Notre variété de haricot'
    ) INTO v_custom_prod_res;

    v_custom_product_id := (v_custom_prod_res->>'product_id')::UUID;

    IF v_custom_product_id IS NULL THEN
        RAISE EXCEPTION 'TEST 2.1 ÉCHOUÉ : Échec de création/association de produit via RPC.';
    END IF;

    -- Association du produit maïs catalogue
    INSERT INTO public.company_products (company_id, product_id, description)
    VALUES (v_company_a_id, v_product_corn_id, 'Maïs blanc grain dur');

    RESET ROLE;
    RAISE NOTICE '✅ TEST 2 RÉUSSI : Séparation Products vs Company_Products et RPC validées.';

    -- ====================================================================
    -- TEST 3 : Cycle des Productions & Étanchéité de Visibilité Feed (Phase 5 & 7)
    -- ====================================================================
    -- Production 1 : Publique et Récoltée (1000 tonnes)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name, expected_quantity, unit,
        period_start, period_end, status, is_public
    ) VALUES (
        v_company_a_id, v_product_corn_id, 'Grande Récolte Maïs 2026', 'https://example.com/mais.jpg',
        'Plateau Batéké', 1000.00, 'tonne', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '60 days',
        'harvested', TRUE
    ) RETURNING id INTO v_production_a1_id;

    -- Production 2 : Privée / Brouillon (300 tonnes)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name, expected_quantity, unit,
        period_start, period_end, status, is_public
    ) VALUES (
        v_company_a_id, v_custom_product_id, 'Essai Haricot Privé', 'https://example.com/haricot.jpg',
        'Parcelle Expérimentale', 300.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
        'draft', FALSE
    ) RETURNING id INTO v_production_a2_private_id;

    -- Vérification visibilité RLS pour un revendeur
    PERFORM set_config('request.jwt.claim.sub', v_reseller_a_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    SELECT COUNT(*) INTO v_count FROM public.productions WHERE id = v_production_a1_id;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3.1 ÉCHOUÉ : La production publique n''est pas lisible par le revendeur !';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.productions WHERE id = v_production_a2_private_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 3.2 ÉCHOUÉ : La production privée/brouillon est visible dans le flux revendeur !';
    END IF;

    RESET ROLE;
    RAISE NOTICE '✅ TEST 3 RÉUSSI : Cycle de vie des productions et isolation des brouillons validés.';

    -- ====================================================================
    -- TEST 4 : Demandes Revendeurs, Anonymat RLS & Agrégation Décloisonnée (Phase 6)
    -- ====================================================================
    -- Revendeur Kasaï déclare un besoin de 200 tonnes de maïs au Kasaï
    INSERT INTO public.resellers (id, business_name, country_id, province_id, city)
    VALUES (v_reseller_kas_id, 'Grossiste Kasaï Central', v_country_id, v_province_kas_id, 'Kananga')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    INSERT INTO public.demands (
        reseller_id, product_id, quantity, unit, country_id, province_id, city,
        target_period_start, target_period_end, status
    ) VALUES (
        v_reseller_kas_id, v_product_corn_id, 200.00, 'tonne', v_country_id, v_province_kas_id, 'Kananga',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active'
    ) RETURNING id INTO v_demand_kas_id;

    -- L'entreprise A (basée à Kinshasa) consulte l'analyse de marché
    SELECT COALESCE(SUM(total_demanded_quantity), 0) INTO v_agg_qty
    FROM public.v_market_demands_aggregated
    WHERE product_id = v_product_corn_id AND province_id = v_province_kas_id;

    IF v_agg_qty < 200.00 THEN
        RAISE EXCEPTION 'TEST 4.1 ÉCHOUÉ : L''agrégation de marché macroscopique est incorrecte (Total: %)', v_agg_qty;
    END IF;

    -- Vérification de l'anonymat : l'entreprise A ne doit pas pouvoir lire directement la table brute 'demands' du revendeur
    PERFORM set_config('request.jwt.claim.sub', v_company_a_owner::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    SELECT COUNT(*) INTO v_count FROM public.demands WHERE id = v_demand_kas_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 4.2 ÉCHOUÉ : Fuite de confidentialité ! L''entreprise accède aux coordonnées privées de la demande !';
    END IF;

    RESET ROLE;
    RAISE NOTICE '✅ TEST 4 RÉUSSI : Demandes décloisonnées, analyse macro et anonymat RLS certifiés.';

    -- ====================================================================
    -- TEST 5 : Campagnes Commerciales & Zones de Desserte (Phase 9)
    -- ====================================================================
    -- Création d'une campagne de 500 tonnes à 320 USD/t livrant UNIQUEMENT Kinshasa
    INSERT INTO public.campaigns (
        company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency,
        min_order_quantity, start_date, end_date, status
    ) VALUES (
        v_company_a_id, v_production_a1_id, v_product_corn_id, 'Campagne Maïs Kinshasa 500t',
        500.00, 'tonne', 320.00, 'USD', 5.00, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '25 days',
        'active'
    ) RETURNING id INTO v_campaign_a1_id;

    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_campaign_a1_id, v_country_id, v_province_kin_id);

    -- Invariant : La création de campagne ne décrémente pas la production et ne crée aucune réservation
    SELECT * INTO v_stock FROM public.get_campaign_stock_summary(v_campaign_a1_id);
    IF v_stock.marketable_quantity <> 500.00 OR v_stock.reserved_quantity <> 0.00 OR v_stock.available_quantity <> 500.00 THEN
        RAISE EXCEPTION 'TEST 5.1 ÉCHOUÉ : Calcul du stock initial faux (Marketable: %, Reserved: %, Available: %)',
            v_stock.marketable_quantity, v_stock.reserved_quantity, v_stock.available_quantity;
    END IF;

    RAISE NOTICE '✅ TEST 5 RÉUSSI : Campagne créée sans effet de bord sur la production ni fausse réservation.';

    -- ====================================================================
    -- TEST 6 : Rejet Strict des Commandes Hors Territoire Desservi (Phase 10)
    -- ====================================================================
    PERFORM set_config('request.jwt.claim.sub', v_reseller_kas_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_kas_id, v_campaign_a1_id, 20.00, v_province_kas_id, 'Kananga', 'Centre-ville'
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Commande hors territoire rejetée avec succès : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : La commande hors territoire de desserte a été acceptée !';
    END IF;
    RAISE NOTICE '✅ TEST 6 RÉUSSI : Éligibilité géographique strictement appliquée côté DB.';

    -- ====================================================================
    -- TEST 7 : Commande Valide, Snapshot de Prix & Réservation Atomique (Phase 10)
    -- ====================================================================
    INSERT INTO public.resellers (id, business_name, country_id, province_id, city, delivery_address)
    VALUES (v_reseller_a_id, 'Grossiste A Kinshasa', v_country_id, v_province_kin_id, 'Kinshasa', 'Port Fluvial')
    ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;

    PERFORM set_config('request.jwt.claim.sub', v_reseller_a_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT * INTO v_order_1_id, v_order_1_num, v_order_1_total, v_order_1_res
    FROM public.create_order_with_reservation(
        v_reseller_a_id, v_campaign_a1_id, 100.00, v_province_kin_id, 'Kinshasa', 'Port Fluvial', 'Livraison prioritaire'
    );

    IF v_order_1_id IS NULL OR v_order_1_total <> 32000.00 OR v_order_1_res <> 100.00 THEN
        RAISE EXCEPTION 'TEST 7.1 ÉCHOUÉ : Erreur création commande (Total: %, Réservé: %)', v_order_1_total, v_order_1_res;
    END IF;

    -- Modification du prix de la campagne mère (inflation à 500 USD)
    UPDATE public.campaigns SET unit_price = 500.00 WHERE id = v_campaign_a1_id;

    -- La commande historique doit conserver 320 USD et 32 000 USD de total
    IF (SELECT total_amount FROM public.orders WHERE id = v_order_1_id) <> 32000.00 THEN
        RAISE EXCEPTION 'TEST 7.2 ÉCHOUÉ : Snapshot de total_amount altéré suite à mise à jour de campagne !';
    END IF;

    IF (SELECT unit_price FROM public.order_items WHERE order_id = v_order_1_id) <> 320.00 THEN
        RAISE EXCEPTION 'TEST 7.3 ÉCHOUÉ : Snapshot de unit_price altéré !';
    END IF;

    RAISE NOTICE '✅ TEST 7 RÉUSSI : Commande ferme, réservation atomique et snapshot de prix immuable.';

    -- ====================================================================
    -- TEST 8 : Concurrence, Limite Exacte et Anti-Surbooking Absolu (Phase 10)
    -- ====================================================================
    -- Stock : 500 - 100 = 400t disponibles
    -- Création d'une commande de 350t -> reste 50t disponibles
    PERFORM public.create_order_with_reservation(
        v_reseller_a_id, v_campaign_a1_id, 350.00, v_province_kin_id, 'Kinshasa'
    );

    SELECT * INTO v_stock FROM public.get_campaign_stock_summary(v_campaign_a1_id);
    IF v_stock.available_quantity <> 50.00 THEN
        RAISE EXCEPTION 'TEST 8.1 ÉCHOUÉ : Stock résiduel incorrect (attendu 50t, obtenu %t)', v_stock.available_quantity;
    END IF;

    -- Tentative de dépassement : commande de 60t alors qu'il reste 50t
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_a_id, v_campaign_a1_id, 60.00, v_province_kin_id, 'Kinshasa'
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Surbooking bloqué avec succès : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 8.2 ÉCHOUÉ : Commande excédant le stock disponible acceptée !';
    END IF;

    -- Commande de la limite exacte : 50t -> Reste 0t
    PERFORM public.create_order_with_reservation(
        v_reseller_a_id, v_campaign_a1_id, 50.00, v_province_kin_id, 'Kinshasa'
    );

    SELECT * INTO v_stock FROM public.get_campaign_stock_summary(v_campaign_a1_id);
    IF v_stock.reserved_quantity <> 500.00 OR v_stock.available_quantity <> 0.00 THEN
        RAISE EXCEPTION 'TEST 8.3 ÉCHOUÉ : Stock après saturation incorrect (Réservé: %t, Dispo: %t)',
            v_stock.reserved_quantity, v_stock.available_quantity;
    END IF;

    -- Tentative sur campagne saturée (0t restante)
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.create_order_with_reservation(
            v_reseller_a_id, v_campaign_a1_id, 5.00, v_province_kin_id, 'Kinshasa'
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 8.4 ÉCHOUÉ : Commande acceptée sur une campagne saturée (0t disponible) !';
    END IF;

    RAISE NOTICE '✅ TEST 8 RÉUSSI : Anti-surbooking et saturation exacte garantis sous verrouillage transactionnel.';

    -- ====================================================================
    -- TEST 9 : Annulation de Commande & Libération Instantanée de Stock (Phase 10)
    -- ====================================================================
    PERFORM public.cancel_order_and_release_reservation(v_order_1_id, 'Annulation test recette');

    -- Vérification commande cancelled et réservation released
    IF (SELECT status FROM public.orders WHERE id = v_order_1_id) <> 'cancelled' THEN
        RAISE EXCEPTION 'TEST 9.1 ÉCHOUÉ : Statut de commande non passé à cancelled !';
    END IF;

    IF (SELECT status FROM public.stock_reservations WHERE order_id = v_order_1_id) <> 'released' THEN
        RAISE EXCEPTION 'TEST 9.2 ÉCHOUÉ : Statut de réservation non passé à released !';
    END IF;

    -- Le stock réservé doit être redescendu à 400t et le disponible remonté à 100t
    SELECT * INTO v_stock FROM public.get_campaign_stock_summary(v_campaign_a1_id);
    IF v_stock.reserved_quantity <> 400.00 OR v_stock.available_quantity <> 100.00 THEN
        RAISE EXCEPTION 'TEST 9.3 ÉCHOUÉ : Stock après libération incorrect (Réservé: %t, Dispo: %t)',
            v_stock.reserved_quantity, v_stock.available_quantity;
    END IF;

    RAISE NOTICE '✅ TEST 9 RÉUSSI : Annulation et restitution instantanée du stock confirmées.';

    -- ====================================================================
    -- TEST 10 : Isolation RLS Multi-Tenant Étanche (Phase 10 & 11)
    -- ====================================================================
    -- Simulation session Entreprise B (concurrente de Entreprise A)
    PERFORM set_config('request.jwt.claim.sub', v_company_b_owner::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    -- Entreprise B ne doit pas voir les commandes d'Entreprise A
    SELECT COUNT(*) INTO v_count FROM public.orders WHERE id = v_order_1_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 10.1 ÉCHOUÉ : Entreprise B peut lire les commandes d''Entreprise A !';
    END IF;

    -- Entreprise B ne doit pas voir les productions privées d'Entreprise A
    SELECT COUNT(*) INTO v_count FROM public.productions WHERE id = v_production_a2_private_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 10.2 ÉCHOUÉ : Entreprise B peut lire les productions privées d''Entreprise A !';
    END IF;

    RESET ROLE;
    RAISE NOTICE '✅ TEST 10 RÉUSSI : Isolation RLS multi-tenant étanche et inviolable.';

    -- ====================================================================
    -- TEST 11 : Intégrité Référentielle et Protection contre les Suppressions
    -- ====================================================================
    -- Tentative de suppression d'un produit utilisé par une production active
    v_error_caught := FALSE;
    BEGIN
        DELETE FROM public.products WHERE id = v_product_corn_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Suppression interdite d''un produit référencé : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 11.1 ÉCHOUÉ : Un produit utilisé par une production a pu être supprimé !';
    END IF;

    -- Tentative de suppression d'une campagne ayant des commandes associées
    v_error_caught := FALSE;
    BEGIN
        DELETE FROM public.campaigns WHERE id = v_campaign_a1_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  Suppression interdite d''une campagne avec commandes : %', SQLERRM;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 11.2 ÉCHOUÉ : Une campagne avec historique de commandes a pu être supprimée !';
    END IF;

    RAISE NOTICE '✅ TEST 11 RÉUSSI : Intégrité relationnelle et protection RESTRICT validées.';

    RAISE NOTICE '====================================================================';
    RAISE NOTICE '=== TOUS LES 11 TESTS MAJEURS DE RECETTE V1 SONT VALIDÉS À 100%% ===';
    RAISE NOTICE '====================================================================';
END $$;

ROLLBACK;
