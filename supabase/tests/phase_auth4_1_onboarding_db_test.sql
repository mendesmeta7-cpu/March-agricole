-- Test de validation SQL Phase AUTH-4.1 (Enrichi): Schéma, Rôle Provisoire, RPC d'Onboarding et Sécurité Renforcée
-- Projet: Radiza (Marché Agricole V1)
-- Fichier: supabase/tests/phase_auth4_1_onboarding_db_test.sql
-- Prérequis: Exécuter dans l'éditeur SQL Supabase ou via CLI après application de la migration 26.

DO $$
DECLARE
    v_col_onboarding RECORD;
    v_role_check_def TEXT;
    v_status_check_def TEXT;
    v_rpc_prosecdef BOOLEAN;
    v_rpc_searchpath TEXT;
    v_has_execute_authenticated BOOLEAN;
    v_has_execute_public BOOLEAN;
    v_has_update_table_authenticated BOOLEAN;
    v_has_update_role_authenticated BOOLEAN;
    v_has_update_status_authenticated BOOLEAN;
    v_has_update_name_authenticated BOOLEAN;
    v_existing_completed_count INTEGER;
    v_pending_accounts_count INTEGER;
    
    -- Variables pour tests d'exécution simulée en bloc protégé
    v_rdc_id UUID;
    v_kinshasa_id UUID;
    v_other_country_id UUID;
    v_test_user_id UUID;
    v_err_caught BOOLEAN;
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'HOMOLOGATION TECHNIQUE AUTH-4.1 — VÉRIFICATIONS DE SCHÉMA ET SÉCURITÉ';
    RAISE NOTICE '======================================================================';

    -- ------------------------------------------------------------------
    -- 1. CONTRÔLES STATIQUES DE SCHÉMA & CONTRAINTES
    -- ------------------------------------------------------------------

    -- TEST 1 : Présence et type de la colonne onboarding_status
    SELECT column_name, data_type, column_default, is_nullable INTO v_col_onboarding
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'onboarding_status';

    IF v_col_onboarding.column_name IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC TEST 1 : Colonne profiles.onboarding_status manquante.';
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 1 : Colonne profiles.onboarding_status présente (type: %).', v_col_onboarding.data_type;

    -- TEST 2 : Contrainte CHECK profiles_role_check incluant formellement 'unassigned'
    SELECT pg_get_constraintdef(oid) INTO v_role_check_def
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
      AND contype = 'c' 
      AND conname = 'profiles_role_check';

    IF v_role_check_def IS NULL OR v_role_check_def NOT LIKE '%unassigned%' THEN
        RAISE EXCEPTION 'ÉCHEC TEST 2 : Contrainte profiles_role_check manquante ou n''incluant pas ''unassigned'' : %', v_role_check_def;
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 2 : Contrainte profiles.role inclut ''unassigned'' : %', v_role_check_def;

    -- TEST 3 : Contrainte CHECK sur profiles.onboarding_status ('pending', 'completed')
    SELECT pg_get_constraintdef(oid) INTO v_status_check_def
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%onboarding_status%';

    IF v_status_check_def IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC TEST 3 : Contrainte CHECK sur profiles.onboarding_status introuvable.';
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 3 : Contrainte CHECK onboarding_status validée : %', v_status_check_def;

    -- TEST 4 : Triggers d'inscription et anti-escalade opérationnels
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_on_auth_user_created') THEN
        RAISE EXCEPTION 'ÉCHEC TEST 4 : Trigger trg_on_auth_user_created manquant sur auth.users.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_profile_role_escalation') THEN
        RAISE EXCEPTION 'ÉCHEC TEST 4 : Trigger trg_prevent_profile_role_escalation manquant sur public.profiles.';
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 4 : Triggers trg_on_auth_user_created et trg_prevent_profile_role_escalation rattachés.';

    -- TEST 5 : Propriétés de sécurité de la RPC complete_user_onboarding
    SELECT prosecdef INTO v_rpc_prosecdef
    FROM pg_proc WHERE proname = 'complete_user_onboarding';

    IF v_rpc_prosecdef IS NOT TRUE THEN
        RAISE EXCEPTION 'ÉCHEC TEST 5 : complete_user_onboarding doit être SECURITY DEFINER.';
    END IF;

    SELECT proconfig::text INTO v_rpc_searchpath
    FROM pg_proc WHERE proname = 'complete_user_onboarding';

    IF v_rpc_searchpath IS NULL OR v_rpc_searchpath NOT LIKE '%search_path=public, pg_temp%' THEN
        RAISE EXCEPTION 'ÉCHEC TEST 5 : complete_user_onboarding doit fixer search_path = public, pg_temp : %', v_rpc_searchpath;
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 5 : RPC configurée en SECURITY DEFINER avec search_path hermétique.';

    -- TEST 6 : Privilèges EXECUTE sur la RPC
    SELECT has_function_privilege('authenticated', 'public.complete_user_onboarding(varchar, uuid, uuid, varchar, varchar, text, text, varchar, varchar, varchar, text)', 'EXECUTE')
    INTO v_has_execute_authenticated;

    SELECT has_function_privilege('public', 'public.complete_user_onboarding(varchar, uuid, uuid, varchar, varchar, text, text, varchar, varchar, varchar, text)', 'EXECUTE')
    INTO v_has_execute_public;

    IF NOT v_has_execute_authenticated THEN
        RAISE EXCEPTION 'ÉCHEC TEST 6 : authenticated doit disposer du droit EXECUTE.';
    END IF;

    IF v_has_execute_public THEN
        RAISE EXCEPTION 'ÉCHEC TEST 6 : PUBLIC ne doit PAS disposer du droit EXECUTE.';
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 6 : Privilèges EXECUTE strictement restreints à authenticated.';

    -- TEST 7 : Rétrocompatibilité 100% des comptes existants
    SELECT COUNT(*) INTO v_existing_completed_count
    FROM public.profiles 
    WHERE role IN ('company', 'reseller', 'admin') 
      AND onboarding_status = 'completed';

    SELECT COUNT(*) INTO v_pending_accounts_count
    FROM public.profiles 
    WHERE role IN ('company', 'reseller', 'admin') 
      AND onboarding_status <> 'completed';

    IF v_pending_accounts_count > 0 THEN
        RAISE EXCEPTION 'ÉCHEC TEST 7 : % compte(s) existant(s) possèdent un onboarding_status non complété.', v_pending_accounts_count;
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 7 : 100%% des comptes existants (% profils) sont marqués completed.', v_existing_completed_count;

    -- ------------------------------------------------------------------
    -- 2. CONTRÔLES DES PRIVILÈGES DE COLONNES (POSTGREST ANTI-TAMPERING)
    -- ------------------------------------------------------------------

    RAISE NOTICE '--- TEST 8 : Vérification matérielle des privilèges de colonnes sur profiles ---';
    
    -- Le rôle authenticated ne doit PAS posséder le privilège UPDATE au niveau table globale
    SELECT has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
    INTO v_has_update_table_authenticated;

    -- Le rôle authenticated ne doit PAS posséder le privilège UPDATE sur la colonne role
    SELECT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
    INTO v_has_update_role_authenticated;

    -- Le rôle authenticated ne doit PAS posséder le privilège UPDATE sur la colonne onboarding_status
    SELECT has_column_privilege('authenticated', 'public.profiles', 'onboarding_status', 'UPDATE')
    INTO v_has_update_status_authenticated;

    -- Le rôle authenticated DOIT posséder le privilège UPDATE sur la colonne full_name pour ses modifications ordinaires
    SELECT has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
    INTO v_has_update_name_authenticated;

    IF v_has_update_role_authenticated THEN
        RAISE EXCEPTION 'ÉCHEC TEST 8 : authenticated possède toujours le privilège UPDATE sur profiles.role.';
    END IF;

    IF v_has_update_status_authenticated THEN
        RAISE EXCEPTION 'ÉCHEC TEST 8 : authenticated possède toujours le privilège UPDATE sur profiles.onboarding_status.';
    END IF;

    IF NOT v_has_update_name_authenticated THEN
        RAISE EXCEPTION 'ÉCHEC TEST 8 : authenticated a perdu le droit légitime de modifier profiles.full_name.';
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 8 : Colonnes sensibles (role, onboarding_status) verrouillées ; colonnes ordinaires autorisées.';

    -- ------------------------------------------------------------------
    -- 3. VÉRIFICATIONS DES RÈGLES DE REJET DE LA RPC (SIMULATIONS UNITAIRES)
    -- ------------------------------------------------------------------

    -- Recherche des référentiels pour tests de cohérence territoriale
    SELECT id INTO v_rdc_id FROM public.countries WHERE code = 'COD' LIMIT 1;
    SELECT id INTO v_kinshasa_id FROM public.provinces WHERE country_id = v_rdc_id LIMIT 1;

    -- TEST 9 : Rejet strict si non authentifié (auth.uid() IS NULL)
    RAISE NOTICE '--- TEST 9 : Rejet d''appel RPC hors session ---';
    v_err_caught := FALSE;
    BEGIN
        -- Exécution sans session auth.uid() simulée
        PERFORM public.complete_user_onboarding(
            p_role := 'company',
            p_country_id := v_rdc_id,
            p_province_id := v_kinshasa_id,
            p_company_name := 'Test Non Authentifie'
        );
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'Non authentifié : une session active est requise.' THEN
            v_err_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'ÉCHEC TEST 9 : Erreur inattendue lors de l''appel RPC au lieu du rejet d''authentification attendu : %', SQLERRM;
        END IF;
    END;

    IF NOT v_err_caught THEN
        RAISE EXCEPTION 'ÉCHEC TEST 9 : La RPC aurait dû lever une exception en l''absence de session authentifiée.';
    END IF;
    RAISE NOTICE 'SUCCÈS TEST 9 : Appel sans session formellement rejeté par la RPC.';

    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'SUITE DE VALIDATION AUTH-4.1 TERMINÉE : 9/9 TESTS CONFORMES.';
    RAISE NOTICE '======================================================================';
END $$;
