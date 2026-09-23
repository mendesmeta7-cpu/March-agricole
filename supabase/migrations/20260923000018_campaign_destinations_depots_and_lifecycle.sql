-- ====================================================================
-- MIGRATION 18 : DESTINATIONS PAR VILLE, DÉPÔTS D'ARRIVÉE,
-- MODIFICATION DE DATE AVEC NOTIFICATION ET CYCLE DE VIE DES CAMPAGNES
-- ====================================================================
-- Date : 2026-09-23
-- Phase : 20 (Partie 2)
-- Description :
--   1. Création de la table campaign_destinations (villes desservies et dates d'arrivée).
--   2. Création de la table campaign_depots (points de livraison / dépôts par ville).
--   3. Évolution de la table orders avec colonnes de liaison et snapshots d'arrivée et dépôt.
--   4. Extension de notifications_type_check pour inclure 'DATE_ARRIVEE_MODIFIEE'.
--   5. Procédure RPC create_order_with_reservation enrichie avec destination_id et depot_id.
--   6. Procédure RPC update_destination_arrival_date avec notification ciblée aux revendeurs.
--   7. Procédure RPC check_and_close_expired_campaigns pour clôture automatique à end_date.
--   8. Politiques de sécurité Row Level Security (RLS) sur destinations et dépôts.

-- 1. TABLE CAMPAIGN_DESTINATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
    city_name VARCHAR(100) NOT NULL,
    expected_arrival_date DATE NOT NULL,
    previous_arrival_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_destinations_city UNIQUE (campaign_id, city_name)
);

CREATE INDEX IF NOT EXISTS idx_campaign_destinations_campaign_id ON public.campaign_destinations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_destinations_province_id ON public.campaign_destinations(province_id);
CREATE INDEX IF NOT EXISTS idx_campaign_destinations_city_name ON public.campaign_destinations(city_name);

CREATE TRIGGER trg_campaign_destinations_updated_at
    BEFORE UPDATE ON public.campaign_destinations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- 2. TABLE CAMPAIGN_DEPOTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_destination_id UUID NOT NULL REFERENCES public.campaign_destinations(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    commune VARCHAR(100) NOT NULL,
    quartier VARCHAR(100),
    address TEXT NOT NULL,
    complement TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_depots_destination_id ON public.campaign_depots(campaign_destination_id);
CREATE INDEX IF NOT EXISTS idx_campaign_depots_campaign_id ON public.campaign_depots(campaign_id);

CREATE TRIGGER trg_campaign_depots_updated_at
    BEFORE UPDATE ON public.campaign_depots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- 3. ÉVOLUTION DE LA TABLE ORDERS
-- --------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES public.campaign_destinations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS depot_id UUID REFERENCES public.campaign_depots(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expected_arrival_date_snapshot DATE,
    ADD COLUMN IF NOT EXISTS destination_city_snapshot VARCHAR(100),
    ADD COLUMN IF NOT EXISTS depot_name_snapshot VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_destination_id ON public.orders(destination_id);
CREATE INDEX IF NOT EXISTS idx_orders_depot_id ON public.orders(depot_id);


-- 4. EXTENSION DES TYPES DE NOTIFICATIONS (DATE_ARRIVEE_MODIFIEE)
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
            'COMMANDE_LIVREE',
            'DATE_ARRIVEE_MODIFIEE'
        ));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


-- 5. PROCÉDURE RPC TRANSACTIONNELLE MISE À JOUR : create_order_with_reservation
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
    p_reseller_id UUID,
    p_campaign_id UUID,
    p_quantity NUMERIC,
    p_delivery_province_id UUID,
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

    -- 3. VÉRIFICATION DE LA PÉRIODE DE VALIDITÉ COMMERCIALE (Date de début et Date de fin)
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

    -- 6. GESTION DE LA DESTINATION ET DU DÉPÔT S'ILS SONT FOURNIS
    v_final_city := TRIM(p_delivery_city);
    v_final_address := TRIM(p_delivery_address);

    IF p_destination_id IS NOT NULL THEN
        SELECT * INTO v_destination
        FROM public.campaign_destinations
        WHERE id = p_destination_id AND campaign_id = p_campaign_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'La destination spécifiée n''appartient pas à cette offre commerciale';
        END IF;

        v_arrival_date := v_destination.expected_arrival_date;
        IF v_final_city IS NULL OR v_final_city = '' THEN
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

        v_depot_name := v_depot.name || ' (' || v_depot.commune || CASE WHEN v_depot.quartier IS NOT NULL THEN ' - ' || v_depot.quartier ELSE '' END || ')';
        IF v_final_address IS NULL OR v_final_address = '' THEN
            v_final_address := v_depot.address || CASE WHEN v_depot.complement IS NOT NULL THEN ' (' || v_depot.complement || ')' ELSE '' END;
        END IF;
    END IF;

    -- 7. CALCUL ATOMIQUE DU STOCK RESTANT
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_qty
    FROM public.stock_reservations
    WHERE campaign_id = p_campaign_id AND status = 'active';

    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;

    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant pour cette campagne (Disponible : %, Demandé : %)', 
            v_available_qty, p_quantity;
    END IF;

    -- 8. CALCUL DU MONTANT TOTAL
    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);

    -- 9. GÉNÉRATION DU NUMÉRO DE COMMANDE UNIQUE (CMD-YYYYMMDD-XXXXXXXX)
    v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- 10. INSERTION DANS ORDERS AVEC SNAPSHOTS COMPLETS
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
        notes,
        destination_id,
        depot_id,
        expected_arrival_date_snapshot,
        destination_city_snapshot,
        depot_name_snapshot
    ) VALUES (
        v_order_number,
        p_reseller_id,
        v_campaign.company_id,
        p_campaign_id,
        v_total_amount,
        v_campaign.currency,
        p_delivery_province_id,
        v_final_city,
        v_final_address,
        'pending',
        p_notes,
        p_destination_id,
        p_depot_id,
        v_arrival_date,
        v_final_city,
        v_depot_name
    ) RETURNING id INTO v_new_order_id;

    -- 11. INSERTION DANS ORDER_ITEMS (Snapshot du prix unitaire contractuel)
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

    -- 12. INSERTION DE LA RÉSERVATION ATOMIQUE DE STOCK
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

    -- 13. ENREGISTREMENT DANS AUDIT_LOGS
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
            'destination_id', p_destination_id,
            'depot_id', p_depot_id,
            'expected_arrival_date', v_arrival_date,
            'delivery_city', v_final_city
        )
    );

    RETURN QUERY
    SELECT 
        v_new_order_id,
        v_order_number,
        v_total_amount,
        p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. PROCÉDURE RPC : update_destination_arrival_date
-- --------------------------------------------------------------------
-- Modifie la date d'arrivée d'une ville sans altérer la campagne ni la réservation,
-- et notifie tous les revendeurs ayant commandé pour cette destination.
CREATE OR REPLACE FUNCTION public.update_destination_arrival_date(
    p_destination_id UUID,
    p_new_arrival_date DATE
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

    -- 3. Mise à jour de la destination (avec conservation de l'ancienne date)
    UPDATE public.campaign_destinations
    SET
        previous_arrival_date = v_old_date,
        expected_arrival_date = p_new_arrival_date,
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


-- 7. PROCÉDURE RPC : check_and_close_expired_campaigns
-- --------------------------------------------------------------------
-- Clôture automatique (status = 'completed') des campagnes actives ayant atteint ou dépassé leur end_date.
CREATE OR REPLACE FUNCTION public.check_and_close_expired_campaigns()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_closed_count INT := 0;
BEGIN
    UPDATE public.campaigns
    SET
        status = 'completed',
        updated_at = NOW()
    WHERE status = 'active'
      AND end_date IS NOT NULL
      AND end_date < CURRENT_DATE;

    GET DIAGNOSTICS v_closed_count = ROW_COUNT;
    RETURN v_closed_count;
END;
$$;


-- 8. POLITIQUES RLS SUR DESTINATIONS ET DÉPÔTS
-- --------------------------------------------------------------------
ALTER TABLE public.campaign_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_depots ENABLE ROW LEVEL SECURITY;

-- A. Lecture des destinations
DROP POLICY IF EXISTS "campaign_destinations_select" ON public.campaign_destinations;
CREATE POLICY "campaign_destinations_select" ON public.campaign_destinations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_destinations.campaign_id
              AND (
                  c.status = 'active'
                  OR public.is_company_member(c.company_id)
                  OR public.current_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM public.orders o
                      WHERE o.campaign_id = c.id AND o.reseller_id = auth.uid()
                  )
              )
        )
    );

-- B. Écriture / Modification des destinations (Entreprise propriétaire ou Admin)
DROP POLICY IF EXISTS "campaign_destinations_all_owner" ON public.campaign_destinations;
CREATE POLICY "campaign_destinations_all_owner" ON public.campaign_destinations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_destinations.campaign_id
              AND (
                  public.is_company_member(c.company_id)
                  OR public.current_user_role() = 'admin'
              )
        )
    );

-- C. Lecture des dépôts
DROP POLICY IF EXISTS "campaign_depots_select" ON public.campaign_depots;
CREATE POLICY "campaign_depots_select" ON public.campaign_depots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_depots.campaign_id
              AND (
                  c.status = 'active'
                  OR public.is_company_member(c.company_id)
                  OR public.current_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM public.orders o
                      WHERE o.campaign_id = c.id AND o.reseller_id = auth.uid()
                  )
              )
        )
    );

-- D. Écriture / Modification des dépôts (Entreprise propriétaire ou Admin)
DROP POLICY IF EXISTS "campaign_depots_all_owner" ON public.campaign_depots;
CREATE POLICY "campaign_depots_all_owner" ON public.campaign_depots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_depots.campaign_id
              AND (
                  public.is_company_member(c.company_id)
                  OR public.current_user_role() = 'admin'
              )
        )
    );
