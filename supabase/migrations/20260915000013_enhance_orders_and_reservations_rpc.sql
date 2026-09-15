-- Migration 13: Consolidation de la procédure transactionnelle de commande et réservation
-- Date: 2026-09-15

-- 1. Fonction sécurisée de calcul du stock d'une campagne
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

-- 2. Fonction transactionnelle de création de commande avec réservation atomique et contrôle de dates
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

    -- 1. VERROUILLAGE PESSIMISTE DE LA LIGNE DE CAMPAGNE (Protection Concurrence / Surbooking)
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

    -- 3. VÉRIFICATION DE LA PÉRIODE DE VALIDITÉ DE LA CAMPAGNE
    IF (v_campaign.start_date > CURRENT_DATE) OR (v_campaign.end_date IS NOT NULL AND v_campaign.end_date < CURRENT_DATE) THEN
        RAISE EXCEPTION 'La campagne n''est plus ou pas encore dans sa période de commercialisation active (Du % au %)', 
            v_campaign.start_date, COALESCE(v_campaign.end_date::text, 'en continu');
    END IF;

    -- 4. VÉRIFICATION DE LA QUANTITÉ MINIMALE
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'La quantité commandée (%) est inférieure au seuil minimum autorisé (%)', 
            p_quantity, v_campaign.min_order_quantity;
    END IF;

    -- 5. CONTRÔLE STRICT D'ÉLIGIBILITÉ GÉOGRAPHIQUE
    SELECT EXISTS (
        SELECT 1 FROM public.campaign_delivery_zones
        WHERE campaign_id = p_campaign_id 
          AND province_id = p_delivery_province_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cette campagne ne dessert pas la province sélectionnée (Éligibilité territoriale refusée)';
    END IF;

    -- 6. CALCUL ATOMIQUE DU STOCK RESTANT
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_qty
    FROM public.stock_reservations
    WHERE campaign_id = p_campaign_id AND status = 'active';

    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;

    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant pour cette campagne (Disponible : %, Demandé : %)', 
            v_available_qty, p_quantity;
    END IF;

    -- 7. CALCUL DU MONTANT TOTAL
    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);

    -- 8. GÉNÉRATION DU NUMÉRO DE COMMANDE UNIQUE (CMD-YYYYMMDD-XXXXXXXX)
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- 9. INSERTION DANS ORDERS
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

    -- 10. INSERTION DANS ORDER_ITEMS (Snapshot du prix unitaire contractuel)
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

    -- 11. INSERTION DE LA RÉSERVATION ATOMIQUE DE STOCK
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

    -- 12. ENREGISTREMENT DANS AUDIT_LOGS
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

    -- 13. RETOUR DU RÉSULTAT TRANSACTIONNEL
    RETURN QUERY SELECT 
        v_new_order_id, 
        v_order_number, 
        v_total_amount, 
        p_quantity::NUMERIC(12,2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
