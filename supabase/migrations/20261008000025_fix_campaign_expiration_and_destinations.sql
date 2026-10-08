-- ====================================================================
-- MIGRATION : 20261008000025_fix_campaign_expiration_and_destinations.sql
-- ÉTAPE 4 : Clôture automatique des campagnes commerciales expirées
--
-- RÈGLE MÉTIER OFFICIELLE :
-- 1. Une campagne active dont la date de fin globale est dépassée
--    (end_date < CURRENT_DATE) passe au statut 'completed'.
-- 2. Une campagne active possédant des destinations dont TOUTES ont leur
--    date limite de commande dépassée (order_deadline_date < CURRENT_DATE)
--    passe au statut 'completed'.
-- 3. Si au moins une destination est encore active (order_deadline_date >= CURRENT_DATE
--    ou NULL) et que end_date n'est pas dépassée, la campagne reste active.
-- 4. Aucune commande, réservation ni livraison historique n'est modifiée ou supprimée.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.check_and_close_expired_campaigns()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_closed_count INT := 0;
BEGIN
    -- Clôture des campagnes actives :
    -- Condition 1 : Date globale de fin dépassée
    -- Condition 2 : OU toutes les destinations ont une date limite dépassée
    UPDATE public.campaigns c
    SET
        status = 'completed',
        updated_at = NOW()
    WHERE c.status = 'active'
      AND (
        -- Condition 1 : end_date globale dépassée
        (c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE)
        OR
        -- Condition 2 : toutes les destinations sont expirées
        (
          EXISTS (
            SELECT 1 FROM public.campaign_destinations cd
            WHERE cd.campaign_id = c.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.campaign_destinations cd
            WHERE cd.campaign_id = c.id
              AND (cd.order_deadline_date IS NULL OR cd.order_deadline_date >= CURRENT_DATE)
          )
        )
      );

    GET DIAGNOSTICS v_closed_count = ROW_COUNT;
    RETURN v_closed_count;
END;
$$;

COMMENT ON FUNCTION public.check_and_close_expired_campaigns() IS
'Clôture automatique (status = completed) des campagnes actives dont le end_date est dépassé ou dont toutes les destinations sont expirées.';
