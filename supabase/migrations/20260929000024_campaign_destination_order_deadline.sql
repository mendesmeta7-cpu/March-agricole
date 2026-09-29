-- ====================================================================
-- MIGRATION 24 : FERMETURE AUTOMATIQUE DES CAMPAGNES PAR DESTINATION
-- ====================================================================
-- Date : 2026-09-29
-- Phase : 28 (Fermeture Régionale des Campagnes)
-- Description :
--   1. Ajout de la colonne order_deadline_date sur campaign_destinations
--      (date limite de commande propre à chaque destination, indépendante
--       de la date d'arrivée et de la date de fin globale de la campagne).
--   2. Mise à jour de create_order_with_reservation pour vérifier :
--      a) La destination correspondant à la province du revendeur ;
--      b) Si order_deadline_date est définie et dépassée → rejet ciblé ;
--      c) Distinction DATE_EXPIRÉE vs STOCK_ÉPUISÉ dans le message.
--   3. Mise à jour de update_destination_arrival_date pour permettre
--      également la modification de order_deadline_date.
--   4. Ajout de la nouvelle fonction RPC :
--      update_destination_order_deadline pour modifier uniquement
--      la date limite de commande d'une destination.
--   5. Extension du type de notification avec DESTINATION_FERMEE.
--   6. Index sur order_deadline_date pour performances.
--
-- RÈGLE MÉTIER :
--   - order_deadline_date NULL = pas de limite de commande pour cette destination.
--   - Si order_deadline_date < CURRENT_DATE → destination fermée aux nouvelles commandes.
--   - La campagne GLOBALE reste active si d'autres destinations sont encore ouvertes.
--   - La fermeture d'une destination ne supprime JAMAIS les commandes existantes.
-- ====================================================================


-- 1. AJOUT DE LA COLONNE order_deadline_date SUR campaign_destinations
-- --------------------------------------------------------------------
-- Cette colonne représente la DATE LIMITE DE COMMANDE pour cette destination.
-- Elle est indépendante de expected_arrival_date (date d'arrivée physique)
-- et de campaigns.end_date (fin globale de la campagne).
-- NULL = pas de limite de commande définie pour cette destination.
ALTER TABLE public.campaign_destinations
    ADD COLUMN IF NOT EXISTS order_deadline_date DATE;

COMMENT ON COLUMN public.campaign_destinations.order_deadline_date IS
    'Date limite de commande pour cette destination (indépendante de la date d''arrivée et de la date de fin globale). NULL = aucune limite définie pour cette destination.';

-- Index partiel pour filtrer rapidement les destinations dont la date limite est dépassée
CREATE INDEX IF NOT EXISTS idx_campaign_destinations_order_deadline
    ON public.campaign_destinations(order_deadline_date)
    WHERE order_deadline_date IS NOT NULL;


-- 2. EXTENSION DES TYPES DE NOTIFICATIONS
-- --------------------------------------------------------------------
-- Ajout de DESTINATION_FERMEE pour notifier les revendeurs si une destination ferme
DO $$
BEGIN
    ALTER TABLE public.notifications
        DROP CONSTRAINT IF EXISTS notifications_type_check;

    ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_type_check
        CHECK (type IN (
            'DEMANDE_GENERALE_RECUE',
            'DEMANDE_PRODUCTION_RECUE',
            'DEMANDE_REPONSE',
            'DEMANDE_ACCEPTEE',
            'DEMANDE_REFUSEE',
            'CAMPAGNE_OUVERTE',
            'COMMANDE_CREEE',
            'COMMANDE_LIVREE',
            'DATE_ARRIVEE_MODIFIEE',
            'DESTINATION_FERMEE'
        ));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


-- 3. MISE À JOUR DE create_order_with_reservation
-- --------------------------------------------------------------------
-- Ajout de la vérification de order_deadline_date par destination
-- AVANT la vérification du stock, avec messages distincts par motif.
CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
    p_reseller_id UUID,
    p_campaign_id UUID,
    p_quantity NUMERIC,
    p_delivery_province_id UUID DEFAULT NULL,
    p_delivery_city VARCHAR DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_destination_id UUID DEFAULT NULL,
    p_depot_id UUID DEFAULT NULL
)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR,
    total_amount NUMERIC(14,2),
    reserved_quantity NUMERIC(12,2)
) AS $$
DECLARE
    v_campaign RECORD;
    v_destination RECORD;
    v_depot RECORD;
    v_reseller RECORD;
    v_product_name TEXT;
    v_reseller_province_id UUID;
    v_is_eligible BOOLEAN;
    v_reserved_qty NUMERIC(12,2);
    v_available_qty NUMERIC(12,2);
    v_new_order_id UUID;
    v_order_number VARCHAR;
    v_total_amount NUMERIC(14,2);
    v_final_city VARCHAR(100);
    v_final_address TEXT;
    v_arrival_date DATE;
    v_depot_name VARCHAR(255);
    v_final_destination_id UUID := NULL;
    v_final_depot_id UUID := NULL;
    v_notif_user_id UUID := NULL;
BEGIN
    -- 0. Vérification de sécurité : le revendeur doit être l'utilisateur connecté ou admin
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_reseller_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            RAISE EXCEPTION 'Accès refusé : vous ne pouvez pas commander pour un autre revendeur';
        END IF;
    END IF;

    -- 0.b. Quantité strictement positive
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantité commandée doit être strictement supérieure à zéro';
    END IF;

    -- 1. SOURCE DE VÉRITÉ : RÉCUPÉRATION DU PROFIL REVENDEUR ET DE SA PROVINCE AUTHENTIFIÉE
    SELECT * INTO v_reseller
    FROM public.resellers
    WHERE id = p_reseller_id;

    IF NOT FOUND OR v_reseller.province_id IS NULL THEN
        RAISE EXCEPTION 'Profil revendeur incomplet : province de rattachement introuvable';
    END IF;

    v_reseller_province_id := v_reseller.province_id;

    -- 2. VERROUILLAGE PESSIMISTE DE LA LIGNE DE CAMPAGNE (Protection Concurrence / Surbooking)
    SELECT * INTO v_campaign
    FROM public.campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campagne introuvable (%)', p_campaign_id;
    END IF;

    -- 3. VÉRIFICATION DU STATUT DE LA CAMPAGNE
    IF v_campaign.status <> 'active' THEN
        RAISE EXCEPTION 'La campagne n''est pas ouverte aux commandes (Statut actuel : %)', v_campaign.status;
    END IF;

    -- 4. VÉRIFICATION DE LA PÉRIODE DE VALIDITÉ GLOBALE DE LA CAMPAGNE
    IF (v_campaign.start_date > CURRENT_DATE) OR (v_campaign.end_date IS NOT NULL AND v_campaign.end_date < CURRENT_DATE) THEN
        RAISE EXCEPTION 'La campagne n''est plus ou pas encore dans sa période de commercialisation active';
    END IF;

    -- 5. VÉRIFICATION DE LA QUANTITÉ MINIMALE
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'La quantité commandée (%) est inférieure au seuil minimum autorisé (%)',
            p_quantity, v_campaign.min_order_quantity;
    END IF;

    -- 6. CONTRÔLE STRICT D'ÉLIGIBILITÉ RÉGIONALE DU REVENDEUR
    SELECT EXISTS (
        SELECT 1 FROM public.campaign_destinations
        WHERE campaign_id = p_campaign_id
          AND province_id = v_reseller_province_id
    ) OR EXISTS (
        SELECT 1 FROM public.campaign_delivery_zones
        WHERE campaign_id = p_campaign_id
          AND province_id = v_reseller_province_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre région';
    END IF;

    -- 7. RÉSOLUTION DE LA DESTINATION ET DU DÉPÔT EN FONCTION DE LA RÉGION DU REVENDEUR
    v_final_city := TRIM(COALESCE(p_delivery_city, v_reseller.city));
    v_final_address := TRIM(COALESCE(p_delivery_address, v_reseller.delivery_address));

    IF p_destination_id IS NOT NULL THEN
        SELECT * INTO v_destination
        FROM public.campaign_destinations
        WHERE id = p_destination_id AND campaign_id = p_campaign_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'La destination spécifiée n''appartient pas à cette offre commerciale';
        END IF;

        -- RÈGLE CRITIQUE : La destination doit impérativement correspondre à la province du revendeur
        IF v_destination.province_id <> v_reseller_province_id THEN
            RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre région';
        END IF;

        v_final_destination_id := v_destination.id;
        v_arrival_date := v_destination.expected_arrival_date;
        v_final_city := v_destination.city_name;
    ELSE
        -- Résolution automatique de la destination correspondant à la province du revendeur
        SELECT * INTO v_destination
        FROM public.campaign_destinations
        WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id
        LIMIT 1;

        IF FOUND THEN
            v_final_destination_id := v_destination.id;
            v_arrival_date := v_destination.expected_arrival_date;
            v_final_city := v_destination.city_name;
        END IF;
    END IF;

    -- ====================================================================
    -- 7bis. VÉRIFICATION DE LA DATE LIMITE DE COMMANDE PAR DESTINATION
    -- NOUVELLE RÈGLE MÉTIER PHASE 28 :
    -- Si la destination possède une order_deadline_date et qu'elle est
    -- dépassée, la commande est refusée avec un motif clair.
    -- Ce contrôle est SÉPARÉ du stock pour des messages d'erreur distincts.
    -- ====================================================================
    IF v_final_destination_id IS NOT NULL AND v_destination.order_deadline_date IS NOT NULL THEN
        IF v_destination.order_deadline_date < CURRENT_DATE THEN
            RAISE EXCEPTION 'La période de commande pour la destination "%" est terminée depuis le %. Aucune nouvelle commande ne peut être acceptée pour cette région.',
                v_destination.city_name,
                TO_CHAR(v_destination.order_deadline_date, 'DD/MM/YYYY');
        END IF;
    END IF;

    IF p_depot_id IS NOT NULL THEN
        SELECT * INTO v_depot
        FROM public.campaign_depots
        WHERE id = p_depot_id AND campaign_id = p_campaign_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Le dépôt sélectionné n''appartient pas à cette campagne commerciale';
        END IF;

        IF v_final_destination_id IS NOT NULL AND v_depot.campaign_destination_id <> v_final_destination_id THEN
            RAISE EXCEPTION 'Le dépôt sélectionné ne correspond pas à la destination de votre région';
        END IF;

        v_final_depot_id := v_depot.id;
        v_depot_name := v_depot.name || ' (' || v_depot.commune || CASE WHEN v_depot.quartier IS NOT NULL THEN ' - ' || v_depot.quartier ELSE '' END || ')';
        IF v_final_address IS NULL OR v_final_address = '' THEN
            v_final_address := v_depot.address || CASE WHEN v_depot.complement IS NOT NULL THEN ' (' || v_depot.complement || ')' ELSE '' END;
        END IF;
    END IF;

    -- 8. CALCUL ATOMIQUE DU STOCK RESTANT (toujours global à la campagne)
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_qty
    FROM public.stock_reservations
    WHERE campaign_id = p_campaign_id AND status = 'active';

    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;

    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant pour cette campagne (Disponible : %, Demandé : %)',
            v_available_qty, p_quantity;
    END IF;

    -- 9. CALCUL DU MONTANT TOTAL
    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);

    -- 10. GÉNÉRATION DU NUMÉRO DE COMMANDE UNIQUE
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- 11. EXTRACTION DU NOM DU PRODUIT POUR LE SNAPSHOT IMMUABLE
    SELECT name INTO v_product_name FROM public.products WHERE id = v_campaign.product_id;

    -- 12. RÉCUPÉRATION DU COMPTE GÉRANT DE L'ENTREPRISE POUR LA NOTIFICATION
    SELECT created_by INTO v_notif_user_id FROM public.companies WHERE id = v_campaign.company_id LIMIT 1;

    -- 13. INSERTION DANS ORDERS AVEC SNAPSHOTS COMPLETS
    INSERT INTO public.orders (
        order_number,
        reseller_id,
        company_id,
        campaign_id,
        total_amount,
        currency,
        delivery_province_id,
        delivery_city,
        delivery_address,
        notes,
        destination_id,
        depot_id,
        expected_arrival_date_snapshot,
        destination_city_snapshot,
        depot_name_snapshot,
        status
    ) VALUES (
        v_order_number,
        p_reseller_id,
        v_campaign.company_id,
        p_campaign_id,
        v_total_amount,
        v_campaign.currency,
        v_reseller_province_id,
        v_final_city,
        v_final_address,
        TRIM(p_notes),
        v_final_destination_id,
        v_final_depot_id,
        v_arrival_date,
        v_final_city,
        v_depot_name,
        'pending'
    ) RETURNING id INTO v_new_order_id;

    -- 14. CRÉATION ATOMIQUE DE LA LIGNE DE COMMANDE (snapshot prix/produit)
    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal,
        product_name_snapshot
    ) VALUES (
        v_new_order_id,
        v_campaign.product_id,
        p_quantity,
        v_campaign.unit,
        v_campaign.unit_price,
        v_total_amount,
        v_product_name
    );

    -- 15. CRÉATION ATOMIQUE DE LA RÉSERVATION DE STOCK
    INSERT INTO public.stock_reservations (
        campaign_id,
        order_id,
        production_id,
        quantity,
        status
    ) VALUES (
        p_campaign_id,
        v_new_order_id,
        v_campaign.production_id,
        p_quantity,
        'active'
    );

    -- 16. NOTIFICATION INTERNE POUR L'ENTREPRISE AGRICOLE
    IF v_notif_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_entity_type,
            related_entity_id,
            action_url
        ) VALUES (
            v_notif_user_id,
            'COMMANDE_CREEE',
            'Nouvelle commande reçue !',
            'Un revendeur a passé commande de ' || p_quantity || ' ' || v_campaign.unit || ' sur votre offre « ' || v_campaign.title || ' ».' || CASE WHEN v_final_city IS NOT NULL THEN ' Destination : ' || v_final_city ELSE '' END,
            'order',
            v_new_order_id,
            '/dashboard/company/orders/' || v_new_order_id
        );
    END IF;

    -- 17. JOURNALISATION DANS AUDIT_LOGS
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_reseller_id,
        'ORDER_CREATED_WITH_RESERVATION',
        'order',
        v_new_order_id,
        jsonb_build_object(
            'campaign_id', p_campaign_id,
            'quantity', p_quantity,
            'unit_price', v_campaign.unit_price,
            'total_amount', v_total_amount,
            'destination_id', v_final_destination_id,
            'depot_id', v_final_depot_id,
            'reseller_province_id', v_reseller_province_id,
            'delivery_city', v_final_city,
            'destination_deadline_checked', v_destination.order_deadline_date::text
        )
    );

    -- 18. RETOUR DU RÉSULTAT TRANSACTIONNEL
    RETURN QUERY
    SELECT
        v_new_order_id AS order_id,
        v_order_number AS order_number,
        v_total_amount AS total_amount,
        p_quantity AS reserved_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. NOUVELLE PROCÉDURE RPC : update_destination_order_deadline
-- --------------------------------------------------------------------
-- Modifie la date limite de commande d'une destination.
-- Si la nouvelle date est dans le passé, la destination est immédiatement
-- fermée aux nouvelles commandes.
-- Notifie les revendeurs ayant des commandes actives sur cette destination.
CREATE OR REPLACE FUNCTION public.update_destination_order_deadline(
    p_destination_id UUID,
    p_new_deadline_date DATE
)
RETURNS TABLE (
    success BOOLEAN,
    notified_resellers_count INT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dest RECORD;
    v_campaign RECORD;
    v_old_deadline DATE;
    v_order RECORD;
    v_count INT := 0;
    v_is_closing BOOLEAN;
BEGIN
    -- 1. Récupération de la destination
    SELECT * INTO v_dest
    FROM public.campaign_destinations
    WHERE id = p_destination_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination introuvable (%)', p_destination_id;
    END IF;

    -- 2. Récupération de la campagne et vérification des droits
    SELECT c.*, p.name AS product_name
    INTO v_campaign
    FROM public.campaigns c
    JOIN public.products p ON p.id = c.product_id
    WHERE c.id = v_dest.campaign_id;

    IF auth.uid() IS NOT NULL THEN
        IF NOT (
            public.is_company_member(v_campaign.company_id)
            OR public.current_user_role() = 'admin'
        ) THEN
            RAISE EXCEPTION 'Action non autorisée sur cette campagne';
        END IF;
    END IF;

    v_old_deadline := v_dest.order_deadline_date;
    -- Détermine si la nouvelle date ferme effectivement la destination
    v_is_closing := (p_new_deadline_date IS NOT NULL AND p_new_deadline_date < CURRENT_DATE);

    -- 3. Mise à jour de la date limite de commande
    UPDATE public.campaign_destinations
    SET
        order_deadline_date = p_new_deadline_date,
        updated_at = NOW()
    WHERE id = p_destination_id;

    -- 4. Notification des revendeurs ayant des commandes actives sur cette destination
    -- (Uniquement si la destination se ferme à cause de la nouvelle date)
    IF v_is_closing THEN
        FOR v_order IN
            SELECT DISTINCT o.id AS order_id, o.order_number, o.reseller_id
            FROM public.orders o
            WHERE o.destination_id = p_destination_id
              AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
        LOOP
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                related_entity_type,
                related_entity_id,
                action_url
            ) VALUES (
                v_order.reseller_id,
                'DESTINATION_FERMEE',
                'Offre commerciale fermée à ' || v_dest.city_name,
                'Les commandes pour la destination « ' || v_dest.city_name || ' » sur l''offre « ' || v_campaign.title || ' » sont désormais clôturées. Votre commande ' || v_order.order_number || ' existante reste valide.',
                'order',
                v_order.order_id,
                '/dashboard/reseller/orders/' || v_order.order_id
            );
            v_count := v_count + 1;
        END LOOP;
    END IF;

    -- 5. Journalisation dans audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        auth.uid(),
        'DESTINATION_DEADLINE_UPDATED',
        'campaign_destination',
        p_destination_id,
        jsonb_build_object(
            'campaign_id', v_dest.campaign_id,
            'city_name', v_dest.city_name,
            'old_deadline', v_old_deadline,
            'new_deadline', p_new_deadline_date,
            'is_closing', v_is_closing,
            'notified_orders', v_count
        )
    );

    RETURN QUERY
    SELECT
        TRUE,
        v_count,
        CASE
            WHEN v_is_closing THEN
                'Date limite de commande pour ' || v_dest.city_name || ' définie au ' || TO_CHAR(p_new_deadline_date, 'DD/MM/YYYY') || '. Destination FERMÉE. ' || v_count || ' revendeur(s) notifié(s).'
            ELSE
                'Date limite de commande pour ' || v_dest.city_name || ' mise à jour (' || COALESCE(TO_CHAR(p_new_deadline_date, 'DD/MM/YYYY'), 'illimitée') || ').'
        END;
END;
$$;


-- 5. MISE À JOUR DE update_destination_arrival_date
-- --------------------------------------------------------------------
-- Extension pour accepter également la modification de order_deadline_date
-- dans un seul appel atomique (optionnel - backward compatible).
CREATE OR REPLACE FUNCTION public.update_destination_arrival_date(
    p_destination_id UUID,
    p_new_arrival_date DATE,
    p_new_order_deadline DATE DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    notified_resellers_count INT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dest RECORD;
    v_campaign RECORD;
    v_product_name VARCHAR(255);
    v_old_date DATE;
    v_order RECORD;
    v_count INT := 0;
BEGIN
    -- 1. Récupération de la destination
    SELECT * INTO v_dest
    FROM public.campaign_destinations
    WHERE id = p_destination_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination introuvable (%)', p_destination_id;
    END IF;

    -- 2. Récupération de la campagne et vérification des droits
    SELECT c.*, p.name AS product_name
    INTO v_campaign
    FROM public.campaigns c
    JOIN public.products p ON p.id = c.product_id
    WHERE c.id = v_dest.campaign_id;

    IF auth.uid() IS NOT NULL THEN
        IF NOT (
            public.is_company_member(v_campaign.company_id)
            OR public.current_user_role() = 'admin'
        ) THEN
            RAISE EXCEPTION 'Action non autorisée sur cette campagne';
        END IF;
    END IF;

    v_old_date := v_dest.expected_arrival_date;
    v_product_name := v_campaign.product_name;

    -- 3. Mise à jour de la destination
    UPDATE public.campaign_destinations
    SET
        previous_arrival_date = v_old_date,
        expected_arrival_date = p_new_arrival_date,
        order_deadline_date = COALESCE(p_new_order_deadline, order_deadline_date),
        updated_at = NOW()
    WHERE id = p_destination_id;

    -- 4. Mise à jour de la date d'arrivée snapshot sur les commandes actives liées
    UPDATE public.orders
    SET
        expected_arrival_date_snapshot = p_new_arrival_date,
        updated_at = NOW()
    WHERE destination_id = p_destination_id
      AND status IN ('pending', 'confirmed', 'preparing', 'ready');

    -- 5. Notification de chaque revendeur ayant commandé sur cette destination
    FOR v_order IN
        SELECT DISTINCT o.id AS order_id, o.order_number, o.reseller_id
        FROM public.orders o
        WHERE o.destination_id = p_destination_id
          AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_entity_type,
            related_entity_id,
            action_url
        ) VALUES (
            v_order.reseller_id,
            'DATE_ARRIVEE_MODIFIEE',
            'Arrivée de ' || v_product_name || ' à ' || v_dest.city_name || ' modifiée',
            'La date prévue d''arrivée de votre commande ' || v_order.order_number || ' à ' || v_dest.city_name ||
            ' a été reportée du ' || TO_CHAR(v_old_date, 'DD/MM/YYYY') || ' au ' || TO_CHAR(p_new_arrival_date, 'DD/MM/YYYY') || '.',
            'order',
            v_order.order_id,
            '/dashboard/reseller/orders/' || v_order.order_id
        );
        v_count := v_count + 1;
    END LOOP;

    -- 6. Journalisation dans audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        auth.uid(),
        'DESTINATION_ARRIVAL_DATE_UPDATED',
        'campaign_destination',
        p_destination_id,
        jsonb_build_object(
            'campaign_id', v_dest.campaign_id,
            'city_name', v_dest.city_name,
            'old_date', v_old_date,
            'new_date', p_new_arrival_date,
            'new_order_deadline', p_new_order_deadline,
            'notified_orders', v_count
        )
    );

    RETURN QUERY
    SELECT
        TRUE,
        v_count,
        'Date d''arrivée pour ' || v_dest.city_name || ' modifiée avec succès (' || v_count || ' revendeur(s) notifié(s)).';
END;
$$;


-- 6. VÉRIFICATION DE L'ÉTAT DES DESTINATIONS EXISTANTES
-- --------------------------------------------------------------------
-- Les destinations existantes auront order_deadline_date = NULL
-- (pas de limite définie = pas de fermeture automatique).
-- C'est le comportement attendu pour la compatibilité ascendante.
-- Aucune donnée existante n'est modifiée.
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.campaign_destinations WHERE order_deadline_date IS NULL;
    RAISE NOTICE 'Migration 24 : % destination(s) existante(s) sans date limite (order_deadline_date = NULL). Comportement inchangé.', v_count;
END $$;
