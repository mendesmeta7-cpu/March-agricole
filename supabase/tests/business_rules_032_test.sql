-- ============================================================================
-- TESTS COMPORTEMENTAUX — MIGRATION 32 (C1, C2, C3, D1, D2, D3, D5, D6, stock)
-- À exécuter UNIQUEMENT sur l'environnement de test, APRÈS les migrations 029,
-- 030, 031 et 032. JAMAIS en production (crée des comptes et des données, même
-- s'ils sont annulés). Tout est encadré par BEGIN ... ROLLBACK.
-- Attendu : notices S0 OK … S33 OK puis « ✅ RÈGLES MÉTIER 032 VALIDÉES ».
-- À exécuter avec le rôle postgres (propriétaire des tables, session directe).
-- S27 à S33 : réouverture et clôture (ADR-047). Le refus d'une requête API sans
-- utilisateur (session authenticator) ne peut pas être simulé ici : à vérifier par un
-- véritable appel à l'API.
-- S22 à S26 : convention UTC. Le fuseau de session est simulé par set_config (effet
-- équivalent à l'en-tête PostgREST « Prefer: timezone », qui n'est PAS testé ici).
-- UTC+14 et UTC-12 ne décalent la date qu'à certaines heures : les fuseaux synthétiques
-- à ±24 h garantissent un décalage à toute heure d'exécution (contrôlé en S22).
-- S21 : arbitrage C3 (contournement en deux étapes). Les destinations reportées pour
-- rouvrir une campagne sont créées par pg_temp.add_existing_destination (antérieures
-- à l'expiration de leur date limite).
-- S12 à S16 couvrent les corrections de la revue ciblée (C-2, C-3/R-4, cascade,
-- C-4, C-6) ; S17 à S20 la finalisation (date générale dépassée, D2 à toute
-- réouverture, modification atomique, cascades).
-- create_order_with_reservation : anon sans droit d'exécution (S11) ; appel sans
-- identité refusé par la fonction elle-même (auth.uid() NULL).
--
-- Remarque : le test 031 (R5) vérifiait qu'une campagne terminée ne se rouvrait
-- pas sans prolonger sa date générale. La décision C3 (migration 32) assouplit
-- cette règle quand la date générale est encore valide : exécuter le test 031
-- AVANT d'appliquer la 032, puis ce test-ci après.
-- ============================================================================
BEGIN;

-- Référence des scénarios S0 à S21 : leurs dates sont calculées avec CURRENT_DATE
SET LOCAL TIME ZONE 'UTC';
-- Les opérations du rôle propriétaire sont des opérations techniques identifiées
SET LOCAL radiza.technical_reason = 'tests-032';

CREATE TEMP TABLE t_ids (k text PRIMARY KEY, v uuid NOT NULL) ON COMMIT DROP;
-- Les identifiants sont relus pendant que le test agit en tant qu'authenticated
-- (table temporaire propre à cette session, détruite au ROLLBACK).
GRANT SELECT ON t_ids TO authenticated;

-- Identité simulée : SET LOCAL ROLE + revendication JWT (lues par auth.uid())
CREATE FUNCTION pg_temp.act_as(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
END $$;
-- Retour au rôle propriétaire, sans identité simulée résiduelle
CREATE FUNCTION pg_temp.as_owner() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    EXECUTE 'RESET ROLE';
END $$;
CREATE FUNCTION pg_temp.id(p_key text) RETURNS uuid LANGUAGE sql AS $$ SELECT v FROM t_ids WHERE k = p_key $$;

-- Destination « existante » (arbitrage C3) : créée 10 jours avant l'expiration de sa
-- date limite. Le trigger fixant created_at à now(), l'antériorité est simulée en le
-- désactivant le temps de l'insertion (rôle propriétaire ; DDL annulée par le ROLLBACK).
CREATE FUNCTION pg_temp.add_existing_destination(p_campaign uuid, p_province uuid, p_city text, p_deadline date)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
    v_id uuid;
BEGIN
    ALTER TABLE public.campaign_destinations DISABLE TRIGGER trg_guard_campaign_destination_reopening;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date, created_at)
    VALUES (p_campaign, p_province, p_city, CURRENT_DATE + 10, p_deadline, p_deadline - 10)
    RETURNING id INTO v_id;
    ALTER TABLE public.campaign_destinations ENABLE TRIGGER trg_guard_campaign_destination_reopening;
    RETURN v_id;
END $$;

-- Même principe avec un instant de création précis (S25)
CREATE FUNCTION pg_temp.add_destination_at(p_campaign uuid, p_province uuid, p_city text, p_deadline date, p_created timestamptz)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
    v_id uuid;
BEGIN
    ALTER TABLE public.campaign_destinations DISABLE TRIGGER trg_guard_campaign_destination_reopening;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date, created_at)
    VALUES (p_campaign, p_province, p_city, CURRENT_DATE + 10, p_deadline, p_created)
    RETURNING id INTO v_id;
    ALTER TABLE public.campaign_destinations ENABLE TRIGGER trg_guard_campaign_destination_reopening;
    RETURN v_id;
END $$;

-- Fuseau de session jusqu'au prochain appel (S22 à S26)
CREATE FUNCTION pg_temp.set_tz(p_zone text) RETURNS text LANGUAGE sql AS $$ SELECT set_config('timezone', p_zone, true) $$;
CREATE FUNCTION pg_temp.zones() RETURNS text[] LANGUAGE sql AS $$
    SELECT ARRAY['UTC', 'Pacific/Kiritimati', 'Etc/GMT+12', '<UTCP24>-24', '<UTCM24>+24']
$$;

-- Campagne active sur PD, desservant la province du revendeur par une zone de livraison
CREATE FUNCTION pg_temp.new_campaign(p_title text, p_start date, p_end date)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), p_title, 10, 'tonne', 10, 'USD', p_start, p_end, 'active')
    RETURNING id INTO v_id;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_id, pg_temp.id('country'), pg_temp.id('p1'));
    RETURN v_id;
END $$;

-- Exécute une écriture puis l'annule : renvoie 'TEST_ACCEPTE' ou le message de refus.
-- Une erreur d'une autre nature (droits, syntaxe) n'est pas interceptée.
CREATE FUNCTION pg_temp.try_sql(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'TEST_ACCEPTE';
EXCEPTION WHEN raise_exception THEN
    RETURN SQLERRM;
END $$;

-- Idem pour une commande : renvoie 'TEST_ACCEPTE:<numéro de commande>' ou le refus
CREATE FUNCTION pg_temp.try_order(p_campaign uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    v_number text;
BEGIN
    SELECT o.order_number INTO v_number
    FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), p_campaign, 1) o;
    RAISE EXCEPTION 'TEST_ACCEPTE:%', v_number;
EXCEPTION WHEN raise_exception THEN
    RETURN SQLERRM;
END $$;

CREATE FUNCTION pg_temp.expect(p_label text, p_zone text, p_got text, p_pattern text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF p_got IS NULL OR p_got NOT LIKE p_pattern THEN
        RAISE EXCEPTION '% ÉCHEC [fuseau %] : obtenu « % », attendu « % »', p_label, p_zone, p_got, p_pattern;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S0 — Données de test
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_suffix text := substr(md5(random()::text), 1, 8);
    v_u_company uuid := gen_random_uuid();
    v_u_company2 uuid := gen_random_uuid();
    v_u_reseller uuid := gen_random_uuid();
    v_u_admin uuid := gen_random_uuid();
    v_p1 uuid; v_p2 uuid; v_country uuid;
    v_prod_x uuid; v_prod_y uuid;
    v_company uuid; v_company2 uuid;
BEGIN
    SELECT p.id, p.country_id INTO v_p1, v_country FROM public.provinces p ORDER BY p.name LIMIT 1;
    SELECT p.id INTO v_p2 FROM public.provinces p WHERE p.id <> v_p1 ORDER BY p.name LIMIT 1;
    SELECT id INTO v_prod_x FROM public.products WHERE is_global AND is_active ORDER BY name LIMIT 1;
    SELECT id INTO v_prod_y FROM public.products WHERE is_global AND is_active AND id <> v_prod_x ORDER BY name LIMIT 1;
    IF v_p2 IS NULL OR v_prod_y IS NULL THEN
        RAISE EXCEPTION 'S0 : référentiels insuffisants (2 provinces et 2 produits globaux requis)';
    END IF;

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
      (v_u_company,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-032-soc-'  || v_suffix || '@example.invalid', '{"full_name":"Société 032"}'::jsonb, now(), now()),
      (v_u_company2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-032-soc2-' || v_suffix || '@example.invalid', '{"full_name":"Société 032 bis"}'::jsonb, now(), now()),
      (v_u_reseller, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-032-rev-'  || v_suffix || '@example.invalid', '{"full_name":"Revendeur 032"}'::jsonb, now(), now()),
      (v_u_admin,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-032-adm-'  || v_suffix || '@example.invalid', '{"full_name":"Admin 032"}'::jsonb, now(), now());
    UPDATE public.profiles SET role = 'admin', onboarding_status = 'completed' WHERE id = v_u_admin;

    INSERT INTO public.companies (name, slug, country_id, province_id, created_by)
    VALUES ('Société test 032','societe-test-032-' || v_suffix, v_country, v_p1, v_u_company) RETURNING id INTO v_company;
    INSERT INTO public.companies (name, slug, country_id, province_id, created_by)
    VALUES ('Société test 032 bis', 'societe-test-032-bis-' || v_suffix, v_country, v_p1, v_u_company2) RETURNING id INTO v_company2;
    UPDATE public.profiles SET role = 'company', onboarding_status = 'completed' WHERE id IN (v_u_company, v_u_company2);

    INSERT INTO public.resellers (id, country_id, province_id, city, business_name)
    VALUES (v_u_reseller, v_country, v_p1, 'Ville test', 'Revendeur test 032');
    UPDATE public.profiles SET role = 'reseller', onboarding_status = 'completed' WHERE id = v_u_reseller;

    INSERT INTO t_ids VALUES ('u_company', v_u_company), ('u_company2', v_u_company2), ('u_reseller', v_u_reseller),
        ('u_admin', v_u_admin), ('company', v_company), ('company2', v_company2), ('p1', v_p1), ('p2', v_p2), ('country', v_country),
        ('prod_x', v_prod_x), ('prod_y', v_prod_y);

    -- Productions : PA récoltée 100 (publique), PB récoltée 50, PG en culture 50,
    --               PD récoltée 1000, PC récoltée 40 (non publique)
    WITH ins AS (
        INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                        expected_quantity, unit, period_start, status, is_public)
        VALUES
          (v_company, v_prod_x, 'PA 032', 'https://example.invalid/a.jpg', 'Parcelle A', 100,  'tonne', CURRENT_DATE - 60, 'harvested', TRUE),
          (v_company, v_prod_x, 'PB 032', 'https://example.invalid/b.jpg', 'Parcelle B', 50,   'tonne', CURRENT_DATE - 60, 'harvested', TRUE),
          (v_company, v_prod_x, 'PG 032', 'https://example.invalid/g.jpg', 'Parcelle G', 50,   'tonne', CURRENT_DATE - 60, 'growing',   TRUE),
          (v_company, v_prod_x, 'PD 032', 'https://example.invalid/d.jpg', 'Parcelle D', 1000, 'tonne', CURRENT_DATE - 60, 'harvested', TRUE),
          (v_company, v_prod_x, 'PC 032', 'https://example.invalid/c.jpg', 'Parcelle C', 40,   'tonne', CURRENT_DATE - 60, 'harvested', FALSE)
        RETURNING id, title
    )
    INSERT INTO t_ids SELECT lower(split_part(title, ' ', 1)), id FROM ins;

    RAISE NOTICE 'S0 OK — jeu de données de test créé';
END $$;

-- ---------------------------------------------------------------------------
-- S1 — D2 : production récoltée exigée (création même en brouillon, activation)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_refused boolean;
    v_draft uuid;
BEGIN
    BEGIN
        INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, status)
        VALUES (pg_temp.id('company'), pg_temp.id('pg'), pg_temp.id('prod_x'), 'Brouillon sur culture', 10, 'tonne', 5, 'USD', CURRENT_DATE, 'draft');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne ne peut être créée ou ouverte que sur une production récoltée%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S1 ÉCHEC : brouillon créé sur une production non récoltée'; END IF;

    -- Contournement : brouillon sur production récoltée, production repassée en culture, puis activation
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pb'), pg_temp.id('prod_x'), 'Brouillon DB', 10, 'tonne', 5, 'USD', CURRENT_DATE, 'draft')
    RETURNING id INTO v_draft;
    INSERT INTO t_ids VALUES ('c_draft', v_draft);
    UPDATE public.productions SET status = 'growing' WHERE id = pg_temp.id('pb');  -- autorisé : aucune campagne active/suspendue
    BEGIN
        UPDATE public.campaigns SET status = 'active' WHERE id = v_draft;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne ne peut être créée ou ouverte que sur une production récoltée%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S1 ÉCHEC : brouillon activé sur une production non récoltée'; END IF;

    RAISE NOTICE 'S1 OK — D2';
END $$;

-- ---------------------------------------------------------------------------
-- S2 — C2 : une campagne expirée n'engage plus de volume ; disponibilité (D4)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_ca uuid; v_ce uuid;
    v_available numeric; v_rows integer;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pa'), pg_temp.id('prod_x'), 'CA ouverte', 60, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_ca;
    -- 60 + 50 > 100 : n'est acceptée QUE parce que CE est expirée (C2)
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pa'), pg_temp.id('prod_x'), 'CE expirée', 50, 'tonne', 10, 'USD', CURRENT_DATE - 20, CURRENT_DATE - 1, 'active')
    RETURNING id INTO v_ce;
    INSERT INTO t_ids VALUES ('c_a', v_ca), ('c_e', v_ce);
    -- Zone de livraison couvrant la province du revendeur (commandes de S5)
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
    VALUES (v_ca, pg_temp.id('country'), pg_temp.id('p1'));

    IF public.get_production_committed_quantity(pg_temp.id('pa'), NULL) <> 60 THEN
        RAISE EXCEPTION 'S2 ÉCHEC : volume engagé % (attendu 60, campagne expirée exclue)',
            public.get_production_committed_quantity(pg_temp.id('pa'), NULL);
    END IF;

    -- Disponibilité côté entreprise : 40 ; en modification de CA : 100
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    SELECT a.available_quantity INTO v_available
    FROM public.get_productions_campaign_availability(ARRAY[pg_temp.id('pa')]) a;
    IF v_available <> 40 THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S2 ÉCHEC : disponible % (attendu 40)', v_available; END IF;
    SELECT a.available_quantity INTO v_available
    FROM public.get_productions_campaign_availability(ARRAY[pg_temp.id('pa')], v_ca) a;
    IF v_available <> 100 THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S2 ÉCHEC : disponible hors CA % (attendu 100)', v_available; END IF;
    PERFORM pg_temp.as_owner();

    -- Autre entreprise et revendeur : aucune ligne
    PERFORM pg_temp.act_as(pg_temp.id('u_company2'));
    SELECT count(*) INTO v_rows FROM public.get_productions_campaign_availability(ARRAY[pg_temp.id('pa')]);
    PERFORM pg_temp.as_owner();
    IF v_rows <> 0 THEN RAISE EXCEPTION 'S2 ÉCHEC : disponibilité visible par une autre entreprise'; END IF;
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT count(*) INTO v_rows FROM public.get_productions_campaign_availability(ARRAY[pg_temp.id('pa')]);
    PERFORM pg_temp.as_owner();
    IF v_rows <> 0 THEN RAISE EXCEPTION 'S2 ÉCHEC : disponibilité visible par un revendeur'; END IF;

    RAISE NOTICE 'S2 OK — C2 / disponibilité des productions';
END $$;

-- ---------------------------------------------------------------------------
-- S3 — A4 / D1 / D3 : production engagée par CA (active, ouverte)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_refused boolean;
    v_cpv uuid;
BEGIN
    BEGIN
        UPDATE public.productions SET unit = 'caisse' WHERE id = pg_temp.id('pa');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de changer l''unité%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S3 ÉCHEC : unité modifiée'; END IF;

    BEGIN
        UPDATE public.productions SET product_id = pg_temp.id('prod_y') WHERE id = pg_temp.id('pa');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de changer le produit%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S3 ÉCHEC : produit modifié'; END IF;

    -- Édition descriptive renvoyant les mêmes valeurs structurantes : acceptée
    UPDATE public.productions
    SET title = 'PA 032 (description mise à jour)', description = 'Texte', unit = 'tonne', is_public = TRUE, status = 'harvested'
    WHERE id = pg_temp.id('pa');

    BEGIN
        UPDATE public.productions SET is_public = FALSE WHERE id = pg_temp.id('pa');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de rendre non publique%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S3 ÉCHEC : passage en non publique accepté'; END IF;

    BEGIN
        UPDATE public.productions SET status = 'cancelled', is_public = FALSE WHERE id = pg_temp.id('pa');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de modifier le statut%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S3 ÉCHEC : archivage accepté'; END IF;

    -- D3 : non publique → publique autorisé même engagée
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pc'), pg_temp.id('prod_x'), 'CPv', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cpv;
    UPDATE public.productions SET is_public = TRUE WHERE id = pg_temp.id('pc');

    RAISE NOTICE 'S3 OK — A4 / D1 / D3';
END $$;

-- ---------------------------------------------------------------------------
-- S4 — C2 : commande refusée sur une campagne expirée (revendeur desservi par
--      une zone de livraison sans destination propre, toutes destinations expirées)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cz uuid;
    v_refused boolean;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CZ zone seule', 100, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cz;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES (v_cz, pg_temp.id('country'), pg_temp.id('p1'));
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cz, pg_temp.id('p2'), 'Ville éloignée', CURRENT_DATE + 10, CURRENT_DATE - 1);
    INSERT INTO t_ids VALUES ('c_z', v_cz);

    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    BEGIN
        PERFORM public.create_order_with_reservation(pg_temp.id('u_reseller'), v_cz, 5);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'La campagne n''est plus dans sa periode de commercialisation%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S4 ÉCHEC : commande acceptée sur une campagne expirée'; END IF;

    RAISE NOTICE 'S4 OK — C2 : commande refusée sur campagne expirée';
END $$;

-- ---------------------------------------------------------------------------
-- S5 — Non-régression A5 / A11 / A13 + stock agrégé revendeur (confidentialité)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_order uuid;
    v_refused boolean;
    v_available numeric;
    v_rows integer;
    v_args text[];
BEGIN
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT o.order_id INTO v_order FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_a'), 10) o;
    PERFORM pg_temp.as_owner();
    INSERT INTO t_ids VALUES ('order', v_order);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.confirm_order_delivery(v_order, NULL);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Seule une commande prête%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S5 ÉCHEC : A5 livraison hors « prête »'; END IF;
    PERFORM public.update_order_status(v_order, 'confirmed');
    BEGIN
        PERFORM public.update_order_status(v_order, 'pending');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := TRUE;
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S5 ÉCHEC : A13 retour en arrière'; END IF;
    PERFORM public.update_order_status(v_order, 'ready');
    PERFORM public.confirm_order_delivery(v_order, NULL);
    SELECT s.available_quantity INTO v_available FROM public.get_campaign_stock_summary(pg_temp.id('c_a')) s;
    PERFORM pg_temp.as_owner();
    IF v_available <> 50 THEN RAISE EXCEPTION 'S5 ÉCHEC : A11 disponible % (attendu 50)', v_available; END IF;

    -- Stock agrégé revendeur : CA = 50 ; CE (expirée), brouillon, CZ (expirée) omises
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT q.available_quantity INTO v_available
    FROM public.get_campaigns_available_quantity(ARRAY[pg_temp.id('c_a')]) q;
    SELECT count(*) INTO v_rows
    FROM public.get_campaigns_available_quantity(ARRAY[pg_temp.id('c_e'), pg_temp.id('c_draft'), pg_temp.id('c_z')]);
    BEGIN
        PERFORM public.get_campaigns_available_quantity(ARRAY(SELECT gen_random_uuid() FROM generate_series(1, 201)));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Trop de campagnes demandées%';
    END;
    PERFORM pg_temp.as_owner();
    IF v_available <> 50 THEN RAISE EXCEPTION 'S5 ÉCHEC : stock revendeur % (attendu 50)', v_available; END IF;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'S5 ÉCHEC : campagnes non ouvertes exposées (%)', v_rows; END IF;
    IF NOT v_refused THEN RAISE EXCEPTION 'S5 ÉCHEC : limite de 200 identifiants non appliquée'; END IF;

    -- Une société qui n'est pas propriétaire ne lit rien
    PERFORM pg_temp.act_as(pg_temp.id('u_company2'));
    SELECT count(*) INTO v_rows FROM public.get_campaigns_available_quantity(ARRAY[pg_temp.id('c_a')]);
    PERFORM pg_temp.as_owner();
    IF v_rows <> 0 THEN RAISE EXCEPTION 'S5 ÉCHEC : stock visible par une société tierce'; END IF;

    -- Confidentialité : la fonction ne renvoie que (campaign_id, available_quantity)
    SELECT proargnames INTO v_args FROM pg_proc WHERE oid = 'public.get_campaigns_available_quantity(uuid[])'::regprocedure;
    IF v_args IS DISTINCT FROM ARRAY['p_campaign_ids', 'campaign_id', 'available_quantity'] THEN
        RAISE EXCEPTION 'S5 ÉCHEC : colonnes exposées inattendues %', v_args;
    END IF;

    RAISE NOTICE 'S5 OK — A5 / A11 / A13 + stock agrégé revendeur';
END $$;

-- ---------------------------------------------------------------------------
-- S6 — C1 : clôture automatique (active et paused expirées ; jamais une campagne
--      ayant une destination ouverte) ; journal ; idempotence
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cp uuid; v_cd uuid; v_cx uuid;
    v_second integer;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CP suspendue expirée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 10, CURRENT_DATE - 1, 'paused')
    RETURNING id INTO v_cp;
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CD une destination ouverte', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cd;
    -- Destination ouverte d'abord : un ajout ne rouvre jamais une campagne fermée (C-3 / R-4)
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date) VALUES
      (v_cd, pg_temp.id('p2'), 'Ville B', CURRENT_DATE + 10, NULL),
      (v_cd, pg_temp.id('p1'), 'Ville A', CURRENT_DATE + 10, CURRENT_DATE - 1);
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CX destinations expirées', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cx;
    PERFORM pg_temp.add_existing_destination(v_cx, pg_temp.id('p1'), 'Ville C', CURRENT_DATE - 1);
    INSERT INTO t_ids VALUES ('c_p', v_cp), ('c_d', v_cd), ('c_x', v_cx);

    PERFORM public.check_and_close_expired_campaigns();

    IF (SELECT status FROM public.campaigns WHERE id = pg_temp.id('c_e')) <> 'completed' THEN RAISE EXCEPTION 'S6 ÉCHEC : active expirée non close'; END IF;
    IF (SELECT status FROM public.campaigns WHERE id = v_cp) <> 'completed' THEN RAISE EXCEPTION 'S6 ÉCHEC : suspendue expirée non close'; END IF;
    IF (SELECT status FROM public.campaigns WHERE id = v_cx) <> 'completed' THEN RAISE EXCEPTION 'S6 ÉCHEC : destinations expirées non close'; END IF;
    IF (SELECT status FROM public.campaigns WHERE id = pg_temp.id('c_z')) <> 'completed' THEN RAISE EXCEPTION 'S6 ÉCHEC : CZ non close'; END IF;
    IF (SELECT status FROM public.campaigns WHERE id = v_cd) <> 'active' THEN RAISE EXCEPTION 'S6 ÉCHEC : campagne avec destination ouverte close'; END IF;
    IF (SELECT status FROM public.campaigns WHERE id = pg_temp.id('c_a')) <> 'active' THEN RAISE EXCEPTION 'S6 ÉCHEC : campagne ouverte close'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.audit_logs a
                   WHERE a.action = 'CAMPAIGN_AUTO_CLOSED' AND a.entity_id = v_cp AND a.actor_id IS NULL
                     AND a.details ->> 'previous_status' = 'paused' AND a.details ->> 'actor_type' = 'system') THEN
        RAISE EXCEPTION 'S6 ÉCHEC : clôture non journalisée';
    END IF;

    v_second := public.check_and_close_expired_campaigns();
    IF v_second <> 0 THEN RAISE EXCEPTION 'S6 ÉCHEC : clôture non idempotente (% au 2e passage)', v_second; END IF;

    RAISE NOTICE 'S6 OK — C1 : clôture, journal, idempotence';
END $$;

-- ---------------------------------------------------------------------------
-- S7 — A12 : une campagne annulée n'est jamais rouverte
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cc uuid;
    v_refused boolean;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CC', 10, 'tonne', 10, 'USD', CURRENT_DATE, CURRENT_DATE + 30, 'draft')
    RETURNING id INTO v_cc;
    UPDATE public.campaigns SET status = 'cancelled' WHERE id = v_cc;

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.reopen_campaign(v_cc, CURRENT_DATE + 40, '[]'::jsonb);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Une campagne annulée ne peut pas être réactivée%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S7 ÉCHEC : campagne annulée rouverte'; END IF;

    BEGIN
        UPDATE public.campaigns SET status = 'active' WHERE id = v_cc;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := TRUE;
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S7 ÉCHEC : campagne annulée réactivée directement'; END IF;

    RAISE NOTICE 'S7 OK — A12';
END $$;

-- ---------------------------------------------------------------------------
-- S8 — A12-bis / C3 : réouverture par report d'une destination (date générale
--      encore valide : aucune prolongation exigée) ; droits
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cx uuid := pg_temp.id('c_x');
    v_dest uuid;
    v_refused boolean;
    v_status text;
BEGIN
    SELECT id INTO v_dest FROM public.campaign_destinations WHERE campaign_id = v_cx LIMIT 1;

    -- Un revendeur ne peut pas rouvrir
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    BEGIN
        PERFORM public.reopen_campaign(v_cx, NULL, jsonb_build_array(jsonb_build_object('destination_id', v_dest, 'order_deadline_date', CURRENT_DATE + 5)));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception OR insufficient_privilege THEN v_refused := TRUE;
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S8 ÉCHEC : réouverture par un revendeur'; END IF;

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    -- Sans report de destination : refus (A12-bis)
    BEGIN
        PERFORM public.reopen_campaign(v_cx, NULL, '[]'::jsonb);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Réouverture impossible : toutes les destinations sont expirées%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S8 ÉCHEC : réouverture sans destination ouverte'; END IF;

    -- D5 : nouvelle date générale antérieure à l'ancienne (même ≥ aujourd'hui) : refus
    BEGIN
        PERFORM public.reopen_campaign(v_cx, CURRENT_DATE + 20,
            jsonb_build_array(jsonb_build_object('destination_id', v_dest, 'order_deadline_date', CURRENT_DATE + 5)));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Réouverture : la nouvelle date de fin doit être strictement postérieure%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S8 ÉCHEC : D5 date non postérieure acceptée'; END IF;

    -- C3 : report d'une destination, date générale inchangée : acceptée
    v_status := public.reopen_campaign(v_cx, NULL,
        jsonb_build_array(jsonb_build_object('destination_id', v_dest, 'order_deadline_date', CURRENT_DATE + 5)));
    PERFORM pg_temp.as_owner();
    IF v_status <> 'active' OR (SELECT status FROM public.campaigns WHERE id = v_cx) <> 'active' THEN
        RAISE EXCEPTION 'S8 ÉCHEC : réouverture C3 non appliquée';
    END IF;

    RAISE NOTICE 'S8 OK — A12-bis / C3';
END $$;

-- ---------------------------------------------------------------------------
-- S9 — D5 : date générale dépassée (nouvelle date obligatoire) et ancienne date vide
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cp uuid := pg_temp.id('c_p');     -- completed, ancienne date = hier
    v_cn uuid;
    v_refused boolean;
BEGIN
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.reopen_campaign(v_cp, NULL, '[]'::jsonb);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Réouverture : la nouvelle date de fin est obligatoire%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S9 ÉCHEC : date dépassée sans nouvelle date acceptée'; END IF;
    PERFORM public.reopen_campaign(v_cp, CURRENT_DATE + 10, '[]'::jsonb);
    PERFORM pg_temp.as_owner();
    IF (SELECT status FROM public.campaigns WHERE id = v_cp) <> 'paused' THEN RAISE EXCEPTION 'S9 ÉCHEC : réouverture valide refusée ou statut d''origine perdu'; END IF;

    -- Ancienne date vide : nouvelle date < aujourd'hui refusée, ≥ aujourd'hui acceptée
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CN sans date', 10, 'tonne', 10, 'USD', CURRENT_DATE - 5, NULL, 'active')
    RETURNING id INTO v_cn;
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_cn;
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.reopen_campaign(v_cn, CURRENT_DATE - 1, '[]'::jsonb);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Réouverture : la nouvelle date de fin est obligatoire%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S9 ÉCHEC : ancienne date vide, nouvelle date passée acceptée'; END IF;
    PERFORM public.reopen_campaign(v_cn, CURRENT_DATE, '[]'::jsonb);
    PERFORM pg_temp.as_owner();

    RAISE NOTICE 'S9 OK — D5';
END $$;

-- ---------------------------------------------------------------------------
-- S10 — D6 : une campagne expirée ne contourne pas la réouverture en vidant sa date
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cf uuid;
    v_refused boolean;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CF expirée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 10, CURRENT_DATE - 1, 'active')
    RETURNING id INTO v_cf;
    BEGIN
        UPDATE public.campaigns SET end_date = NULL WHERE id = v_cf;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Réouverture : la nouvelle date de fin est obligatoire%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S10 ÉCHEC : date expirée vidée'; END IF;
    UPDATE public.campaigns SET end_date = CURRENT_DATE + 5 WHERE id = v_cf;  -- prolongation conforme à D5
    RAISE NOTICE 'S10 OK — D6';
END $$;

-- ---------------------------------------------------------------------------
-- S11 — Droits d'exécution
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_sig text;
    v_refused boolean;
BEGIN
    FOREACH v_sig IN ARRAY ARRAY[
        'public.reopen_campaign(uuid, date, jsonb)',
        'public.get_productions_campaign_availability(uuid[], uuid)',
        'public.get_campaigns_available_quantity(uuid[])',
        'public.check_and_close_expired_campaigns()',
        'public.get_production_committed_quantity(uuid, uuid)',
        'public.is_campaign_effectively_open(text, date, uuid)',
        'public.update_campaign_with_destinations(uuid, jsonb, uuid[], jsonb)',
        'public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid)'
    ] LOOP
        IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
            RAISE EXCEPTION 'S11 ÉCHEC : anon peut exécuter %', v_sig;
        END IF;
    END LOOP;
    IF NOT has_function_privilege('authenticated', 'public.reopen_campaign(uuid, date, jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.get_productions_campaign_availability(uuid[], uuid)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.get_campaigns_available_quantity(uuid[])', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.update_campaign_with_destinations(uuid, jsonb, uuid[], jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'S11 ÉCHEC : fonction applicative non exécutable par authenticated';
    END IF;
    IF has_function_privilege('authenticated', 'public.check_and_close_expired_campaigns()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.get_production_committed_quantity(uuid, uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'S11 ÉCHEC : fonction interne exposée à authenticated';
    END IF;
    -- Clôture et autorisation : aucun rôle API, service_role compris
    FOREACH v_sig IN ARRAY ARRAY[
        'public.check_and_close_expired_campaigns()',
        'public.technical_operation_identity()',
        'public.authorize_campaign_reopening(uuid)'
    ] LOOP
        IF has_function_privilege('anon', v_sig, 'EXECUTE')
           OR has_function_privilege('authenticated', v_sig, 'EXECUTE')
           OR has_function_privilege('service_role', v_sig, 'EXECUTE') THEN
            RAISE EXCEPTION 'S11 ÉCHEC : % exécutable par un rôle API', v_sig;
        END IF;
    END LOOP;
    IF has_function_privilege('authenticated', 'public.guard_campaign_consistency()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.guard_campaign_destination_reopening()', 'EXECUTE') THEN
        RAISE EXCEPTION 'S11 ÉCHEC : fonction de trigger exécutable par authenticated';
    END IF;
    IF to_regprocedure('public.guard_production_status()') IS NOT NULL THEN
        RAISE EXCEPTION 'S11 ÉCHEC : ancienne fonction de trigger encore présente';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid IN (
                  'public.reopen_campaign(uuid, date, jsonb)'::regprocedure,
                  'public.get_productions_campaign_availability(uuid[], uuid)'::regprocedure,
                  'public.get_campaigns_available_quantity(uuid[])'::regprocedure,
                  'public.check_and_close_expired_campaigns()'::regprocedure,
                  'public.guard_production_commitments()'::regprocedure,
                  'public.guard_campaign_business_rules()'::regprocedure,
                  'public.guard_campaign_destination_reopening()'::regprocedure,
                  'public.guard_campaign_consistency()'::regprocedure,
                  'public.technical_operation_identity()'::regprocedure,
                  'public.authorize_campaign_reopening(uuid)'::regprocedure,
                  'public.update_campaign_with_destinations(uuid, jsonb, uuid[], jsonb)'::regprocedure,
                  'public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid)'::regprocedure)
               AND NOT ('search_path=""' = ANY (coalesce(p.proconfig, '{}')))) THEN
        RAISE EXCEPTION 'S11 ÉCHEC : search_path vide non appliqué';
    END IF;

    -- Appel sans identité (auth.uid() NULL, ex. clé service ou rôle technique) : refusé
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    BEGIN
        PERFORM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_a'), 1);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Authentification requise pour passer commande%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S11 ÉCHEC : commande acceptée sans identité'; END IF;
    RAISE NOTICE 'S11 OK — droits et search_path';
END $$;

-- ---------------------------------------------------------------------------
-- S12 — C-2 : une destination ne change jamais de campagne (appel direct à l'API
--       en tant qu'authenticated, puis rôle propriétaire) ; les autres champs
--       restent modifiables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cm1 uuid; v_cm2 uuid; v_dest uuid;
    v_refused boolean;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CM1 source', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cm1;
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CM2 cible', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cm2;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cm1, pg_temp.id('p1'), 'Ville M', CURRENT_DATE + 10, CURRENT_DATE + 5)
    RETURNING id INTO v_dest;
    INSERT INTO t_ids VALUES ('c_m1', v_cm1), ('c_m2', v_cm2), ('d_m', v_dest);

    -- Appel direct de l'API par la société propriétaire des deux campagnes
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        UPDATE public.campaign_destinations SET campaign_id = pg_temp.id('c_m2') WHERE id = pg_temp.id('d_m');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une destination ne peut pas être déplacée vers une autre campagne%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S12 ÉCHEC : déplacement accepté (authenticated)'; END IF;
    -- Modification descriptive de la même destination : acceptée
    UPDATE public.campaign_destinations SET city_name = 'Ville M (centre)' WHERE id = pg_temp.id('d_m');
    PERFORM pg_temp.as_owner();

    -- Rôle propriétaire : même refus
    BEGIN
        UPDATE public.campaign_destinations SET campaign_id = v_cm2 WHERE id = v_dest;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une destination ne peut pas être déplacée vers une autre campagne%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S12 ÉCHEC : déplacement accepté (propriétaire)'; END IF;
    IF (SELECT campaign_id FROM public.campaign_destinations WHERE id = v_dest) <> v_cm1
       OR (SELECT city_name FROM public.campaign_destinations WHERE id = v_dest) <> 'Ville M (centre)' THEN
        RAISE EXCEPTION 'S12 ÉCHEC : état de la destination inattendu';
    END IF;

    RAISE NOTICE 'S12 OK — C-2 : déplacement refusé, édition descriptive acceptée';
END $$;

-- ---------------------------------------------------------------------------
-- S13 — C-3 / R-4 : sur une campagne fermée par ses destinations, ni l'ajout ni la
--       suppression ne la rouvrent ; le report d'une destination existante le peut
--       (C3), avec contrôle D2 pour une campagne au statut ouvert
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cr uuid; v_r1 uuid; v_r3 uuid;
    v_ck uuid; v_k1 uuid;
    v_crd uuid; v_rd uuid; v_pr uuid;
    v_refused boolean;
    v_status text;
BEGIN
    -- CR : active, date générale valide, unique destination expirée → fermée
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CR fermée par destination', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cr;
    v_r1 := pg_temp.add_existing_destination(v_cr, pg_temp.id('p1'), 'Ville R1', CURRENT_DATE - 1);
    INSERT INTO t_ids VALUES ('c_r', v_cr), ('d_r1', v_r1);
    IF public.is_campaign_effectively_open('active', CURRENT_DATE + 30, v_cr) THEN
        RAISE EXCEPTION 'S13 ÉCHEC : CR devrait être fermée';
    END IF;

    -- Ajout d'une destination ouverte (appel direct par la société) : refusé
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
        VALUES (pg_temp.id('c_r'), pg_temp.id('p1'), 'Ville R2', CURRENT_DATE + 10, CURRENT_DATE + 5);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'L''ajout d''une destination ne permet pas de rouvrir une campagne expirée%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S13 ÉCHEC : ajout d''une destination ouverte accepté (authenticated)'; END IF;
    -- Destination sans date limite (donc ouverte) : refusée aussi
    BEGIN
        INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
        VALUES (pg_temp.id('c_r'), pg_temp.id('p1'), 'Ville R2', CURRENT_DATE + 10, NULL);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'L''ajout d''une destination ne permet pas de rouvrir%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S13 ÉCHEC : ajout d''une destination sans date limite accepté'; END IF;
    PERFORM pg_temp.as_owner();

    -- Ajout d'une destination déjà expirée : accepté, la campagne reste fermée
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cr, pg_temp.id('p2'), 'Ville R3', CURRENT_DATE + 10, CURRENT_DATE - 2)
    RETURNING id INTO v_r3;
    IF public.is_campaign_effectively_open('active', CURRENT_DATE + 30, v_cr) THEN
        RAISE EXCEPTION 'S13 ÉCHEC : l''ajout d''une destination expirée a rouvert CR';
    END IF;

    -- Suppression d'une destination expirée parmi d'autres expirées : acceptée (reste fermée)
    DELETE FROM public.campaign_destinations WHERE id = v_r3;

    -- Suppression de la dernière destination expirée : refusée (CR deviendrait « sans destination »)
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        DELETE FROM public.campaign_destinations WHERE id = pg_temp.id('d_r1');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'La suppression d''une destination ne permet pas de rouvrir une campagne expirée%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S13 ÉCHEC : suppression de la dernière destination expirée acceptée (authenticated)'; END IF;
    BEGIN
        DELETE FROM public.campaign_destinations WHERE id = v_r1;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'La suppression d''une destination ne permet pas de rouvrir%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S13 ÉCHEC : suppression de la dernière destination expirée acceptée (propriétaire)'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.campaign_destinations WHERE id = v_r1) THEN
        RAISE EXCEPTION 'S13 ÉCHEC : destination R1 supprimée';
    END IF;

    -- Report de la date limite de la destination existante (C3) : accepté, CR rouverte
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    UPDATE public.campaign_destinations SET order_deadline_date = CURRENT_DATE + 5 WHERE id = pg_temp.id('d_r1');
    PERFORM pg_temp.as_owner();
    IF NOT public.is_campaign_effectively_open('active', CURRENT_DATE + 30, v_cr) THEN
        RAISE EXCEPTION 'S13 ÉCHEC : report C3 sans effet';
    END IF;
    -- CR ouverte : l'ajout d'une destination est de nouveau possible
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cr, pg_temp.id('p2'), 'Ville R4', CURRENT_DATE + 10, CURRENT_DATE + 7);

    -- D2 au report : production repassée en culture pendant que la campagne était fermée
    INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                    expected_quantity, unit, period_start, status, is_public)
    VALUES (pg_temp.id('company'), pg_temp.id('prod_x'), 'PR 032', 'https://example.invalid/r.jpg', 'Parcelle R', 100, 'tonne', CURRENT_DATE - 60, 'harvested', TRUE)
    RETURNING id INTO v_pr;
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), v_pr, pg_temp.id('prod_x'), 'CRD', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_crd;
    v_rd := pg_temp.add_existing_destination(v_crd, pg_temp.id('p1'), 'Ville RD', CURRENT_DATE - 1);
    UPDATE public.productions SET status = 'growing' WHERE id = v_pr;  -- autorisé : CRD n'est pas effectivement ouverte
    BEGIN
        UPDATE public.campaign_destinations SET order_deadline_date = CURRENT_DATE + 5 WHERE id = v_rd;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne ne peut être créée ou ouverte que sur une production récoltée%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S13 ÉCHEC : report accepté sur une production non récoltée (D2)'; END IF;

    -- Campagne terminée : ajout et suppression refusés ; report accepté puis réouverture
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CK terminée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_ck;
    v_k1 := pg_temp.add_existing_destination(v_ck, pg_temp.id('p1'), 'Ville K1', CURRENT_DATE - 1);
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_ck;
    BEGIN
        INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
        VALUES (v_ck, pg_temp.id('p2'), 'Ville K2', CURRENT_DATE + 10, CURRENT_DATE + 5);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'L''ajout d''une destination ne permet pas%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S13 ÉCHEC : ajout accepté sur une campagne terminée'; END IF;
    BEGIN
        DELETE FROM public.campaign_destinations WHERE id = v_k1;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'La suppression d''une destination ne permet pas%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S13 ÉCHEC : suppression de la dernière destination d''une campagne terminée acceptée'; END IF;

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    v_status := public.reopen_campaign(v_ck, NULL,
        jsonb_build_array(jsonb_build_object('destination_id', v_k1, 'order_deadline_date', CURRENT_DATE + 5)));
    PERFORM pg_temp.as_owner();
    IF v_status <> 'active' THEN RAISE EXCEPTION 'S13 ÉCHEC : réouverture par report refusée (%)', v_status; END IF;

    RAISE NOTICE 'S13 OK — C-3 / R-4 : ajout et suppression sans réouverture, report C3 accepté (D2 contrôlé)';
END $$;

-- ---------------------------------------------------------------------------
-- S14 — Suppression en cascade : supprimer une campagne dont toutes les
--       destinations sont expirées n'est pas bloqué
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cq uuid;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CQ à supprimer', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'draft')
    RETURNING id INTO v_cq;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date) VALUES
      (v_cq, pg_temp.id('p1'), 'Ville Q1', CURRENT_DATE + 10, CURRENT_DATE - 1),
      (v_cq, pg_temp.id('p2'), 'Ville Q2', CURRENT_DATE + 10, CURRENT_DATE - 3);

    DELETE FROM public.campaigns WHERE id = v_cq;

    IF EXISTS (SELECT 1 FROM public.campaign_destinations WHERE campaign_id = v_cq) THEN
        RAISE EXCEPTION 'S14 ÉCHEC : destinations non supprimées en cascade';
    END IF;
    RAISE NOTICE 'S14 OK — suppression en cascade autorisée';
END $$;

-- ---------------------------------------------------------------------------
-- S15 — C-4 : unité de la campagne = unité de la production ; unité de production
--       figée par une campagne non annulée (brouillon compris), une réservation en
--       cours ou une proposition ouverte ; libre sinon
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_pu uuid; v_pv uuid;
    v_cu uuid; v_cw uuid; v_cw2 uuid;
    v_order uuid; v_order2 uuid;
    v_demand uuid; v_response uuid;
    v_refused boolean;
BEGIN
    INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                    expected_quantity, unit, period_start, status, is_public)
    VALUES (pg_temp.id('company'), pg_temp.id('prod_x'), 'PU 032', 'https://example.invalid/u.jpg', 'Parcelle U', 100, 'tonne', CURRENT_DATE - 60, 'harvested', TRUE)
    RETURNING id INTO v_pu;
    INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                    expected_quantity, unit, period_start, status, is_public)
    VALUES (pg_temp.id('company'), pg_temp.id('prod_x'), 'PV 032', 'https://example.invalid/v.jpg', 'Parcelle V', 100, 'caisse', CURRENT_DATE - 60, 'harvested', TRUE)
    RETURNING id INTO v_pv;
    INSERT INTO t_ids VALUES ('pu', v_pu), ('pv', v_pv);

    -- Création dans une autre unité que celle de la production : refusée (API directe)
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, status)
        VALUES (pg_temp.id('company'), pg_temp.id('pu'), pg_temp.id('prod_x'), 'CU caisse', 10, 'caisse', 5, 'USD', CURRENT_DATE, 'draft');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'L''unité de la campagne (caisse) doit être celle de sa production (tonne)%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : campagne créée dans une autre unité'; END IF;

    -- Brouillon cohérent
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, status)
    VALUES (pg_temp.id('company'), v_pu, pg_temp.id('prod_x'), 'CU brouillon', 10, 'tonne', 5, 'USD', CURRENT_DATE, 'draft')
    RETURNING id INTO v_cu;

    -- Changement d'unité de la campagne : refusé
    BEGIN
        UPDATE public.campaigns SET unit = 'caisse' WHERE id = v_cu;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'L''unité de la campagne%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : unité de campagne modifiée'; END IF;

    -- Rattachement à une production d'une autre unité : refusé
    BEGIN
        UPDATE public.campaigns SET production_id = v_pv WHERE id = v_cu;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'L''unité de la campagne (tonne) doit être celle de sa production (caisse)%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : campagne rattachée à une production d''une autre unité'; END IF;

    -- Unité de production figée par le brouillon (API directe)
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        UPDATE public.productions SET unit = 'kg' WHERE id = pg_temp.id('pu');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de changer l''unité de mesure%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : unité de production modifiée malgré un brouillon (authenticated)'; END IF;

    -- Brouillon annulé : l'unité redevient modifiable
    UPDATE public.campaigns SET status = 'cancelled' WHERE id = v_cu;
    UPDATE public.productions SET unit = 'kg' WHERE id = v_pu;
    UPDATE public.productions SET unit = 'tonne' WHERE id = v_pu;

    -- Réservation en cours sur une campagne annulée : unité figée jusqu'à la libération
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), v_pu, pg_temp.id('prod_x'), 'CW réservation', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cw;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES (v_cw, pg_temp.id('country'), pg_temp.id('p1'));
    INSERT INTO t_ids VALUES ('c_w', v_cw);
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT o.order_id INTO v_order FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_w'), 5) o;
    PERFORM pg_temp.as_owner();
    INSERT INTO t_ids VALUES ('order_w', v_order);
    UPDATE public.campaigns SET status = 'cancelled' WHERE id = v_cw;
    BEGIN
        UPDATE public.productions SET unit = 'kg' WHERE id = v_pu;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de changer l''unité de mesure%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : unité modifiée malgré une réservation en cours'; END IF;
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    PERFORM public.cancel_order_and_release_reservation(pg_temp.id('order_w'), 'Test 032');
    PERFORM pg_temp.as_owner();
    UPDATE public.productions SET unit = 'kg' WHERE id = v_pu;      -- réservation libérée : autorisé
    UPDATE public.productions SET unit = 'tonne' WHERE id = v_pu;

    -- Réservation livrée : ne bloque plus une fois la campagne annulée
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), v_pu, pg_temp.id('prod_x'), 'CW2 livrée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cw2;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES (v_cw2, pg_temp.id('country'), pg_temp.id('p1'));
    INSERT INTO t_ids VALUES ('c_w2', v_cw2);
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT o.order_id INTO v_order2 FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_w2'), 5) o;
    PERFORM pg_temp.as_owner();
    INSERT INTO t_ids VALUES ('order_w2', v_order2);
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM public.update_order_status(pg_temp.id('order_w2'), 'confirmed');
    PERFORM public.update_order_status(pg_temp.id('order_w2'), 'ready');
    PERFORM public.confirm_order_delivery(pg_temp.id('order_w2'), NULL);
    PERFORM pg_temp.as_owner();
    -- Tant que CW2 n'est pas annulée, l'unité reste figée
    BEGIN
        UPDATE public.productions SET unit = 'kg' WHERE id = v_pu;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de changer l''unité de mesure%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : unité modifiée malgré une campagne non annulée'; END IF;
    UPDATE public.campaigns SET status = 'cancelled' WHERE id = v_cw2;
    UPDATE public.productions SET unit = 'kg' WHERE id = v_pu;      -- livrée + campagnes annulées : autorisé

    -- Proposition ouverte sur une demande : unité figée ; proposition refusée : libre
    INSERT INTO public.demands (reseller_id, product_id, quantity, unit, country_id, province_id)
    VALUES (pg_temp.id('u_reseller'), pg_temp.id('prod_x'), 5, 'kg', pg_temp.id('country'), pg_temp.id('p1'))
    RETURNING id INTO v_demand;
    INSERT INTO public.demand_responses (demand_id, company_id, production_id, status, proposed_quantity, unit, unit_price, currency)
    VALUES (v_demand, pg_temp.id('company'), v_pu, 'proposed', 5, 'kg', 10, 'USD')
    RETURNING id INTO v_response;
    BEGIN
        UPDATE public.productions SET unit = 'tonne' WHERE id = v_pu;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'Impossible de changer l''unité de mesure%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S15 ÉCHEC : unité modifiée malgré une proposition ouverte'; END IF;
    UPDATE public.demand_responses SET status = 'refused' WHERE id = v_response;
    UPDATE public.productions SET unit = 'tonne' WHERE id = v_pu;

    RAISE NOTICE 'S15 OK — C-4 : cohérence et protection de l''unité';
END $$;

-- ---------------------------------------------------------------------------
-- S16 — C-6 : modification de plusieurs destinations dans l'ordre de l'application
--       (mises à jour ouvertes → ajouts → mises à jour fermantes → suppressions)
--       sans état transitoire bloquant ; l'ancien ordre (suppression d'abord) échoue
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cs uuid; v_s1 uuid; v_s2 uuid;
    v_ct uuid; v_t1 uuid;
    v_refused boolean;
BEGIN
    -- CS : S1 ouverte, S2 expirée. L'utilisateur remplace S1 par S3 et conserve S2.
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CS synchronisation', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cs;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cs, pg_temp.id('p1'), 'Ville S1', CURRENT_DATE + 10, CURRENT_DATE + 5) RETURNING id INTO v_s1;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cs, pg_temp.id('p2'), 'Ville S2', CURRENT_DATE + 10, CURRENT_DATE - 1) RETURNING id INTO v_s2;
    INSERT INTO t_ids VALUES ('c_s', v_cs), ('d_s1', v_s1), ('d_s2', v_s2);

    -- Ancien ordre (suppression d'abord) : la suppression ferme la campagne, l'ajout est refusé
    BEGIN
        DELETE FROM public.campaign_destinations WHERE id = v_s1;
        INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
        VALUES (v_cs, pg_temp.id('p1'), 'Ville S3', CURRENT_DATE + 10, CURRENT_DATE + 8);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE 'L''ajout d''une destination ne permet pas%';
    END;
    IF NOT v_refused THEN RAISE EXCEPTION 'S16 ÉCHEC : le scénario de référence aurait dû échouer'; END IF;

    -- Ordre de l'application, en tant que société : mise à jour de S2 (reste fermée),
    -- ajout de S3 (ouverte), puis suppression de S1
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    UPDATE public.campaign_destinations SET expected_arrival_date = CURRENT_DATE + 12, order_deadline_date = CURRENT_DATE - 1
    WHERE id = pg_temp.id('d_s2');
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (pg_temp.id('c_s'), pg_temp.id('p1'), 'Ville S3', CURRENT_DATE + 10, CURRENT_DATE + 8);
    DELETE FROM public.campaign_destinations WHERE id = pg_temp.id('d_s1');
    PERFORM pg_temp.as_owner();
    IF NOT public.is_campaign_effectively_open('active', CURRENT_DATE + 30, v_cs)
       OR (SELECT count(*) FROM public.campaign_destinations WHERE campaign_id = v_cs) <> 2 THEN
        RAISE EXCEPTION 'S16 ÉCHEC : synchronisation incomplète';
    END IF;

    -- CT fermée par T1 expirée : report de T1 puis ajout de T2 (ordre de l'application) : accepté
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CT report et ajout', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_ct;
    v_t1 := pg_temp.add_existing_destination(v_ct, pg_temp.id('p1'), 'Ville T1', CURRENT_DATE - 1);
    UPDATE public.campaign_destinations SET order_deadline_date = CURRENT_DATE + 5 WHERE id = v_t1;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_ct, pg_temp.id('p2'), 'Ville T2', CURRENT_DATE + 10, CURRENT_DATE + 6);

    RAISE NOTICE 'S16 OK — C-6 : synchronisation multi-destinations sans état transitoire bloquant';
END $$;

-- ---------------------------------------------------------------------------
-- S17 — C-3 / R-4 sur une campagne expirée À LA FOIS par sa date générale et par
--       ses destinations : ni l'ajout ni la suppression ne préparent une
--       réouverture par simple nouvelle date ; le report reste la seule voie (C3)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cg uuid; v_g1 uuid; v_g2 uuid;
    v_refused boolean;
    v_status text;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CG expirée deux fois', 10, 'tonne', 10, 'USD', CURRENT_DATE - 20, CURRENT_DATE - 1, 'active')
    RETURNING id INTO v_cg;
    v_g1 := pg_temp.add_existing_destination(v_cg, pg_temp.id('p1'), 'Ville G1', CURRENT_DATE - 2);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cg, pg_temp.id('p2'), 'Ville G2', CURRENT_DATE + 10, CURRENT_DATE - 3) RETURNING id INTO v_g2;
    INSERT INTO t_ids VALUES ('c_g', v_cg), ('d_g1', v_g1), ('d_g2', v_g2);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    -- Ajout d'une destination ouverte : refusé (auparavant exempté par la date générale)
    BEGIN
        INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
        VALUES (pg_temp.id('c_g'), pg_temp.id('p1'), 'Ville G3', CURRENT_DATE + 10, CURRENT_DATE + 5);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'L''ajout d''une destination ne permet pas de rouvrir une campagne expirée%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S17 ÉCHEC : ajout d''une destination ouverte accepté (date générale dépassée)'; END IF;

    -- Suppression d'une destination expirée parmi d'autres : acceptée
    DELETE FROM public.campaign_destinations WHERE id = pg_temp.id('d_g2');
    -- Suppression de la dernière : refusée (la campagne deviendrait « sans destination »)
    BEGIN
        DELETE FROM public.campaign_destinations WHERE id = pg_temp.id('d_g1');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'La suppression d''une destination ne permet pas de rouvrir une campagne expirée%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S17 ÉCHEC : suppression de la dernière destination acceptée (date générale dépassée)'; END IF;

    -- Nouvelle date générale seule : refusée (toutes les destinations restent expirées)
    BEGIN
        PERFORM public.reopen_campaign(pg_temp.id('c_g'), CURRENT_DATE + 10, '[]'::jsonb);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Réouverture impossible : toutes les destinations sont expirées%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S17 ÉCHEC : réouverture par la seule date générale'; END IF;

    -- Nouvelle date générale + report de la destination existante : acceptée
    v_status := public.reopen_campaign(pg_temp.id('c_g'), CURRENT_DATE + 10,
        jsonb_build_array(jsonb_build_object('destination_id', pg_temp.id('d_g1'), 'order_deadline_date', CURRENT_DATE + 5)));
    PERFORM pg_temp.as_owner();
    IF v_status <> 'active' OR NOT public.is_campaign_effectively_open('active', CURRENT_DATE + 10, v_cg) THEN
        RAISE EXCEPTION 'S17 ÉCHEC : réouverture par report et nouvelle date refusée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.campaign_destinations WHERE id = v_g1)
       OR EXISTS (SELECT 1 FROM public.campaign_destinations WHERE id = v_g2) THEN
        RAISE EXCEPTION 'S17 ÉCHEC : état des destinations inattendu';
    END IF;

    RAISE NOTICE 'S17 OK — C-3 / R-4 : date générale dépassée sans exemption, report seul accepté';
END $$;

-- ---------------------------------------------------------------------------
-- S18 — D2 à la réouverture SANS changement de statut : campagne 'active' expirée
--       par sa date générale, production repassée en culture, nouvelle date refusée
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_ph uuid; v_ch uuid;
    v_refused boolean;
BEGIN
    INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                    expected_quantity, unit, period_start, status, is_public)
    VALUES (pg_temp.id('company'), pg_temp.id('prod_x'), 'PH 032', 'https://example.invalid/h.jpg', 'Parcelle H', 100, 'tonne', CURRENT_DATE - 60, 'harvested', TRUE)
    RETURNING id INTO v_ph;
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), v_ph, pg_temp.id('prod_x'), 'CH expirée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 20, CURRENT_DATE - 1, 'active')
    RETURNING id INTO v_ch;
    INSERT INTO t_ids VALUES ('ph', v_ph), ('c_h', v_ch);
    UPDATE public.productions SET status = 'growing' WHERE id = v_ph;  -- autorisé : CH n'est pas effectivement ouverte

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.reopen_campaign(pg_temp.id('c_h'), CURRENT_DATE + 10, '[]'::jsonb);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne ne peut être créée ou ouverte que sur une production récoltée%';
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S18 ÉCHEC : réouverture (reopen_campaign) sur production non récoltée'; END IF;
    BEGIN
        UPDATE public.campaigns SET end_date = CURRENT_DATE + 10 WHERE id = pg_temp.id('c_h');
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une campagne ne peut être créée ou ouverte que sur une production récoltée%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S18 ÉCHEC : réouverture directe sur production non récoltée'; END IF;

    UPDATE public.productions SET status = 'harvested' WHERE id = v_ph;
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM public.reopen_campaign(pg_temp.id('c_h'), CURRENT_DATE + 10, '[]'::jsonb);
    PERFORM pg_temp.as_owner();

    RAISE NOTICE 'S18 OK — D2 revérifié à toute réouverture';
END $$;

-- ---------------------------------------------------------------------------
-- S19 — C-6 : update_campaign_with_destinations est atomique (tout ou rien),
--       réservée à l'entreprise propriétaire, et protège les destinations commandées
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cv uuid; v_v1 uuid; v_v2 uuid;
    v_cw uuid; v_w1 uuid;
    v_order uuid;
    v_refused boolean;
    v_fields jsonb;
BEGIN
    -- CV : V1 ouverte (avec un dépôt), V2 expirée, zone p1
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CV atomique', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cv;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES (v_cv, pg_temp.id('country'), pg_temp.id('p1'));
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cv, pg_temp.id('p1'), 'Ville V1', CURRENT_DATE + 10, CURRENT_DATE + 5) RETURNING id INTO v_v1;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cv, pg_temp.id('p2'), 'Ville V2', CURRENT_DATE + 10, CURRENT_DATE - 1) RETURNING id INTO v_v2;
    INSERT INTO public.campaign_depots (campaign_destination_id, campaign_id, name, commune, address)
    VALUES (v_v1, v_cv, 'Dépôt V1', 'Commune V1', 'Avenue V1');
    INSERT INTO t_ids VALUES ('c_v', v_cv), ('d_v1', v_v1), ('d_v2', v_v2);

    v_fields := jsonb_build_object('title', 'CV atomique modifiée', 'description', NULL,
        'marketable_quantity', 10, 'unit_price', 12, 'currency', 'USD', 'min_order_quantity', 1,
        'start_date', CURRENT_DATE - 1, 'end_date', CURRENT_DATE + 30, 'availability_period', NULL);

    -- (a) Succès : report de V1, ajout de V3 avec dépôt, V2 inchangée, zones p1 + p2
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM public.update_campaign_with_destinations(pg_temp.id('c_v'), v_fields,
        ARRAY[pg_temp.id('p1'), pg_temp.id('p2')],
        jsonb_build_object(
            'early_deletes', '[]'::jsonb,
            'updates_open', jsonb_build_array(jsonb_build_object('id', pg_temp.id('d_v1'), 'province_id', pg_temp.id('p1'),
                'city_name', 'Ville V1', 'expected_arrival_date', CURRENT_DATE + 10, 'order_deadline_date', CURRENT_DATE + 6)),
            'inserts', jsonb_build_array(jsonb_build_object('id', NULL, 'province_id', pg_temp.id('p2'),
                'city_name', 'Ville V3', 'expected_arrival_date', CURRENT_DATE + 10, 'order_deadline_date', CURRENT_DATE + 8)),
            'updates_closing', jsonb_build_array(jsonb_build_object('id', pg_temp.id('d_v2'), 'province_id', pg_temp.id('p2'),
                'city_name', 'Ville V2', 'expected_arrival_date', CURRENT_DATE + 10, 'order_deadline_date', CURRENT_DATE - 1)),
            'depot_deletes', '[]'::jsonb,
            'deletes', '[]'::jsonb,
            'depots', jsonb_build_array(jsonb_build_object('city_name', 'Ville V3', 'id', NULL,
                'name', 'Dépôt V3', 'commune', 'Commune V3', 'quartier', NULL, 'address', 'Avenue V3', 'complement', NULL))));
    PERFORM pg_temp.as_owner();
    IF (SELECT title FROM public.campaigns WHERE id = v_cv) <> 'CV atomique modifiée'
       OR (SELECT count(*) FROM public.campaign_delivery_zones WHERE campaign_id = v_cv) <> 2
       OR (SELECT count(*) FROM public.campaign_destinations WHERE campaign_id = v_cv) <> 3
       OR (SELECT order_deadline_date FROM public.campaign_destinations WHERE id = v_v1) <> CURRENT_DATE + 6
       OR NOT EXISTS (SELECT 1 FROM public.campaign_depots dp JOIN public.campaign_destinations d ON d.id = dp.campaign_destination_id
                      WHERE d.campaign_id = v_cv AND d.city_name = 'Ville V3' AND dp.name = 'Dépôt V3') THEN
        RAISE EXCEPTION 'S19 ÉCHEC : modification atomique incomplète';
    END IF;

    -- (b) Tout ou rien : CW fermée par W1 ; l'ajout d'une destination ouverte est refusé
    --     par le trigger → titre, zones et destinations inchangés
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CW fermée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cw;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES (v_cw, pg_temp.id('country'), pg_temp.id('p1'));
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cw, pg_temp.id('p1'), 'Ville W1', CURRENT_DATE + 10, CURRENT_DATE - 1) RETURNING id INTO v_w1;
    INSERT INTO t_ids VALUES ('c_w3', v_cw);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.update_campaign_with_destinations(pg_temp.id('c_w3'),
            v_fields || jsonb_build_object('title', 'CW modifiée'),
            ARRAY[pg_temp.id('p2')],
            jsonb_build_object('inserts', jsonb_build_array(jsonb_build_object('province_id', pg_temp.id('p2'),
                'city_name', 'Ville W2', 'expected_arrival_date', CURRENT_DATE + 10, 'order_deadline_date', CURRENT_DATE + 5))));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'L''ajout d''une destination ne permet pas de rouvrir une campagne expirée%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused THEN RAISE EXCEPTION 'S19 ÉCHEC : ajout réouvrant accepté via la fonction atomique'; END IF;
    IF (SELECT title FROM public.campaigns WHERE id = v_cw) <> 'CW fermée'
       OR NOT EXISTS (SELECT 1 FROM public.campaign_delivery_zones WHERE campaign_id = v_cw AND province_id = pg_temp.id('p1'))
       OR EXISTS (SELECT 1 FROM public.campaign_delivery_zones WHERE campaign_id = v_cw AND province_id = pg_temp.id('p2'))
       OR (SELECT count(*) FROM public.campaign_destinations WHERE campaign_id = v_cw) <> 1 THEN
        RAISE EXCEPTION 'S19 ÉCHEC : état intermédiaire persisté après un échec';
    END IF;

    -- (c) Autre entreprise : refus, sans énumération
    PERFORM pg_temp.act_as(pg_temp.id('u_company2'));
    BEGIN
        PERFORM public.update_campaign_with_destinations(pg_temp.id('c_v'), v_fields || jsonb_build_object('title', 'Piratage'),
            ARRAY[pg_temp.id('p1')], NULL);
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception OR insufficient_privilege THEN v_refused := TRUE;
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused OR (SELECT title FROM public.campaigns WHERE id = v_cv) <> 'CV atomique modifiée' THEN
        RAISE EXCEPTION 'S19 ÉCHEC : modification par une autre entreprise';
    END IF;

    -- (d) Destination liée à une commande : suppression refusée, rien n'est modifié
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT o.order_id INTO v_order FROM public.create_order_with_reservation(
        pg_temp.id('u_reseller'), pg_temp.id('c_v'), 1, NULL, NULL, NULL, NULL, pg_temp.id('d_v1')) o;
    PERFORM pg_temp.as_owner();
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    BEGIN
        PERFORM public.update_campaign_with_destinations(pg_temp.id('c_v'), v_fields || jsonb_build_object('title', 'CV sans V1'),
            ARRAY[pg_temp.id('p1'), pg_temp.id('p2')],
            jsonb_build_object('deletes', jsonb_build_array(pg_temp.id('d_v1'))));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN
        v_refused := SQLERRM LIKE 'Une destination que vous avez retirée est liée à des commandes existantes%';
    END;
    PERFORM pg_temp.as_owner();
    IF NOT v_refused
       OR NOT EXISTS (SELECT 1 FROM public.campaign_destinations WHERE id = v_v1)
       OR (SELECT title FROM public.campaigns WHERE id = v_cv) <> 'CV atomique modifiée' THEN
        RAISE EXCEPTION 'S19 ÉCHEC : destination commandée supprimée ou modification partielle';
    END IF;

    RAISE NOTICE 'S19 OK — C-6 : modification atomique, droits, destinations commandées protégées';
END $$;

-- ---------------------------------------------------------------------------
-- S20 — Suppressions en cascade jamais bloquées : campagne expirée par sa date
--       générale et ses destinations (avec dépôt), campagne terminée
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_c1 uuid; v_c2 uuid; v_d uuid;
BEGIN
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CQ2 expirée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 20, CURRENT_DATE - 1, 'active')
    RETURNING id INTO v_c1;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_c1, pg_temp.id('p1'), 'Ville Q3', CURRENT_DATE + 10, CURRENT_DATE - 2) RETURNING id INTO v_d;
    INSERT INTO public.campaign_depots (campaign_destination_id, campaign_id, name, commune, address)
    VALUES (v_d, v_c1, 'Dépôt Q3', 'Commune Q3', 'Avenue Q3');

    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CQ4 terminée', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_c2;
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_c2, pg_temp.id('p1'), 'Ville Q4', CURRENT_DATE + 10, CURRENT_DATE - 1);
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_c2;

    DELETE FROM public.campaigns WHERE id IN (v_c1, v_c2);

    IF EXISTS (SELECT 1 FROM public.campaign_destinations WHERE campaign_id IN (v_c1, v_c2))
       OR EXISTS (SELECT 1 FROM public.campaign_depots WHERE campaign_id = v_c1) THEN
        RAISE EXCEPTION 'S20 ÉCHEC : destinations ou dépôts non supprimés en cascade';
    END IF;
    RAISE NOTICE 'S20 OK — cascade autorisée (date générale dépassée, campagne terminée)';
END $$;

-- ---------------------------------------------------------------------------
-- S21 — Arbitrage C3 : contournement en deux étapes (ajout d'une destination déjà
--       expirée, puis report de cette destination) refusé ; created_at non
--       falsifiable ; résultat indépendant de l'ordre des reports
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cb uuid; v_x1 uuid; v_x2 uuid; v_x3 uuid;
    v_cb2 uuid; v_y1 uuid; v_y2 uuid;
    v_refused boolean;
    v_status text;
    v_msg constant text := 'Cette destination a été créée après l''expiration de sa date limite%';
BEGIN
    -- CB fermée par X1, destination existante (créée avant son expiration)
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CB contournement', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cb;
    v_x1 := pg_temp.add_existing_destination(v_cb, pg_temp.id('p1'), 'Ville X1', CURRENT_DATE - 1);
    INSERT INTO t_ids VALUES ('c_b', v_cb), ('d_x1', v_x1);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    -- Étape 1 : ajout d'une destination déjà expirée (permis, campagne toujours fermée)
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (pg_temp.id('c_b'), pg_temp.id('p2'), 'Ville X2', CURRENT_DATE + 10, CURRENT_DATE - 2)
    RETURNING id INTO v_x2;
    -- Étape 2 : report de cette destination → refusé (mise à jour directe)
    BEGIN
        UPDATE public.campaign_destinations SET order_deadline_date = CURRENT_DATE + 5 WHERE id = v_x2;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE v_msg;
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S21 ÉCHEC : contournement en deux étapes accepté (mise à jour directe)'; END IF;
    -- … et via reopen_campaign
    BEGIN
        PERFORM public.reopen_campaign(pg_temp.id('c_b'), NULL,
            jsonb_build_array(jsonb_build_object('destination_id', v_x2, 'order_deadline_date', CURRENT_DATE + 5)));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE v_msg;
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S21 ÉCHEC : contournement en deux étapes accepté (reopen_campaign)'; END IF;

    -- Antidatation : created_at transmis à l'insertion ignoré, puis non modifiable
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date, created_at)
    VALUES (pg_temp.id('c_b'), pg_temp.id('p2'), 'Ville X3', CURRENT_DATE + 10, CURRENT_DATE - 1, CURRENT_DATE - 30)
    RETURNING id INTO v_x3;
    UPDATE public.campaign_destinations SET created_at = CURRENT_DATE - 30 WHERE id = v_x3;
    BEGIN
        UPDATE public.campaign_destinations SET order_deadline_date = CURRENT_DATE + 5 WHERE id = v_x3;
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE v_msg;
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S21 ÉCHEC : destination antidatée utilisée pour rouvrir'; END IF;
    PERFORM pg_temp.as_owner();
    IF (SELECT created_at::date FROM public.campaign_destinations WHERE id = v_x3) <> CURRENT_DATE THEN
        RAISE EXCEPTION 'S21 ÉCHEC : created_at falsifié';
    END IF;
    IF public.is_campaign_effectively_open('active', CURRENT_DATE + 30, v_cb) THEN
        RAISE EXCEPTION 'S21 ÉCHEC : CB rouverte par contournement';
    END IF;

    -- Report de X2 transmis AVANT celui de X1 : accepté (X1 traitée d'abord, X2 ensuite
    -- sur une campagne déjà rouverte)
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    v_status := public.reopen_campaign(pg_temp.id('c_b'), NULL, jsonb_build_array(
        jsonb_build_object('destination_id', v_x2, 'order_deadline_date', CURRENT_DATE + 5),
        jsonb_build_object('destination_id', pg_temp.id('d_x1'), 'order_deadline_date', CURRENT_DATE + 5)));
    PERFORM pg_temp.as_owner();
    IF v_status <> 'active'
       OR (SELECT order_deadline_date FROM public.campaign_destinations WHERE id = v_x1) <> CURRENT_DATE + 5
       OR (SELECT order_deadline_date FROM public.campaign_destinations WHERE id = v_x2) <> CURRENT_DATE + 5 THEN
        RAISE EXCEPTION 'S21 ÉCHEC : réouverture par destination existante dépendante de l''ordre';
    END IF;

    -- Même garantie pour la modification atomique (updates_open : Y2 avant Y1)
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'CB2 contournement', 10, 'tonne', 10, 'USD', CURRENT_DATE - 1, CURRENT_DATE + 30, 'active')
    RETURNING id INTO v_cb2;
    v_y1 := pg_temp.add_existing_destination(v_cb2, pg_temp.id('p1'), 'Ville Y1', CURRENT_DATE - 1);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_cb2, pg_temp.id('p2'), 'Ville Y2', CURRENT_DATE + 10, CURRENT_DATE - 2)
    RETURNING id INTO v_y2;
    INSERT INTO t_ids VALUES ('c_b2', v_cb2), ('d_y1', v_y1), ('d_y2', v_y2);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    -- Y2 seule : refusée
    BEGIN
        PERFORM public.update_campaign_with_destinations(pg_temp.id('c_b2'),
            jsonb_build_object('title', 'CB2 contournement', 'description', NULL, 'marketable_quantity', 10, 'unit_price', 10,
                'currency', 'USD', 'min_order_quantity', 1, 'start_date', CURRENT_DATE - 1, 'end_date', CURRENT_DATE + 30,
                'availability_period', NULL),
            ARRAY[pg_temp.id('p1')],
            jsonb_build_object('updates_open', jsonb_build_array(jsonb_build_object('id', pg_temp.id('d_y2'),
                'province_id', pg_temp.id('p2'), 'city_name', 'Ville Y2', 'expected_arrival_date', CURRENT_DATE + 10,
                'order_deadline_date', CURRENT_DATE + 5))));
        v_refused := FALSE;
    EXCEPTION WHEN raise_exception THEN v_refused := SQLERRM LIKE v_msg;
    END;
    IF NOT v_refused THEN PERFORM pg_temp.as_owner(); RAISE EXCEPTION 'S21 ÉCHEC : contournement accepté via la fonction atomique'; END IF;
    -- Y2 puis Y1 : acceptée
    PERFORM public.update_campaign_with_destinations(pg_temp.id('c_b2'),
        jsonb_build_object('title', 'CB2 rouverte', 'description', NULL, 'marketable_quantity', 10, 'unit_price', 10,
            'currency', 'USD', 'min_order_quantity', 1, 'start_date', CURRENT_DATE - 1, 'end_date', CURRENT_DATE + 30,
            'availability_period', NULL),
        ARRAY[pg_temp.id('p1'), pg_temp.id('p2')],
        jsonb_build_object('updates_open', jsonb_build_array(
            jsonb_build_object('id', pg_temp.id('d_y2'), 'province_id', pg_temp.id('p2'), 'city_name', 'Ville Y2',
                'expected_arrival_date', CURRENT_DATE + 10, 'order_deadline_date', CURRENT_DATE + 5),
            jsonb_build_object('id', pg_temp.id('d_y1'), 'province_id', pg_temp.id('p1'), 'city_name', 'Ville Y1',
                'expected_arrival_date', CURRENT_DATE + 10, 'order_deadline_date', CURRENT_DATE + 5))));
    PERFORM pg_temp.as_owner();
    IF (SELECT title FROM public.campaigns WHERE id = v_cb2) <> 'CB2 rouverte'
       OR NOT public.is_campaign_effectively_open('active', CURRENT_DATE + 30, v_cb2) THEN
        RAISE EXCEPTION 'S21 ÉCHEC : réouverture atomique par destination existante refusée';
    END IF;

    RAISE NOTICE 'S21 OK — arbitrage C3 : contournement en deux étapes refusé, created_at protégé';
END $$;

-- ---------------------------------------------------------------------------
-- S22 — UTC : l'ouverture effective, le volume engagé et le stock revendeur sont
--       identiques dans tous les fuseaux de session
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_zone text;
    v_c_today uuid; v_c_past uuid; v_d_today uuid; v_d_past uuid;
    v_s_today uuid; v_s_tomorrow uuid; v_m uuid;
    v_committed numeric;
    v_rows integer;
BEGIN
    -- Pouvoir de détection : ces fuseaux décalent bien la date de session à toute heure
    PERFORM pg_temp.set_tz('<UTCP24>-24');
    IF CURRENT_DATE <> v_today + 1 THEN RAISE EXCEPTION 'S22 ÉCHEC : fuseau +24 h sans effet sur CURRENT_DATE'; END IF;
    PERFORM pg_temp.set_tz('<UTCM24>+24');
    IF CURRENT_DATE <> v_today - 1 THEN RAISE EXCEPTION 'S22 ÉCHEC : fuseau -24 h sans effet sur CURRENT_DATE'; END IF;
    PERFORM pg_temp.set_tz('UTC');

    v_c_today := pg_temp.new_campaign('ZC fin aujourd''hui', v_today - 20, v_today);
    v_c_past := pg_temp.new_campaign('ZC fin hier', v_today - 20, v_today - 1);
    v_d_today := pg_temp.new_campaign('ZD limite aujourd''hui', v_today - 1, v_today + 30);
    v_d_past := pg_temp.new_campaign('ZD limite hier', v_today - 1, v_today + 30);
    v_s_today := pg_temp.new_campaign('ZS début aujourd''hui', v_today, v_today + 30);
    v_s_tomorrow := pg_temp.new_campaign('ZS début demain', v_today + 1, v_today + 30);
    v_m := pg_temp.new_campaign('ZM multi-destinations', v_today - 1, v_today + 30);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date) VALUES
      (v_d_today, pg_temp.id('p1'), 'Ville ZD1', v_today + 10, v_today),
      (v_d_past, pg_temp.id('p1'), 'Ville ZD2', v_today + 10, v_today - 1),
      (v_m, pg_temp.id('p2'), 'Ville ZM2', v_today + 10, v_today + 10);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_m, pg_temp.id('p1'), 'Ville ZM1', v_today + 10, v_today - 1);
    INSERT INTO t_ids VALUES ('z_c_today', v_c_today), ('z_c_past', v_c_past), ('z_d_today', v_d_today), ('z_d_past', v_d_past),
        ('z_s_today', v_s_today), ('z_s_tomorrow', v_s_tomorrow), ('z_m', v_m);

    v_committed := public.get_production_committed_quantity(pg_temp.id('pd'), NULL);

    FOREACH v_zone IN ARRAY pg_temp.zones() LOOP
        PERFORM pg_temp.set_tz(v_zone);
        IF NOT public.is_campaign_effectively_open('active', v_today, v_c_today)
           OR public.is_campaign_effectively_open('active', v_today - 1, v_c_past)
           OR NOT public.is_campaign_effectively_open('active', v_today + 30, v_d_today)
           OR public.is_campaign_effectively_open('active', v_today + 30, v_d_past) THEN
            RAISE EXCEPTION 'S22 ÉCHEC [fuseau %] : ouverture effective dépendante du fuseau', v_zone;
        END IF;
        IF public.get_production_committed_quantity(pg_temp.id('pd'), NULL) <> v_committed THEN
            RAISE EXCEPTION 'S22 ÉCHEC [fuseau %] : volume engagé dépendant du fuseau', v_zone;
        END IF;
        PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
        SELECT count(*) INTO v_rows FROM public.get_campaigns_available_quantity(
            ARRAY[pg_temp.id('z_c_today'), pg_temp.id('z_c_past'), pg_temp.id('z_d_today'), pg_temp.id('z_d_past')]);
        PERFORM pg_temp.as_owner();
        IF v_rows <> 2 THEN RAISE EXCEPTION 'S22 ÉCHEC [fuseau %] : % campagne(s) exposée(s), 2 attendues', v_zone, v_rows; END IF;
    END LOOP;
    PERFORM pg_temp.set_tz('UTC');

    RAISE NOTICE 'S22 OK — UTC : ouverture, volume et stock identiques dans tous les fuseaux';
END $$;

-- ---------------------------------------------------------------------------
-- S23 — UTC : commandes. Un fuseau en avance n'ouvre pas une offre avant sa date de
--       début et ne ferme pas une offre le dernier jour ; un fuseau en retard ne
--       prolonge pas une échéance dépassée et n'empêche pas une offre du jour
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_zone text;
    v_accepted text := 'TEST_ACCEPTE:CMD-' || to_char((now() AT TIME ZONE 'UTC')::date, 'YYYYMMDD') || '-%';
    v_closed constant text := 'La campagne n''est plus dans sa periode de commercialisation%';
BEGIN
    FOREACH v_zone IN ARRAY pg_temp.zones() LOOP
        PERFORM pg_temp.set_tz(v_zone);
        PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
        -- Dernier jour et premier jour : acceptés, numéro de commande à la date UTC
        PERFORM pg_temp.expect('S23 fin aujourd''hui', v_zone, pg_temp.try_order(pg_temp.id('z_c_today')), v_accepted);
        PERFORM pg_temp.expect('S23 limite aujourd''hui', v_zone, pg_temp.try_order(pg_temp.id('z_d_today')), v_accepted);
        PERFORM pg_temp.expect('S23 début aujourd''hui', v_zone, pg_temp.try_order(pg_temp.id('z_s_today')), v_accepted);
        -- Échéances dépassées ou non atteintes : refusées
        PERFORM pg_temp.expect('S23 fin hier', v_zone, pg_temp.try_order(pg_temp.id('z_c_past')), v_closed);
        PERFORM pg_temp.expect('S23 limite hier', v_zone, pg_temp.try_order(pg_temp.id('z_d_past')), v_closed);
        PERFORM pg_temp.expect('S23 début demain', v_zone, pg_temp.try_order(pg_temp.id('z_s_tomorrow')), v_closed);
        PERFORM pg_temp.expect('S23 destination expirée', v_zone, pg_temp.try_order(pg_temp.id('z_m')),
            'La periode de commande pour la destination%');
        PERFORM pg_temp.as_owner();
    END LOOP;
    PERFORM pg_temp.set_tz('UTC');

    RAISE NOTICE 'S23 OK — UTC : échéances de commande indépendantes du fuseau';
END $$;

-- ---------------------------------------------------------------------------
-- S24 — UTC : contournement de C-3 / R-4 par le fuseau. Sur une campagne fermée, une
--       destination dont la date limite est aujourd'hui (UTC) est ouverte : son ajout
--       reste refusé même si le fuseau de session la ferait paraître expirée
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_zone text;
    v_k uuid; v_k1 uuid;
    v_insert constant text := 'INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date) VALUES (%L, %L, ''Ville ZK2'', %L, %L)';
BEGIN
    v_k := pg_temp.new_campaign('ZK fermée', v_today - 1, v_today + 30);
    v_k1 := pg_temp.add_existing_destination(v_k, pg_temp.id('p1'), 'Ville ZK1', v_today - 1);

    FOREACH v_zone IN ARRAY pg_temp.zones() LOOP
        PERFORM pg_temp.set_tz(v_zone);
        PERFORM pg_temp.act_as(pg_temp.id('u_company'));
        PERFORM pg_temp.expect('S24 ajout limite aujourd''hui', v_zone,
            pg_temp.try_sql(format(v_insert, v_k, pg_temp.id('p1'), v_today + 10, v_today)),
            'L''ajout d''une destination ne permet pas de rouvrir une campagne expirée%');
        -- Date limite d'hier : réellement expirée, ajout sans effet, accepté
        PERFORM pg_temp.expect('S24 ajout limite hier', v_zone,
            pg_temp.try_sql(format(v_insert, v_k, pg_temp.id('p1'), v_today + 10, v_today - 1)), 'TEST_ACCEPTE');
        PERFORM pg_temp.expect('S24 suppression', v_zone,
            pg_temp.try_sql(format('DELETE FROM public.campaign_destinations WHERE id = %L', v_k1)),
            'La suppression d''une destination ne permet pas de rouvrir une campagne expirée%');
        PERFORM pg_temp.expect('S24 report', v_zone,
            pg_temp.try_sql(format('UPDATE public.campaign_destinations SET order_deadline_date = %L WHERE id = %L', v_today, v_k1)),
            'TEST_ACCEPTE');
        PERFORM pg_temp.as_owner();
    END LOOP;
    PERFORM pg_temp.set_tz('UTC');

    RAISE NOTICE 'S24 OK — UTC : ajout, suppression et report indépendants du fuseau';
END $$;

-- ---------------------------------------------------------------------------
-- S25 — UTC : la date de création d'une destination est sa date UTC (arbitrage C3).
--       Instants choisis près de minuit UTC : tout fuseau décalé changerait la date.
--       E1 : créée à 23:30 UTC le jour de sa date limite → existante, peut rouvrir.
--       E2 : créée à 00:30 UTC le lendemain de sa date limite → ne peut pas rouvrir.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_zone text;
    v_e uuid; v_e1 uuid; v_e2 uuid;
    v_msg constant text := 'Cette destination a été créée après l''expiration de sa date limite%';
    v_update constant text := 'UPDATE public.campaign_destinations SET order_deadline_date = %L WHERE id = %L';
    v_reopen constant text := 'SELECT public.reopen_campaign(%L::uuid, NULL, %L::jsonb)';
    v_item_e1 jsonb; v_item_e2 jsonb;
    v_fields jsonb;
    v_plan jsonb;
BEGIN
    v_e := pg_temp.new_campaign('ZE dates de création', v_today - 1, v_today + 30);
    v_e1 := pg_temp.add_destination_at(v_e, pg_temp.id('p1'), 'Ville ZE1', v_today - 5,
        ((v_today - 5)::timestamp + interval '23 hours 30 minutes') AT TIME ZONE 'UTC');
    v_e2 := pg_temp.add_destination_at(v_e, pg_temp.id('p2'), 'Ville ZE2', v_today - 6,
        ((v_today - 5)::timestamp + interval '30 minutes') AT TIME ZONE 'UTC');

    v_item_e1 := jsonb_build_object('destination_id', v_e1, 'order_deadline_date', v_today + 5);
    v_item_e2 := jsonb_build_object('destination_id', v_e2, 'order_deadline_date', v_today + 5);
    v_fields := jsonb_build_object('title', 'ZE modifiée', 'description', NULL, 'marketable_quantity', 10, 'unit_price', 10,
        'currency', 'USD', 'min_order_quantity', 1, 'start_date', v_today - 1, 'end_date', v_today + 30, 'availability_period', NULL);
    v_plan := jsonb_build_object('updates_open', jsonb_build_array(
        jsonb_build_object('id', v_e2, 'province_id', pg_temp.id('p2'), 'city_name', 'Ville ZE2',
            'expected_arrival_date', v_today + 10, 'order_deadline_date', v_today + 5),
        jsonb_build_object('id', v_e1, 'province_id', pg_temp.id('p1'), 'city_name', 'Ville ZE1',
            'expected_arrival_date', v_today + 10, 'order_deadline_date', v_today + 5)));

    FOREACH v_zone IN ARRAY pg_temp.zones() LOOP
        PERFORM pg_temp.set_tz(v_zone);
        PERFORM pg_temp.act_as(pg_temp.id('u_company'));
        PERFORM pg_temp.expect('S25 report E2', v_zone, pg_temp.try_sql(format(v_update, v_today + 5, v_e2)), v_msg);
        PERFORM pg_temp.expect('S25 report E1', v_zone, pg_temp.try_sql(format(v_update, v_today + 5, v_e1)), 'TEST_ACCEPTE');
        PERFORM pg_temp.expect('S25 reopen E2', v_zone,
            pg_temp.try_sql(format(v_reopen, v_e, jsonb_build_array(v_item_e2))), v_msg);
        PERFORM pg_temp.expect('S25 reopen E2 puis E1', v_zone,
            pg_temp.try_sql(format(v_reopen, v_e, jsonb_build_array(v_item_e2, v_item_e1))), 'TEST_ACCEPTE');
        PERFORM pg_temp.expect('S25 fonction atomique', v_zone,
            pg_temp.try_sql(format('SELECT public.update_campaign_with_destinations(%L::uuid, %L::jsonb, %L::uuid[], %L::jsonb)',
                v_e, v_fields, ARRAY[pg_temp.id('p1'), pg_temp.id('p2')], v_plan)), 'TEST_ACCEPTE');
        PERFORM pg_temp.as_owner();
    END LOOP;
    PERFORM pg_temp.set_tz('UTC');

    RAISE NOTICE 'S25 OK — UTC : dates de création interprétées en UTC sur tous les chemins';
END $$;

-- ---------------------------------------------------------------------------
-- S26 — UTC : réouverture (D5, report) et clôture automatique (C1). Aucune fermeture
--       anticipée d'une campagne encore valide, aucune échéance prolongée
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_zone text;
    v_r1 uuid; v_r2 uuid; v_dest uuid;
    v_reopen constant text := 'SELECT public.reopen_campaign(%L::uuid, %L::date, %L::jsonb)';
BEGIN
    v_r1 := pg_temp.new_campaign('ZR1 date dépassée', v_today - 20, v_today - 3);
    v_r2 := pg_temp.new_campaign('ZR2 destination expirée', v_today - 1, v_today + 30);
    v_dest := pg_temp.add_existing_destination(v_r2, pg_temp.id('p1'), 'Ville ZR2', v_today - 2);

    FOREACH v_zone IN ARRAY pg_temp.zones() LOOP
        PERFORM pg_temp.set_tz(v_zone);
        PERFORM pg_temp.act_as(pg_temp.id('u_company'));
        -- D5 : nouvelle date d'hier refusée, date du jour acceptée
        PERFORM pg_temp.expect('S26 date hier', v_zone, pg_temp.try_sql(format(v_reopen, v_r1, v_today - 1, '[]')),
            'Réouverture : la nouvelle date de fin est obligatoire%');
        PERFORM pg_temp.expect('S26 date du jour', v_zone, pg_temp.try_sql(format(v_reopen, v_r1, v_today, '[]')), 'TEST_ACCEPTE');
        -- Report : date limite d'hier refusée, date du jour acceptée
        PERFORM pg_temp.expect('S26 report hier', v_zone, pg_temp.try_sql(format(v_reopen, v_r2, NULL,
            jsonb_build_array(jsonb_build_object('destination_id', v_dest, 'order_deadline_date', v_today - 1)))),
            'Chaque date limite reportée doit être au moins égale à aujourd''hui%');
        PERFORM pg_temp.expect('S26 report du jour', v_zone, pg_temp.try_sql(format(v_reopen, v_r2, NULL,
            jsonb_build_array(jsonb_build_object('destination_id', v_dest, 'order_deadline_date', v_today)))), 'TEST_ACCEPTE');
        PERFORM pg_temp.as_owner();

        -- C1 : clôture exécutée puis annulée (SQLSTATE propre à ce test)
        BEGIN
            PERFORM public.check_and_close_expired_campaigns();
            IF (SELECT status FROM public.campaigns WHERE id = pg_temp.id('z_c_today')) <> 'active'
               OR (SELECT status FROM public.campaigns WHERE id = pg_temp.id('z_d_today')) <> 'active' THEN
                RAISE EXCEPTION 'S26 ÉCHEC [fuseau %] : fermeture anticipée d''une campagne valide aujourd''hui', v_zone;
            END IF;
            IF (SELECT status FROM public.campaigns WHERE id = pg_temp.id('z_c_past')) <> 'completed'
               OR (SELECT status FROM public.campaigns WHERE id = pg_temp.id('z_d_past')) <> 'completed' THEN
                RAISE EXCEPTION 'S26 ÉCHEC [fuseau %] : campagne expirée non close', v_zone;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.audit_logs a
                           WHERE a.action = 'CAMPAIGN_AUTO_CLOSED' AND a.entity_id = pg_temp.id('z_c_past')
                             AND a.details ->> 'closed_on' = v_today::text) THEN
                RAISE EXCEPTION 'S26 ÉCHEC [fuseau %] : date de clôture journalisée hors UTC', v_zone;
            END IF;
            RAISE EXCEPTION 'annulation du test' USING ERRCODE = 'ZZ001';
        EXCEPTION WHEN SQLSTATE 'ZZ001' THEN
            NULL;
        END;
    END LOOP;
    PERFORM pg_temp.set_tz('UTC');

    RAISE NOTICE 'S26 OK — UTC : réouverture et clôture automatique indépendantes du fuseau';
END $$;

-- ---------------------------------------------------------------------------
-- S27 — Statut d'origine (ADR-047) : la date générale prévaut sur les destinations ;
--       une campagne suspendue reste suspendue après réouverture, jusqu'à sa reprise
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_p uuid; v_p2 uuid; v_q uuid; v_a uuid;
    v_status text;
BEGIN
    v_p := pg_temp.new_campaign('ZP suspendue', v_today - 20, v_today - 1);
    UPDATE public.campaigns SET status = 'paused' WHERE id = v_p;
    -- Date générale dépassée, destination encore ouverte : la campagne est close
    v_a := pg_temp.new_campaign('ZA date dépassée', v_today - 20, v_today - 1);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_a, pg_temp.id('p1'), 'Ville ZA', v_today + 10, v_today + 10);
    v_q := pg_temp.new_campaign('ZQ brouillon', v_today - 1, v_today + 30);
    UPDATE public.campaigns SET status = 'draft' WHERE id = v_q;
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_q;

    PERFORM public.check_and_close_expired_campaigns();

    IF (SELECT status FROM public.campaigns WHERE id = v_a) <> 'completed' THEN
        RAISE EXCEPTION 'S27 ÉCHEC : la date générale n''a pas prévalu sur la destination ouverte';
    END IF;
    IF (SELECT status_before_completion FROM public.campaigns WHERE id = v_p) IS DISTINCT FROM 'paused'
       OR (SELECT status_before_completion FROM public.campaigns WHERE id = v_a) IS DISTINCT FROM 'active'
       OR (SELECT status_before_completion FROM public.campaigns WHERE id = v_q) IS DISTINCT FROM 'draft' THEN
        RAISE EXCEPTION 'S27 ÉCHEC : statut d''origine non conservé';
    END IF;

    -- Campagne suspendue expirée mais pas encore close
    v_p2 := pg_temp.new_campaign('ZP2 suspendue', v_today - 20, v_today - 1);
    UPDATE public.campaigns SET status = 'paused' WHERE id = v_p2;

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM pg_temp.expect('S27 reprise directe', 'UTC',
        pg_temp.try_sql(format('UPDATE public.campaigns SET status = ''active'', end_date = %L WHERE id = %L', v_today + 10, v_p)),
        'Une campagne terminée ne peut revenir qu''à son statut précédent%');
    v_status := public.reopen_campaign(v_p, v_today + 10, '[]'::jsonb);
    IF v_status <> 'paused' THEN RAISE EXCEPTION 'S27 ÉCHEC : suspendue rouverte en %', v_status; END IF;
    v_status := public.reopen_campaign(v_p2, v_today + 10, '[]'::jsonb);
    IF v_status <> 'paused' THEN RAISE EXCEPTION 'S27 ÉCHEC : suspendue non close rouverte en %', v_status; END IF;
    v_status := public.reopen_campaign(v_q, NULL, '[]'::jsonb);
    IF v_status <> 'draft' THEN RAISE EXCEPTION 'S27 ÉCHEC : brouillon rouvert en %', v_status; END IF;
    v_status := public.reopen_campaign(v_a, v_today + 10, '[]'::jsonb);
    IF v_status <> 'active' THEN RAISE EXCEPTION 'S27 ÉCHEC : active rouverte en %', v_status; END IF;
    PERFORM pg_temp.as_owner();

    IF (SELECT status FROM public.campaigns WHERE id = v_p) <> 'paused'
       OR (SELECT status_before_completion FROM public.campaigns WHERE id = v_p) IS NOT NULL THEN
        RAISE EXCEPTION 'S27 ÉCHEC : état de la campagne suspendue après réouverture';
    END IF;

    -- Suspendue : commandes refusées jusqu'à la reprise explicite par la société
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    PERFORM pg_temp.expect('S27 commande suspendue', 'UTC', pg_temp.try_order(v_p), 'La campagne n''est pas ouverte aux commandes%');
    PERFORM pg_temp.as_owner();
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    UPDATE public.campaigns SET status = 'active' WHERE id = v_p;
    PERFORM pg_temp.as_owner();
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    PERFORM pg_temp.expect('S27 commande après reprise', 'UTC', pg_temp.try_order(v_p), 'TEST_ACCEPTE:%');
    PERFORM pg_temp.as_owner();

    RAISE NOTICE 'S27 OK — statut d''origine conservé, reprise explicite, date générale prioritaire';
END $$;

-- ---------------------------------------------------------------------------
-- S28 — status_before_completion ne peut pas être manipulée, quel que soit l'appel
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_c uuid; v_d uuid;
BEGIN
    v_d := pg_temp.new_campaign('ZM manipulation', v_today - 1, v_today + 30);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, status, status_before_completion)
    VALUES (pg_temp.id('company'), pg_temp.id('pd'), pg_temp.id('prod_x'), 'ZM insertion', 10, 'tonne', 10, 'USD', v_today, 'draft', 'paused')
    RETURNING id INTO v_c;
    UPDATE public.campaigns SET status_before_completion = 'paused' WHERE id = v_c;
    UPDATE public.campaigns SET status = 'paused' WHERE id = v_d;
    -- Valeur falsifiée au passage en 'completed' : le statut réel est conservé
    UPDATE public.campaigns SET status = 'completed', status_before_completion = 'active' WHERE id = v_d;
    -- Valeur falsifiée sur une campagne terminée : ignorée
    UPDATE public.campaigns SET status_before_completion = 'active' WHERE id = v_d;
    PERFORM pg_temp.expect('S28 retour en active', 'UTC',
        pg_temp.try_sql(format('UPDATE public.campaigns SET status = ''active'' WHERE id = %L', v_d)),
        'Une campagne terminée ne peut revenir qu''à son statut précédent%');
    PERFORM pg_temp.as_owner();

    IF (SELECT status_before_completion FROM public.campaigns WHERE id = v_c) IS NOT NULL THEN
        RAISE EXCEPTION 'S28 ÉCHEC : valeur acceptée sur une campagne non terminée';
    END IF;
    IF (SELECT status_before_completion FROM public.campaigns WHERE id = v_d) IS DISTINCT FROM 'paused' THEN
        RAISE EXCEPTION 'S28 ÉCHEC : statut d''origine falsifié';
    END IF;

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    UPDATE public.campaigns SET status = 'paused' WHERE id = v_d;
    PERFORM pg_temp.as_owner();
    IF (SELECT status_before_completion FROM public.campaigns WHERE id = v_d) IS NOT NULL THEN
        RAISE EXCEPTION 'S28 ÉCHEC : colonne non vidée en quittant « terminée »';
    END IF;

    RAISE NOTICE 'S28 OK — colonne protégée à l''insertion, à la mise à jour et aux transitions';
END $$;

-- ---------------------------------------------------------------------------
-- S29 — Un administrateur ne rouvre jamais une campagne, quel que soit le canal
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_c uuid; v_e uuid; v_f uuid; v_dest uuid;
    v_admin constant text := 'Un administrateur ne peut pas rouvrir une campagne%';
    v_denied constant text := 'Action non autorisée sur cette campagne%';
BEGIN
    v_c := pg_temp.new_campaign('ZAD destinations expirées', v_today - 1, v_today + 30);
    v_dest := pg_temp.add_existing_destination(v_c, pg_temp.id('p1'), 'Ville ZAD', v_today - 1);
    v_e := pg_temp.new_campaign('ZAE date dépassée', v_today - 20, v_today - 1);
    v_f := pg_temp.new_campaign('ZAF terminée', v_today - 1, v_today + 30);
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_f;

    PERFORM pg_temp.act_as(pg_temp.id('u_admin'));
    PERFORM pg_temp.expect('S29 reopen_campaign', 'UTC',
        pg_temp.try_sql(format('SELECT public.reopen_campaign(%L::uuid, %L::date, ''[]''::jsonb)', v_e, v_today + 10)), v_denied);
    PERFORM pg_temp.expect('S29 fonction atomique', 'UTC',
        pg_temp.try_sql(format('SELECT public.update_campaign_with_destinations(%L::uuid, %L::jsonb, %L::uuid[], NULL)',
            v_e, jsonb_build_object('title', 'ZAE', 'description', NULL, 'marketable_quantity', 10, 'unit_price', 10, 'currency', 'USD',
                'min_order_quantity', 1, 'start_date', v_today - 20, 'end_date', v_today + 10, 'availability_period', NULL),
            ARRAY[pg_temp.id('p1')])), v_denied);
    PERFORM pg_temp.expect('S29 report direct', 'UTC',
        pg_temp.try_sql(format('UPDATE public.campaign_destinations SET order_deadline_date = %L WHERE id = %L', v_today + 5, v_dest)), v_admin);
    PERFORM pg_temp.expect('S29 date directe', 'UTC',
        pg_temp.try_sql(format('UPDATE public.campaigns SET end_date = %L WHERE id = %L', v_today + 10, v_e)), v_admin);
    PERFORM pg_temp.expect('S29 statut direct', 'UTC',
        pg_temp.try_sql(format('UPDATE public.campaigns SET status = ''active'' WHERE id = %L', v_f)), v_admin);
    PERFORM pg_temp.expect('S29 fonction date limite', 'UTC',
        pg_temp.try_sql(format('SELECT public.update_destination_order_deadline(%L::uuid, %L::date)', v_dest, v_today + 5)), v_admin);
    PERFORM pg_temp.expect('S29 fonction date d''arrivée', 'UTC',
        pg_temp.try_sql(format('SELECT public.update_destination_arrival_date(%L::uuid, %L::date, %L::date)', v_dest, v_today + 10, v_today + 5)), v_admin);
    PERFORM pg_temp.as_owner();

    -- La société propriétaire conserve ce droit
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM pg_temp.expect('S29 société', 'UTC',
        pg_temp.try_sql(format('UPDATE public.campaign_destinations SET order_deadline_date = %L WHERE id = %L', v_today + 5, v_dest)), 'TEST_ACCEPTE');
    PERFORM pg_temp.as_owner();

    RAISE NOTICE 'S29 OK — administrateur refusé sur tous les canaux';
END $$;

-- ---------------------------------------------------------------------------
-- S30 — Opérations techniques : sans motif, refus ; avec motif, identité système
--       journalisée (actor_id vide). Le cas de la session API n'est pas simulable ici.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_c uuid; v_dest uuid;
    v_report text;
    v_log record;
BEGIN
    v_c := pg_temp.new_campaign('ZT technique', v_today - 1, v_today + 30);
    v_dest := pg_temp.add_existing_destination(v_c, pg_temp.id('p1'), 'Ville ZT', v_today - 1);
    v_report := format('UPDATE public.campaign_destinations SET order_deadline_date = %L WHERE id = %L', v_today + 5, v_dest);

    PERFORM set_config('radiza.technical_reason', '', true);
    PERFORM pg_temp.expect('S30 clôture sans motif', 'UTC',
        pg_temp.try_sql('SELECT public.check_and_close_expired_campaigns()'), 'Clôture refusée : opération technique non identifiée%');
    PERFORM pg_temp.expect('S30 report sans motif', 'UTC', pg_temp.try_sql(v_report),
        'Réouverture refusée : opération technique non identifiée%');
    PERFORM set_config('radiza.technical_reason', 'tests-032', true);

    EXECUTE v_report;
    SELECT a.actor_id, a.details INTO v_log FROM public.audit_logs a
    WHERE a.action = 'CAMPAIGN_REOPENED' AND a.entity_id = v_c;
    IF NOT FOUND OR v_log.actor_id IS NOT NULL
       OR v_log.details ->> 'actor_type' <> 'system'
       OR v_log.details ->> 'system_actor' <> session_user::text
       OR v_log.details ->> 'reason' <> 'tests-032' THEN
        RAISE EXCEPTION 'S30 ÉCHEC : identité système absente du journal (%)', v_log.details;
    END IF;

    RAISE NOTICE 'S30 OK — opérations techniques identifiées et journalisées';
END $$;

-- ---------------------------------------------------------------------------
-- S31 — Journal : exactement une ligne par réouverture, sur chaque canal ; aucune en
--       cas de refus ni pour un report sur une campagne déjà ouverte
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_e uuid; v_f uuid; v_g uuid;
    v_da uuid; v_db uuid; v_dc uuid; v_dd uuid; v_df uuid; v_dg uuid;
    v_id uuid;
BEGIN
    v_a := pg_temp.new_campaign('ZJ terminée', v_today - 1, v_today + 30);
    v_da := pg_temp.add_existing_destination(v_a, pg_temp.id('p1'), 'Ville ZJA', v_today - 1);
    UPDATE public.campaigns SET status = 'completed' WHERE id = v_a;
    v_b := pg_temp.new_campaign('ZJ active fermée', v_today - 1, v_today + 30);
    v_db := pg_temp.add_existing_destination(v_b, pg_temp.id('p1'), 'Ville ZJB', v_today - 1);
    v_c := pg_temp.new_campaign('ZJ atomique', v_today - 1, v_today + 30);
    v_dc := pg_temp.add_existing_destination(v_c, pg_temp.id('p1'), 'Ville ZJC', v_today - 1);
    v_d := pg_temp.new_campaign('ZJ directe', v_today - 1, v_today + 30);
    v_dd := pg_temp.add_existing_destination(v_d, pg_temp.id('p1'), 'Ville ZJD', v_today - 1);
    v_e := pg_temp.new_campaign('ZJ date', v_today - 20, v_today - 1);
    v_f := pg_temp.new_campaign('ZJ refus', v_today - 1, v_today + 30);
    v_df := pg_temp.add_existing_destination(v_f, pg_temp.id('p1'), 'Ville ZJF', v_today - 1);
    v_g := pg_temp.new_campaign('ZJ ouverte', v_today - 1, v_today + 30);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_g, pg_temp.id('p1'), 'Ville ZJG1', v_today + 10, v_today + 10);
    v_dg := pg_temp.add_existing_destination(v_g, pg_temp.id('p2'), 'Ville ZJG2', v_today - 1);

    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM public.reopen_campaign(v_a, NULL, jsonb_build_array(jsonb_build_object('destination_id', v_da, 'order_deadline_date', v_today + 5)));
    PERFORM public.reopen_campaign(v_b, NULL, jsonb_build_array(jsonb_build_object('destination_id', v_db, 'order_deadline_date', v_today + 5)));
    PERFORM public.update_campaign_with_destinations(v_c,
        jsonb_build_object('title', 'ZJ atomique', 'description', NULL, 'marketable_quantity', 10, 'unit_price', 10, 'currency', 'USD',
            'min_order_quantity', 1, 'start_date', v_today - 1, 'end_date', v_today + 30, 'availability_period', NULL),
        ARRAY[pg_temp.id('p1')],
        jsonb_build_object('updates_open', jsonb_build_array(jsonb_build_object('id', v_dc, 'province_id', pg_temp.id('p1'),
            'city_name', 'Ville ZJC', 'expected_arrival_date', v_today + 10, 'order_deadline_date', v_today + 5))));
    UPDATE public.campaign_destinations SET order_deadline_date = v_today + 5 WHERE id = v_dd;
    UPDATE public.campaigns SET end_date = v_today + 10 WHERE id = v_e;
    PERFORM pg_temp.expect('S31 refus', 'UTC',
        pg_temp.try_sql(format('SELECT public.reopen_campaign(%L::uuid, NULL, ''[]''::jsonb)', v_f)), 'Réouverture impossible%');
    UPDATE public.campaign_destinations SET order_deadline_date = v_today + 5 WHERE id = v_dg;
    PERFORM pg_temp.as_owner();

    FOREACH v_id IN ARRAY ARRAY[v_a, v_b, v_c, v_d, v_e] LOOP
        IF (SELECT count(*) FROM public.audit_logs a WHERE a.action = 'CAMPAIGN_REOPENED' AND a.entity_id = v_id) <> 1 THEN
            RAISE EXCEPTION 'S31 ÉCHEC : nombre de lignes de journal inattendu pour %', v_id;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.action = 'CAMPAIGN_REOPENED' AND a.entity_id = v_id
                       AND a.actor_id = pg_temp.id('u_company') AND a.details ->> 'actor_type' = 'company_user') THEN
            RAISE EXCEPTION 'S31 ÉCHEC : acteur non journalisé pour %', v_id;
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.action = 'CAMPAIGN_REOPENED' AND a.entity_id IN (v_f, v_g)) THEN
        RAISE EXCEPTION 'S31 ÉCHEC : journal écrit sans réouverture';
    END IF;

    RAISE NOTICE 'S31 OK — une ligne de journal par réouverture, sur chaque canal';
END $$;

-- ---------------------------------------------------------------------------
-- S32 — Clôture sans effet sur les commandes, réservations et productions ; volumes
--       engagés conservés ; les commandes restent traitables et consultables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_pt uuid; v_c uuid;
    v_delivered uuid; v_preparing uuid; v_pending uuid;
    v_before text; v_after text;
    v_rows integer;
BEGIN
    INSERT INTO public.productions (company_id, product_id, title, main_image_url, location_name,
                                    expected_quantity, unit, period_start, status, is_public)
    VALUES (pg_temp.id('company'), pg_temp.id('prod_x'), 'PT 032', 'https://example.invalid/t.jpg', 'Parcelle T', 300, 'tonne', v_today - 60, 'harvested', TRUE)
    RETURNING id INTO v_pt;
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), v_pt, pg_temp.id('prod_x'), 'CT commandes', 200, 'tonne', 10, 'USD', v_today - 20, v_today + 30, 'active')
    RETURNING id INTO v_c;
    INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id) VALUES (v_c, pg_temp.id('country'), pg_temp.id('p1'));
    -- Une destination encore ouverte après la fin générale (cas réel)
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_c, pg_temp.id('p1'), 'Ville CT', v_today + 10, v_today + 10);
    INSERT INTO t_ids VALUES ('c_t', v_c);

    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT o.order_id INTO v_delivered FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_t'), 20) o;
    SELECT o.order_id INTO v_preparing FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_t'), 8) o;
    SELECT o.order_id INTO v_pending FROM public.create_order_with_reservation(pg_temp.id('u_reseller'), pg_temp.id('c_t'), 2) o;
    PERFORM pg_temp.as_owner();
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM public.update_order_status(v_delivered, 'ready');
    PERFORM public.confirm_order_delivery(v_delivered, NULL);
    PERFORM public.update_order_status(v_preparing, 'preparing');
    PERFORM pg_temp.as_owner();

    UPDATE public.campaigns SET end_date = v_today - 1 WHERE id = v_c;

    SELECT md5(
        (SELECT string_agg(concat_ws('|', o.id, o.status, o.total_amount, o.updated_at), ',' ORDER BY o.id) FROM public.orders o WHERE o.campaign_id = v_c)
        || (SELECT string_agg(concat_ws('|', s.id, s.status, s.quantity, s.updated_at), ',' ORDER BY s.id) FROM public.stock_reservations s WHERE s.campaign_id = v_c)
        || (SELECT concat_ws('|', p.status, p.expected_quantity, p.is_public, p.unit, p.updated_at) FROM public.productions p WHERE p.id = v_pt))
    INTO v_before;

    PERFORM public.check_and_close_expired_campaigns();

    SELECT md5(
        (SELECT string_agg(concat_ws('|', o.id, o.status, o.total_amount, o.updated_at), ',' ORDER BY o.id) FROM public.orders o WHERE o.campaign_id = v_c)
        || (SELECT string_agg(concat_ws('|', s.id, s.status, s.quantity, s.updated_at), ',' ORDER BY s.id) FROM public.stock_reservations s WHERE s.campaign_id = v_c)
        || (SELECT concat_ws('|', p.status, p.expected_quantity, p.is_public, p.unit, p.updated_at) FROM public.productions p WHERE p.id = v_pt))
    INTO v_after;

    IF (SELECT status FROM public.campaigns WHERE id = v_c) <> 'completed' THEN
        RAISE EXCEPTION 'S32 ÉCHEC : campagne non close';
    END IF;
    IF v_before IS NULL OR v_before <> v_after THEN
        RAISE EXCEPTION 'S32 ÉCHEC : la clôture a modifié des commandes, réservations ou la production';
    END IF;
    -- Volume engagé : seules les réservations restent comptées
    IF public.get_production_committed_quantity(v_pt, NULL) <> 30 THEN
        RAISE EXCEPTION 'S32 ÉCHEC : volume engagé % (attendu 30)', public.get_production_committed_quantity(v_pt, NULL);
    END IF;
    IF pg_temp.try_sql(format('UPDATE public.productions SET expected_quantity = 20 WHERE id = %L', v_pt)) = 'TEST_ACCEPTE' THEN
        RAISE EXCEPTION 'S32 ÉCHEC : production réduite sous le volume réservé';
    END IF;

    -- Accès conservé après la clôture
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    SELECT count(*) INTO v_rows FROM public.orders o JOIN public.campaigns c ON c.id = o.campaign_id WHERE c.id = pg_temp.id('c_t');
    PERFORM pg_temp.as_owner();
    IF v_rows <> 3 THEN RAISE EXCEPTION 'S32 ÉCHEC : revendeur sans accès à ses commandes (%)', v_rows; END IF;
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    SELECT count(*) INTO v_rows FROM public.orders o JOIN public.campaigns c ON c.id = o.campaign_id WHERE c.id = pg_temp.id('c_t');
    PERFORM pg_temp.as_owner();
    IF v_rows <> 3 THEN RAISE EXCEPTION 'S32 ÉCHEC : société sans accès à ses commandes (%)', v_rows; END IF;

    -- Les commandes restent traitables sur une campagne close
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM public.update_order_status(v_preparing, 'ready');
    PERFORM public.confirm_order_delivery(v_preparing, NULL);
    PERFORM pg_temp.as_owner();
    PERFORM pg_temp.act_as(pg_temp.id('u_reseller'));
    PERFORM public.cancel_order_and_release_reservation(v_pending, 'Test 032');
    PERFORM pg_temp.as_owner();
    IF (SELECT status FROM public.orders WHERE id = v_preparing) <> 'delivered'
       OR (SELECT status FROM public.stock_reservations WHERE order_id = v_preparing) <> 'confirmed'
       OR (SELECT status FROM public.orders WHERE id = v_pending) <> 'cancelled'
       OR (SELECT status FROM public.stock_reservations WHERE order_id = v_pending) <> 'released' THEN
        RAISE EXCEPTION 'S32 ÉCHEC : commande non traitée après la clôture';
    END IF;

    -- Volume repris par une autre campagne : la réouverture est refusée
    INSERT INTO public.campaigns (company_id, production_id, product_id, title, marketable_quantity, unit, unit_price, currency, start_date, end_date, status)
    VALUES (pg_temp.id('company'), v_pt, pg_temp.id('prod_x'), 'CT2 reprise du volume', 272, 'tonne', 10, 'USD', v_today, v_today + 30, 'active');
    PERFORM pg_temp.act_as(pg_temp.id('u_company'));
    PERFORM pg_temp.expect('S32 réouverture sans volume', 'UTC',
        pg_temp.try_sql(format('SELECT public.reopen_campaign(%L::uuid, %L::date, ''[]''::jsonb)', v_c, v_today + 10)),
        'Volume insuffisant sur la production%');
    PERFORM pg_temp.as_owner();

    RAISE NOTICE 'S32 OK — commandes, réservations, production et volumes protégés';
END $$;

-- ---------------------------------------------------------------------------
-- S33 — UTC : la décision de notifier la fermeture d'une destination ne dépend pas du
--       fuseau de session (update_destination_order_deadline)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_zone text;
    v_c uuid; v_dest uuid;
    v_message text;
BEGIN
    v_c := pg_temp.new_campaign('ZN notification', v_today - 1, v_today + 30);
    INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
    VALUES (v_c, pg_temp.id('p1'), 'Ville ZN', v_today + 10, v_today + 5)
    RETURNING id INTO v_dest;

    FOREACH v_zone IN ARRAY pg_temp.zones() LOOP
        PERFORM pg_temp.set_tz(v_zone);
        PERFORM pg_temp.act_as(pg_temp.id('u_company'));
        BEGIN
            SELECT r.message INTO v_message FROM public.update_destination_order_deadline(v_dest, v_today) r;
            PERFORM pg_temp.expect('S33 limite du jour', v_zone, v_message, 'Date limite mise a jour%');
            SELECT r.message INTO v_message FROM public.update_destination_order_deadline(v_dest, v_today - 1) r;
            PERFORM pg_temp.expect('S33 limite d''hier', v_zone, v_message, 'Destination FERMEE%');
            RAISE EXCEPTION 'annulation du test' USING ERRCODE = 'ZZ001';
        EXCEPTION WHEN SQLSTATE 'ZZ001' THEN
            NULL;
        END;
        PERFORM pg_temp.as_owner();
    END LOOP;
    PERFORM pg_temp.set_tz('UTC');

    RAISE NOTICE 'S33 OK — notification de fermeture indépendante du fuseau';
END $$;

DO $$ BEGIN RAISE NOTICE '✅ RÈGLES MÉTIER 032 VALIDÉES'; END $$;

ROLLBACK;
