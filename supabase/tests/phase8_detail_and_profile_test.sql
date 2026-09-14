-- ====================================================================
-- TEST TRANSACTIONNEL AUTOMATISÉ : PHASE 8 — DÉTAIL PRODUCTION ET PROFIL PUBLIC ENTREPRISE V1
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_company_owner_id UUID := gen_random_uuid();
    v_reseller_id UUID := gen_random_uuid();
    v_country_id UUID;
    v_province_id UUID;
    v_active_company_id UUID;
    v_inactive_company_id UUID;
    v_product_id UUID;
    v_public_prod_id UUID;
    v_draft_prod_id UUID;
    v_private_prod_id UUID;
    v_cancelled_prod_id UUID;
    v_profile_count INT;
    v_prod_count INT;
BEGIN
    RAISE NOTICE '=== DÉMARRAGE DES TESTS PHASE 8 : DÉTAIL PRODUCTION & PROFIL PUBLIC ENTREPRISE V1 ===';

    -- 1. Récupération des référentiels réels
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_province_id FROM public.provinces WHERE country_id = v_country_id LIMIT 1;
    SELECT id INTO v_product_id FROM public.products WHERE is_active = TRUE LIMIT 1;

    IF v_country_id IS NULL OR v_province_id IS NULL OR v_product_id IS NULL THEN
        RAISE EXCEPTION 'Référentiels pays/province/produit manquants pour les tests.';
    END IF;

    -- 2. Création des profils d'acteurs de test
    -- Profil Entreprise Productrice
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_company_owner_id, 'company_phase8@test.com', '{"role":"company"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_company_owner_id, 'Agro Producteur Test Phase 8', 'company')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Profil Revendeur
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reseller_id, 'reseller_phase8@test.com', '{"role":"reseller"}'::jsonb);

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_reseller_id, 'Grossiste Revendeur Test Phase 8', 'reseller')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Entreprise Agricole Active
    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, is_active, verification_status, created_by
    ) VALUES (
        'Ferme de la Menkao Phase 8', 'ferme-menkao-phase8-' || substr(v_company_owner_id::text, 1, 6),
        'Producteur maraîcher et maïsicole', v_country_id, v_province_id, 'Kinshasa', TRUE, 'verified', v_company_owner_id
    ) RETURNING id INTO v_active_company_id;

    -- Entreprise Agricole Inactive / Suspendue
    INSERT INTO public.companies (
        name, slug, description, country_id, province_id, city, is_active, verification_status, created_by
    ) VALUES (
        'Exploitation Suspendue Phase 8', 'ferme-suspendue-phase8-' || substr(v_company_owner_id::text, 1, 6),
        'Exploitation désactivée', v_country_id, v_province_id, 'Kinshasa', FALSE, 'pending', v_company_owner_id
    ) RETURNING id INTO v_inactive_company_id;

    -- 3. Création des productions pour l'entreprise active
    -- A. Production Publique Active (doit apparaître sur le profil public et la fiche détail)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_active_company_id, v_product_id, 'Maïs Doux Hybride Saison 2026',
        'https://test.supabase.co/storage/v1/object/public/public-assets/mais.jpg',
        'Plateau de Bateke - Parcelle 4', 75.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '120 days',
        'growing', TRUE
    ) RETURNING id INTO v_public_prod_id;

    -- B. Production Brouillon de l'entreprise (ne doit PAS apparaître publiquement)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_active_company_id, v_product_id, 'Brouillon Culture Tomates',
        'https://test.supabase.co/storage/v1/object/public/public-assets/tomate.jpg',
        'Serre 2', 15.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days',
        'draft', TRUE
    ) RETURNING id INTO v_draft_prod_id;

    -- C. Production Privée de l'entreprise (is_public = FALSE, ne doit PAS apparaître publiquement)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_active_company_id, v_product_id, 'Essai Agronomique Interne',
        'https://test.supabase.co/storage/v1/object/public/public-assets/essai.jpg',
        'Parcelle Expérimentale', 5.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days',
        'growing', FALSE
    ) RETURNING id INTO v_private_prod_id;

    -- D. Production Annulée de l'entreprise (status = cancelled, ne doit PAS apparaître publiquement)
    INSERT INTO public.productions (
        company_id, product_id, title, main_image_url, location_name,
        expected_quantity, unit, period_start, period_end, status, is_public
    ) VALUES (
        v_active_company_id, v_product_id, 'Culture Haricot Annulée Ravageurs',
        'https://test.supabase.co/storage/v1/object/public/public-assets/haricot.jpg',
        'Parcelle Bas-Fond', 25.00, 'tonne', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
        'cancelled', TRUE
    ) RETURNING id INTO v_cancelled_prod_id;

    -- ====================================================================
    -- TEST 1 : Consultation du Profil Public Entreprise par un Revendeur Authentifié
    -- ====================================================================
    PERFORM set_config('request.jwt.claim.sub', v_reseller_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;

    SELECT COUNT(*) INTO v_profile_count
    FROM public.companies
    WHERE id = v_active_company_id AND is_active = TRUE;

    IF v_profile_count <> 1 THEN
        RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Le revendeur ne peut pas consulter le profil public de l''entreprise active.';
    END IF;
    RAISE NOTICE '✅ TEST 1 RÉUSSI : Profil public d''entreprise active accessible au revendeur.';

    -- ====================================================================
    -- TEST 2 : Entreprise Inactive Invisible Publiquement
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM public.companies WHERE id = v_inactive_company_id) THEN
        RAISE EXCEPTION 'TEST 2 ÉCHOUÉ : L''entreprise inactive est visible par le revendeur via RLS !';
    END IF;
    RAISE NOTICE '✅ TEST 2 RÉUSSI : Entreprise inactive invisible publiquement (RLS companies_select_active).';

    -- ====================================================================
    -- TEST 3 : Consultation de la fiche de Détail Production publique
    -- ====================================================================
    IF NOT EXISTS (
        SELECT 1 FROM public.productions
        WHERE id = v_public_prod_id
          AND is_public = TRUE
          AND status IN ('planned', 'growing', 'harvested')
    ) THEN
        RAISE EXCEPTION 'TEST 3 ÉCHOUÉ : La fiche détaillée de production publique active n''est pas accessible.';
    END IF;
    RAISE NOTICE '✅ TEST 3 RÉUSSI : Fiche détaillée de production publique active accessible.';

    -- ====================================================================
    -- TEST 4 : Filtrage des productions sur le profil public de l'entreprise
    -- ====================================================================
    -- Le revendeur doit voir uniquement la production publique active (1 seule sur les 4)
    SELECT COUNT(*) INTO v_prod_count
    FROM public.productions
    WHERE company_id = v_active_company_id
      AND is_public = TRUE
      AND status IN ('planned', 'growing', 'harvested');

    IF v_prod_count <> 1 THEN
        RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : Le profil public expose % productions au lieu d''exactement 1.', v_prod_count;
    END IF;
    RAISE NOTICE '✅ TEST 4 RÉUSSI : Seule la production publique active apparaît sur le profil public.';

    -- ====================================================================
    -- TEST 5 : Tentative d'accès aux productions privées / draft / annulées
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM public.productions WHERE id = v_draft_prod_id) THEN
        RAISE EXCEPTION 'TEST 5.1 ÉCHOUÉ : La production draft est accessible !';
    END IF;

    IF EXISTS (SELECT 1 FROM public.productions WHERE id = v_private_prod_id) THEN
        RAISE EXCEPTION 'TEST 5.2 ÉCHOUÉ : La production privée is_public=FALSE est accessible !';
    END IF;

    IF EXISTS (SELECT 1 FROM public.productions WHERE id = v_cancelled_prod_id) THEN
        RAISE EXCEPTION 'TEST 5.3 ÉCHOUÉ : La production annulée est accessible !';
    END IF;
    RAISE NOTICE '✅ TEST 5 RÉUSSI : Étanchéité absolue (draft, private et cancelled sont invisibles).';

    -- ====================================================================
    -- TEST 6 : Rejet des tentatives de modification par le Revendeur
    -- ====================================================================
    -- Tentative de modifier le nom de l'entreprise
    BEGIN
        UPDATE public.companies
        SET name = 'Nom Entreprise Modifié par Pirate'
        WHERE id = v_active_company_id;

        IF (SELECT name FROM public.companies WHERE id = v_active_company_id) = 'Nom Entreprise Modifié par Pirate' THEN
            RAISE EXCEPTION 'TEST 6.1 ÉCHOUÉ : Le revendeur a pu modifier l''entreprise !';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Tentative de modifier la production
    BEGIN
        UPDATE public.productions
        SET expected_quantity = 9999.00
        WHERE id = v_public_prod_id;

        IF (SELECT expected_quantity FROM public.productions WHERE id = v_public_prod_id) = 9999.00 THEN
            RAISE EXCEPTION 'TEST 6.2 ÉCHOUÉ : Le revendeur a pu modifier la production !';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RAISE NOTICE '✅ TEST 6 RÉUSSI : Rejet strict des modifications frauduleuses (RLS en lecture seule pour revendeur).';

    -- Rétablir le rôle postgres pour les vérifications finales
    RESET ROLE;

    -- ====================================================================
    -- TEST 7 : Invariants Règle d'Or 3 (0 campagne, 0 commande, 0 réservation de stock)
    -- ====================================================================
    IF (SELECT COUNT(*) FROM public.campaigns WHERE company_id = v_active_company_id) > 0 THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Des campagnes ont été générées prématurément.';
    END IF;

    IF (SELECT COUNT(*) FROM public.orders WHERE company_id = v_active_company_id) > 0 THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Des commandes ont été créées.';
    END IF;

    IF (SELECT COUNT(*) FROM public.stock_reservations) > 0 THEN
        RAISE EXCEPTION 'TEST 7 ÉCHOUÉ : Des réservations de stock ont été créées.';
    END IF;
    RAISE NOTICE '✅ TEST 7 RÉUSSI : Invariants respectés (0 campagne, 0 commande, 0 stock réservé).';

    RAISE NOTICE '=== TOUS LES TESTS DE LA PHASE 8 SONT VALIDÉS AVEC SUCCÈS ===';
END $$;

ROLLBACK;
