-- ============================================================================
-- MIGRATION 31 — RÈGLES MÉTIER VALIDÉES A3, A4, A5, A11, A12 (A13 déjà en 030)
-- Date : 2026-11-02
-- Référence : ADR-045 (docs/decisions-log.md), docs/business-rules.md
--
-- ⚠️  NON APPLIQUÉE. Prérequis : migrations 029 et 030. À valider sur
--     l'environnement de test avec supabase/tests/business_rules_031_test.sql.
--
-- Les fonctions create_order_with_reservation, create_order_from_demand_response,
-- confirm_order_delivery et cancel_order_and_release_reservation sont reprises
-- de la migration 030 à l'identique, à l'exception des lignes marquées A3/A5/A11
-- (générées par extraction contrôlée, aucune réécriture manuelle).
-- Idempotente, sans suppression de données ni de tables.
-- ============================================================================


-- ============================================================================
-- 1. CALCULS DE RÉFÉRENCE
-- ============================================================================

-- A11 — Quantité consommée d'une campagne : commandes en cours ('active')
-- ET commandes livrées ('confirmed'). Une livraison ne remet jamais du volume
-- en vente ; seule une annulation ('released') le libère.
CREATE OR REPLACE FUNCTION public.get_campaign_consumed_quantity(p_campaign_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(SUM(sr.quantity), 0)::numeric
    FROM public.stock_reservations sr
    WHERE sr.campaign_id = p_campaign_id
      AND sr.status IN ('active', 'confirmed');
$$;

-- A3 — Volume engagé sur une production :
--   * volume commercialisable TOTAL des campagnes ouvertes (brouillon, active,
--     suspendue), qu'il soit vendu ou non ;
--   * + quantités réservées ou livrées hors de ces campagnes (campagnes
--     terminées/annulées, commandes issues de propositions).
-- p_exclude_campaign_id : campagne à exclure entièrement (en cours de contrôle).
CREATE OR REPLACE FUNCTION public.get_production_committed_quantity(
    p_production_id uuid,
    p_exclude_campaign_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        COALESCE((
            SELECT SUM(c.marketable_quantity)
            FROM public.campaigns c
            WHERE c.production_id = p_production_id
              AND c.status IN ('draft', 'active', 'paused')
              AND c.id IS DISTINCT FROM p_exclude_campaign_id
        ), 0)
      + COALESCE((
            SELECT SUM(sr.quantity)
            FROM public.stock_reservations sr
            LEFT JOIN public.campaigns c ON c.id = sr.campaign_id
            WHERE sr.status IN ('active', 'confirmed')
              AND (sr.production_id = p_production_id OR c.production_id = p_production_id)
              AND (c.id IS NULL
                   OR (c.status NOT IN ('draft', 'active', 'paused')
                       AND c.id IS DISTINCT FROM p_exclude_campaign_id))
        ), 0);
$$;

-- A11 — Résumé de stock d'une campagne (même signature qu'auparavant)
CREATE OR REPLACE FUNCTION public.get_campaign_stock_summary(p_campaign_id uuid)
RETURNS TABLE(marketable_quantity numeric, reserved_quantity numeric, available_quantity numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_marketable NUMERIC(12,2);
    v_reserved NUMERIC(12,2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT c.marketable_quantity INTO v_marketable
    FROM public.campaigns c
    WHERE c.id = p_campaign_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campagne introuvable (%)', p_campaign_id;
    END IF;

    v_reserved := public.get_campaign_consumed_quantity(p_campaign_id);

    RETURN QUERY SELECT v_marketable, v_reserved, (v_marketable - v_reserved)::NUMERIC(12,2);
END;
$function$;


-- ============================================================================
-- 2. COMMANDES (A11, A3, A5) — fonctions de la migration 030 + lignes marquées
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

    -- Stock de la campagne (A11) : commandes en cours ET commandes livrées
    v_reserved_qty := public.get_campaign_consumed_quantity(p_campaign_id);
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

    -- A3 : volume engagé par les campagnes ouvertes + réservations hors de ces campagnes
    v_production_available := v_production.expected_quantity - public.get_production_committed_quantity(v_production.id, NULL);
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

    -- A5 : seule une commande « prête » peut être livrée
    IF v_order.status <> 'ready' THEN
        RAISE EXCEPTION 'Seule une commande prête peut être livrée (statut actuel : %).', v_order.status;
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

    -- A5 : le revendeur n'annule qu'une commande en attente ; l'entreprise
    --      vendeuse (et l'administrateur) peuvent annuler en attente ou confirmée.
    IF v_order.reseller_id = v_user_id
       AND NOT public.is_company_member_or_creator(v_order.company_id)
       AND COALESCE(public.current_user_role(), '') <> 'admin'
       AND v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Un revendeur ne peut annuler qu''une commande en attente de confirmation (statut actuel : %).', v_order.status;
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
-- 3. CAMPAGNES
-- ============================================================================

-- Cohérence (reprise de la migration 030) : production de la même entreprise,
-- même produit, campagne ≤ production ; réduction impossible sous le volume
-- consommé (A11 : réservations en cours ET livrées).
CREATE OR REPLACE FUNCTION public.guard_campaign_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_consumed NUMERIC(12,2);
    v_production RECORD;
BEGIN
    SELECT company_id, product_id, expected_quantity INTO v_production
    FROM public.productions WHERE id = NEW.production_id;

    IF NOT FOUND OR v_production.company_id <> NEW.company_id THEN
        RAISE EXCEPTION 'La production d''une campagne doit appartenir à la même exploitation.';
    END IF;

    IF NEW.product_id <> v_production.product_id THEN
        RAISE EXCEPTION 'Le produit de la campagne doit être celui de la production source.';
    END IF;

    IF NEW.marketable_quantity > v_production.expected_quantity THEN
        RAISE EXCEPTION 'La quantité commercialisable (%) dépasse la quantité de la production (%).',
            NEW.marketable_quantity, v_production.expected_quantity;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.marketable_quantity < OLD.marketable_quantity THEN
        v_consumed := public.get_campaign_consumed_quantity(NEW.id);
        IF NEW.marketable_quantity < v_consumed THEN
            RAISE EXCEPTION 'La quantité commercialisable (%) ne peut pas être inférieure au volume déjà réservé ou livré (%).',
                NEW.marketable_quantity, v_consumed;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- A12 (réouverture) + A3 (volume engagé cumulé)
CREATE OR REPLACE FUNCTION public.guard_campaign_business_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_open_statuses CONSTANT text[] := ARRAY['draft', 'active', 'paused'];
    v_expected NUMERIC(12,2);
    v_committed NUMERIC(12,2);
    v_check_volume BOOLEAN := FALSE;
BEGIN
    -- A12 — Une campagne annulée ne se rouvre jamais ; une campagne terminée ne se
    --       rouvre que si sa date de fin est prolongée jusqu'à aujourd'hui au moins.
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status = 'cancelled' THEN
            RAISE EXCEPTION 'Une campagne annulée ne peut pas être réactivée.';
        END IF;
        IF OLD.status = 'completed' AND NEW.status = ANY (v_open_statuses) THEN
            IF NEW.end_date IS NULL
               OR NEW.end_date < CURRENT_DATE
               OR (OLD.end_date IS NOT NULL AND NEW.end_date <= OLD.end_date) THEN
                RAISE EXCEPTION 'Une campagne terminée ne peut être rouverte qu''après prolongation de sa date de fin (nouvelle date postérieure à l''ancienne et au moins égale à aujourd''hui).';
            END IF;
        END IF;
    END IF;

    -- A3 — Le total engagé sur la production ne peut pas dépasser sa quantité.
    -- Contrôlé à la création, à la réouverture, au changement de production et à
    -- toute augmentation du volume (une réduction reste toujours possible).
    IF NEW.status = ANY (v_open_statuses) THEN
        IF TG_OP = 'INSERT' THEN
            v_check_volume := TRUE;
        ELSIF NEW.production_id IS DISTINCT FROM OLD.production_id
           OR NOT (OLD.status = ANY (v_open_statuses))
           OR NEW.marketable_quantity > OLD.marketable_quantity THEN
            v_check_volume := TRUE;
        END IF;
    END IF;

    IF v_check_volume THEN
        -- Verrou sur la production : sérialise les créations concurrentes et les
        -- commandes sur proposition (même ordre de verrouillage que les RPC).
        SELECT expected_quantity INTO v_expected
        FROM public.productions WHERE id = NEW.production_id FOR UPDATE;

        v_committed := public.get_production_committed_quantity(NEW.production_id, NEW.id);
        IF v_committed + NEW.marketable_quantity > v_expected THEN
            RAISE EXCEPTION 'Volume insuffisant sur la production : % déjà engagé(s) sur % ; disponible pour cette campagne : %.',
                v_committed, v_expected, GREATEST(v_expected - v_committed, 0);
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_campaign_business_rules ON public.campaigns;
CREATE TRIGGER trg_guard_campaign_business_rules
    BEFORE INSERT OR UPDATE OF status, production_id, marketable_quantity, end_date ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_business_rules();


-- ============================================================================
-- 4. PRODUCTIONS
-- ============================================================================

-- A3 — La quantité d'une production ne peut pas descendre sous le volume engagé
-- (remplace la version 030 qui ne comptait que les réservations).
CREATE OR REPLACE FUNCTION public.guard_production_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_committed NUMERIC(12,2);
BEGIN
    IF NEW.expected_quantity < OLD.expected_quantity THEN
        v_committed := public.get_production_committed_quantity(NEW.id, NULL);
        IF NEW.expected_quantity < v_committed THEN
            RAISE EXCEPTION 'La quantité de la production (%) ne peut pas être inférieure au volume déjà engagé en campagnes, réservé ou livré (%).',
                NEW.expected_quantity, v_committed;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- A4 — Une production récoltée ne change pas de statut tant qu'une campagne
-- active ou suspendue en dépend.
CREATE OR REPLACE FUNCTION public.guard_production_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF OLD.status = 'harvested'
       AND NEW.status IS DISTINCT FROM 'harvested'
       AND EXISTS (SELECT 1 FROM public.campaigns c
                   WHERE c.production_id = NEW.id AND c.status IN ('active', 'paused')) THEN
        RAISE EXCEPTION 'Impossible de modifier le statut d''une production récoltée tant qu''une campagne active ou suspendue y est rattachée. Terminez ou annulez d''abord la campagne.';
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_production_status ON public.productions;
CREATE TRIGGER trg_guard_production_status
    BEFORE UPDATE OF status ON public.productions
    FOR EACH ROW EXECUTE FUNCTION public.guard_production_status();


-- ============================================================================
-- 5. PRIVILÈGES
--    Les fonctions remplacées (CREATE OR REPLACE) conservent les droits posés
--    par la migration 030. Les nouveaux calculs sont internes : ils ne sont
--    appelés que par des fonctions SECURITY DEFINER et des triggers.
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_campaign_consumed_quantity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_production_committed_quantity(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_campaign_business_rules() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_production_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_consumed_quantity(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_production_committed_quantity(uuid, uuid) TO service_role;

-- ============================================================================
-- FIN DE LA MIGRATION 31
-- ============================================================================
