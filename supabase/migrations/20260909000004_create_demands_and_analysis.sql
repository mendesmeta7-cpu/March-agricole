-- Migration 4: Demandes des Revendeurs et Vue d'Analyse Territoriale
-- Date: 2026-09-09

-- 1. Table demands (Expressions de besoin des revendeurs)
CREATE TABLE IF NOT EXISTS public.demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    target_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'tonne',
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
    city VARCHAR(100),
    target_period_start DATE,
    target_period_end DATE,
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_demands_period CHECK (target_period_end IS NULL OR target_period_start IS NULL OR target_period_end >= target_period_start)
);

CREATE INDEX IF NOT EXISTS idx_demands_reseller_id ON public.demands(reseller_id);
CREATE INDEX IF NOT EXISTS idx_demands_product_id ON public.demands(product_id);
CREATE INDEX IF NOT EXISTS idx_demands_province_id ON public.demands(province_id);
CREATE INDEX IF NOT EXISTS idx_demands_status ON public.demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_target_company ON public.demands(target_company_id);

CREATE TRIGGER trg_demands_updated_at
    BEFORE UPDATE ON public.demands
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Vue d'analyse territoriale décloisonnée (v_market_demands_aggregated)
-- Permet à toute entreprise d'observer la demande agrégée sur tous les territoires
CREATE OR REPLACE VIEW public.v_market_demands_aggregated AS
SELECT 
    d.product_id,
    p.name AS product_name,
    p.category AS product_category,
    d.country_id,
    c.name AS country_name,
    d.province_id,
    pr.name AS province_name,
    d.unit,
    COUNT(d.id)::INT AS total_demands_count,
    SUM(d.quantity)::NUMERIC(14,2) AS total_demanded_quantity
FROM public.demands d
JOIN public.products p ON p.id = d.product_id
JOIN public.countries c ON c.id = d.country_id
JOIN public.provinces pr ON pr.id = d.province_id
WHERE d.status = 'active'
GROUP BY 
    d.product_id, 
    p.name, 
    p.category, 
    d.country_id, 
    c.name, 
    d.province_id, 
    pr.name, 
    d.unit;
