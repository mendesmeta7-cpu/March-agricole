-- ============================================================================
-- MIGRATION 30 — DURCISSEMENT DE SÉCURITÉ (LOT 1 + LOT 2 base de données)
-- Date : 2026-11-01
-- Référence : dossier d'audit Radiza (02-cybersecurite.md, 04-fonctionnalites-tests.md)
--
-- ⚠️  NON APPLIQUÉE. À exécuter d'abord sur un environnement isolé (Supabase local
--     ou projet de staging), puis valider avec
--     supabase/tests/security_hardening_030_test.sql, avant toute production.
--
-- Principes :
--   * Aucune donnée supprimée, aucune table supprimée.
--   * Les fonctions sont réécrites à partir de leur définition LIVE (relevée en
--     lecture seule le 2026-11-01), en ne modifiant que les contrôles d'accès,
--     le search_path et les contrôles de stock.
--   * Le script est idempotent (CREATE OR REPLACE, DROP ... IF EXISTS).
--   * Pas de BEGIN/COMMIT explicites : la CLI Supabase et le SQL Editor exécutent
--     un script multi-instructions dans une transaction implicite unique.
--
-- Constats traités : SEC-02, SEC-03, SEC-04, SEC-06, SEC-07, SEC-08 (partiel),
-- SEC-11, SEC-12 (partiel), SEC-13, SEC-15, SEC-18, SEC-19, SEC-20, SEC-21,
-- SEC-23, SEC-28 (partiel), FUN-01 (base), FUN-02, FUN-12.
-- ============================================================================


-- ============================================================================
-- 0. FONCTION UTILITAIRE : membre OU créateur d'une entreprise
--    (les entreprises antérieures au trigger auto-owner n'ont pas forcément de
--     ligne company_members ; getCompanyIdForUser() côté app couvre les deux cas)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_company_member_or_creator(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT auth.uid() IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.company_members cm
                WHERE cm.company_id = p_company_id AND cm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.companies c
                   WHERE c.id = p_company_id AND c.created_by = auth.uid())
    );
$$;

-- search_path figé sur les helpers existants (SEC-23). Certaines fonctions n'existent
-- qu'en production (créées hors migrations, ex. check_global_product_image_protection) :
-- chaque ALTER est conditionné pour que la migration passe aussi sur une base
-- reconstruite depuis le dépôt.
DO $$
DECLARE
    v_sig text;
BEGIN
    FOREACH v_sig IN ARRAY ARRAY[
        'public.current_user_role()',
        'public.is_company_member(uuid)',
        'public.is_company_admin_or_owner(uuid)',
        'public.check_profile_creation_role()',
        'public.handle_new_company_created()',
        'public.check_global_product_image_protection()',
        'public.update_updated_at_column()',
        'public.get_campaign_stock_summary(uuid)'
    ] LOOP
        IF to_regprocedure(v_sig) IS NOT NULL THEN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_sig);
        ELSE
            RAISE NOTICE 'Fonction absente (search_path ignoré) : %', v_sig;
        END IF;
    END LOOP;
END $$;


-- ============================================================================
-- 1. STOCK D'UNE PRODUCTION (SEC-08 / FUN-02 / FUN-03 partiel)
--    Règle appliquée ici (indépendante de l'arbitrage A3) : on ne peut jamais
--    réserver plus que la quantité de la production. Les réservations comptées
--    sont celles des commandes en cours ('active') ET livrées ('confirmed'),
--    qu'elles viennent d'une campagne ou d'une proposition.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_production_reserved_quantity(p_production_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(SUM(sr.quantity), 0)::numeric
    FROM public.stock_reservations sr
    WHERE sr.status IN ('active', 'confirmed')
      AND (
            sr.production_id = p_production_id
         OR EXISTS (SELECT 1 FROM public.campaigns c
                    WHERE c.id = sr.campaign_id AND c.production_id = p_production_id)
      );
$$;


-- ============================================================================
-- 2. create_order_with_reservation (SEC-02, SEC-18, SEC-08, SEC-23)
--    Changements par rapport à la version live :
--      - appelant anonyme refusé ; p_reseller_id doit être l'appelant (sauf admin)
--      - le bénéficiaire doit avoir le rôle 'reseller'
--      - verrou + contrôle de la quantité restante de la PRODUCTION
--      - SET search_path
--    Le calcul du stock de CAMPAGNE est inchangé (réservations 'active', BR-STK-01).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
    p_reseller_id uuid,
    p_campaign_id uuid,
    p_quantity numeric,
    p_delivery_province_id uuid DEFAULT NULL::uuid,
    p_delivery_city character varying DEFAULT NULL::character varying,
    p_delivery_address text DEFAULT NULL::text,
    p_notes text DEFAULT NULL::text,
    p_destination_id uuid DEFAULT NULL::uuid,
    p_depot_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(order_id uuid, order_number character varying, total_amount numeric, reserved_quantity numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_campaign RECORD; v_destination RECORD; v_depot RECORD; v_reseller RECORD;
    v_product_name TEXT; v_reseller_province_id UUID; v_is_eligible BOOLEAN;
    v_reserved_qty NUMERIC(12,2); v_available_qty NUMERIC(12,2);
    v_production_expected NUMERIC(12,2); v_production_available NUMERIC(12,2);
    v_new_order_id UUID; v_order_number VARCHAR; v_total_amount NUMERIC(14,2);
    v_final_city VARCHAR(100); v_final_address TEXT; v_arrival_date DATE; v_depot_name VARCHAR(255);
    v_final_destination_id UUID := NULL; v_final_depot_id UUID := NULL; v_notif_user_id UUID := NULL;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour passer commande.';
    END IF;
    IF auth.uid() <> p_reseller_id AND COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Acces refuse';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reseller_id AND role = 'reseller') THEN
        RAISE EXCEPTION 'Seuls les revendeurs enregistres peuvent passer commande';
    END IF;
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantite commandee doit etre strictement superieure a zero';
    END IF;

    SELECT * INTO v_reseller FROM public.resellers WHERE id = p_reseller_id;
    IF NOT FOUND OR v_reseller.province_id IS NULL THEN
        RAISE EXCEPTION 'Profil revendeur incomplet : province de rattachement introuvable';
    END IF;
    v_reseller_province_id := v_reseller.province_id;

    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable'; END IF;
    IF v_campaign.status <> 'active' THEN
        RAISE EXCEPTION 'La campagne n''est pas ouverte aux commandes (Statut : %)', v_campaign.status;
    END IF;
    IF (v_campaign.start_date > CURRENT_DATE) OR (v_campaign.end_date IS NOT NULL AND v_campaign.end_date < CURRENT_DATE) THEN
        RAISE EXCEPTION 'La campagne n''est plus dans sa periode de commercialisation';
    END IF;
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'Quantite inferieure au minimum autorise';
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.campaign_destinations WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id)
        OR EXISTS(SELECT 1 FROM public.campaign_delivery_zones WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id)
      INTO v_is_eligible;
    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre region';
    END IF;

    v_final_city := TRIM(COALESCE(p_delivery_city, v_reseller.city));
    v_final_address := TRIM(COALESCE(p_delivery_address, v_reseller.delivery_address));

    IF p_destination_id IS NOT NULL THEN
        SELECT * INTO v_destination FROM public.campaign_destinations WHERE id = p_destination_id AND campaign_id = p_campaign_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'La destination specifiee n''appartient pas a cette offre'; END IF;
        IF v_destination.province_id <> v_reseller_province_id THEN
            RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre region';
        END IF;
        v_final_destination_id := v_destination.id;
        v_arrival_date := v_destination.expected_arrival_date;
        v_final_city := v_destination.city_name;
    ELSE
        SELECT * INTO v_destination FROM public.campaign_destinations WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id LIMIT 1;
        IF FOUND THEN
            v_final_destination_id := v_destination.id;
            v_arrival_date := v_destination.expected_arrival_date;
            v_final_city := v_destination.city_name;
        END IF;
    END IF;

    IF v_final_destination_id IS NOT NULL AND v_destination.order_deadline_date IS NOT NULL THEN
        IF v_destination.order_deadline_date < CURRENT_DATE THEN
            RAISE EXCEPTION 'La periode de commande pour la destination "%" est terminee depuis le %. Aucune nouvelle commande ne peut etre acceptee pour cette region.',
                v_destination.city_name, TO_CHAR(v_destination.order_deadline_date, 'DD/MM/YYYY');
        END IF;
    END IF;

    IF p_depot_id IS NOT NULL THEN
        SELECT * INTO v_depot FROM public.campaign_depots WHERE id = p_depot_id AND campaign_id = p_campaign_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Le depot selectionne n''appartient pas a cette campagne'; END IF;
        IF v_final_destination_id IS NOT NULL AND v_depot.campaign_destination_id <> v_final_destination_id THEN
            RAISE EXCEPTION 'Le depot selectionne ne correspond pas a la destination de votre region';
        END IF;
        v_final_depot_id := v_depot.id;
        v_depot_name := v_depot.name || ' (' || v_depot.commune || CASE WHEN v_depot.quartier IS NOT NULL THEN ' - ' || v_depot.quartier ELSE '' END || ')';
        IF v_final_address IS NULL OR v_final_address = '' THEN
            v_final_address := v_depot.address || CASE WHEN v_depot.complement IS NOT NULL THEN ' (' || v_depot.complement || ')' ELSE '' END;
        END IF;
    END IF;

    -- Stock de la campagne (inchangé : BR-STK-01)
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_qty
    FROM public.stock_reservations WHERE campaign_id = p_campaign_id AND status = 'active';
    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;
    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant (Disponible : %, Demande : %)', v_available_qty, p_quantity;
    END IF;

    -- NOUVEAU : stock physique de la production (verrou partagé avec les propositions)
    SELECT expected_quantity INTO v_production_expected
    FROM public.productions WHERE id = v_campaign.production_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Production source introuvable'; END IF;
    v_production_available := v_production_expected - public.get_production_reserved_quantity(v_campaign.production_id);
    IF p_quantity > v_production_available THEN
        RAISE EXCEPTION 'Stock disponible insuffisant sur la production (Disponible : %, Demande : %)', v_production_available, p_quantity;
    END IF;

    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
    SELECT name INTO v_product_name FROM public.products WHERE id = v_campaign.product_id;
    SELECT created_by INTO v_notif_user_id FROM public.companies WHERE id = v_campaign.company_id LIMIT 1;

    INSERT INTO public.orders(order_number, reseller_id, company_id, campaign_id, total_amount, currency,
        delivery_province_id, delivery_city, delivery_address, notes, destination_id, depot_id,
        expected_arrival_date_snapshot, destination_city_snapshot, depot_name_snapshot, status)
    VALUES (v_order_number, p_reseller_id, v_campaign.company_id, p_campaign_id, v_total_amount, v_campaign.currency,
        v_reseller_province_id, v_final_city, v_final_address, TRIM(p_notes), v_final_destination_id, v_final_depot_id,
        v_arrival_date, v_final_city, v_depot_name, 'pending')
    RETURNING id INTO v_new_order_id;

    INSERT INTO public.order_items(order_id, product_id, quantity, unit, unit_price, subtotal, product_name_snapshot)
    VALUES (v_new_order_id, v_campaign.product_id, p_quantity, v_campaign.unit, v_campaign.unit_price, v_total_amount, v_product_name);

    INSERT INTO public.stock_reservations(campaign_id, order_id, production_id, quantity, status)
    VALUES (p_campaign_id, v_new_order_id, v_campaign.production_id, p_quantity, 'active');

    IF v_notif_user_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, message, related_entity_type, related_entity_id, action_url)
        VALUES (v_notif_user_id, 'COMMANDE_CREEE', 'Nouvelle commande recue !',
            'Un revendeur a passe commande de ' || p_quantity || ' ' || v_campaign.unit || ' sur votre offre ' || v_campaign.title || '.'
                || CASE WHEN v_final_city IS NOT NULL THEN ' Destination : ' || v_final_city ELSE '' END,
            'order', v_new_order_id, '/dashboard/company/orders/' || v_new_order_id);
    END IF;

    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'ORDER_CREATED_WITH_RESERVATION', 'order', v_new_order_id,
        jsonb_build_object('campaign_id', p_campaign_id, 'reseller_id', p_reseller_id, 'quantity', p_quantity,
            'unit_price', v_campaign.unit_price, 'total_amount', v_total_amount,
            'destination_id', v_final_destination_id, 'depot_id', v_final_depot_id,
            'reseller_province_id', v_reseller_province_id, 'delivery_city', v_final_city,
            'destination_deadline_checked', v_destination.order_deadline_date::text));

    RETURN QUERY SELECT v_new_order_id, v_order_number, v_total_amount, p_quantity;
END;
$function$;


-- ============================================================================
-- 3. create_order_from_demand_response (SEC-02, SEC-04, SEC-08, FUN-02)
--    Changements :
--      - appelant anonyme refusé ; bénéficiaire = appelant (sauf admin), rôle reseller
--      - prix unitaire obligatoire et > 0 (plus de repli silencieux à 1)
--      - la production doit appartenir à l'entreprise qui a fait la proposition
--      - contrôle réel du stock restant de la production
--    Le prix provient exclusivement de demand_responses, désormais non modifiable
--    par le revendeur (section 7).
-- ============================================================================
-- Nouveau paramètre p_expected_unit_price (prix affiché au revendeur) : la signature
-- change, l'ancienne version est donc retirée (aucune donnée concernée).
DROP FUNCTION IF EXISTS public.create_order_from_demand_response(uuid, uuid, numeric, uuid, character varying, text, text);

CREATE OR REPLACE FUNCTION public.create_order_from_demand_response(
    p_reseller_id uuid,
    p_demand_response_id uuid,
    p_quantity numeric,
    p_delivery_province_id uuid,
    p_delivery_city character varying DEFAULT NULL::character varying,
    p_delivery_address text DEFAULT NULL::text,
    p_notes text DEFAULT NULL::text,
    p_expected_unit_price numeric DEFAULT NULL::numeric
)
RETURNS TABLE(order_id uuid, order_number character varying, total_amount numeric, reserved_quantity numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_response RECORD;
    v_demand RECORD;
    v_production RECORD;
    v_new_order_id UUID;
    v_order_number VARCHAR;
    v_total_amount NUMERIC(14,2);
    v_company_owner_id UUID;
    v_production_available NUMERIC(12,2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour passer commande.';
    END IF;
    IF auth.uid() <> p_reseller_id AND COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Accès refusé : vous ne pouvez pas commander pour un autre revendeur.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reseller_id AND role = 'reseller') THEN
        RAISE EXCEPTION 'Seuls les revendeurs enregistrés peuvent passer commande.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantité commandée doit être strictement supérieure à zéro.';
    END IF;

    SELECT * INTO v_response
    FROM public.demand_responses
    WHERE id = p_demand_response_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposition commerciale introuvable (ID: %).', p_demand_response_id;
    END IF;

    IF v_response.status NOT IN ('proposed', 'accepted') THEN
        RAISE EXCEPTION 'Cette proposition n''est plus disponible pour commande (Statut : %).', v_response.status;
    END IF;

    IF v_response.unit_price IS NULL OR v_response.unit_price <= 0 THEN
        RAISE EXCEPTION 'Cette proposition ne comporte pas de prix unitaire valide.';
    END IF;

    -- Le revendeur commande au prix qu'il a vu : si la société a modifié sa
    -- proposition entre-temps, la commande est refusée.
    IF p_expected_unit_price IS NOT NULL AND p_expected_unit_price <> v_response.unit_price THEN
        RAISE EXCEPTION 'Le prix de cette proposition a été modifié par la société (% au lieu de %).',
            v_response.unit_price, p_expected_unit_price;
    END IF;

    SELECT * INTO v_demand
    FROM public.demands
    WHERE id = v_response.demand_id;

    IF NOT FOUND OR v_demand.reseller_id <> p_reseller_id THEN
        RAISE EXCEPTION 'Cette proposition ne correspond pas à votre demande initiale.';
    END IF;

    SELECT * INTO v_production
    FROM public.productions
    WHERE id = v_response.production_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La production proposée par la société est introuvable.';
    END IF;

    IF v_production.company_id <> v_response.company_id THEN
        RAISE EXCEPTION 'La production proposée n''appartient pas à la société émettrice.';
    END IF;

    IF p_quantity > v_response.proposed_quantity THEN
        RAISE EXCEPTION 'La quantité demandée (%) excède la quantité proposée par la société (%).',
            p_quantity, v_response.proposed_quantity;
    END IF;

    v_production_available := v_production.expected_quantity - public.get_production_reserved_quantity(v_production.id);
    IF p_quantity > v_production_available THEN
        RAISE EXCEPTION 'Stock disponible insuffisant sur la production (Disponible : %, Demande : %)',
            v_production_available, p_quantity;
    END IF;

    v_total_amount := ROUND(p_quantity * v_response.unit_price, 2)::NUMERIC(14,2);

    v_order_number := 'CMD-DEM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    INSERT INTO public.orders (
        order_number, reseller_id, company_id, campaign_id, origin_type, demand_response_id,
        production_id, total_amount, currency, delivery_province_id, delivery_city,
        delivery_address, status, notes
    ) VALUES (
        v_order_number, p_reseller_id, v_response.company_id, NULL, 'demand_response', v_response.id,
        v_production.id, v_total_amount, COALESCE(v_response.currency, 'USD'), p_delivery_province_id, p_delivery_city,
        p_delivery_address, 'pending', p_notes
    ) RETURNING id INTO v_new_order_id;

    INSERT INTO public.order_items (order_id, product_id, quantity, unit, unit_price, subtotal)
    VALUES (v_new_order_id, v_production.product_id, p_quantity,
            COALESCE(v_response.unit, v_production.unit), v_response.unit_price, v_total_amount);

    INSERT INTO public.stock_reservations (campaign_id, production_id, order_id, quantity, status)
    VALUES (NULL, v_production.id, v_new_order_id, p_quantity, 'active');

    UPDATE public.demand_responses
    SET status = 'ordered', updated_at = NOW()
    WHERE id = v_response.id;

    UPDATE public.demands
    SET status = 'converted', updated_at = NOW()
    WHERE id = v_demand.id;

    SELECT created_by INTO v_company_owner_id
    FROM public.companies
    WHERE id = v_response.company_id;

    IF v_company_owner_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
        VALUES (
            v_company_owner_id,
            'COMMANDE_CREEE',
            'Nouvelle commande suite à votre proposition',
            'Le revendeur a validé une commande de ' || p_quantity || ' ' || COALESCE(v_response.unit, 'tonne') || ' sur votre production.',
            'order',
            v_new_order_id,
            '/dashboard/company/orders/' || v_new_order_id
        );
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        'ORDER_CREATED_FROM_DEMAND_RESPONSE',
        'order',
        v_new_order_id,
        jsonb_build_object(
            'demand_response_id', v_response.id,
            'reseller_id', p_reseller_id,
            'production_id', v_production.id,
            'quantity', p_quantity,
            'unit_price', v_response.unit_price,
            'total_amount', v_total_amount
        )
    );

    RETURN QUERY SELECT v_new_order_id, v_order_number, v_total_amount, p_quantity::NUMERIC(12,2);
END;
$function$;


-- ============================================================================
-- 4. DESTINATIONS DE CAMPAGNE (SEC-02)
--    La version à 2 arguments n'est plus appelée par l'application
--    (campaigns.ts appelle la version à 3 arguments) : elle est retirée.
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_destination_arrival_date(uuid, date);

CREATE OR REPLACE FUNCTION public.update_destination_arrival_date(
    p_destination_id uuid,
    p_new_arrival_date date,
    p_new_order_deadline date DEFAULT NULL::date
)
RETURNS TABLE(success boolean, notified_resellers_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_dest RECORD; v_campaign RECORD; v_product_name VARCHAR(255); v_old_date DATE; v_order RECORD; v_count INT := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_dest FROM public.campaign_destinations WHERE id = p_destination_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination introuvable'; END IF;

    SELECT c.*, p.name AS product_name INTO v_campaign
    FROM public.campaigns c JOIN public.products p ON p.id = c.product_id
    WHERE c.id = v_dest.campaign_id;

    IF NOT (public.is_company_member_or_creator(v_campaign.company_id) OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Action non autorisee';
    END IF;

    v_old_date := v_dest.expected_arrival_date;
    v_product_name := v_campaign.product_name;

    UPDATE public.campaign_destinations
    SET previous_arrival_date = v_old_date,
        expected_arrival_date = p_new_arrival_date,
        order_deadline_date = COALESCE(p_new_order_deadline, order_deadline_date),
        updated_at = NOW()
    WHERE id = p_destination_id;

    UPDATE public.orders
    SET expected_arrival_date_snapshot = p_new_arrival_date, updated_at = NOW()
    WHERE destination_id = p_destination_id AND status IN ('pending', 'confirmed', 'preparing', 'ready');

    FOR v_order IN
        SELECT DISTINCT o.id AS order_id, o.order_number, o.reseller_id
        FROM public.orders o
        WHERE o.destination_id = p_destination_id AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
    LOOP
        INSERT INTO public.notifications(user_id, type, title, message, related_entity_type, related_entity_id, action_url)
        VALUES (v_order.reseller_id, 'DATE_ARRIVEE_MODIFIEE',
            'Arrivee de ' || v_product_name || ' a ' || v_dest.city_name || ' modifiee',
            'La date prevue d''arrivee de votre commande ' || v_order.order_number || ' a ' || v_dest.city_name
                || ' a ete reportee du ' || TO_CHAR(v_old_date, 'DD/MM/YYYY') || ' au ' || TO_CHAR(p_new_arrival_date, 'DD/MM/YYYY') || '.',
            'order', v_order.order_id, '/dashboard/reseller/orders/' || v_order.order_id);
        v_count := v_count + 1;
    END LOOP;

    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'DESTINATION_ARRIVAL_DATE_UPDATED', 'campaign_destination', p_destination_id,
        jsonb_build_object('campaign_id', v_dest.campaign_id, 'city_name', v_dest.city_name,
            'old_date', v_old_date, 'new_date', p_new_arrival_date,
            'new_order_deadline', p_new_order_deadline, 'notified_orders', v_count));

    RETURN QUERY SELECT TRUE, v_count,
        'Date d''arrivee pour ' || v_dest.city_name || ' modifiee avec succes (' || v_count || ' revendeur(s) notifie(s)).';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_destination_order_deadline(
    p_destination_id uuid,
    p_new_deadline_date date
)
RETURNS TABLE(success boolean, notified_resellers_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_dest RECORD; v_campaign RECORD; v_old_deadline DATE; v_order RECORD; v_count INT := 0; v_is_closing BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_dest FROM public.campaign_destinations WHERE id = p_destination_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination introuvable'; END IF;

    SELECT c.*, p.name AS product_name INTO v_campaign
    FROM public.campaigns c JOIN public.products p ON p.id = c.product_id
    WHERE c.id = v_dest.campaign_id;

    IF NOT (public.is_company_member_or_creator(v_campaign.company_id) OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Action non autorisee';
    END IF;

    v_old_deadline := v_dest.order_deadline_date;
    v_is_closing := (p_new_deadline_date IS NOT NULL AND p_new_deadline_date < CURRENT_DATE);

    UPDATE public.campaign_destinations
    SET order_deadline_date = p_new_deadline_date, updated_at = NOW()
    WHERE id = p_destination_id;

    IF v_is_closing THEN
        FOR v_order IN
            SELECT DISTINCT o.id AS order_id, o.order_number, o.reseller_id
            FROM public.orders o
            WHERE o.destination_id = p_destination_id AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
        LOOP
            INSERT INTO public.notifications(user_id, type, title, message, related_entity_type, related_entity_id, action_url)
            VALUES (v_order.reseller_id, 'DESTINATION_FERMEE',
                'Offre commerciale fermee a ' || v_dest.city_name,
                'Les commandes pour la destination ' || v_dest.city_name || ' sur l''offre ' || v_campaign.title
                    || ' sont desormais cloturees. Votre commande ' || v_order.order_number || ' reste valide.',
                'order', v_order.order_id, '/dashboard/reseller/orders/' || v_order.order_id);
            v_count := v_count + 1;
        END LOOP;
    END IF;

    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'DESTINATION_DEADLINE_UPDATED', 'campaign_destination', p_destination_id,
        jsonb_build_object('campaign_id', v_dest.campaign_id, 'city_name', v_dest.city_name,
            'old_deadline', v_old_deadline, 'new_deadline', p_new_deadline_date,
            'is_closing', v_is_closing, 'notified_orders', v_count));

    RETURN QUERY SELECT TRUE, v_count,
        CASE WHEN v_is_closing THEN 'Destination FERMEE. ' || v_count || ' revendeur(s) notifie(s).'
             ELSE 'Date limite mise a jour.' END;
END;
$function$;


-- ============================================================================
-- 5. lookup_order_for_delivery (SEC-02 — fuite confirmée : un appelant anonyme
--    obtenait les détails d'une commande, car current_user_role() vaut NULL)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lookup_order_for_delivery(p_identifier text)
RETURNS TABLE(order_id uuid, order_number character varying, qr_code_token character varying, status character varying,
    total_amount numeric, currency character varying, created_at timestamp with time zone,
    delivered_at timestamp with time zone, delivered_quantity numeric, delivery_notes text,
    delivery_province_name character varying, delivery_city character varying, delivery_address text,
    reseller_id uuid, reseller_business_name character varying, company_id uuid, company_name character varying,
    campaign_title character varying, production_title character varying, total_ordered_quantity numeric,
    unit character varying, items jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_clean_identifier TEXT;
    v_order_company_id UUID;
    v_order_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;

    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        RETURN;
    END IF;

    v_clean_identifier := TRIM(p_identifier);

    SELECT o.id, o.company_id
    INTO v_order_id, v_order_company_id
    FROM public.orders o
    WHERE o.order_number = v_clean_identifier
       OR o.qr_code_token = v_clean_identifier
       OR (v_clean_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND o.id = v_clean_identifier::UUID)
    LIMIT 1;

    IF v_order_id IS NULL THEN
        RETURN;
    END IF;

    -- Étanchéité multi-société : membre ou créateur de l'entreprise de la commande
    -- (corrige aussi la résolution « LIMIT 1 » fragile pour un utilisateur multi-entreprises)
    IF COALESCE(public.current_user_role(), '') <> 'admin'
       AND NOT public.is_company_member_or_creator(v_order_company_id) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        o.id AS order_id,
        o.order_number,
        o.qr_code_token,
        o.status,
        o.total_amount,
        o.currency,
        o.created_at,
        o.delivered_at,
        o.delivered_quantity,
        o.delivery_notes,
        p.name AS delivery_province_name,
        o.delivery_city,
        o.delivery_address,
        r.id AS reseller_id,
        r.business_name AS reseller_business_name,
        c.id AS company_id,
        COALESCE(c.name, o.company_name_snapshot) AS company_name,
        COALESCE(camp.title, o.campaign_title_snapshot) AS campaign_title,
        COALESCE(prod.title, o.production_title_snapshot) AS production_title,
        COALESCE(SUM(oi.quantity), 0)::NUMERIC(12,2) AS total_ordered_quantity,
        COALESCE(MAX(oi.unit), 'tonne')::VARCHAR AS unit,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'product_id', oi.product_id,
                    'product_name', COALESCE(pr.name, oi.product_name_snapshot, 'Produit'),
                    'quantity', oi.quantity,
                    'unit', oi.unit,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal
                )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::jsonb
        ) AS items
    FROM public.orders o
    JOIN public.companies c ON c.id = o.company_id
    JOIN public.resellers r ON r.id = o.reseller_id
    LEFT JOIN public.provinces p ON p.id = o.delivery_province_id
    LEFT JOIN public.campaigns camp ON camp.id = o.campaign_id
    LEFT JOIN public.productions prod ON prod.id = o.production_id OR prod.id = camp.production_id
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.products pr ON pr.id = oi.product_id
    WHERE o.id = v_order_id
    GROUP BY
        o.id, o.order_number, o.qr_code_token, o.status, o.total_amount, o.currency,
        o.created_at, o.delivered_at, o.delivered_quantity, o.delivery_notes,
        p.name, o.delivery_city, o.delivery_address,
        r.id, r.business_name, c.id, c.name, camp.title, prod.title,
        o.company_name_snapshot, o.campaign_title_snapshot, o.production_title_snapshot;
END;
$function$;


-- ============================================================================
-- 6. ANNULATION (SEC-20) — verrou, condition de statut, appelant authentifié.
--    Règles de statut inchangées (pending/confirmed — arbitrage A5 en attente).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_order_and_release_reservation(p_order_id uuid, p_reason text DEFAULT 'Annulation demandée'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_order RECORD;
    v_user_id UUID := auth.uid();
    v_updated INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour annuler une commande.';
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (%)', p_order_id;
    END IF;

    IF NOT (v_order.reseller_id = v_user_id
            OR public.is_company_member_or_creator(v_order.company_id)
            OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Accès refusé : vous n''avez pas les droits pour annuler cette commande';
    END IF;

    IF v_order.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'Impossible d''annuler une commande au statut actuel : %', v_order.status;
    END IF;

    UPDATE public.orders
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_order_id AND status IN ('pending', 'confirmed');
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
        RAISE EXCEPTION 'Impossible d''annuler une commande au statut actuel : %', v_order.status;
    END IF;

    UPDATE public.stock_reservations
    SET status = 'released', updated_at = NOW()
    WHERE order_id = p_order_id AND status = 'active';

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (v_user_id, 'ORDER_CANCELLED_RESERVATION_RELEASED', 'order', p_order_id,
        jsonb_build_object('reason', p_reason, 'previous_status', v_order.status));

    RETURN TRUE;
END;
$function$;


-- ============================================================================
-- 6 bis. CONFIRMATION DE LIVRAISON — rattachement à l'entreprise de la commande
--    (remplace la résolution « LIMIT 1 », fausse pour un utilisateur rattaché à
--    plusieurs entreprises). Statuts de départ autorisés INCHANGÉS : tout sauf
--    delivered/cancelled (le statut minimum requis relève de l'arbitrage A5).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.confirm_order_delivery(p_order_id uuid, p_notes text DEFAULT NULL::text)
RETURNS TABLE(order_id uuid, order_number character varying, status character varying,
              delivered_at timestamp with time zone, delivered_quantity numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_order RECORD;
    v_delivered_qty NUMERIC(12,2);
    v_now TIMESTAMPTZ := NOW();
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour confirmer une livraison.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders o
    WHERE o.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (ID: %).', p_order_id;
    END IF;

    IF COALESCE(public.current_user_role(), '') <> 'admin'
       AND NOT public.is_company_member_or_creator(v_order.company_id) THEN
        RAISE EXCEPTION 'Accès refusé : vous n''avez pas les droits pour livrer cette commande.';
    END IF;

    IF v_order.status = 'delivered' THEN
        RAISE EXCEPTION 'Cette commande a déjà été livrée le %.', TO_CHAR(v_order.delivered_at, 'DD/MM/YYYY à HH24:MI');
    END IF;

    IF v_order.status = 'cancelled' THEN
        RAISE EXCEPTION 'Impossible de livrer une commande annulée.';
    END IF;

    SELECT COALESCE(SUM(oi.quantity), 0) INTO v_delivered_qty
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id;

    IF v_delivered_qty <= 0 THEN
        v_delivered_qty := 1;
    END IF;

    UPDATE public.orders ord
    SET status = 'delivered',
        delivered_at = v_now,
        delivered_quantity = v_delivered_qty,
        delivered_by = v_actor_id,
        delivery_notes = COALESCE(p_notes, ord.delivery_notes),
        updated_at = v_now
    WHERE ord.id = p_order_id;

    UPDATE public.stock_reservations sr
    SET status = 'confirmed', updated_at = v_now
    WHERE sr.order_id = p_order_id;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (v_actor_id, 'ORDER_DELIVERED', 'order', p_order_id,
        jsonb_build_object('order_number', v_order.order_number, 'delivered_quantity', v_delivered_qty,
            'delivered_at', v_now, 'previous_status', v_order.status, 'notes', p_notes));

    INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
    VALUES (v_order.reseller_id, 'COMMANDE_LIVREE',
        'Commande livrée : ' || v_order.order_number,
        'Votre commande n° ' || v_order.order_number || ' a été confirmée comme livrée par le producteur.',
        'order', p_order_id, '/dashboard/reseller/orders/' || p_order_id);

    RETURN QUERY SELECT
        v_order.id,
        v_order.order_number,
        'delivered'::VARCHAR,
        v_now,
        v_delivered_qty;
END;
$function$;


-- ============================================================================
-- 7. CHANGEMENT DE STATUT DES COMMANDES (SEC-03 / FUN-01)
--    Remplace la mise à jour directe de la table par l'application.
--    Progression vers l'avant uniquement : pending → confirmed → preparing → ready
--    (sauts vers l'avant autorisés, retours en arrière refusés).
--    'delivered' : uniquement via confirm_order_delivery ; 'cancelled' : uniquement
--    via cancel_order_and_release_reservation. Réservé à l'entreprise vendeuse.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status character varying)
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_order RECORD;
    v_old_rank INT;
    v_new_rank INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    IF p_new_status IS NULL THEN
        RAISE EXCEPTION 'Statut cible manquant.';
    END IF;

    IF p_new_status = 'delivered' THEN
        RAISE EXCEPTION 'La livraison doit être confirmée via la procédure officielle (QR code ou numéro de commande).';
    END IF;
    IF p_new_status = 'cancelled' THEN
        RAISE EXCEPTION 'L''annulation doit passer par la procédure d''annulation dédiée.';
    END IF;
    IF p_new_status NOT IN ('confirmed', 'preparing', 'ready') THEN
        RAISE EXCEPTION 'Statut cible invalide : %', p_new_status;
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable.';
    END IF;

    IF NOT (public.is_company_member_or_creator(v_order.company_id)
            OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Accès refusé : seule l''entreprise vendeuse peut faire évoluer cette commande.';
    END IF;

    v_old_rank := CASE v_order.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1
                                      WHEN 'preparing' THEN 2 WHEN 'ready' THEN 3 ELSE NULL END;
    v_new_rank := CASE p_new_status WHEN 'confirmed' THEN 1 WHEN 'preparing' THEN 2 WHEN 'ready' THEN 3 END;

    IF v_old_rank IS NULL THEN
        RAISE EXCEPTION 'Cette commande est clôturée (statut : %) et ne peut plus changer de statut.', v_order.status;
    END IF;
    IF v_new_rank <= v_old_rank THEN
        RAISE EXCEPTION 'Transition non autorisée : % → % (retour en arrière interdit).', v_order.status, p_new_status;
    END IF;

    UPDATE public.orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'ORDER_STATUS_UPDATED', 'order', p_order_id,
        jsonb_build_object('previous_status', v_order.status, 'new_status', p_new_status));

    RETURN p_new_status;
END;
$function$;


-- ============================================================================
-- 8. NOTIFICATIONS (SEC-06)
--    - Plus aucune insertion directe par les clients.
--    - Les fonctions notify_* vérifient l'appelant et sont idempotentes.
--    - Nouvelle fonction pour notifier le revendeur d'une proposition : le texte
--      est construit côté serveur à partir des données en base.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_company_on_demand_received(p_demand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_demand RECORD;
    v_product RECORD;
    v_production RECORD;
    v_province RECORD;
    v_target_company_id UUID;
    v_recipient_id UUID;
    v_title VARCHAR(255);
    v_message TEXT;
    v_action_url VARCHAR(255);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_demand FROM public.demands WHERE id = p_demand_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Seul l'auteur de la demande (ou un admin) peut déclencher l'envoi
    IF v_demand.reseller_id <> auth.uid() AND COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Action non autorisée.';
    END IF;

    -- Idempotence : une demande ne notifie qu'une fois
    IF EXISTS (SELECT 1 FROM public.notifications n
               WHERE n.related_entity_type = 'demand' AND n.related_entity_id = p_demand_id
                 AND n.type IN ('DEMANDE_PRODUCTION_RECUE', 'DEMANDE_GENERALE_RECUE')) THEN
        RETURN;
    END IF;

    IF v_demand.status <> 'active' THEN
        RETURN;
    END IF;

    SELECT name INTO v_product FROM public.products WHERE id = v_demand.product_id;
    SELECT name INTO v_province FROM public.provinces WHERE id = v_demand.province_id;

    v_action_url := '/dashboard/company/demands/' || v_demand.id::text;

    IF v_demand.demand_type = 'production' AND v_demand.production_id IS NOT NULL THEN
        SELECT title, company_id INTO v_production FROM public.productions WHERE id = v_demand.production_id;
        v_target_company_id := COALESCE(v_demand.target_company_id, v_production.company_id);

        v_title := 'Nouvelle demande sur votre récolte : ' || COALESCE(v_product.name, 'Produit');
        v_message := 'Un revendeur a exprimé un besoin de ' || v_demand.quantity || ' ' || v_demand.unit ||
                     ' sur la production « ' || COALESCE(v_production.title, '') || ' » (' || COALESCE(v_province.name, 'Région') || ').';

        FOR v_recipient_id IN
            SELECT c.created_by AS user_id FROM public.companies c WHERE c.id = v_target_company_id
            UNION
            SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_target_company_id
        LOOP
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
                VALUES (v_recipient_id, 'DEMANDE_PRODUCTION_RECUE', v_title, v_message, 'demand', v_demand.id, v_action_url);
            END IF;
        END LOOP;

    ELSIF v_demand.demand_type = 'general' THEN
        v_title := 'Nouvelle demande générale : ' || COALESCE(v_product.name, 'Produit');
        v_message := 'Un revendeur recherche ' || v_demand.quantity || ' ' || v_demand.unit ||
                     ' de ' || COALESCE(v_product.name, 'ce produit') || ' à ' || COALESCE(v_province.name, 'Région') || '.';

        FOR v_recipient_id IN
            SELECT DISTINCT c.created_by AS user_id
            FROM public.company_products cp
            JOIN public.companies c ON c.id = cp.company_id
            WHERE cp.product_id = v_demand.product_id AND cp.is_active = TRUE AND c.country_id = v_demand.country_id
            UNION
            SELECT DISTINCT cm.user_id
            FROM public.company_products cp
            JOIN public.companies c ON c.id = cp.company_id
            JOIN public.company_members cm ON cm.company_id = c.id
            WHERE cp.product_id = v_demand.product_id AND cp.is_active = TRUE AND c.country_id = v_demand.country_id
        LOOP
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
                VALUES (v_recipient_id, 'DEMANDE_GENERALE_RECUE', v_title, v_message, 'demand', v_demand.id, v_action_url);
            END IF;
        END LOOP;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_resellers_on_campaign_opened(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_campaign RECORD;
    v_demander RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT c.*, prod.title AS production_title, p.name AS product_name
    INTO v_campaign
    FROM public.campaigns c
    JOIN public.productions prod ON prod.id = c.production_id
    JOIN public.products p ON p.id = c.product_id
    WHERE c.id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Seule l'entreprise propriétaire (ou un admin) peut déclencher l'envoi
    IF NOT (public.is_company_member_or_creator(v_campaign.company_id)
            OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Action non autorisée.';
    END IF;

    IF v_campaign.status <> 'active' THEN
        RETURN;
    END IF;

    FOR v_demander IN
        SELECT DISTINCT d.reseller_id
        FROM public.demands d
        JOIN public.resellers r ON r.id = d.reseller_id
        WHERE d.production_id = v_campaign.production_id
          AND d.status = 'active'
          AND (
              EXISTS (SELECT 1 FROM public.campaign_destinations cd
                      WHERE cd.campaign_id = v_campaign.id AND cd.province_id = r.province_id)
              OR EXISTS (SELECT 1 FROM public.campaign_delivery_zones cdz
                         WHERE cdz.campaign_id = v_campaign.id AND cdz.province_id = r.province_id)
          )
          -- Idempotence : un revendeur n'est notifié qu'une fois par campagne
          AND NOT EXISTS (SELECT 1 FROM public.notifications n
                          WHERE n.user_id = d.reseller_id AND n.type = 'CAMPAGNE_OUVERTE'
                            AND n.related_entity_id = v_campaign.id)
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
        VALUES (
            v_demander.reseller_id,
            'CAMPAGNE_OUVERTE',
            'Campagne ouverte pour votre demande : ' || v_campaign.product_name,
            'Une offre commerciale correspondant à votre demande sur « ' || v_campaign.production_title || ' » est maintenant ouverte aux commandes dans votre région.',
            'campaign',
            v_campaign.id,
            '/dashboard/reseller/campaigns'
        );
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_reseller_of_demand_response(p_response_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_resp RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT dr.id, dr.company_id, dr.status, dr.proposed_quantity, dr.unit, dr.unit_price, dr.currency,
           d.reseller_id, c.name AS company_name, pr.name AS product_name
    INTO v_resp
    FROM public.demand_responses dr
    JOIN public.demands d ON d.id = dr.demand_id
    JOIN public.companies c ON c.id = dr.company_id
    LEFT JOIN public.products pr ON pr.id = d.product_id
    WHERE dr.id = p_response_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposition introuvable.';
    END IF;

    IF NOT (public.is_company_member_or_creator(v_resp.company_id)
            OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Action non autorisée.';
    END IF;

    IF v_resp.status <> 'proposed' THEN
        RETURN;
    END IF;

    -- Idempotence : une seule notification par version de la proposition
    IF EXISTS (SELECT 1 FROM public.notifications n
               JOIN public.demand_responses dr ON dr.id = n.related_entity_id
               WHERE n.type = 'DEMANDE_REPONSE' AND n.related_entity_id = p_response_id
                 AND n.created_at >= dr.updated_at) THEN
        RETURN;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
    VALUES (
        v_resp.reseller_id,
        'DEMANDE_REPONSE',
        'Nouvelle proposition de ' || COALESCE(v_resp.company_name, 'un producteur'),
        COALESCE(v_resp.company_name, 'Une société') || ' a répondu à votre demande pour '
            || v_resp.proposed_quantity || ' ' || COALESCE(v_resp.unit, '') || ' de ' || COALESCE(v_resp.product_name, 'Produit')
            || ' à ' || v_resp.unit_price || ' ' || COALESCE(v_resp.currency, '') || '/' || COALESCE(v_resp.unit, 'unité') || '.',
        'demand_response',
        v_resp.id,
        '/dashboard/reseller/demands'
    );
END;
$function$;

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS chk_notifications_action_url_internal;
ALTER TABLE public.notifications
    ADD CONSTRAINT chk_notifications_action_url_internal
    CHECK (action_url IS NULL OR (action_url LIKE '/%' AND action_url NOT LIKE '//%')) NOT VALID;


-- ============================================================================
-- 9. COMMANDES, LIGNES ET RÉSERVATIONS : plus d'écriture directe (SEC-03)
--    Toute écriture passe par les fonctions SECURITY DEFINER ci-dessus.
-- ============================================================================
DROP POLICY IF EXISTS orders_insert ON public.orders;
DROP POLICY IF EXISTS orders_update ON public.orders;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;

REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stock_reservations FROM anon, authenticated;


-- ============================================================================
-- 10. JOURNAL D'AUDIT (SEC-13) : écriture réservée aux fonctions serveur
-- ============================================================================
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;


-- ============================================================================
-- 11. PROPOSITIONS COMMERCIALES (SEC-04, SEC-19, FUN-12)
--     - Le revendeur ne peut plus modifier une proposition (prix, quantité, statut).
--     - L'entreprise ne peut créer/modifier que ses propres propositions, sur ses
--       propres productions, avec le statut 'proposed' ou 'refused'.
--     - Une proposition déjà convertie en commande est figée.
-- ============================================================================
DROP POLICY IF EXISTS demand_responses_update_policy ON public.demand_responses;
CREATE POLICY demand_responses_update_policy ON public.demand_responses
    FOR UPDATE
    USING (public.is_company_member_or_creator(company_id) OR COALESCE(public.current_user_role(), '') = 'admin')
    WITH CHECK (public.is_company_member_or_creator(company_id) OR COALESCE(public.current_user_role(), '') = 'admin');

-- Lecture : même logique, en incluant les créateurs d'entreprise sans ligne
-- company_members (nécessaire au retour de l'upsert de l'application).
DROP POLICY IF EXISTS demand_responses_select_policy ON public.demand_responses;
CREATE POLICY demand_responses_select_policy ON public.demand_responses
    FOR SELECT
    USING (
        public.is_company_member_or_creator(company_id)
        OR EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_responses.demand_id AND d.reseller_id = auth.uid())
        OR COALESCE(public.current_user_role(), '') = 'admin'
    );

DROP POLICY IF EXISTS demand_responses_insert_policy ON public.demand_responses;
CREATE POLICY demand_responses_insert_policy ON public.demand_responses
    FOR INSERT
    WITH CHECK (public.is_company_member_or_creator(company_id) OR COALESCE(public.current_user_role(), '') = 'admin');

REVOKE DELETE ON public.demand_responses FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.demand_responses FROM anon;

-- Lectures de contrôle hors RLS (appelées par le trigger ci-dessous)
CREATE OR REPLACE FUNCTION public.demand_response_target_is_valid(
    p_production_id uuid, p_company_id uuid, p_demand_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF p_production_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.productions p WHERE p.id = p_production_id AND p.company_id = p_company_id
    ) THEN
        RETURN 'La production proposée doit appartenir à votre exploitation.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.demands d WHERE d.id = p_demand_id AND d.status = 'active') THEN
        RETURN 'Cette demande n''est plus ouverte aux propositions.';
    END IF;
    -- Même produit que celui demandé (règle déjà appliquée par l'application)
    IF NOT EXISTS (
        SELECT 1 FROM public.demands d JOIN public.productions p ON p.id = p_production_id
        WHERE d.id = p_demand_id AND p.product_id = d.product_id
    ) THEN
        RETURN 'La production sélectionnée ne correspond pas au produit demandé.';
    END IF;
    -- Une demande ciblée (sur une production ou une société) n'accepte que la société visée
    IF NOT EXISTS (
        SELECT 1 FROM public.demands d
        WHERE d.id = p_demand_id
          AND (
                (d.target_company_id IS NULL AND d.production_id IS NULL)
             OR d.target_company_id = p_company_id
             OR EXISTS (SELECT 1 FROM public.productions dp
                        WHERE dp.id = d.production_id AND dp.company_id = p_company_id)
          )
    ) THEN
        RETURN 'Cette demande est adressée à une autre exploitation.';
    END IF;
    RETURN NULL;
END;
$function$;

-- SECURITY INVOKER volontaire : current_user vaut 'authenticated'/'anon' pour un
-- appel client direct, et le propriétaire de la fonction lorsqu'une fonction
-- serveur SECURITY DEFINER (ex. create_order_from_demand_response) écrit.
CREATE OR REPLACE FUNCTION public.guard_demand_response_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_is_client BOOLEAN := current_user IN ('anon', 'authenticated');
    v_error TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.demand_id IS DISTINCT FROM OLD.demand_id OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
            RAISE EXCEPTION 'La demande et la société d''une proposition ne peuvent pas être modifiées.';
        END IF;
        IF OLD.status = 'ordered' AND v_is_client THEN
            RAISE EXCEPTION 'Cette proposition a déjà été convertie en commande et ne peut plus être modifiée.';
        END IF;
    END IF;

    IF v_is_client THEN
        -- Les clients ne peuvent poser que 'proposed' ou 'refused'
        -- ('accepted'/'ordered'/'cancelled' sont réservés aux fonctions serveur)
        IF NEW.status NOT IN ('proposed', 'refused') THEN
            RAISE EXCEPTION 'Statut de proposition non autorisé : %', NEW.status;
        END IF;

        IF NEW.status = 'proposed' THEN
            IF NEW.unit_price IS NULL OR NEW.unit_price <= 0 OR NEW.proposed_quantity IS NULL OR NEW.proposed_quantity <= 0 THEN
                RAISE EXCEPTION 'Quantité et prix unitaire doivent être strictement positifs.';
            END IF;

            v_error := public.demand_response_target_is_valid(NEW.production_id, NEW.company_id, NEW.demand_id);
            IF v_error IS NOT NULL THEN
                RAISE EXCEPTION '%', v_error;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_demand_response_write ON public.demand_responses;
CREATE TRIGGER trg_guard_demand_response_write
    BEFORE INSERT OR UPDATE ON public.demand_responses
    FOR EACH ROW EXECUTE FUNCTION public.guard_demand_response_write();


-- ============================================================================
-- 12. ENTREPRISES (SEC-07, SEC-11)
--     - Les membres ne peuvent modifier que les champs de profil.
--     - verification_status / created_by / is_active : admin uniquement, via RPC.
--     - Les visiteurs anonymes ne lisent plus téléphone, email et adresse.
-- ============================================================================
REVOKE UPDATE ON public.companies FROM anon, authenticated;
-- Création d'entreprise uniquement via complete_user_onboarding (SECURITY DEFINER) :
-- empêche d'insérer directement une entreprise déjà « verified ».
REVOKE INSERT ON public.companies FROM anon, authenticated;
GRANT UPDATE (name, description, logo_url, city, address, phone, email, updated_at)
    ON public.companies TO authenticated;

REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (id, name, slug, description, logo_url, country_id, province_id, city,
              verification_status, is_active, created_at, updated_at)
    ON public.companies TO anon;

CREATE OR REPLACE FUNCTION public.admin_set_company_verification(p_company_id uuid, p_status character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_old VARCHAR;
BEGIN
    IF auth.uid() IS NULL OR COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Action réservée aux administrateurs.';
    END IF;
    IF p_status NOT IN ('pending', 'verified', 'rejected') THEN
        RAISE EXCEPTION 'Statut de vérification invalide : %', p_status;
    END IF;

    SELECT verification_status INTO v_old FROM public.companies WHERE id = p_company_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entreprise introuvable.';
    END IF;

    UPDATE public.companies SET verification_status = p_status, updated_at = NOW() WHERE id = p_company_id;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'COMPANY_VERIFICATION_UPDATED', 'company', p_company_id,
        jsonb_build_object('previous_status', v_old, 'new_status', p_status));
END;
$function$;


-- ============================================================================
-- 13. REVENDEURS (SEC-18) : seule une ligne propre, avec le rôle 'reseller'.
--     (L'onboarding passe par complete_user_onboarding, SECURITY DEFINER.)
--     La modification de la province reste possible (arbitrage A7 en attente).
-- ============================================================================
DROP POLICY IF EXISTS resellers_insert_own ON public.resellers;
CREATE POLICY resellers_insert_own ON public.resellers
    FOR INSERT
    WITH CHECK (auth.uid() = id AND COALESCE(public.current_user_role(), '') = 'reseller');


-- ============================================================================
-- 14. CAMPAGNES : cohérence production / quantité (SEC-08 partiel, FUN-03 partiel)
--     - La production d'une campagne doit appartenir à la même entreprise.
--     - La quantité commercialisable ne peut pas descendre sous le volume
--       déjà réservé par des commandes en cours.
--     Le plafond cumulé Σ campagnes ≤ production dépend de l'arbitrage A3 :
--     NON implémenté ici.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_campaign_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_reserved NUMERIC(12,2);
    v_production RECORD;
BEGIN
    SELECT company_id, product_id, expected_quantity INTO v_production
    FROM public.productions WHERE id = NEW.production_id;

    IF NOT FOUND OR v_production.company_id <> NEW.company_id THEN
        RAISE EXCEPTION 'La production d''une campagne doit appartenir à la même exploitation.';
    END IF;

    -- BR-CMP-04 : le produit commercialisé est celui de la production source
    IF NEW.product_id <> v_production.product_id THEN
        RAISE EXCEPTION 'Le produit de la campagne doit être celui de la production source.';
    END IF;

    -- BR-CMP-03 (campagne prise isolément) : jamais plus que la quantité de la production.
    -- Le plafond cumulé sur plusieurs campagnes dépend de l'arbitrage A3.
    IF NEW.marketable_quantity > v_production.expected_quantity THEN
        RAISE EXCEPTION 'La quantité commercialisable (%) dépasse la quantité de la production (%).',
            NEW.marketable_quantity, v_production.expected_quantity;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.marketable_quantity < OLD.marketable_quantity THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
        FROM public.stock_reservations
        WHERE campaign_id = NEW.id AND status = 'active';
        IF NEW.marketable_quantity < v_reserved THEN
            RAISE EXCEPTION 'La quantité commercialisable (%) ne peut pas être inférieure au volume déjà réservé (%).',
                NEW.marketable_quantity, v_reserved;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_campaign_consistency ON public.campaigns;
CREATE TRIGGER trg_guard_campaign_consistency
    BEFORE INSERT OR UPDATE OF production_id, company_id, product_id, marketable_quantity ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_consistency();

-- La quantité d'une production ne peut pas descendre sous le volume déjà
-- réservé ou livré sur cette production (SEC-08).
CREATE OR REPLACE FUNCTION public.guard_production_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_reserved NUMERIC(12,2);
BEGIN
    IF NEW.expected_quantity < OLD.expected_quantity THEN
        v_reserved := public.get_production_reserved_quantity(NEW.id);
        IF NEW.expected_quantity < v_reserved THEN
            RAISE EXCEPTION 'La quantité de la production (%) ne peut pas être inférieure au volume déjà réservé ou livré (%).',
                NEW.expected_quantity, v_reserved;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_production_quantity ON public.productions;
CREATE TRIGGER trg_guard_production_quantity
    BEFORE UPDATE OF expected_quantity ON public.productions
    FOR EACH ROW EXECUTE FUNCTION public.guard_production_quantity();


-- ============================================================================
-- 15. DEVISES (SEC-21 / BR-FIN-05) — NOT VALID : les lignes existantes ne sont
--     pas vérifiées ; seules les nouvelles écritures le sont. Après contrôle des
--     données (requête V5 du rapport), exécuter :
--       ALTER TABLE ... VALIDATE CONSTRAINT ...;
-- ============================================================================
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS chk_campaigns_currency;
ALTER TABLE public.campaigns ADD CONSTRAINT chk_campaigns_currency CHECK (currency IN ('CDF', 'USD')) NOT VALID;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_currency;
ALTER TABLE public.orders ADD CONSTRAINT chk_orders_currency CHECK (currency IN ('CDF', 'USD')) NOT VALID;
ALTER TABLE public.demand_responses DROP CONSTRAINT IF EXISTS chk_demand_responses_currency;
ALTER TABLE public.demand_responses ADD CONSTRAINT chk_demand_responses_currency CHECK (currency IS NULL OR currency IN ('CDF', 'USD')) NOT VALID;


-- ============================================================================
-- 16. VUE DE MARCHÉ (SEC-12 partiel) : plus d'accès anonyme.
--     Le passage en security_invoker changerait les agrégats visibles par les
--     entreprises (décloisonnement BR-MKT-01) : non fait sans validation.
-- ============================================================================
REVOKE SELECT ON public.v_market_demands_aggregated FROM anon;


-- ============================================================================
-- 17. TABLE DE SAUVEGARDE (SEC-14) : aucune suppression ; accès API retiré.
-- ============================================================================
DO $$
BEGIN
    IF to_regclass('public._backup_profiles_pre_auth4') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON public._backup_profiles_pre_auth4 FROM anon, authenticated';
    END IF;
END $$;


-- ============================================================================
-- 18. STOCKAGE public-assets (SEC-15)
--     - SVG retiré des types autorisés (les fichiers existants ne sont pas touchés).
--     - Dépôt limité aux dossiers utilisés par l'application ; 'catalog/' réservé
--       aux administrateurs.
-- ============================================================================
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'public-assets';

-- Le renommage (UPDATE) doit respecter les mêmes dossiers que le dépôt, sinon un
-- fichier pourrait être déplacé vers catalog/.
DROP POLICY IF EXISTS public_assets_update_owner ON storage.objects;
CREATE POLICY public_assets_update_owner ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'public-assets' AND ((auth.uid() = owner) OR (COALESCE(public.current_user_role(), '') = 'admin')))
    WITH CHECK (
        bucket_id = 'public-assets'
        AND ((auth.uid() = owner) OR (COALESCE(public.current_user_role(), '') = 'admin'))
        AND (
            (storage.foldername(name))[1] IN ('logos', 'productions', 'company-products')
            OR ((storage.foldername(name))[1] = 'catalog' AND COALESCE(public.current_user_role(), '') = 'admin')
        )
    );

DROP POLICY IF EXISTS public_assets_insert_auth ON storage.objects;
CREATE POLICY public_assets_insert_auth ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'public-assets'
        AND auth.role() = 'authenticated'
        AND (
            (storage.foldername(name))[1] IN ('logos', 'productions', 'company-products')
            OR ((storage.foldername(name))[1] = 'catalog' AND COALESCE(public.current_user_role(), '') = 'admin')
        )
    );


-- ============================================================================
-- 19. PRIVILÈGES D'EXÉCUTION (SEC-02, SEC-28)
--     - RPC applicatives : authenticated uniquement (plus PUBLIC ni anon).
--     - Fonctions de trigger : non appelables via l'API.
--     - Clôture automatique des campagnes : service_role uniquement.
--     - Helpers RLS (current_user_role, is_company_member, ...) : conservés pour
--       anon car des politiques publiques les référencent (ex. campaigns_select).
-- ============================================================================
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
        'public.admin_set_company_verification(uuid, character varying)'
    ];
    v_triggers text[] := ARRAY[
        'public.check_global_product_image_protection()',
        'public.check_profile_creation_role()',
        'public.fn_populate_order_item_snapshots()',
        'public.fn_populate_order_snapshots()',
        'public.handle_new_company_created()',
        'public.handle_new_user_registration()',
        'public.prevent_profile_role_escalation()',
        'public.guard_demand_response_write()',
        'public.guard_campaign_consistency()',
        'public.guard_production_quantity()',
        -- Utilisé uniquement à l'intérieur des fonctions SECURITY DEFINER
        'public.get_production_reserved_quantity(uuid)'
    ];
BEGIN
    FOREACH v_sig IN ARRAY v_rpc LOOP
        IF to_regprocedure(v_sig) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_sig);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', v_sig);
        ELSE
            RAISE NOTICE 'Fonction absente (ignorée) : %', v_sig;
        END IF;
    END LOOP;

    FOREACH v_sig IN ARRAY v_triggers LOOP
        IF to_regprocedure(v_sig) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
        END IF;
    END LOOP;

    IF to_regprocedure('public.check_and_close_expired_campaigns()') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.check_and_close_expired_campaigns() FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.check_and_close_expired_campaigns() TO service_role;
    END IF;
END $$;

-- Helper ajouté par cette migration, utilisé dans des politiques : exécutable
-- par les rôles qui évaluent ces politiques.
GRANT EXECUTE ON FUNCTION public.is_company_member_or_creator(uuid) TO anon, authenticated, service_role;

-- Utilisé par le trigger SECURITY INVOKER des propositions : l'appelant client
-- (authenticated) doit pouvoir l'exécuter ; il ne révèle qu'un message d'erreur.
REVOKE ALL ON FUNCTION public.demand_response_target_is_valid(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demand_response_target_is_valid(uuid, uuid, uuid) TO authenticated, service_role;

-- Défense en profondeur : aucun droit d'écriture ni de TRUNCATE pour anon ;
-- pas de TRUNCATE / REFERENCES / TRIGGER pour authenticated.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Tables créées plus tard par le même rôle : pas d'écriture anonyme par défaut.
-- (Les fonctions futures restent exécutables par défaut : chaque nouvelle RPC doit
--  faire l'objet d'un REVOKE ... FROM PUBLIC, anon explicite, comme ci-dessus.)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;

-- ============================================================================
-- FIN DE LA MIGRATION 30
-- ============================================================================
