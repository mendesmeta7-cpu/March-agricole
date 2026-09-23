-- ====================================================================
-- MIGRATION 19 : ÉLIGIBILITÉ RÉGIONALE STRICTE DES COMMANDES REVENDEURS
-- ====================================================================
-- Date : 2026-09-23
-- Phase : 21 (Règle Métier Critique - Éligibilité Régionale des Commandes)
-- Description :
--   1. Suppression de l'ancienne surcharge de create_order_with_reservation (7 paramètres).
--   2. Récupération inviolable de la province du revendeur depuis public.resellers.
--   3. Contrôle serveur strict de l'éligibilité régionale dans create_order_with_reservation.
--   4. Verrouillage de la destination et du dépôt sur le territoire officiel du revendeur.
--   5. Rejet immédiat de toute tentative de commande hors territoire ou contournement.
--   6. Intégration de la règle régionale dans les notifications de campagne (Section 11).

-- 1. SUPPRESSION DE L'ANCIENNE SURCHARGE OBSOLÈTE (7 PARAMÈTRES)
DROP FUNCTION IF EXISTS public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text);

-- 2. PROCÉDURE RPC TRANSACTIONNELLE STRICTE : create_order_with_reservation
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

    -- 4. VÉRIFICATION DE LA PÉRIODE DE VALIDITÉ DE LA CAMPAGNE
    IF (v_campaign.start_date > CURRENT_DATE) OR (v_campaign.end_date IS NOT NULL AND v_campaign.end_date < CURRENT_DATE) THEN
        RAISE EXCEPTION 'La campagne n''est plus ou pas encore dans sa période de commercialisation active';
    END IF;

    -- 5. VÉRIFICATION DE LA QUANTITÉ MINIMALE
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'La quantité commandée (%) est inférieure au seuil minimum autorisé (%)', 
            p_quantity, v_campaign.min_order_quantity;
    END IF;

    -- 6. CONTRÔLE STRICT D'ÉLIGIBILITÉ RÉGIONALE DU REVENDEUR
    -- La province du revendeur doit obligatoirement être desservie par la campagne
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

    -- 7. VERROUILLAGE STRICT DE LA DESTINATION & DU DÉPÔT EN FONCTION DE LA RÉGION DU REVENDEUR
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
        -- Résolution automatique de la destination correspondant à la province du revendeur si elle existe
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

    -- 8. CALCUL ATOMIQUE DU STOCK RESTANT
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

    -- 10. GÉNÉRATION DU NUMÉRO DE COMMANDE UNIQUE (CMD-YYYYMMDD-XXXXXXXX)
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- 11. EXTRACTION DU NOM DU PRODUIT POUR LE SNAPSHOT IMMUABLE
    SELECT name INTO v_product_name FROM public.products WHERE id = v_campaign.product_id;

    -- 12. RÉCUPÉRATION DU COMPTE UTILISATEUR GÉRANT DE L'ENTREPRISE POUR LA NOTIFICATION
    SELECT created_by INTO v_notif_user_id FROM public.companies WHERE id = v_campaign.company_id LIMIT 1;

    -- 13. INSERTION DANS ORDERS AVEC LA PROVINCE DU REVENDEUR ET LES SNAPSHOTS COMPLETS
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

    -- 14. CRÉATION ATOMIQUE DE LA LIGNE DE COMMANDE (ORDER_ITEMS avec snapshot produit)
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

    -- 15. CRÉATION ATOMIQUE DE LA RÉSERVATION DE STOCK (STOCK_RESERVATIONS avec production_id)
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
            'delivery_city', v_final_city
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


-- 3. NOTIFICATION CIBLÉE STRICTEMENT ALIGNÉE SUR LE TERRITOIRE DU REVENDEUR (Section 11)
CREATE OR REPLACE FUNCTION public.notify_resellers_on_campaign_opened(
    p_campaign_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_campaign RECORD;
    v_demander RECORD;
BEGIN
    SELECT c.*, prod.title as production_title, p.name as product_name
    INTO v_campaign
    FROM public.campaigns c
    JOIN public.productions prod ON prod.id = c.production_id
    JOIN public.products p ON p.id = c.product_id
    WHERE c.id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Notification ciblée aux revendeurs ayant fait une demande sur cette production
    -- ET dont le territoire actuel correspond à une destination ou zone de livraison de la campagne
    FOR v_demander IN
        SELECT DISTINCT d.reseller_id
        FROM public.demands d
        JOIN public.resellers r ON r.id = d.reseller_id
        WHERE d.production_id = v_campaign.production_id
          AND d.status = 'active'
          AND (
              EXISTS (
                  SELECT 1 FROM public.campaign_destinations cd
                  WHERE cd.campaign_id = v_campaign.id AND cd.province_id = r.province_id
              )
              OR EXISTS (
                  SELECT 1 FROM public.campaign_delivery_zones cdz
                  WHERE cdz.campaign_id = v_campaign.id AND cdz.province_id = r.province_id
              )
          )
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
$$;
