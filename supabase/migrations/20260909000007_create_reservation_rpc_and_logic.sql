-- Migration 7: Procédures Stockées Transactionnelles pour la Réservation et les Commandes
-- Date: 2026-09-09

-- 1. Fonction de calcul du stock d'une campagne
CREATE OR REPLACE FUNCTION public.get_campaign_stock_summary(p_campaign_id UUID)
RETURNS TABLE (
    marketable_quantity NUMERIC(12,2),
    reserved_quantity NUMERIC(12,2),
    available_quantity NUMERIC(12,2)
) AS $$
DECLARE
    v_marketable NUMERIC(12,2);
    v_reserved NUMERIC(12,2);
BEGIN
    SELECT c.marketable_quantity INTO v_marketable
    FROM public.campaigns c
    WHERE c.id = p_campaign_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campagne introuvable (%)', p_campaign_id;
    END IF;

    SELECT COALESCE(SUM(sr.quantity), 0) INTO v_reserved
    FROM public.stock_reservations sr
    WHERE sr.campaign_id = p_campaign_id AND sr.status = 'active';

    RETURN QUERY SELECT 
        v_marketable, 
        v_reserved, 
        (v_marketable - v_reserved)::NUMERIC(12,2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Fonction transactionnelle de création de commande avec réservation atomique
CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
    p_reseller_id UUID,
    p_campaign_id UUID,
    p_quantity NUMERIC,
    p_delivery_province_id UUID,
    p_delivery_city VARCHAR DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR,
    total_amount NUMERIC(14,2),
    reserved_quantity NUMERIC(12,2)
) AS $$
DECLARE
    v_campaign RECORD;
    v_is_eligible BOOLEAN;
    v_reserved_qty NUMERIC(12,2);
    v_available_qty NUMERIC(12,2);
    v_new_order_id UUID;
    v_order_number VARCHAR;
    v_total_amount NUMERIC(14,2);
BEGIN
    -- Vérification de sécurité : le revendeur doit être l'utilisateur connecté ou admin
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_reseller_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            RAISE EXCEPTION 'Accès refusé : vous ne pouvez pas commander pour un autre revendeur';
        END IF;
    END IF;

    -- Quantité strictement positive
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantité commandée doit être strictement supérieure à zéro';
    END IF;

    -- 1. VERROUILLAGE PESSIMISTE DE LA LIGNE DE CAMPAGNE (Concurrence sûre)
    SELECT * INTO v_campaign
    FROM public.campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campagne introuvable (%)', p_campaign_id;
    END IF;

    -- 2. VÉRIFICATION DU STATUT DE LA CAMPAGNE
    IF v_campaign.status <> 'active' THEN
        RAISE EXCEPTION 'La campagne n''est pas ouverte aux commandes (Statut actuel : %)', v_campaign.status;
    END IF;

    -- 3. VÉRIFICATION DE LA QUANTITÉ MINIMALE
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'La quantité commandée (%) est inférieure au seuil minimum autorisé (%)', 
            p_quantity, v_campaign.min_order_quantity;
    END IF;

    -- 4. CONTRÔLE STRICT D'ÉLIGIBILITÉ GÉOGRAPHIQUE
    SELECT EXISTS (
        SELECT 1 FROM public.campaign_delivery_zones
        WHERE campaign_id = p_campaign_id 
          AND province_id = p_delivery_province_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cette campagne ne dessert pas la province sélectionnée (Éligibilité refusée)';
    END IF;

    -- 5. CALCUL ATOMIQUE DU STOCK RESTANT
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_qty
    FROM public.stock_reservations
    WHERE campaign_id = p_campaign_id AND status = 'active';

    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;

    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant pour cette campagne (Disponible: %, Demandé: %)', 
            v_available_qty, p_quantity;
    END IF;

    -- 6. CALCUL DU MONTANT TOTAL
    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);

    -- 7. GÉNÉRATION DU NUMÉRO DE COMMANDE UNIQUE
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- 8. INSERTION DANS ORDERS
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
        status,
        notes
    ) VALUES (
        v_order_number,
        p_reseller_id,
        v_campaign.company_id,
        p_campaign_id,
        v_total_amount,
        v_campaign.currency,
        p_delivery_province_id,
        p_delivery_city,
        p_delivery_address,
        'pending',
        p_notes
    ) RETURNING id INTO v_new_order_id;

    -- 9. INSERTION DANS ORDER_ITEMS
    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal
    ) VALUES (
        v_new_order_id,
        v_campaign.product_id,
        p_quantity,
        v_campaign.unit,
        v_campaign.unit_price,
        v_total_amount
    );

    -- 10. INSERTION DE LA RÉSERVATION ATOMIQUE DE STOCK
    INSERT INTO public.stock_reservations (
        campaign_id,
        order_id,
        quantity,
        status
    ) VALUES (
        p_campaign_id,
        v_new_order_id,
        p_quantity,
        'active'
    );

    -- 11. ENREGISTREMENT DANS AUDIT_LOGS
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
            'available_after', (v_available_qty - p_quantity)
        )
    );

    -- 12. RETOUR DU RÉSULTAT
    RETURN QUERY SELECT 
        v_new_order_id, 
        v_order_number, 
        v_total_amount, 
        p_quantity::NUMERIC(12,2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction d'annulation de commande avec libération de réservation
CREATE OR REPLACE FUNCTION public.cancel_order_and_release_reservation(
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Annulation demandée'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_user_id UUID;
    v_is_reseller BOOLEAN;
    v_is_company_member BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (%)', p_order_id;
    END IF;

    -- Contrôle d'autorisation
    v_is_reseller := (v_order.reseller_id = v_user_id);
    v_is_company_member := public.is_company_member(v_order.company_id);
    v_is_admin := (public.current_user_role() = 'admin');

    IF NOT (v_is_reseller OR v_is_company_member OR v_is_admin) THEN
        RAISE EXCEPTION 'Accès refusé : vous n''avez pas les droits pour annuler cette commande';
    END IF;

    -- Vérification du statut de commande autorisant l'annulation
    IF v_order.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'Impossible d''annuler une commande au statut actuel : %', v_order.status;
    END IF;

    -- Mise à jour du statut de la commande
    UPDATE public.orders
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_order_id;

    -- Libération de la réservation de stock
    UPDATE public.stock_reservations
    SET status = 'released', updated_at = NOW()
    WHERE order_id = p_order_id AND status = 'active';

    -- Audit log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        v_user_id,
        'ORDER_CANCELLED_RESERVATION_RELEASED',
        'order',
        p_order_id,
        jsonb_build_object(
            'reason', p_reason,
            'previous_status', v_order.status
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
