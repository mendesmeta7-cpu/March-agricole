-- ============================================================================
-- TESTS — PROTECTION DES DÉPÔTS DE CAMPAGNE (migration préparée 034, ADR-061)
-- À exécuter UNIQUEMENT sur l'environnement de test, APRÈS l'application de
-- supabase/pending/20261118000034_revoke_anon_select_campaign_depots.sql.
-- Ne crée ni ne modifie aucune donnée ; tout est encadré par BEGIN ... ROLLBACK.
-- À exécuter avec le rôle postgres (propriétaire des tables, session directe).
-- Attendu : notices D1 OK … D5 OK (D5 peut être « IGNORÉ » sans données) puis
-- « ✅ PROTECTION DES DÉPÔTS VALIDÉE ».
-- Limite : la requête d'un vrai visiteur passe par PostgREST (rôle authenticator puis
-- anon) ; elle est simulée ici par SET LOCAL ROLE anon. Un appel réel à l'API avec la
-- clé anon reste à faire (procédure ADR-061).
-- ============================================================================
BEGIN;

-- D1 : droits de table
DO $$
BEGIN
    IF has_table_privilege('anon', 'public.campaign_depots', 'SELECT') THEN
        RAISE EXCEPTION 'D1 ÉCHEC : anon a encore SELECT sur campaign_depots';
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.campaign_depots', 'SELECT') THEN
        RAISE EXCEPTION 'D1 ÉCHEC : authenticated a perdu SELECT sur campaign_depots';
    END IF;
    RAISE NOTICE 'D1 OK — anon sans lecture, authenticated conservé';
END $$;

-- D2 : aucune colonne lisible par anon (droits par colonne)
DO $$
DECLARE
    v_col text;
BEGIN
    FOR v_col IN
        SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'campaign_depots'
    LOOP
        IF has_column_privilege('anon', 'public.campaign_depots', v_col, 'SELECT') THEN
            RAISE EXCEPTION 'D2 ÉCHEC : anon peut lire la colonne %', v_col;
        END IF;
    END LOOP;
    RAISE NOTICE 'D2 OK — aucune colonne de campaign_depots lisible par anon';
END $$;

-- D3 : RLS active et politiques inchangées (lecture et gestion)
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.campaign_depots'::regclass) THEN
        RAISE EXCEPTION 'D3 ÉCHEC : RLS désactivée sur campaign_depots';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_depots'
                    AND policyname = 'campaign_depots_select' AND cmd = 'SELECT') THEN
        RAISE EXCEPTION 'D3 ÉCHEC : politique campaign_depots_select absente';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_depots'
                    AND policyname = 'campaign_depots_all_owner') THEN
        RAISE EXCEPTION 'D3 ÉCHEC : politique campaign_depots_all_owner absente';
    END IF;
    RAISE NOTICE 'D3 OK — RLS et politiques en place';
END $$;

-- D4 : lecture réellement refusée au rôle anon
DO $$
DECLARE
    v_refused boolean := false;
BEGIN
    SET LOCAL ROLE anon;
    BEGIN
        PERFORM 1 FROM public.campaign_depots LIMIT 1;
    EXCEPTION WHEN insufficient_privilege THEN
        v_refused := true;
    END;
    RESET ROLE;
    IF NOT v_refused THEN
        RAISE EXCEPTION 'D4 ÉCHEC : SELECT accepté pour anon';
    END IF;
    RAISE NOTICE 'D4 OK — lecture des dépôts refusée à anon (permission denied)';
END $$;

-- D5 : un revendeur connecté lit toujours les dépôts d'une campagne active
-- (sur les données présentes ; ignoré si l'environnement n'en contient pas)
DO $$
DECLARE
    v_campaign uuid;
    v_reseller uuid;
    v_expected int;
    v_seen int;
BEGIN
    SELECT d.campaign_id, count(*) INTO v_campaign, v_expected
      FROM public.campaign_depots d
      JOIN public.campaigns c ON c.id = d.campaign_id
     WHERE c.status = 'active'
     GROUP BY d.campaign_id
     LIMIT 1;
    SELECT r.id INTO v_reseller FROM public.resellers r LIMIT 1;

    IF v_campaign IS NULL OR v_reseller IS NULL THEN
        RAISE NOTICE 'D5 IGNORÉ — aucune campagne active avec dépôts ou aucun revendeur dans cet environnement';
        RETURN;
    END IF;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_reseller, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_seen FROM public.campaign_depots WHERE campaign_id = v_campaign;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    IF v_seen <> v_expected THEN
        RAISE EXCEPTION 'D5 ÉCHEC : le revendeur voit % dépôt(s) sur % pour la campagne active %', v_seen, v_expected, v_campaign;
    END IF;
    RAISE NOTICE 'D5 OK — le revendeur connecté lit les % dépôt(s) de la campagne active', v_seen;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ PROTECTION DES DÉPÔTS VALIDÉE'; END $$;

ROLLBACK;
