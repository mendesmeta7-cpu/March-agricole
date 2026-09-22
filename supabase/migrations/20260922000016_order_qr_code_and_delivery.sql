-- ====================================================================
-- MIGRATION 16 : QR CODE, RECHERCHE RAPIDE ET CONFIRMATION DE LIVRAISON V1
-- ====================================================================
-- Date : 2026-09-22
-- Phase : 16
-- Description :
--   1. Ajout de qr_code_token, delivered_at, delivered_quantity, delivered_by, delivery_notes sur orders.
--   2. Indexation de qr_code_token pour scan instantané.
--   3. Procédure RPC lookup_order_for_delivery avec étanchéité multi-société stricte.
--   4. Procédure RPC confirm_order_delivery avec protection anti-double livraison et audit.
--   5. Extension des types de notifications pour inclure COMMANDE_LIVREE.

-- 1. ÉVOLUTION DE LA TABLE ORDERS
-- --------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64) DEFAULT encode(gen_random_bytes(24), 'hex'),
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_quantity NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Peupler les commandes existantes sans token
UPDATE public.orders
SET qr_code_token = encode(gen_random_bytes(24), 'hex')
WHERE qr_code_token IS NULL;

-- Rendre la colonne non-nulle et unique
ALTER TABLE public.orders
    ALTER COLUMN qr_code_token SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_qr_code_token'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT uq_orders_qr_code_token UNIQUE (qr_code_token);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_qr_code_token ON public.orders(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at);

-- 2. ÉVOLUTION DE LA CONTRAINTE DE NOTIFICATIONS (TYPE COMMANDE_LIVREE)
-- --------------------------------------------------------------------
DO $$
BEGIN
    ALTER TABLE public.notifications
        DROP CONSTRAINT IF EXISTS notifications_type_check;
        
    ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('DEMANDE_REPONSE', 'DEMANDE_ACCEPTEE', 'DEMANDE_REFUSEE', 'CAMPAGNE_OUVERTE', 'COMMANDE_CREEE', 'COMMANDE_LIVREE'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


-- 3. PROCÉDURE RPC SÉCURISÉE : lookup_order_for_delivery
-- --------------------------------------------------------------------
-- Recherche une commande par son numéro lisible ou son jeton QR code.
-- RÈGLE CRITIQUE : Si la commande n'appartient pas à l'entreprise de l'utilisateur connecté,
-- la fonction ne renvoie aucune ligne (zéro fuite d'information).
CREATE OR REPLACE FUNCTION public.lookup_order_for_delivery(p_identifier TEXT)
RETURNS TABLE(
    order_id UUID,
    order_number VARCHAR,
    qr_code_token VARCHAR,
    status VARCHAR,
    total_amount NUMERIC,
    currency VARCHAR,
    created_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivered_quantity NUMERIC,
    delivery_notes TEXT,
    delivery_province_name VARCHAR,
    delivery_city VARCHAR,
    delivery_address TEXT,
    reseller_id UUID,
    reseller_business_name VARCHAR,
    company_id UUID,
    company_name VARCHAR,
    campaign_title VARCHAR,
    production_title VARCHAR,
    total_ordered_quantity NUMERIC,
    unit VARCHAR,
    items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_identifier TEXT;
    v_user_company_id UUID;
    v_order_company_id UUID;
    v_order_id UUID;
BEGIN
    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        RETURN;
    END IF;

    v_clean_identifier := TRIM(p_identifier);

    -- 1. Récupération de l'entreprise associée à l'utilisateur connecté
    IF auth.uid() IS NOT NULL THEN
        SELECT c.id INTO v_user_company_id
        FROM public.companies c
        WHERE c.created_by = auth.uid()
        LIMIT 1;

        IF v_user_company_id IS NULL THEN
            SELECT cm.company_id INTO v_user_company_id
            FROM public.company_members cm
            WHERE cm.user_id = auth.uid()
            LIMIT 1;
        END IF;
    END IF;

    -- 2. Recherche de la commande par numéro ou token
    SELECT o.id, o.company_id 
    INTO v_order_id, v_order_company_id
    FROM public.orders o
    WHERE o.order_number = v_clean_identifier 
       OR o.qr_code_token = v_clean_identifier
    LIMIT 1;

    -- 3. Contrôle d'étanchéité multi-société strict
    -- Si la commande n'existe pas OU si l'utilisateur n'appartient pas à la société propriétaire
    -- (sauf admin), renvoyer vide immédiatement sans rien dévoiler.
    IF v_order_id IS NULL THEN
        RETURN;
    END IF;

    IF public.current_user_role() <> 'admin' THEN
        IF v_user_company_id IS NULL OR v_user_company_id <> v_order_company_id THEN
            RETURN;
        END IF;
    END IF;

    -- 4. Retour des détails de la commande autorisée
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
        c.name AS company_name,
        camp.title AS campaign_title,
        prod.title AS production_title,
        COALESCE(SUM(oi.quantity), 0)::NUMERIC(12,2) AS total_ordered_quantity,
        COALESCE(MAX(oi.unit), 'tonne')::VARCHAR AS unit,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'product_id', oi.product_id,
                    'product_name', pr.name,
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
        r.id, r.business_name, c.id, c.name, camp.title, prod.title;
END;
$$;


-- 4. PROCÉDURE RPC TRANSACTIONNELLE : confirm_order_delivery
-- --------------------------------------------------------------------
-- Valide la livraison physique d'une commande avec garde-fous stricts :
-- - Vérifie la propriété de l'entreprise
-- - Empêche toute double confirmation si déjà livrée
-- - Enregistre l'horodatage, la quantité livrée et l'agent
-- - Trace dans audit_logs et notifie le revendeur
CREATE OR REPLACE FUNCTION public.confirm_order_delivery(
    p_order_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    order_id UUID,
    order_number VARCHAR,
    status VARCHAR,
    delivered_at TIMESTAMPTZ,
    delivered_quantity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_user_company_id UUID;
    v_delivered_qty NUMERIC(12,2);
    v_now TIMESTAMPTZ := NOW();
    v_actor_id UUID := auth.uid();
BEGIN
    -- 1. Contrôle d'authentification
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour confirmer une livraison.';
    END IF;

    -- 2. Verrouillage transactionnel pessimiste de la commande
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (ID: %).', p_order_id;
    END IF;

    -- 3. Vérification de l'appartenance à l'entreprise propriétaire
    IF public.current_user_role() <> 'admin' THEN
        SELECT c.id INTO v_user_company_id
        FROM public.companies c
        WHERE c.created_by = v_actor_id
        LIMIT 1;

        IF v_user_company_id IS NULL THEN
            SELECT cm.company_id INTO v_user_company_id
            FROM public.company_members cm
            WHERE cm.user_id = v_actor_id
            LIMIT 1;
        END IF;

        IF v_user_company_id IS NULL OR v_user_company_id <> v_order.company_id THEN
            RAISE EXCEPTION 'Accès refusé : vous n''avez pas les droits pour livrer cette commande.';
        END IF;
    END IF;

    -- 4. Garde-fou Anti-Double Livraison
    IF v_order.status = 'delivered' THEN
        RAISE EXCEPTION 'Cette commande a déjà été livrée le %.', TO_CHAR(v_order.delivered_at, 'DD/MM/YYYY à HH24:MI');
    END IF;

    IF v_order.status = 'cancelled' THEN
        RAISE EXCEPTION 'Impossible de livrer une commande annulée.';
    END IF;

    -- 5. Calcul de la quantité totale commandée pour l'enregistrer comme quantité livrée
    SELECT COALESCE(SUM(oi.quantity), 0) INTO v_delivered_qty
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id;

    IF v_delivered_qty <= 0 THEN
        v_delivered_qty := 1;
    END IF;

    -- 6. Mise à jour de la commande
    UPDATE public.orders ord
    SET
        status = 'delivered',
        delivered_at = v_now,
        delivered_quantity = v_delivered_qty,
        delivered_by = v_actor_id,
        delivery_notes = COALESCE(p_notes, ord.delivery_notes),
        updated_at = v_now
    WHERE ord.id = p_order_id;

    -- 7. Confirmation de la réservation de stock
    UPDATE public.stock_reservations sr
    SET 
        status = 'confirmed',
        updated_at = v_now
    WHERE sr.order_id = p_order_id;

    -- 8. Enregistrement dans audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        v_actor_id,
        'ORDER_DELIVERED',
        'order',
        p_order_id,
        jsonb_build_object(
            'order_number', v_order.order_number,
            'delivered_quantity', v_delivered_qty,
            'delivered_at', v_now,
            'previous_status', v_order.status,
            'notes', p_notes
        )
    );

    -- 9. Notification interne au revendeur
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
        'COMMANDE_LIVREE',
        'Commande livrée : ' || v_order.order_number,
        'Votre commande n° ' || v_order.order_number || ' a été confirmée comme livrée par le producteur.',
        'order',
        p_order_id,
        '/dashboard/reseller/orders/' || p_order_id
    );

    -- 10. Retour du résultat
    RETURN QUERY SELECT
        v_order.id,
        v_order.order_number,
        'delivered'::VARCHAR AS status,
        v_now AS delivered_at,
        v_delivered_qty AS delivered_quantity;
END;
$$;
