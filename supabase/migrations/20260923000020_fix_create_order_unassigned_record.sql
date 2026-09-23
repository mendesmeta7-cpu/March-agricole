-- ====================================================================
-- MIGRATION 20 : CORRECTION BUG "RECORD NOT ASSIGNED YET" +
--                ALIGNEMENT SCHÉMA RÉEL (order_items, stock_reservations, notifications)
-- ====================================================================
-- Date : 2026-09-23
-- Phase : 21 (Correctif de la migration 19)
-- Description :
--   Corrige plusieurs bugs dans create_order_with_reservation :
--   1. "record v_depot/v_destination is not assigned yet" → variables scalaires UUID
--   2. order_items n'a pas production_id → supprimé, ajout de product_name_snapshot
--   3. stock_reservations n'a pas expires_at → supprimé, a production_id
--   4. notifications.recipient_id → notifications.user_id (companies.created_by)
--      + champs obligatoires : related_entity_type, related_entity_id, action_url
-- Schéma vérifié directement sur la base de production le 2026-09-23.

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
    -- Variables scalaires sûres pour éviter "record not assigned yet"
    v_final_destination_id UUID := NULL;
    v_final_depot_id UUID := NULL;
    -- User destinataire de la notification (créateur de l'entreprise)
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

    -- 1. SOURCE DE VÉRITÉ : PROVINCE DU REVENDEUR (inviolable)
    SELECT * INTO v_reseller FROM public.resellers WHERE id = p_reseller_id;
    IF NOT FOUND OR v_reseller.province_id IS NULL THEN
        RAISE EXCEPTION 'Profil revendeur incomplet : province de rattachement introuvable';
    END IF;
    v_reseller_province_id := v_reseller.province_id;

    -- 2. VERROUILLAGE PESSIMISTE DE LA CAMPAGNE
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable (%)', p_campaign_id; END IF;

    -- 3. STATUT
    IF v_campaign.status <> 'active' THEN
        RAISE EXCEPTION 'La campagne n''est pas ouverte aux commandes (Statut actuel : %)', v_campaign.status;
    END IF;

    -- 4. PÉRIODE DE VALIDITÉ
    IF (v_campaign.start_date > CURRENT_DATE) OR (v_campaign.end_date IS NOT NULL AND v_campaign.end_date < CURRENT_DATE) THEN
        RAISE EXCEPTION 'La campagne n''est plus ou pas encore dans sa période de commercialisation active';
    END IF;

    -- 5. QUANTITÉ MINIMALE
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'La quantité commandée (%) est inférieure au seuil minimum autorisé (%)',
            p_quantity, v_campaign.min_order_quantity;
    END IF;

    -- 6. ÉLIGIBILITÉ RÉGIONALE STRICTE
    SELECT EXISTS (
        SELECT 1 FROM public.campaign_destinations
        WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id
    ) OR EXISTS (
        SELECT 1 FROM public.campaign_delivery_zones
        WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre région';
    END IF;

    -- 7. DESTINATION & DÉPÔT
    v_final_city := TRIM(COALESCE(p_delivery_city, v_reseller.city));
    v_final_address := TRIM(COALESCE(p_delivery_address, v_reseller.delivery_address));

    IF p_destination_id IS NOT NULL THEN
        SELECT * INTO v_destination
        FROM public.campaign_destinations
        WHERE id = p_destination_id AND campaign_id = p_campaign_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'La destination spécifiée n''appartient pas à cette offre commerciale';
        END IF;

        -- RÈGLE CRITIQUE : destination doit correspondre à la province du revendeur
        IF v_destination.province_id <> v_reseller_province_id THEN
            RAISE EXCEPTION 'Vous ne pouvez commander que pour la destination correspondant à votre région de rattachement';
        END IF;

        v_final_destination_id := v_destination.id;
        v_arrival_date := v_destination.expected_arrival_date;
        v_final_city := v_destination.city_name;
    ELSE
        -- Résolution automatique
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
        v_depot_name := v_depot.name || ' (' || v_depot.commune
            || CASE WHEN v_depot.quartier IS NOT NULL THEN ' - ' || v_depot.quartier ELSE '' END || ')';
        IF v_final_address IS NULL OR v_final_address = '' THEN
            v_final_address := v_depot.address
                || CASE WHEN v_depot.complement IS NOT NULL THEN ' (' || v_depot.complement || ')' ELSE '' END;
        END IF;
    END IF;

    -- 8. CALCUL STOCK RESTANT
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_qty
    FROM public.stock_reservations
    WHERE campaign_id = p_campaign_id AND status = 'active';

    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;

    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant pour cette campagne (Disponible : %, Demandé : %)',
            v_available_qty, p_quantity;
    END IF;

    -- 9. MONTANT TOTAL
    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);

    -- 10. NUMÉRO DE COMMANDE
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- Nom du produit pour snapshot
    SELECT name INTO v_product_name FROM public.products WHERE id = v_campaign.product_id;

    -- User destinataire de la notification (créateur de l'entreprise)
    SELECT created_by INTO v_notif_user_id FROM public.companies WHERE id = v_campaign.company_id LIMIT 1;

    -- 11. INSERTION COMMANDE
    INSERT INTO public.orders (
        order_number, reseller_id, company_id, campaign_id,
        total_amount, currency, delivery_province_id, delivery_city, delivery_address, notes,
        destination_id, depot_id, expected_arrival_date_snapshot, destination_city_snapshot,
        depot_name_snapshot, status
    ) VALUES (
        v_order_number, p_reseller_id, v_campaign.company_id, p_campaign_id,
        v_total_amount, v_campaign.currency, v_reseller_province_id, v_final_city, v_final_address, TRIM(p_notes),
        v_final_destination_id, v_final_depot_id, v_arrival_date, v_final_city,
        v_depot_name, 'pending'
    ) RETURNING id INTO v_new_order_id;

    -- 12. LIGNE DE COMMANDE
    INSERT INTO public.order_items (order_id, product_id, quantity, unit, unit_price, subtotal, product_name_snapshot)
    VALUES (v_new_order_id, v_campaign.product_id, p_quantity, v_campaign.unit, v_campaign.unit_price, v_total_amount, v_product_name);

    -- 13. RÉSERVATION DE STOCK
    INSERT INTO public.stock_reservations (campaign_id, order_id, production_id, quantity, status)
    VALUES (p_campaign_id, v_new_order_id, v_campaign.production_id, p_quantity, 'active');

    -- 14. NOTIFICATION (uniquement si le destinataire est identifiable)
    IF v_notif_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
        VALUES (
            v_notif_user_id,
            'COMMANDE_CREEE',
            'Nouvelle commande reçue !',
            'Un revendeur a passé commande de ' || p_quantity || ' ' || v_campaign.unit
                || ' sur votre offre « ' || v_campaign.title || ' ».'
                || CASE WHEN v_final_city IS NOT NULL THEN ' Destination : ' || v_final_city ELSE '' END,
            'order',
            v_new_order_id,
            '/dashboard/company/orders/' || v_new_order_id
        );
    END IF;

    -- 15. RETOUR
    RETURN QUERY SELECT v_new_order_id, v_order_number, v_total_amount, p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_order_with_reservation IS
'Phase 21 - v2 Final (Mig 20) : Éligibilité régionale stricte.
Corrections: (1) bug record-not-assigned via v_final_destination_id/v_final_depot_id scalaires,
(2) schéma réel order_items sans production_id, (3) stock_reservations sans expires_at,
(4) notifications.user_id = companies.created_by + champs obligatoires.';
