-- ============================================================================
-- Migration 20 : Résolution de l'accès aux demandes, notifications ciblées & détail
-- Date : 2026-09-25
-- Description :
--   1. Mise à jour de la politique RLS demands_select pour permettre aux entreprises
--      de consulter les demandes générales actives du marché et leurs demandes sur récoltes.
--   2. Mise à jour de notify_company_on_demand_received pour pointer directement vers
--      l'URL de détail /dashboard/company/demands/[id].
-- ============================================================================

-- 1. MISE À JOUR DE LA POLITIQUE RLS DEMANDS_SELECT
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS demands_select ON public.demands;

CREATE POLICY demands_select ON public.demands
FOR SELECT
TO public
USING (
  -- A. Revendeur auteur de la demande
  (auth.uid() = reseller_id)
  -- B. Administrateur système
  OR ((current_user_role())::text = 'admin'::text)
  -- C. Entreprise agricole ciblée sur sa récolte spécifique
  OR (
    target_company_id IS NOT NULL 
    AND is_company_member(target_company_id)
  )
  OR (
    production_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.productions p 
      WHERE p.id = demands.production_id 
        AND is_company_member(p.company_id)
    )
  )
  -- D. Entreprise agricole pour les demandes générales actives du marché
  OR (
    demand_type = 'general' 
    AND status = 'active' 
    AND (current_user_role())::text = 'company'::text
  )
);

-- 2. MISE À JOUR DE LA PROCÉDURE RPC NOTIFY_COMPANY_ON_DEMAND_RECEIVED
-- --------------------------------------------------------------------
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
    v_target_company_id UUID;
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

    -- URL d'action directe vers la fiche détaillée de la demande exacte
    v_action_url := '/dashboard/company/demands/' || v_demand.id::text;

    IF v_demand.demand_type = 'production' AND v_demand.production_id IS NOT NULL THEN
        SELECT title, company_id INTO v_production FROM public.productions WHERE id = v_demand.production_id;
        v_target_company_id := COALESCE(v_demand.target_company_id, v_production.company_id);
        
        v_title := 'Nouvelle demande sur votre récolte : ' || COALESCE(v_product.name, 'Produit');
        v_message := 'Un revendeur a exprimé un besoin de ' || v_demand.quantity || ' ' || v_demand.unit || 
                     ' sur la production « ' || COALESCE(v_production.title, '') || ' » (' || COALESCE(v_province.name, 'Région') || ').';

        -- Destinataires : propriétaire et membres de l'entreprise ciblée
        FOR v_recipient_id IN
            SELECT c.created_by AS user_id FROM public.companies c WHERE c.id = v_target_company_id
            UNION
            SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_target_company_id
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

        -- Destinataires : exploitants configurés sur ce produit dans le même pays
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
