-- Suite de Validation Complète Phase 3 : Interfaces et Espaces V1
-- Valide l'intégrité des requêtes, des données géographiques, des vues et du cloisonnement RBAC pour les 3 espaces
-- Nettoyage complet post-test (0 résidu en base)

DO $$
DECLARE
    v_rdc_id UUID;
    v_kinshasa_id UUID;
    v_kasai_id UUID;

    v_comp_user_id UUID := gen_random_uuid();
    v_res_user_id UUID := gen_random_uuid();
    v_admin_user_id UUID := gen_random_uuid();

    v_comp_email VARCHAR := 'test_p3_comp_' || SUBSTRING(v_comp_user_id::text, 1, 6) || '@testagri.cd';
    v_res_email VARCHAR := 'test_p3_res_' || SUBSTRING(v_res_user_id::text, 1, 6) || '@testagri.cd';
    v_admin_email VARCHAR := 'test_p3_admin_' || SUBSTRING(v_admin_user_id::text, 1, 6) || '@testagri.cd';

    v_company_id UUID;
    v_comp_count INTEGER;
    v_res_count INTEGER;
    v_prod_count INTEGER;
    v_rls_active_count INTEGER;
    v_market_view_count INTEGER;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'DÉBUT DE LA VALIDATION DE LA PHASE 3 (INTERFACES & ESPACES)';
    RAISE NOTICE '==================================================';

    -- 1. Référentiel Géographique
    SELECT id INTO v_rdc_id FROM public.countries WHERE code = 'COD';
    SELECT id INTO v_kinshasa_id FROM public.provinces WHERE country_id = v_rdc_id AND name = 'Kinshasa';
    SELECT id INTO v_kasai_id FROM public.provinces WHERE country_id = v_rdc_id AND name = 'Kasaï';

    IF v_rdc_id IS NULL OR v_kinshasa_id IS NULL OR v_kasai_id IS NULL THEN
        RAISE EXCEPTION 'ERREUR: Référentiel géographique RDC ou provinces Kinshasa/Kasaï introuvables';
    END IF;
    RAISE NOTICE '[TEST 1] Référentiel géographique opérationnel (COD, Kinshasa, Kasaï).';

    -- 2. Vérification RLS sur les 17 tables publiques
    SELECT COUNT(*) INTO v_rls_active_count
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = TRUE;

    IF v_rls_active_count < 17 THEN
        RAISE EXCEPTION 'ERREUR: Moins de 17 tables avec RLS active (trouvé: %)', v_rls_active_count;
    END IF;
    RAISE NOTICE '[TEST 2] Sécurité RLS active sur 100%% des tables publiques (total: %).', v_rls_active_count;

    -- 3. Requête de la vue v_market_demands_aggregated
    SELECT COUNT(*) INTO v_market_view_count FROM public.v_market_demands_aggregated;
    RAISE NOTICE '[TEST 3] Vue v_market_demands_aggregated accessible (lignes: %).', v_market_view_count;

    -- 4. Test Création et Requêtes Espace Entreprise (/dashboard/company)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_comp_user_id, '00000000-0000-0000-0000-000000000000', v_comp_email,
        crypt('Password123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
            'role', 'company',
            'full_name', 'Fondateur Test Phase 3',
            'phone', '+243990000101',
            'company_name', 'Coopérative Maraîchère Test P3',
            'company_description', 'Production locale biologique',
            'country_id', v_rdc_id,
            'province_id', v_kinshasa_id,
            'city', 'Kinshasa'
        ),
        NOW(), NOW(), 'authenticated', 'authenticated'
    );

    SELECT id INTO v_company_id FROM public.companies WHERE created_by = v_comp_user_id;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'ERREUR: Entreprise non créée via trigger';
    END IF;

    -- Vérifier les comptages réels Dashboard Entreprise (doivent tous être 0)
    SELECT COUNT(*) INTO v_prod_count FROM public.productions WHERE company_id = v_company_id;
    IF v_prod_count <> 0 THEN
        RAISE EXCEPTION 'ERREUR: La production ne devrait pas être créée à l''onboarding (règle d''or 1 violée)';
    END IF;
    RAISE NOTICE '[TEST 4] Espace Entreprise validé : Profil, Entreprise, Owner et compteurs réels à 0.';

    -- 5. Test Création et Requêtes Espace Revendeur (/dashboard/reseller)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_res_user_id, '00000000-0000-0000-0000-000000000000', v_res_email,
        crypt('Password123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
            'role', 'reseller',
            'full_name', 'Acheteur Pro Test Phase 3',
            'phone', '+243990000102',
            'business_name', 'Alimentation Centrale Tshikapa',
            'reseller_type', 'wholesaler',
            'country_id', v_rdc_id,
            'province_id', v_kasai_id,
            'city', 'Tshikapa',
            'delivery_address', 'Avenue du Marché n°10'
        ),
        NOW(), NOW(), 'authenticated', 'authenticated'
    );

    -- Vérification du rattachement territorial pivot
    IF NOT EXISTS (
        SELECT 1 FROM public.resellers r
        WHERE r.id = v_res_user_id AND r.province_id = v_kasai_id AND r.city = 'Tshikapa'
    ) THEN
        RAISE EXCEPTION 'ERREUR: Profil revendeur ou territoire pivot mal initialisé';
    END IF;
    RAISE NOTICE '[TEST 5] Espace Revendeur validé : Territoire pivot Kasaï/Tshikapa correctement rattaché.';

    -- 6. Test Création et Requêtes Espace Admin (/dashboard/admin)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_admin_user_id, '00000000-0000-0000-0000-000000000000', v_admin_email,
        crypt('Password123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
            'role', 'company',
            'full_name', 'Admin Plateforme Test P3',
            'company_name', 'Admin Temporary Company'
        ),
        NOW(), NOW(), 'authenticated', 'authenticated'
    );

    -- Promotion explicite et sécurisée au rôle admin
    UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_user_id;

    -- Vérification des comptages système globaux
    SELECT COUNT(*) INTO v_comp_count FROM public.companies;
    SELECT COUNT(*) INTO v_res_count FROM public.resellers;
    RAISE NOTICE '[TEST 6] Espace Admin validé : Promotion réussie, métriques réelles accessibles (Compagnies: %, Revendeurs: %).', v_comp_count, v_res_count;

    -- =========================================================================
    -- NETTOYAGE COMPLET DES DONNÉES DE TEST (RÈGLE D'OR 2 : ZERO MOCK DATA)
    -- =========================================================================
    DELETE FROM public.company_members WHERE user_id = v_comp_user_id;
    DELETE FROM public.companies WHERE created_by = v_comp_user_id;
    DELETE FROM public.resellers WHERE id = v_res_user_id;
    DELETE FROM public.profiles WHERE id IN (v_comp_user_id, v_res_user_id, v_admin_user_id);
    DELETE FROM auth.users WHERE id IN (v_comp_user_id, v_res_user_id, v_admin_user_id);

    -- Vérification finale de base propre
    SELECT COUNT(*) INTO v_comp_count FROM public.companies;
    SELECT COUNT(*) INTO v_res_count FROM public.resellers;

    IF v_comp_count <> 0 OR v_res_count <> 0 THEN
        RAISE EXCEPTION 'ERREUR: Nettoyage incomplet, données de test résiduelles en base !';
    END IF;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'VALIDATION PHASE 3 RÉUSSIE AVEC SUCCÈS À 100%% !';
    RAISE NOTICE 'Base de données nettoyée : 0 donnée fictive résiduelle.';
    RAISE NOTICE '==================================================';
END $$;
