-- ============================================================================
-- Migration 21 : Élimination définitive de la récursion infinie RLS (PostgreSQL 42P17)
-- Date : 2026-09-25
-- Description :
--   1. Création de fonctions helper SECURITY DEFINER pour briser le cycle
--      entre public.productions, public.demands et public.company_products.
--   2. Réécriture sécurisée des politiques RLS :
--      - demands_select
--      - productions_select
--      - company_products_select
-- ============================================================================

-- 1. FONCTIONS HELPER SECURITY DEFINER (Bypass RLS pour éviter l'évaluation cyclique)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_company_view_demand(p_target_company_id UUID, p_production_id UUID)
RETURNS BOOLEAN AS $$
    SELECT (
        (p_target_company_id IS NOT NULL AND public.is_company_member(p_target_company_id))
        OR (p_production_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.productions p
            WHERE p.id = p_production_id
              AND public.is_company_member(p.company_id)
        ))
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.reseller_has_order_or_demand_on_production(p_production_id UUID, p_reseller_id UUID)
RETURNS BOOLEAN AS $$
    SELECT (
        EXISTS (
            SELECT 1 FROM public.orders o
            LEFT JOIN public.campaigns c ON c.id = o.campaign_id
            WHERE (o.production_id = p_production_id OR c.production_id = p_production_id)
              AND o.reseller_id = p_reseller_id
        )
        OR EXISTS (
            SELECT 1 FROM public.demands d
            WHERE d.production_id = p_production_id
              AND d.reseller_id = p_reseller_id
        )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.reseller_has_order_on_company_product(p_company_product_id UUID, p_reseller_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.productions p
        LEFT JOIN public.campaigns c ON c.production_id = p.id
        LEFT JOIN public.orders o ON (o.production_id = p.id OR o.campaign_id = c.id)
        WHERE p.company_product_id = p_company_product_id
          AND o.reseller_id = p_reseller_id
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. RÉÉCRITURE DES POLITIQUES RLS
-- --------------------------------------------------------------------

-- A. Table demands : demands_select
DROP POLICY IF EXISTS demands_select ON public.demands;
CREATE POLICY demands_select ON public.demands
FOR SELECT
TO public
USING (
  (auth.uid() = reseller_id)
  OR ((public.current_user_role())::text = 'admin'::text)
  OR public.can_company_view_demand(target_company_id, production_id)
  OR (
    demand_type = 'general' 
    AND status = 'active' 
    AND (public.current_user_role())::text = 'company'::text
  )
);

-- B. Table productions : productions_select
DROP POLICY IF EXISTS "productions_select" ON public.productions;
CREATE POLICY "productions_select" ON public.productions
FOR SELECT
TO public
USING (
    (is_public = TRUE AND status IN ('planned', 'growing', 'harvested'))
    OR public.is_company_member(company_id)
    OR public.current_user_role() = 'admin'
    OR public.reseller_has_order_or_demand_on_production(id, auth.uid())
);

-- C. Table company_products : company_products_select
DROP POLICY IF EXISTS "company_products_select" ON public.company_products;
CREATE POLICY "company_products_select" ON public.company_products
FOR SELECT
TO public
USING (
    is_active = TRUE 
    OR public.is_company_member(company_id) 
    OR public.current_user_role() = 'admin'
    OR public.reseller_has_order_on_company_product(id, auth.uid())
);
