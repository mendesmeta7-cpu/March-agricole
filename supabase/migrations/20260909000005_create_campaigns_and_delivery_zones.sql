-- Migration 5: Campagnes Commerciales et Zones Desservies
-- Date: 2026-09-09

-- 1. Table campaigns (Offres de mise en marché adossées à une production)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    production_id UUID NOT NULL REFERENCES public.productions(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    marketable_quantity NUMERIC(12,2) NOT NULL CHECK (marketable_quantity > 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'tonne',
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    min_order_quantity NUMERIC(12,2) DEFAULT 1 CHECK (min_order_quantity > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    availability_period VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_campaigns_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_production_id ON public.campaigns(production_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_product_id ON public.campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON public.campaigns(start_date);

CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Table campaign_delivery_zones (Zones provinciales desservies par la campagne)
CREATE TABLE IF NOT EXISTS public.campaign_delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_delivery_zones UNIQUE (campaign_id, province_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_delivery_zones_campaign ON public.campaign_delivery_zones(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_delivery_zones_province ON public.campaign_delivery_zones(province_id);
