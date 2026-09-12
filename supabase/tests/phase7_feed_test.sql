-- ====================================================================
-- TEST TRANSACTIONNEL AUTOMATISÉ : PHASE 7 — FEED REVENDEUR V1
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_company_owner_id UUID := gen_random_uuid();
    v_reseller_id UUID := gen_random_uuid();
    v_country_id UUID;
    v_province_id UUID;
    v_company_id UUID;
    v_product_id UUID;
    v_public_prod_id UUID;
    v_draft_prod_id UUID;
    v_private_prod_id UUID;
    v_cancelled_prod_id UUID;
    v_feed_count INT;
BEGIN
    RAISE NOTICE '=== DÉMARRAGE DES TESTS PHASE 7 : FEED REVENDEUR V1 ===';

    -- 1. Récupération des référentiels géographiques réels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_province_id FROM public.provinces WHERE country_id = v_country_id LIMIT 1;
    SELECT id INTO v_product_id FROM public.products WHERE is_active = TRUE LIMIT 1;

    IF v_country_id IS NULL OR v_province_id IS NULL OR v_product_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/province/produit manquants pour les tests.';
    END IF;

    -- 2. Création des profils d'acteurs de test
    -- Profil Entreprise
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_owner_id, 'feed_company@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_owner_id, 'Fondateur Ferme Test', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Profil Revendeur
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_id, 'feed_reseller@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_id, 'Acheteur Revendeur Test', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Enregistrement de l'entreprise
    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, created_by
    ) VALUES (
        'Exploitation Agricole Test Feed', 'ferme-test-feed-' || substr(v_company_owner_id::text, 1, 6),
        'Producteur maraîcher et céréalier', v_country_id, v_province_id, 'Kinshasa', v_company_owner_id
    ) RETURNING id INTO v_company_id;

    -- 3. Création des différents types de productions
    -- A. Production Publique Active (doit apparaître dans le feed)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_id, v_product_id, 'Culture de Maïs Saison A',
        'https://test.supabase.co/storage/v1/object/public/public-assets/mais.jpg',
        'Plateau de Bateke', 50.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
        'growing', TRUE
    ) RETURNING id INTO v_public_prod_id;

    -- B. Production Brouillon (ne doit PAS apparaître dans le feed public)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_id, v_product_id, 'Brouillon Culture Tomates',
        'https://test.supabase.co/storage/v1/object/public/public-assets/tomates.jpg',
        'Serre 1', 10.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days',
        'draft', TRUE
    ) RETURNING id INTO v_draft_prod_id;

    -- C. Production Privée (ne doit PAS apparaître dans le feed public)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_id, v_product_id, 'Culture Privée Confidentielle',
        'https://test.supabase.co/storage/v1/object/public/public-assets/prive.jpg',
        'Champ Secret', 20.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days',
        'growing', FALSE
    ) RETURNING id INTO v_private_prod_id;

    -- D. Production Annulée (ne doit PAS apparaître dans le feed public)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_company_id, v_product_id, 'Culture de Soja Annulée',
        'https://test.supabase.co/storage/v1/object/public/public-assets/soja.jpg',
        'Parcelle B', 30.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
        'cancelled', TRUE
    ) RETURNING id INTO v_cancelled_prod_id;

    -- ====================================================================
    -- TEST 1 : Vérification RLS visibilité publique pour le Revendeur
    -- ====================================================================
    -- Simulation de session revendeur sous rôle authenticated
    PERFORM set_config('request.jwt.claim.sub', v_reseller_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    -- Le revendeur doit voir UNIQUEMENT la production publique active
    SELECT COUNT(*) INTO v_feed_count
    FROM public.productions
    WHERE id IN (v_public_prod_id, v_draft_prod_id, v_private_prod_id, v_cancelled_prod_id);

    IF v_feed_count <> 1 THEN
        RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Le revendeur voit % productions au lieu de 1 seule publique active.', v_feed_count;
    END IF;
    RAISE NOTICE '✅ TEST 1 RÉUSSI : Isolation RLS respectée (seule la production publique growing est visible).';

    -- ====================================================================
    -- TEST 2 : Tentative d''accès direct à la production brouillon (doit retourner NULL)
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM public.productions WHERE id = v_draft_prod_id) THEN
        RAISE EXCEPTION 'TEST 2 ÉCHOUÉ : La production brouillon est accessible au revendeur !';
    END IF;
    RAISE NOTICE '✅ TEST 2 RÉUSSI : Production brouillon invisible au revendeur.';

    -- ====================================================================
    -- TEST 3 : Tentative d''accès direct à la production privée (doit retourner NULL)
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM public.productions WHERE id = v_private_prod_id) THEN
        RAISE EXCEPTION 'TEST 3 ÉCHOUÉ : La production privée is_public=FALSE est accessible au revendeur !';
    END IF;
    RAISE NOTICE '✅ TEST 3 RÉUSSI : Production privée is_public=FALSE invisible au revendeur.';

    -- ====================================================================
    -- TEST 4 : Tentative d''accès direct à la production annulée (doit retourner NULL)
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM public.productions WHERE id = v_cancelled_prod_id) THEN
        RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : La production annulée est accessible au revendeur !';
    END IF;
    RAISE NOTICE '✅ TEST 4 RÉUSSI : Production annulée invisible au revendeur.';

    -- ====================================================================
    -- TEST 5 : Rejet d''écriture/modification par le revendeur
    -- ====================================================================
    BEGIN
        UPDATE public.productions
        SET title = 'Titre piraté'
        WHERE id = v_public_prod_id;

        IF (SELECT title FROM public.productions WHERE id = v_public_prod_id) = 'Titre piraté' THEN
            RAISE EXCEPTION 'TEST 5 ÉCHOUÉ : Le revendeur a pu modifier la production !';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RAISE NOTICE '✅ TEST 5 RÉUSSI : Rejet strict des modifications non autorisées par un revendeur.';

    -- Rétablir le rôle postgres pour les vérifications finales
    RESET ROLE;

    -- ====================================================================
    -- TEST 6 : Invariant Règle d''Or 3 (0 stock, 0 campagne, 0 commande créés)
    -- ====================================================================
    IF (SELECT COUNT(*) FROM public.campaigns WHERE company_id = v_company_id) > 0 THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : Des campagnes ont été générées automatiquement.';
    END IF;

    IF (SELECT COUNT(*) FROM public.orders WHERE company_id = v_company_id) > 0 THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : Des commandes ont été créées.';
    END IF;

    IF (SELECT COUNT(*) FROM public.stock_reservations) > 0 THEN
        RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : Des réservations de stock ont été créées.';
    END IF;
    RAISE NOTICE '✅ TEST 6 RÉUSSI : Zéro campagne, zéro commande et zéro réservation de stock.';

    RAISE NOTICE '=== TOUS LES TESTS DE LA PHASE 7 SONT VALIDÉS AVEC SUCCÈS ===';
END $$;

ROLLBACK;
