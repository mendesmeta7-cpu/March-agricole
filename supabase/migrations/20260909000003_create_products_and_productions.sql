-- Migration 3: Catalogue Général, Produits Entreprises et Productions
-- Date: 2026-09-09

-- 1. Table products (Catalogue général de référence)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    default_unit VARCHAR(30) NOT NULL DEFAULT 'tonne',
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Table company_products (Produits configurés/cultivés par une entreprise)
CREATE TABLE IF NOT EXISTS public.company_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    custom_name VARCHAR(150),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_products UNIQUE (company_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_company_products_company_id ON public.company_products(company_id);
CREATE INDEX IF NOT EXISTS idx_company_products_product_id ON public.company_products(product_id);

CREATE TRIGGER trg_company_products_updated_at
    BEFORE UPDATE ON public.company_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Table productions (Productions agricoles déclarées par les entreprises)
CREATE TABLE IF NOT EXISTS public.productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    company_product_id UUID REFERENCES public.company_products(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    main_image_url TEXT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    expected_quantity NUMERIC(12,2) NOT NULL CHECK (expected_quantity > 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'tonne',
    period_start DATE NOT NULL,
    period_end DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'growing', 'harvested', 'cancelled')),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_productions_period CHECK (period_end IS NULL OR period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_productions_company_id ON public.productions(company_id);
CREATE INDEX IF NOT EXISTS idx_productions_product_id ON public.productions(product_id);
CREATE INDEX IF NOT EXISTS idx_productions_status_public ON public.productions(status, is_public);
CREATE INDEX IF NOT EXISTS idx_productions_period_start ON public.productions(period_start);

CREATE TRIGGER trg_productions_updated_at
    BEFORE UPDATE ON public.productions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
