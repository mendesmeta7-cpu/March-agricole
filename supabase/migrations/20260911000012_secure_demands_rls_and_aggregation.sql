-- ============================================================================
-- Migration 12 : Sécurisation RLS de la table demands et accès à la vue agrégée
-- Date : 2026-09-11
-- Description : 
--   - Restreint demands_select aux seuls propriétaires (auth.uid() = reseller_id) et admins
--   - Empêche toute entreprise ou tiers de lire les demandes individuelles brutes via l'API REST
--   - Maintient l'accès à la vue agrégée anonymisée v_market_demands_aggregated
-- ============================================================================

DROP POLICY IF EXISTS demands_select ON demands;

CREATE POLICY demands_select ON demands
FOR SELECT
TO public
USING (
  (auth.uid() = reseller_id)
  OR ((current_user_role())::text = 'admin'::text)
);

GRANT SELECT ON v_market_demands_aggregated TO authenticated;
GRANT SELECT ON v_market_demands_aggregated TO anon;
