-- Migration 2: Identité et Acteurs (profiles, companies, company_members, resellers)
-- Date: 2026-09-09

-- 1. Table profiles (Extension de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('company', 'reseller', 'admin')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Table companies (Entreprises agricoles)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_province_id ON public.companies(province_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_verification_status ON public.companies(verification_status);

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Table company_members (Collaborateurs et gouvernance interne)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_members UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);

-- 4. Table resellers (Revendeurs et acheteurs professionnels)
CREATE TABLE IF NOT EXISTS public.resellers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
    city VARCHAR(100),
    delivery_address TEXT,
    reseller_type VARCHAR(50) NOT NULL DEFAULT 'wholesaler' CHECK (reseller_type IN ('wholesaler', 'semi_wholesaler', 'retailer', 'processor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resellers_province_id ON public.resellers(province_id);
CREATE INDEX IF NOT EXISTS idx_resellers_country_id ON public.resellers(country_id);

CREATE TRIGGER trg_resellers_updated_at
    BEFORE UPDATE ON public.resellers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Fonctions Helper de sécurité (dans schema public ou auth)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = p_company_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_company_admin_or_owner(p_company_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = p_company_id 
          AND user_id = auth.uid() 
          AND role IN ('owner', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
