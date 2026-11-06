-- ============================================================================
-- TESTS COMPORTEMENTAUX — RÈGLES MÉTIER A3, A4, A5, A11, A12, A13 (migration 31)
-- À exécuter UNIQUEMENT sur l'environnement de test, APRÈS les migrations 029,
-- 030 et 031. Tout est encadré par BEGIN ... ROLLBACK : les comptes, l'entreprise,
-- la production, les campagnes et les commandes créés ici disparaissent à la fin.
-- Attendu : notices R1 OK … R7 OK puis « ✅ RÈGLES MÉTIER 031 VALIDÉES ».
-- ============================================================================
BEGIN;

CREATE TEMP TABLE t_ids (k text PRIMARY KEY, v uuid NOT NULL) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- R0 — Jeu de données de test (créé par le rôle propriétaire, puis annulé)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_company_user uuid := gen_random_uuid();
    v_reseller_user uuid := gen_random_uuid();
    v_province uuid;
    v_country uuid;
    v_product uuid;
    v_company uuid;
    v_production uuid;
    v_campaign uuid;
    v_suffix text := substr(md5(random()::text), 1, 8);
BEGIN
    SELECT p.id, p.country_id INTO v_province, v_country FROM public.provinces p ORDER BY p.name LIMIT 1;
    SELECT id INTO v_product FROM public.products WHERE is_global AND is_active ORDER BY name LIMIT 1;
    IF v_province IS NULL OR v_product IS NULL THEN
        RAISE EXCEPTION 'R0 : référentiels absents (provinces / catalogue global) — migrations incomplètes ?';
    END IF;

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    VALUES
      (v_company_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'test-031-societe-' || v_suffix || '@example.invalid', '{"full_name":"Test Société 031"}'::jsonb, now(), now()),
      (v_reseller_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'test-031-revendeur-' || v_suffix || '@example.invalid', '{"full_name":"Test Revendeur 031"}'::jsonb, now(), now());

    INSERT INTO public.companies (name, slug, country_id, province_id, created_by)
    VALUES ('Société test 031', 'societe-test-031-' || v_suffix, v_country, v_province, v_company_user)
    RETURNING id INTO v_company;
    UPDATE public.profiles SET role = 'company', onboarding_status = 'completed' WHERE id = v_company_user;

    INSERT INTO public.resellers (id, country_id, province_id, city, business_name)
    VALUES (v_reseller_user, v_country, v_province, 'Ville test', 'Revendeur test 031');
    UPDATE public.profiles SET role = 'reseller', onboarding_status = 'completed' WHERE id = v_reseller_user;

    INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                    expected_quantity, unit, period_start, status, is_public)
    VALUES (v_company, v_product, 'Production test 031', 'https://example.invalid/image.jpg', 'Parcelle test',
            100, 'tonne', CURRENT_DATE - 30, 'harvested', TRUE)
    RETURNING id INTO v_production;

    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit,
                                  unit_price, currency, start_date, end_date, status)
    VALUES (v_company, v_production, v_product, 'Campagne A 031', 60, 'tonne', 10, 'USD',
            CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_campaign;

    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date)
    VALUES (v_campaign, v_province, 'Ville test', CURRENT_DATE + 10);

    INSERT INTO t_ids VALUES ('company_user', v_company_user), ('reseller_user', v_reseller_user),
                             ('company', v_company), ('production', v_production), ('campaign_a', v_campaign),
                             ('product', v_product), ('province', v_province);
    RAISE NOTICE 'R0 OK — jeu de données de test créé';
END $$;

-- ---------------------------------------------------------------------------
-- R1 — A3 : le total engagé par les campagnes ne dépasse jamais la production
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_company uuid := (SELECT v FROM t_ids WHERE k = 'company');
    v_production uuid := (SELECT v FROM t_ids WHERE k = 'production');
    v_product uuid := (SELECT v FROM t_ids WHERE k = 'product');
    v_campaign_b uuid;
    v_refused boolean;
BEGIN
    -- 60 déjà engagés : une campagne de 50 doit être refusée (110 > 100)
    BEGIN
        INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit,
                                      unit_price, currency, start_date, status)
        VALUES (v_company, v_production, v_product, 'Campagne B trop grande', 50, 'tonne', 10, 'USD', CURRENT_DATE, 'draft');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Volume insuffisant sur la production%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R1 ÉCHEC : campagne dépassant la production acceptée'; END IF;

    -- 40 : exactement le reliquat → acceptée (le brouillon engage aussi son volume)
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit,
                                  unit_price, currency, start_date, status)
    VALUES (v_company, v_production, v_product, 'Campagne B', 40, 'tonne', 10, 'USD', CURRENT_DATE, 'draft')
    RETURNING id INTO v_campaign_b;
    INSERT INTO t_ids VALUES ('campaign_b', v_campaign_b);

    -- Augmentation au-delà : refusée
    BEGIN
        UPDATE public.campaigns SET marketable_quantity = 41 WHERE id = v_campaign_b;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := TRUE;
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R1 ÉCHEC : augmentation au-delà du reliquat acceptée'; END IF;

    -- Réduction de la production sous le volume engagé (100) : refusée
    BEGIN
        UPDATE public.productions SET expected_quantity = 90 WHERE id = v_production;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := TRUE;
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R1 ÉCHEC : production réduite sous le volume engagé'; END IF;

    RAISE NOTICE 'R1 OK — A3 : volume cumulé des campagnes plafonné par la production';
END $$;

-- ---------------------------------------------------------------------------
-- R2 — A4 : production récoltée figée tant qu'une campagne active en dépend
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_production uuid := (SELECT v FROM t_ids WHERE k = 'production');
    v_refused boolean;
BEGIN
    BEGIN
        UPDATE public.productions SET status = 'planned' WHERE id = v_production;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Impossible de modifier le statut d''une production récoltée%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R2 ÉCHEC : statut modifié malgré une campagne active'; END IF;
    RAISE NOTICE 'R2 OK — A4 : statut de la production protégé';
END $$;

-- ---------------------------------------------------------------------------
-- R3 — Commande revendeur (identité simulée) puis A13 / A5 côté statuts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_reseller uuid := (SELECT v FROM t_ids WHERE k = 'reseller_user');
    v_company_user uuid := (SELECT v FROM t_ids WHERE k = 'company_user');
    v_campaign uuid := (SELECT v FROM t_ids WHERE k = 'campaign_a');
    v_order uuid;
    v_refused boolean;
BEGIN
    -- Le revendeur commande 10 t
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_reseller, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT o.order_id INTO v_order FROM public.create_order_with_reservation(v_reseller, v_campaign, 10) o;
    RESET ROLE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'R3 ÉCHEC : commande non créée'; END IF;
    INSERT INTO t_ids VALUES ('order', v_order);

    -- A5 : livraison impossible tant que la commande n'est pas « prête »
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_company_user, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM public.confirm_order_delivery(v_order, NULL);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Seule une commande prête peut être livrée%';
    END;
    IF NOT v_refused THEN RESET ROLE; RAISE EXCEPTION 'R3 ÉCHEC : livraison acceptée en statut pending'; END IF;

    -- A13 : l'entreprise confirme (en avant)…
    PERFORM public.update_order_status(v_order, 'confirmed');
    -- … puis ne peut pas revenir en arrière
    BEGIN
        PERFORM public.update_order_status(v_order, 'pending');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := TRUE;
    END;
    RESET ROLE;
    IF NOT v_refused THEN RAISE EXCEPTION 'R3 ÉCHEC : retour en arrière de statut accepté'; END IF;

    -- A5 : le revendeur ne peut plus annuler une commande confirmée
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_reseller, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM public.cancel_order_and_release_reservation(v_order, 'Test revendeur');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Un revendeur ne peut annuler qu''une commande en attente%';
    END;
    RESET ROLE;
    IF NOT v_refused THEN RAISE EXCEPTION 'R3 ÉCHEC : annulation revendeur d''une commande confirmée acceptée'; END IF;

    RAISE NOTICE 'R3 OK — A5 / A13 : statuts et annulation conformes';
END $$;

-- ---------------------------------------------------------------------------
-- R4 — A5 : livraison d'une commande « prête » puis A11 : le volume livré
--      reste consommé sur la campagne
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_company_user uuid := (SELECT v FROM t_ids WHERE k = 'company_user');
    v_campaign uuid := (SELECT v FROM t_ids WHERE k = 'campaign_a');
    v_order uuid := (SELECT v FROM t_ids WHERE k = 'order');
    v_reserved numeric;
    v_available numeric;
    v_refused boolean;
BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_company_user, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.update_order_status(v_order, 'ready');
    PERFORM public.confirm_order_delivery(v_order, 'Livraison test');
    SELECT s.reserved_quantity, s.available_quantity INTO v_reserved, v_available
    FROM public.get_campaign_stock_summary(v_campaign) s;
    RESET ROLE;

    IF (SELECT status FROM public.orders WHERE id = v_order) <> 'delivered' THEN
        RAISE EXCEPTION 'R4 ÉCHEC : commande prête non livrée';
    END IF;
    IF v_reserved <> 10 OR v_available <> 50 THEN
        RAISE EXCEPTION 'R4 ÉCHEC : A11 — consommé % / disponible % (attendu 10 / 50)', v_reserved, v_available;
    END IF;

    -- Réduction de la campagne sous le volume livré : refusée
    BEGIN
        UPDATE public.campaigns SET marketable_quantity = 5 WHERE id = v_campaign;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := TRUE;
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R4 ÉCHEC : campagne réduite sous le volume livré'; END IF;

    RAISE NOTICE 'R4 OK — A5 / A11 : livraison depuis « prête », volume livré toujours consommé';
END $$;

-- ---------------------------------------------------------------------------
-- R5 — A12 : réouverture des campagnes
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_campaign_a uuid := (SELECT v FROM t_ids WHERE k = 'campaign_a');
    v_campaign_b uuid := (SELECT v FROM t_ids WHERE k = 'campaign_b');
    v_refused boolean;
BEGIN
    -- Campagne annulée : jamais réactivable
    UPDATE public.campaigns SET status = 'cancelled' WHERE id = v_campaign_b;
    BEGIN
        UPDATE public.campaigns SET status = 'active' WHERE id = v_campaign_b;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne annulée ne peut pas être réactivée%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R5 ÉCHEC : campagne annulée réactivée'; END IF;

    -- Campagne terminée : réouverture refusée sans prolongation…
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_campaign_a;
    BEGIN
        UPDATE public.campaigns SET status = 'active' WHERE id = v_campaign_a;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne terminée ne peut être rouverte%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'R5 ÉCHEC : campagne terminée rouverte sans prolongation'; END IF;

    -- … acceptée avec une date de fin prolongée
    UPDATE public.campaigns SET status = 'active', end_date = CURRENT_DATE + 60 WHERE id = v_campaign_a;
    IF (SELECT status FROM public.campaigns WHERE id = v_campaign_a) <> 'active' THEN
        RAISE EXCEPTION 'R5 ÉCHEC : réouverture légitime refusée';
    END IF;

    RAISE NOTICE 'R5 OK — A12 : réouverture encadrée';
END $$;

-- ---------------------------------------------------------------------------
-- R6 — A3 : la commande sur proposition respecte le volume engagé
--      (campagne B annulée : reliquat 100 - 60 = 40)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_production uuid := (SELECT v FROM t_ids WHERE k = 'production');
    v_committed numeric;
BEGIN
    v_committed := public.get_production_committed_quantity(v_production, NULL);
    IF v_committed <> 60 THEN
        RAISE EXCEPTION 'R6 ÉCHEC : volume engagé % (attendu 60 : campagne A ouverte, livrée incluse)', v_committed;
    END IF;
    RAISE NOTICE 'R6 OK — A3 : volume engagé calculé (campagnes ouvertes + hors campagnes)';
END $$;

-- ---------------------------------------------------------------------------
-- R7 — Privilèges des nouveaux calculs internes
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF has_function_privilege('anon', 'public.get_production_committed_quantity(uuid, uuid)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.get_production_committed_quantity(uuid, uuid)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.get_campaign_consumed_quantity(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'R7 ÉCHEC : calcul interne exposé à l''API';
    END IF;
    IF has_function_privilege('anon', 'public.get_campaign_stock_summary(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'R7 ÉCHEC : résumé de stock exposé à anon';
    END IF;
    RAISE NOTICE 'R7 OK — calculs internes non exposés';
END $$;

DO $$ BEGIN RAISE NOTICE '✅ RÈGLES MÉTIER 031 VALIDÉES'; END $$;

ROLLBACK;
