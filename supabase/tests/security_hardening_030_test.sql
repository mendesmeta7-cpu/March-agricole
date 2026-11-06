-- ============================================================================
-- TESTS DE NON-RÉGRESSION SÉCURITÉ — MIGRATION 30
-- À exécuter UNIQUEMENT sur une base locale ou de staging, APRÈS la migration 30.
-- Entièrement encadré par BEGIN ... ROLLBACK : aucune écriture persistée.
-- Chaque test lève une exception en cas d'échec ; un passage complet affiche
-- « TOUS LES TESTS DE SÉCURITÉ 030 SONT PASSÉS ».
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- T1 — Aucune RPC applicative n'est exécutable par anon (SEC-02)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_sig text;
    v_rpc text[] := ARRAY[
        'public.cancel_order_and_release_reservation(uuid, text)',
        'public.confirm_order_delivery(uuid, text)',
        'public.create_custom_product_and_associate(uuid, character varying, character varying, character varying, text, text, character varying, text)',
        'public.create_order_from_demand_response(uuid, uuid, numeric, uuid, character varying, text, text, numeric)',
        'public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid)',
        'public.get_campaign_stock_summary(uuid)',
        'public.lookup_order_for_delivery(text)',
        'public.notify_company_on_demand_received(uuid)',
        'public.notify_resellers_on_campaign_opened(uuid)',
        'public.notify_reseller_of_demand_response(uuid)',
        'public.update_destination_arrival_date(uuid, date, date)',
        'public.update_destination_order_deadline(uuid, date)',
        'public.update_order_status(uuid, character varying)',
        'public.admin_set_company_verification(uuid, character varying)',
        'public.check_and_close_expired_campaigns()'
    ];
BEGIN
    FOREACH v_sig IN ARRAY v_rpc LOOP
        IF to_regprocedure(v_sig) IS NULL THEN
            RAISE EXCEPTION 'T1 ÉCHEC : fonction attendue absente : %', v_sig;
        END IF;
        IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
            RAISE EXCEPTION 'T1 ÉCHEC : anon peut exécuter %', v_sig;
        END IF;
    END LOOP;
    IF has_function_privilege('authenticated', 'public.check_and_close_expired_campaigns()', 'EXECUTE') THEN
        RAISE EXCEPTION 'T1 ÉCHEC : authenticated peut exécuter check_and_close_expired_campaigns';
    END IF;
    IF NOT has_function_privilege('authenticated', 'public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'T1 ÉCHEC : authenticated ne peut plus passer commande';
    END IF;
    RAISE NOTICE 'T1 OK — RPC fermées à anon';
END $$;

-- ---------------------------------------------------------------------------
-- T2 — L'ancienne version à 2 arguments a disparu ; toutes les SECURITY DEFINER
--      ont un search_path figé (SEC-02, SEC-23)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_bad text;
BEGIN
    IF to_regprocedure('public.update_destination_arrival_date(uuid, date)') IS NOT NULL THEN
        RAISE EXCEPTION 'T2 ÉCHEC : update_destination_arrival_date(uuid, date) existe encore';
    END IF;
    SELECT string_agg(p.proname, ', ') INTO v_bad
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
      AND p.proname <> 'rls_auto_enable'
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%');
    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'T2 ÉCHEC : SECURITY DEFINER sans search_path : %', v_bad;
    END IF;
    RAISE NOTICE 'T2 OK — search_path figés';
END $$;

-- ---------------------------------------------------------------------------
-- T3 — Appel anonyme effectif refusé (permission refusée avant le corps)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_rejected boolean;
BEGIN
    SET LOCAL ROLE anon;
    BEGIN
        PERFORM public.create_order_with_reservation(gen_random_uuid(), gen_random_uuid(), 1);
        v_rejected := false;
    EXCEPTION WHEN insufficient_privilege THEN
        v_rejected := true;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'T3 ÉCHEC : commande anonyme non rejetée'; END IF;

    BEGIN
        PERFORM public.update_destination_order_deadline(gen_random_uuid(), CURRENT_DATE - 1);
        v_rejected := false;
    EXCEPTION WHEN insufficient_privilege THEN
        v_rejected := true;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'T3 ÉCHEC : fermeture de destination anonyme non rejetée'; END IF;

    BEGIN
        PERFORM * FROM public.lookup_order_for_delivery('CMD-TEST');
        v_rejected := false;
    EXCEPTION WHEN insufficient_privilege THEN
        v_rejected := true;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'T3 ÉCHEC : recherche de commande anonyme non rejetée'; END IF;
    RESET ROLE;
    RAISE NOTICE 'T3 OK — appels anonymes rejetés';
END $$;

-- ---------------------------------------------------------------------------
-- T4 — Aucune écriture directe possible sur commandes, lignes, réservations,
--      audit, notifications (SEC-03, SEC-06, SEC-13)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_tbl text;
BEGIN
    FOREACH v_tbl IN ARRAY ARRAY['orders', 'order_items', 'stock_reservations', 'audit_logs'] LOOP
        IF has_table_privilege('authenticated', 'public.' || v_tbl, 'INSERT')
           OR has_table_privilege('authenticated', 'public.' || v_tbl, 'UPDATE')
           OR has_table_privilege('authenticated', 'public.' || v_tbl, 'DELETE') THEN
            RAISE EXCEPTION 'T4 ÉCHEC : authenticated peut écrire dans %', v_tbl;
        END IF;
    END LOOP;

    IF has_table_privilege('authenticated', 'public.notifications', 'INSERT') THEN
        RAISE EXCEPTION 'T4 ÉCHEC : authenticated peut créer des notifications';
    END IF;
    IF has_column_privilege('authenticated', 'public.notifications', 'title', 'UPDATE')
       OR NOT has_column_privilege('authenticated', 'public.notifications', 'read_at', 'UPDATE') THEN
        RAISE EXCEPTION 'T4 ÉCHEC : privilèges UPDATE notifications incorrects';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
               AND policyname IN ('orders_insert', 'orders_update', 'order_items_insert',
                                  'audit_logs_insert', 'notifications_insert_policy')) THEN
        RAISE EXCEPTION 'T4 ÉCHEC : une politique d''écriture directe subsiste';
    END IF;
    RAISE NOTICE 'T4 OK — écritures directes fermées';
END $$;

-- ---------------------------------------------------------------------------
-- T5 — Propositions : le revendeur n'a plus de droit de modification (SEC-04)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_qual text;
BEGIN
    SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'demand_responses' AND policyname = 'demand_responses_update_policy';
    IF v_qual IS NULL THEN
        RAISE EXCEPTION 'T5 ÉCHEC : politique de mise à jour absente';
    END IF;
    IF v_qual ILIKE '%reseller_id%' THEN
        RAISE EXCEPTION 'T5 ÉCHEC : la politique autorise encore le revendeur : %', v_qual;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guard_demand_response_write' AND NOT tgisinternal) THEN
        RAISE EXCEPTION 'T5 ÉCHEC : trigger de garde absent';
    END IF;
    RAISE NOTICE 'T5 OK — propositions protégées';
END $$;

-- ---------------------------------------------------------------------------
-- T6 — Entreprises : badge et propriétaire non modifiables ; coordonnées
--      privées non lisibles par anon (SEC-07, SEC-11)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF has_column_privilege('authenticated', 'public.companies', 'verification_status', 'UPDATE')
       OR has_column_privilege('authenticated', 'public.companies', 'created_by', 'UPDATE')
       OR has_column_privilege('authenticated', 'public.companies', 'is_active', 'UPDATE') THEN
        RAISE EXCEPTION 'T6 ÉCHEC : un membre peut modifier un champ réservé';
    END IF;
    IF NOT has_column_privilege('authenticated', 'public.companies', 'description', 'UPDATE') THEN
        RAISE EXCEPTION 'T6 ÉCHEC : le profil n''est plus modifiable';
    END IF;
    IF has_column_privilege('anon', 'public.companies', 'phone', 'SELECT')
       OR has_column_privilege('anon', 'public.companies', 'email', 'SELECT')
       OR has_column_privilege('anon', 'public.companies', 'address', 'SELECT') THEN
        RAISE EXCEPTION 'T6 ÉCHEC : coordonnées lisibles par anon';
    END IF;
    IF has_table_privilege('authenticated', 'public.companies', 'INSERT') THEN
        RAISE EXCEPTION 'T6 ÉCHEC : création directe d''entreprise encore possible';
    END IF;
    IF NOT has_column_privilege('anon', 'public.companies', 'name', 'SELECT') THEN
        RAISE EXCEPTION 'T6 ÉCHEC : le profil public n''est plus lisible';
    END IF;
    RAISE NOTICE 'T6 OK — entreprises protégées';
END $$;

-- ---------------------------------------------------------------------------
-- T7 — Divers : vue de marché, stockage, devises, anon sans écriture
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_mimes text[];
    v_tbl record;
BEGIN
    IF has_table_privilege('anon', 'public.v_market_demands_aggregated', 'SELECT') THEN
        RAISE EXCEPTION 'T7 ÉCHEC : vue de marché lisible par anon';
    END IF;

    SELECT allowed_mime_types INTO v_mimes FROM storage.buckets WHERE id = 'public-assets';
    IF 'image/svg+xml' = ANY (v_mimes) THEN
        RAISE EXCEPTION 'T7 ÉCHEC : SVG encore autorisé';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_currency')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_campaigns_currency') THEN
        RAISE EXCEPTION 'T7 ÉCHEC : contraintes de devise absentes';
    END IF;

    FOR v_tbl IN
        SELECT c.oid, c.relname FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
    LOOP
        IF has_table_privilege('anon', v_tbl.oid, 'INSERT')
           OR has_table_privilege('anon', v_tbl.oid, 'UPDATE')
           OR has_table_privilege('anon', v_tbl.oid, 'DELETE')
           OR has_table_privilege('anon', v_tbl.oid, 'TRUNCATE') THEN
            RAISE EXCEPTION 'T7 ÉCHEC : anon a un droit d''écriture sur %', v_tbl.relname;
        END IF;
    END LOOP;
    RAISE NOTICE 'T7 OK — durcissements complémentaires présents';
END $$;

-- ---------------------------------------------------------------------------
-- T8 — Écriture client réelle sur une table verrouillée (comportemental)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_rejected boolean;
BEGIN
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;

    BEGIN
        UPDATE public.orders SET status = 'delivered' WHERE false;
        v_rejected := false;
    EXCEPTION WHEN insufficient_privilege THEN
        v_rejected := true;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'T8 ÉCHEC : UPDATE direct de orders accepté'; END IF;

    BEGIN
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
        VALUES (gen_random_uuid(), 'FAUX', 'order', gen_random_uuid());
        v_rejected := false;
    EXCEPTION WHEN insufficient_privilege THEN
        v_rejected := true;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'T8 ÉCHEC : INSERT direct dans audit_logs accepté'; END IF;

    BEGIN
        PERFORM public.update_order_status(gen_random_uuid(), 'delivered');
        v_rejected := false;
    EXCEPTION WHEN raise_exception THEN
        v_rejected := true;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'T8 ÉCHEC : update_order_status a accepté delivered'; END IF;

    RESET ROLE;
    RAISE NOTICE 'T8 OK — écritures client refusées';
END $$;

-- ---------------------------------------------------------------------------
-- T9 — Tests POSITIFS : les parcours normaux ne sont pas cassés
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_sig text;
BEGIN
    -- Helpers appelés par les politiques RLS publiques : toujours exécutables
    FOREACH v_sig IN ARRAY ARRAY[
        'public.current_user_role()',
        'public.is_company_member(uuid)',
        'public.is_company_member_or_creator(uuid)',
        'public.can_company_view_demand(uuid, uuid)',
        'public.reseller_has_order_or_demand_on_production(uuid, uuid)',
        'public.reseller_has_order_on_company_product(uuid, uuid)'
    ] LOOP
        IF to_regprocedure(v_sig) IS NOT NULL
           AND (NOT has_function_privilege('anon', v_sig, 'EXECUTE')
                OR NOT has_function_privilege('authenticated', v_sig, 'EXECUTE')) THEN
            RAISE EXCEPTION 'T9 ÉCHEC : helper RLS non exécutable : %', v_sig;
        END IF;
    END LOOP;

    -- Lectures publiques (profil public, campagnes, productions) en anonyme
    SET LOCAL ROLE anon;
    PERFORM id, name, slug, logo_url, city, verification_status FROM public.companies LIMIT 1;
    PERFORM id, title, status FROM public.campaigns LIMIT 1;
    PERFORM id, title, status FROM public.productions LIMIT 1;
    RESET ROLE;

    -- Écritures légitimes conservées pour authenticated
    IF NOT has_table_privilege('authenticated', 'public.demand_responses', 'INSERT')
       OR NOT has_table_privilege('authenticated', 'public.demand_responses', 'UPDATE') THEN
        RAISE EXCEPTION 'T9 ÉCHEC : les entreprises ne peuvent plus proposer';
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.demands', 'INSERT') THEN
        RAISE EXCEPTION 'T9 ÉCHEC : les revendeurs ne peuvent plus exprimer de demande';
    END IF;
    RAISE NOTICE 'T9 OK — parcours normaux préservés';
END $$;

DO $$ BEGIN RAISE NOTICE '✅ TOUS LES TESTS DE SÉCURITÉ 030 SONT PASSÉS'; END $$;

ROLLBACK;
