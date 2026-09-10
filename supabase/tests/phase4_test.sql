-- Suite de Validation Complète Phase 4 : Gestion des Produits V1
-- Exécute et valide les 14 scénarios requis par le Prompt 4
-- Nettoyage complet post-test (Règle d'Or 2 : 0 donnée fictive résiduelle)

DO $$
DECLARE
    v_rdc_id UUID;
    v_kinshasa_id UUID;

    v_user_a_id UUID := gen_random_uuid();
    v_user_b_id UUID := gen_random_uuid();
    v_res_user_id UUID := gen_random_uuid();

    v_email_a VARCHAR := 'test_p4_a_' || SUBSTRING(v_user_a_id::text, 1, 6) || '@testagri.cd';
    v_email_b VARCHAR := 'test_p4_b_' || SUBSTRING(v_user_b_id::text, 1, 6) || '@testagri.cd';
    v_res_email VARCHAR := 'test_p4_res_' || SUBSTRING(v_res_user_id::text, 1, 6) || '@testagri.cd';

    v_company_a_id UUID;
    v_company_b_id UUID;

    v_prod_catalog_id UUID := gen_random_uuid();
    v_assoc_id UUID;
    v_count INTEGER;
    v_json_res JSONB;
    v_custom_name_text VARCHAR;
    v_product_id_created UUID;
    v_reused_product_id UUID;

    v_security_error_caught BOOLEAN := FALSE;
    v_name_error_caught BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'DÉBUT DE LA VALIDATION DE LA PHASE 4 (PRODUITS V1)';
    RAISE NOTICE '==================================================';

    -- 0. Référentiel géographique
    SELECT id INTO v_rdc_id FROM public.countries WHERE code = 'COD';
    SELECT id INTO v_kinshasa_id FROM public.provinces WHERE country_id = v_rdc_id AND name = 'Kinshasa';

    -- Création Entreprise A
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (v_user_a_id, '00000000-0000-0000-0000-000000000000', v_email_a, crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}',
            jsonb_build_object('role', 'company', 'full_name', 'Fermier Test A', 'company_name', 'AgriFerme Test A P4', 'country_id', v_rdc_id, 'province_id', v_kinshasa_id, 'city', 'Kinshasa'),
            NOW(), NOW(), 'authenticated', 'authenticated');

    SELECT id INTO v_company_a_id FROM public.companies WHERE created_by = v_user_a_id;

    -- Création Entreprise B
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (v_user_b_id, '00000000-0000-0000-0000-000000000000', v_email_b, crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}',
            jsonb_build_object('role', 'company', 'full_name', 'Fermier Test B', 'company_name', 'AgriFerme Test B P4', 'country_id', v_rdc_id, 'province_id', v_kinshasa_id, 'city', 'Kinshasa'),
            NOW(), NOW(), 'authenticated', 'authenticated');

    SELECT id INTO v_company_b_id FROM public.companies WHERE created_by = v_user_b_id;

    -- Création Revendeur
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (v_res_user_id, '00000000-0000-0000-0000-000000000000', v_res_email, crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}',
            jsonb_build_object('role', 'reseller', 'full_name', 'Revendeur Test P4', 'business_name', 'Boutique Test P4', 'country_id', v_rdc_id, 'province_id', v_kinshasa_id, 'city', 'Kinshasa'),
            NOW(), NOW(), 'authenticated', 'authenticated');

    -- =========================================================================
    -- SCÉNARIO 1 : Entreprise sans produit (État vide)
    -- =========================================================================
    SELECT COUNT(*) INTO v_count FROM public.company_products WHERE company_id = v_company_a_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 1 : L''entreprise ne devrait avoir aucun produit au démarrage.';
    END IF;
    RAISE NOTICE '[TEST 1 VALIDÉ] Entreprise sans produit : compteurs réels à 0.';

    -- =========================================================================
    -- SCÉNARIOS 2 & 3 : Ajout et association d'un produit existant du catalogue
    -- =========================================================================
    INSERT INTO public.products (id, name, category, default_unit, description, is_active)
    VALUES (v_prod_catalog_id, 'Maïs Jaune Test P4', 'Céréales', 'tonne', 'Variété locale certifiée', TRUE);

    -- Association par l'entreprise A
    INSERT INTO public.company_products (company_id, product_id, custom_name, description, is_active)
    VALUES (v_company_a_id, v_prod_catalog_id, 'Maïs Jaune des Plateaux', 'Culture plein champ', TRUE)
    RETURNING id INTO v_assoc_id;

    IF v_assoc_id IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 2 & 3 : Association company_products non créée.';
    END IF;
    RAISE NOTICE '[TEST 2 & 3 VALIDÉ] Produit existant du catalogue associé avec succès dans company_products.';

    -- =========================================================================
    -- SCÉNARIO 4 : Ajout d'un nouveau produit absent du catalogue
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    v_json_res := public.create_custom_product_and_associate(
        v_company_a_id,
        'Manioc Doux Test P4',
        'Tubercules & Racines',
        'sac_50kg',
        'Variété à haut rendement',
        NULL,
        'Manioc Doux de Kwilu',
        'Parcelle n°2'
    );

    v_product_id_created := (v_json_res->>'product_id')::uuid;

    IF v_product_id_created IS NULL OR (v_json_res->>'was_already_in_catalog')::boolean <> FALSE THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 4 : Nouveau produit non inséré correctement.';
    END IF;
    RAISE NOTICE '[TEST 4 VALIDÉ] Nouveau produit absent créé dans products et associé dans company_products.';

    -- =========================================================================
    -- SCÉNARIO 5 : Tentative de doublon (Normalisation & recherche insensible à la casse)
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);

    v_json_res := public.create_custom_product_and_associate(
        v_company_b_id,
        '   manioc doux test p4   ',
        'Tubercules & Racines',
        'sac_50kg',
        NULL, NULL, 'Manioc Ferme B', NULL
    );

    v_reused_product_id := (v_json_res->>'product_id')::uuid;

    IF v_reused_product_id <> v_product_id_created OR (v_json_res->>'was_already_in_catalog')::boolean <> TRUE THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 5 : La détection anti-doublon a échoué.';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.products WHERE LOWER(name) = 'manioc doux test p4';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 5 : Doublon détecté dans products (total: %).', v_count;
    END IF;
    RAISE NOTICE '[TEST 5 VALIDÉ] Détection anti-doublon parfaite : réutilisation du produit sans duplication.';

    -- =========================================================================
    -- SCÉNARIO 6 : Modification des informations d'un produit de l'entreprise
    -- =========================================================================
    UPDATE public.company_products
    SET custom_name = 'Maïs Jaune Extra Séché', description = 'Humidité < 12%'
    WHERE id = v_assoc_id;

    SELECT custom_name INTO v_custom_name_text FROM public.company_products WHERE id = v_assoc_id;
    IF v_custom_name_text <> 'Maïs Jaune Extra Séché' THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 6 : Modification non prise en compte.';
    END IF;
    RAISE NOTICE '[TEST 6 VALIDÉ] Modification de l''association produit réussie (custom_name: %).', v_custom_name_text;

    -- =========================================================================
    -- SCÉNARIO 7 : Désactivation puis réactivation (Archivage doux)
    -- =========================================================================
    UPDATE public.company_products SET is_active = FALSE WHERE id = v_assoc_id;

    SELECT is_active INTO v_security_error_caught FROM public.company_products WHERE id = v_assoc_id;
    IF v_security_error_caught <> FALSE THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 7 : La désactivation a échoué.';
    END IF;

    UPDATE public.company_products SET is_active = TRUE WHERE id = v_assoc_id;
    RAISE NOTICE '[TEST 7 VALIDÉ] Désactivation et réactivation douces réussies sans suppression en cascade.';

    -- =========================================================================
    -- SCÉNARIOS 8 & 9 : Refresh et persistance des données
    -- =========================================================================
    SELECT COUNT(*) INTO v_count FROM public.company_products WHERE company_id = v_company_a_id AND is_active = TRUE;
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 8 & 9 : Problème de persistance des données (trouvé: % attendu: 2).', v_count;
    END IF;
    RAISE NOTICE '[TEST 8 & 9 VALIDÉ] Données réelles persistées et requêtables.';

    -- =========================================================================
    -- SCÉNARIO 10 : Isolation - Entreprise A ne peut pas agir sur Entreprise B
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    BEGIN
        PERFORM public.create_custom_product_and_associate(
            v_company_b_id,
            'Soja Frais Test',
            'Légumineuses & Protéagineux',
            'tonne'
        );
        v_security_error_caught := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_security_error_caught := TRUE;
    END;

    IF NOT v_security_error_caught THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 10 : L''entreprise A a pu effectuer une action sur l''entreprise B !';
    END IF;
    RAISE NOTICE '[TEST 10 VALIDÉ] Isolation multi-entreprises hermétique.';

    -- =========================================================================
    -- SCÉNARIO 11 : Revendeur ne peut pas associer de produit agricole
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_res_user_id::text, true);

    BEGIN
        PERFORM public.create_custom_product_and_associate(
            v_company_a_id,
            'Produit Fraude Revendeur',
            'Céréales',
            'tonne'
        );
        v_security_error_caught := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_security_error_caught := TRUE;
    END;

    IF NOT v_security_error_caught THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 11 : Un revendeur a pu manipuler les produits d''une entreprise !';
    END IF;
    RAISE NOTICE '[TEST 11 VALIDÉ] Revendeur formellement interdit de manipuler les produits entreprise.';

    -- =========================================================================
    -- SCÉNARIO 12 : Utilisateur non authentifié bloqué
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', '', true);

    BEGIN
        PERFORM public.create_custom_product_and_associate(
            v_company_a_id,
            'Produit Anonyme',
            'Céréales',
            'tonne'
        );
        v_security_error_caught := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_security_error_caught := TRUE;
    END;

    IF NOT v_security_error_caught THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 12 : Un utilisateur non connecté a pu agir !';
    END IF;
    RAISE NOTICE '[TEST 12 VALIDÉ] Accès non authentifié formellement rejeté.';

    -- =========================================================================
    -- SCÉNARIO 13 : Validation des données et gestion d'erreurs
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    BEGIN
        PERFORM public.create_custom_product_and_associate(
            v_company_a_id,
            'X',
            'Céréales',
            'tonne'
        );
        v_name_error_caught := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_name_error_caught := TRUE;
    END;

    IF NOT v_name_error_caught THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 13 : Le nom invalide n''a pas déclenché d''erreur.';
    END IF;
    RAISE NOTICE '[TEST 13 VALIDÉ] Rejet systématique des données invalides.';

    -- =========================================================================
    -- SCÉNARIO 14 : Nettoyage intégral post-test (RÈGLE D'OR 2 : ZERO MOCK DATA)
    -- =========================================================================
    PERFORM set_config('request.jwt.claim.sub', '', true);

    DELETE FROM public.company_products WHERE company_id IN (v_company_a_id, v_company_b_id);
    DELETE FROM public.products WHERE id IN (v_prod_catalog_id, v_product_id_created);
    DELETE FROM public.company_members WHERE company_id IN (v_company_a_id, v_company_b_id);
    DELETE FROM public.companies WHERE id IN (v_company_a_id, v_company_b_id);
    DELETE FROM public.resellers WHERE id = v_res_user_id;
    DELETE FROM public.profiles WHERE id IN (v_user_a_id, v_user_b_id, v_res_user_id);
    DELETE FROM auth.users WHERE id IN (v_user_a_id, v_user_b_id, v_res_user_id);

    SELECT COUNT(*) INTO v_count FROM public.products;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 14 : Nettoyage incomplet dans products.';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.company_products;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'ÉCHEC SCÉNARIO 14 : Nettoyage incomplet dans company_products.';
    END IF;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'SUITE COMPLÈTE DE TESTS PHASE 4 VALIDÉE À 100%% !';
    RAISE NOTICE 'Base nettoyée : 0 donnée résiduelle.';
    RAISE NOTICE '==================================================';
END $$;
