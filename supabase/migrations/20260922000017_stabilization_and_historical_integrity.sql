-- ====================================================================
-- MIGRATION 17 : STABILISATION, COHÉRENCE DES WORKFLOWS ET PRÉSERVATION DE L'HISTORIQUE
-- ====================================================================
-- Date : 2026-09-22
-- Phase : 18
-- Description :
--   1. Ajout de colonnes de snapshot historique sur orders et order_items.
--   2. Remplissage rétroactif des snapshots pour les commandes existantes.
--   3. Élargissement des politiques RLS (campaigns, productions, company_products)
--      pour garantir que les revendeurs conservent l'accès à l'historique de leurs commandes.
--   4. Extension des types de notifications pour inclure DEMANDE_GENERALE_RECUE et DEMANDE_PRODUCTION_RECUE.
--   5. Correction du ciblage strict dans notify_resellers_on_campaign_opened (suppression du broadcast général).
--   6. Procédure RPC unifiée et tolérante lookup_order_for_delivery (gestion token, n° et UUID).
--   7. Procédure RPC helper notify_company_on_demand_received.

-- 1. COLONNES DE SNAPSHOT SUR ORDERS ET ORDER_ITEMS
-- --------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS company_name_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS campaign_title_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS production_title_snapshot VARCHAR(255);

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS product_name_snapshot VARCHAR(255);

-- Remplissage rétroactif des snapshots
UPDATE public.orders o
SET
    company_name_snapshot = COALESCE(o.company_name_snapshot, sub.company_name),
    campaign_title_snapshot = COALESCE(o.campaign_title_snapshot, sub.campaign_title),
    production_title_snapshot = COALESCE(o.production_title_snapshot, sub.production_title)
FROM (
    SELECT 
        o2.id,
        c.name AS company_name,
        camp.title AS campaign_title,
        prod.title AS production_title
    FROM public.orders o2
    JOIN public.companies c ON c.id = o2.company_id
    LEFT JOIN public.campaigns camp ON camp.id = o2.campaign_id
    LEFT JOIN public.productions prod ON (prod.id = o2.production_id OR prod.id = camp.production_id)
) sub
WHERE o.id = sub.id
  AND (o.company_name_snapshot IS NULL OR o.campaign_title_snapshot IS NULL OR o.production_title_snapshot IS NULL);

UPDATE public.order_items oi
SET product_name_snapshot = COALESCE(oi.product_name_snapshot, p.name)
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.product_name_snapshot IS NULL;


-- 2. ÉVOLUTION DES POLITIQUES RLS POUR LA PRÉSERVATION DE L'HISTORIQUE
-- --------------------------------------------------------------------

-- A. RLS Campaigns : le revendeur doit pouvoir lire toute campagne sur laquelle il a passé commande
DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
CREATE POLICY "campaigns_select" ON public.campaigns
    FOR SELECT USING (
        status = 'active'
        OR public.is_company_member(company_id)
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.campaign_id = campaigns.id
              AND o.reseller_id = auth.uid()
        )
    );

-- B. RLS Productions : le revendeur doit pouvoir lire toute production liée à ses commandes ou demandes
DROP POLICY IF EXISTS "productions_select" ON public.productions;
CREATE POLICY "productions_select" ON public.productions
    FOR SELECT USING (
        (is_public = TRUE AND status IN ('planned', 'growing', 'harvested'))
        OR public.is_company_member(company_id)
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.orders o
            LEFT JOIN public.campaigns c ON c.id = o.campaign_id
            WHERE (o.production_id = productions.id OR c.production_id = productions.id)
              AND o.reseller_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.demands d
            WHERE d.production_id = productions.id
              AND d.reseller_id = auth.uid()
        )
    );

-- C. RLS Company Products : lisible si actif, ou membre de la société, ou lié à une production historique commandée
DROP POLICY IF EXISTS "company_products_select" ON public.company_products;
CREATE POLICY "company_products_select" ON public.company_products
    FOR SELECT USING (
        is_active = TRUE 
        OR public.is_company_member(company_id) 
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.productions p
            LEFT JOIN public.campaigns c ON c.production_id = p.id
            LEFT JOIN public.orders o ON (o.production_id = p.id OR o.campaign_id = c.id)
            WHERE p.company_product_id = company_products.id
              AND o.reseller_id = auth.uid()
        )
    );


-- 3. ÉVOLUTION DE LA CONTRAINTE DE NOTIFICATIONS (TOUS LES ÉVÉNEMENTS REQUIS)
-- --------------------------------------------------------------------
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
            'COMMANDE_LIVREE'
        ));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


-- 4. CORRECTION DU CIBLAGE STRICT DANS notify_resellers_on_campaign_opened
-- --------------------------------------------------------------------
-- Ne notifier STRICTEMENT que les revendeurs ayant exprimé une demande active sur CETTE production.
-- Suppression de la diffusion générale aux revendeurs de la province.
CREATE OR REPLACE FUNCTION public.notify_resellers_on_campaign_opened(p_campaign_id UUID)
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

    -- Notification STRICTEMENT ciblée aux revendeurs ayant fait une demande sur cette production
    FOR v_demander IN
        SELECT DISTINCT d.reseller_id
        FROM public.demands d
        WHERE d.production_id = v_campaign.production_id
          AND d.status = 'active'
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
            'Une offre commerciale correspondant à votre demande sur « ' || v_campaign.production_title || ' » est maintenant ouverte aux commandes.',
            'campaign',
            v_campaign.id,
            '/dashboard/reseller/campaigns'
        );
    END LOOP;
END;
$$;


-- 5. PROCÉDURE RPC HELPER : notify_company_on_demand_received
-- --------------------------------------------------------------------
-- Notifie les membres / propriétaire d'une entreprise lorsqu'une demande est formulée
CREATE OR REPLACE FUNCTION public.notify_company_on_demand_received(p_demand_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_demand RECORD;
    v_product RECORD;
    v_production RECORD;
    v_province RECORD;
    v_recipient_id UUID;
    v_title VARCHAR(255);
    v_message TEXT;
    v_action_url VARCHAR(255);
BEGIN
    SELECT * INTO v_demand FROM public.demands WHERE id = p_demand_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT name INTO v_product FROM public.products WHERE id = v_demand.product_id;
    SELECT name INTO v_province FROM public.provinces WHERE id = v_demand.province_id;

    IF v_demand.demand_type = 'production' AND v_demand.production_id IS NOT NULL THEN
        SELECT title, company_id INTO v_production FROM public.productions WHERE id = v_demand.production_id;
        
        v_title := 'Nouvelle demande sur votre récolte : ' || COALESCE(v_product.name, 'Produit');
        v_message := 'Un revendeur a exprimé un besoin de ' || v_demand.quantity || ' ' || v_demand.unit || 
                     ' sur la production « ' || COALESCE(v_production.title, '') || ' » (' || COALESCE(v_province.name, 'Région') || ').';
        v_action_url := '/dashboard/company/demands';

        -- Destinataires : propriétaire de l'entreprise et membres
        FOR v_recipient_id IN
            SELECT c.created_by AS user_id FROM public.companies c WHERE c.id = v_demand.target_company_id
            UNION
            SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_demand.target_company_id
        LOOP
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    related_entity_type,
                    related_entity_id,
                    action_url
                ) VALUES (
                    v_recipient_id,
                    'DEMANDE_PRODUCTION_RECUE',
                    v_title,
                    v_message,
                    'demand',
                    v_demand.id,
                    v_action_url
                );
            END IF;
        END LOOP;

    ELSIF v_demand.demand_type = 'general' THEN
        v_title := 'Nouvelle demande générale : ' || COALESCE(v_product.name, 'Produit');
        v_message := 'Un revendeur recherche ' || v_demand.quantity || ' ' || v_demand.unit || 
                     ' de ' || COALESCE(v_product.name, 'ce produit') || ' à ' || COALESCE(v_province.name, 'Région') || '.';
        v_action_url := '/dashboard/company/demands';

        -- Destinataires : entreprises configurées sur ce produit dans le même pays
        FOR v_recipient_id IN
            SELECT DISTINCT c.created_by AS user_id
            FROM public.company_products cp
            JOIN public.companies c ON c.id = cp.company_id
            WHERE cp.product_id = v_demand.product_id
              AND cp.is_active = TRUE
              AND c.country_id = v_demand.country_id
            UNION
            SELECT DISTINCT cm.user_id
            FROM public.company_products cp
            JOIN public.companies c ON c.id = cp.company_id
            JOIN public.company_members cm ON cm.company_id = c.id
            WHERE cp.product_id = v_demand.product_id
              AND cp.is_active = TRUE
              AND c.country_id = v_demand.country_id
        LOOP
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    related_entity_type,
                    related_entity_id,
                    action_url
                ) VALUES (
                    v_recipient_id,
                    'DEMANDE_GENERALE_RECUE',
                    v_title,
                    v_message,
                    'demand',
                    v_demand.id,
                    v_action_url
                );
            END IF;
        END LOOP;
    END IF;
END;
$$;


-- 6. PROCÉDURE RPC SÉCURISÉE ET TOLÉRANTE : lookup_order_for_delivery
-- --------------------------------------------------------------------
-- Résout une commande de manière unifiée :
-- - Par numéro lisible (ex: CMD-20260922-8356E05A)
-- - Par jeton QR opaque (qr_code_token)
-- - Par identifiant UUID interne (fallback si ancien QR)
-- - Utilise les snapshots en cas d'archives ou suppressions
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

    -- 2. Recherche unifiée de la commande (Numéro lisible, Token QR ou UUID)
    SELECT o.id, o.company_id 
    INTO v_order_id, v_order_company_id
    FROM public.orders o
    WHERE o.order_number = v_clean_identifier 
       OR o.qr_code_token = v_clean_identifier
       OR (v_clean_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND o.id = v_clean_identifier::UUID)
    LIMIT 1;

    -- 3. Contrôle d'étanchéité multi-société strict
    IF v_order_id IS NULL THEN
        RETURN;
    END IF;

    IF public.current_user_role() <> 'admin' THEN
        IF v_user_company_id IS NULL OR v_user_company_id <> v_order_company_id THEN
            RETURN;
        END IF;
    END IF;

    -- 4. Retour des détails de la commande autorisée avec retombée sur snapshots
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
$$;


-- 7. TRIGGERS AUTOMATIQUES DE CAPTURE DE SNAPSHOTS
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_populate_order_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.company_name_snapshot IS NULL AND NEW.company_id IS NOT NULL THEN
        SELECT name INTO NEW.company_name_snapshot FROM public.companies WHERE id = NEW.company_id;
    END IF;

    IF NEW.campaign_title_snapshot IS NULL AND NEW.campaign_id IS NOT NULL THEN
        SELECT title INTO NEW.campaign_title_snapshot FROM public.campaigns WHERE id = NEW.campaign_id;
    END IF;

    IF NEW.production_title_snapshot IS NULL THEN
        IF NEW.production_id IS NOT NULL THEN
            SELECT title INTO NEW.production_title_snapshot FROM public.productions WHERE id = NEW.production_id;
        ELSIF NEW.campaign_id IS NOT NULL THEN
            SELECT prod.title INTO NEW.production_title_snapshot 
            FROM public.campaigns c
            JOIN public.productions prod ON prod.id = c.production_id
            WHERE c.id = NEW.campaign_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_snapshots ON public.orders;
CREATE TRIGGER trg_orders_snapshots
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_populate_order_snapshots();

CREATE OR REPLACE FUNCTION public.fn_populate_order_item_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.product_name_snapshot IS NULL AND NEW.product_id IS NOT NULL THEN
        SELECT name INTO NEW.product_name_snapshot FROM public.products WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_snapshots ON public.order_items;
CREATE TRIGGER trg_order_items_snapshots
    BEFORE INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_populate_order_item_snapshots();
