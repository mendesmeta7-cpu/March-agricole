-- ====================================================================
-- MIGRATION 15 : ÉVOLUTION DES DEMANDES, PROPOSITIONS, NOTIFICATIONS ET CAMPAGNES
-- ====================================================================
-- Date : 2026-09-22
-- Phase : 14a
-- Description : 
--   1. Distinction formelle des 2 types de demandes (générales vs liées à une production).
--   2. Création de la table demand_responses pour les propositions des sociétés.
--   3. Création de la table notifications pour le centre de notifications internes.
--   4. Extension de orders pour les commandes issues de propositions (origin_type).
--   5. Procédure RPC create_order_from_demand_response avec réservation atomique.
--   6. Politiques RLS sécurisées et triggers.

-- 1. ÉVOLUTION DE LA TABLE DEMANDS
-- --------------------------------------------------------------------
ALTER TABLE public.demands
    ADD COLUMN IF NOT EXISTS demand_type VARCHAR(20) NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS production_id UUID REFERENCES public.productions(id) ON DELETE SET NULL;

-- Ajout de la contrainte de type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_demand_type_values'
    ) THEN
        ALTER TABLE public.demands
            ADD CONSTRAINT chk_demand_type_values 
            CHECK (demand_type IN ('general', 'production'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_demand_production_link'
    ) THEN
        ALTER TABLE public.demands
            ADD CONSTRAINT chk_demand_production_link 
            CHECK (
                (demand_type = 'production' AND production_id IS NOT NULL) OR
                (demand_type = 'general')
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_demands_demand_type ON public.demands(demand_type);
CREATE INDEX IF NOT EXISTS idx_demands_production_id ON public.demands(production_id);


-- 2. CRÉATION DE LA TABLE DEMAND_RESPONSES (Propositions et Refus des Sociétés)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demand_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    production_id UUID REFERENCES public.productions(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'refused', 'accepted', 'ordered', 'cancelled')),
    proposed_quantity NUMERIC(12,2),
    unit VARCHAR(30) DEFAULT 'tonne',
    unit_price NUMERIC(12,2),
    currency VARCHAR(10) DEFAULT 'USD',
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_demand_company_response UNIQUE (demand_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_demand_responses_demand_id ON public.demand_responses(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_responses_company_id ON public.demand_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_demand_responses_production_id ON public.demand_responses(production_id);
CREATE INDEX IF NOT EXISTS idx_demand_responses_status ON public.demand_responses(status);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_demand_responses_updated_at ON public.demand_responses;
CREATE TRIGGER trg_demand_responses_updated_at
    BEFORE UPDATE ON public.demand_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- 3. CRÉATION DE LA TABLE NOTIFICATIONS (Centre de Notifications Internes)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('DEMANDE_REPONSE', 'DEMANDE_ACCEPTEE', 'DEMANDE_REFUSEE', 'CAMPAGNE_OUVERTE', 'COMMANDE_CREEE')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50) NOT NULL CHECK (related_entity_type IN ('demand', 'demand_response', 'campaign', 'order', 'production')),
    related_entity_id UUID NOT NULL,
    action_url VARCHAR(255) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);


-- 4. ÉVOLUTION DE ORDERS POUR LES COMMANDES SUR PROPOSITIONS
-- --------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30) NOT NULL DEFAULT 'campaign',
    ADD COLUMN IF NOT EXISTS demand_response_id UUID REFERENCES public.demand_responses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS production_id UUID REFERENCES public.productions(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_order_origin_type'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT chk_order_origin_type 
            CHECK (origin_type IN ('campaign', 'demand_response'));
    END IF;
END $$;

-- Permettre campaign_id NULL si la commande provient d'une proposition directe
ALTER TABLE public.orders ALTER COLUMN campaign_id DROP NOT NULL;

-- Adapter stock_reservations pour autoriser campaign_id NULL si production_id est renseigné
ALTER TABLE public.stock_reservations
    ADD COLUMN IF NOT EXISTS production_id UUID REFERENCES public.productions(id) ON DELETE SET NULL;

ALTER TABLE public.stock_reservations ALTER COLUMN campaign_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_target'
    ) THEN
        ALTER TABLE public.stock_reservations
            ADD CONSTRAINT chk_reservation_target 
            CHECK (campaign_id IS NOT NULL OR production_id IS NOT NULL);
    END IF;
END $$;


-- 5. PROCÉDURE RPC ATOMIQUE : create_order_from_demand_response
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_from_demand_response(
    p_reseller_id UUID,
    p_demand_response_id UUID,
    p_quantity NUMERIC,
    p_delivery_province_id UUID,
    p_delivery_city VARCHAR DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    order_id UUID,
    order_number VARCHAR,
    total_amount NUMERIC,
    reserved_quantity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_response RECORD;
    v_demand RECORD;
    v_production RECORD;
    v_new_order_id UUID;
    v_order_number VARCHAR;
    v_total_amount NUMERIC(14,2);
    v_company_owner_id UUID;
BEGIN
    -- 1. Contrôle d'authentification
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_reseller_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            RAISE EXCEPTION 'Accès refusé : vous ne pouvez pas commander pour un autre revendeur.';
        END IF;
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantité commandée doit être strictement supérieure à zéro.';
    END IF;

    -- 2. Verrouillage de la proposition de réponse
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

    -- 3. Verrouillage de la demande
    SELECT * INTO v_demand
    FROM public.demands
    WHERE id = v_response.demand_id;

    IF v_demand.reseller_id <> p_reseller_id THEN
        RAISE EXCEPTION 'Cette proposition ne correspond pas à votre demande initiale.';
    END IF;

    -- 4. Verrouillage de la production associée
    SELECT * INTO v_production
    FROM public.productions
    WHERE id = v_response.production_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La production proposée par la société est introuvable.';
    END IF;

    -- Vérification de la quantité proposée
    IF p_quantity > v_response.proposed_quantity THEN
        RAISE EXCEPTION 'La quantité demandée (%) excède la quantité proposée par la société (%).', 
            p_quantity, v_response.proposed_quantity;
    END IF;

    -- 5. Calcul financier
    v_total_amount := (p_quantity * COALESCE(v_response.unit_price, 0))::NUMERIC(14,2);
    IF v_total_amount <= 0 THEN
        v_total_amount := (p_quantity * 1)::NUMERIC(14,2);
    END IF;

    -- 6. Génération du numéro de commande
    v_order_number := 'CMD-DEM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- 7. Insertion de la commande réelle
    INSERT INTO public.orders (
        order_number,
        reseller_id,
        company_id,
        campaign_id,
        origin_type,
        demand_response_id,
        production_id,
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
        v_response.company_id,
        NULL,
        'demand_response',
        v_response.id,
        v_production.id,
        v_total_amount,
        COALESCE(v_response.currency, 'USD'),
        p_delivery_province_id,
        p_delivery_city,
        p_delivery_address,
        'pending',
        p_notes
    ) RETURNING id INTO v_new_order_id;

    -- 8. Insertion dans order_items
    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit,
        unit_price,
        subtotal
    ) VALUES (
        v_new_order_id,
        v_production.product_id,
        p_quantity,
        COALESCE(v_response.unit, v_production.unit),
        COALESCE(v_response.unit_price, 0),
        v_total_amount
    );

    -- 9. Insertion de la réservation de stock liée à la production
    INSERT INTO public.stock_reservations (
        campaign_id,
        production_id,
        order_id,
        quantity,
        status
    ) VALUES (
        NULL,
        v_production.id,
        v_new_order_id,
        p_quantity,
        'active'
    );

    -- 10. Mise à jour des statuts de la réponse et de la demande
    UPDATE public.demand_responses
    SET status = 'ordered', updated_at = NOW()
    WHERE id = v_response.id;

    UPDATE public.demands
    SET status = 'converted', updated_at = NOW()
    WHERE id = v_demand.id;

    -- 11. Notification interne à l'entreprise vendeuse
    SELECT created_by INTO v_company_owner_id
    FROM public.companies
    WHERE id = v_response.company_id;

    IF v_company_owner_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_entity_type,
            related_entity_id,
            action_url
        ) VALUES (
            v_company_owner_id,
            'COMMANDE_CREEE',
            'Nouvelle commande suite à votre proposition',
            'Le revendeur a validé une commande de ' || p_quantity || ' ' || COALESCE(v_response.unit, 'tonne') || ' sur votre production.',
            'order',
            v_new_order_id,
            '/dashboard/company/orders/' || v_new_order_id
        );
    END IF;

    -- 12. Audit log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_reseller_id,
        'ORDER_CREATED_FROM_DEMAND_RESPONSE',
        'order',
        v_new_order_id,
        jsonb_build_object(
            'demand_response_id', v_response.id,
            'production_id', v_production.id,
            'quantity', p_quantity,
            'total_amount', v_total_amount
        )
    );

    -- 13. Retour du résultat
    RETURN QUERY SELECT 
        v_new_order_id, 
        v_order_number, 
        v_total_amount, 
        p_quantity::NUMERIC(12,2);
END;
$$;


-- 6. POLITIQUES RLS SUR DEMAND_RESPONSES ET NOTIFICATIONS
-- --------------------------------------------------------------------
ALTER TABLE public.demand_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politiques demand_responses
DROP POLICY IF EXISTS "demand_responses_select_policy" ON public.demand_responses;
CREATE POLICY "demand_responses_select_policy" ON public.demand_responses
    FOR SELECT USING (
        -- L'entreprise auteur de la réponse
        public.is_company_member(company_id)
        -- Le revendeur auteur de la demande liée
        OR EXISTS (
            SELECT 1 FROM public.demands d 
            WHERE d.id = demand_responses.demand_id AND d.reseller_id = auth.uid()
        )
        -- Administrateur
        OR (public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "demand_responses_insert_policy" ON public.demand_responses;
CREATE POLICY "demand_responses_insert_policy" ON public.demand_responses
    FOR INSERT WITH CHECK (
        public.is_company_member(company_id)
        OR (public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "demand_responses_update_policy" ON public.demand_responses;
CREATE POLICY "demand_responses_update_policy" ON public.demand_responses
    FOR UPDATE USING (
        public.is_company_member(company_id)
        OR EXISTS (
            SELECT 1 FROM public.demands d 
            WHERE d.id = demand_responses.demand_id AND d.reseller_id = auth.uid()
        )
        OR (public.current_user_role() = 'admin')
    );

-- Politiques notifications
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT USING (
        auth.uid() = user_id OR (public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE USING (
        auth.uid() = user_id OR (public.current_user_role() = 'admin')
    );


-- 7. NOTIFICATION D'OUVERTURE DE CAMPAGNE (Procédure helper)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_resellers_on_campaign_opened(p_campaign_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_campaign RECORD;
    v_demander RECORD;
    v_eligible_reseller RECORD;
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

    -- 1. Notifier les revendeurs ayant fait une demande sur cette production
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
            'Une campagne commerciale correspondant à votre demande sur « ' || v_campaign.production_title || ' » est maintenant ouverte aux commandes.',
            'campaign',
            v_campaign.id,
            '/dashboard/reseller/campaigns'
        );
    END LOOP;

    -- 2. Notifier les autres revendeurs situés dans les provinces desservies
    FOR v_eligible_reseller IN
        SELECT DISTINCT r.id as reseller_id
        FROM public.resellers r
        JOIN public.campaign_delivery_zones z ON z.province_id = r.province_id
        WHERE z.campaign_id = v_campaign.id
          AND r.id NOT IN (
              SELECT d.reseller_id FROM public.demands d WHERE d.production_id = v_campaign.production_id
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
            v_eligible_reseller.reseller_id,
            'CAMPAGNE_OUVERTE',
            'Nouvelle offre agricole dans votre région : ' || v_campaign.product_name,
            'La campagne « ' || v_campaign.title || ' » dessert votre province. Découvrez les volumes disponibles.',
            'campaign',
            v_campaign.id,
            '/dashboard/reseller/campaigns'
        );
    END LOOP;
END;
$$;
