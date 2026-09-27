-- Migration 22: Catégories Visuelles, Bannières Dynamiques du Flux et Avatar Revendeur (Cloudinary)
-- Date: 2026-09-27
-- Phase Design: Flux revendeur + Gestion des images Cloudinary

-- ====================================================================
-- 1. TABLE public.feed_categories (Catégories visuelles administrables)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.feed_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    image_url TEXT,
    cloudinary_public_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index d'unicité insensible à la casse sur le nom
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_categories_name_unique
    ON public.feed_categories (LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_feed_categories_is_active_sort
    ON public.feed_categories (is_active, sort_order);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_feed_categories_updated_at
    BEFORE UPDATE ON public.feed_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 2. TABLE public.feed_banners (Bannières carrousel dynamiques)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.feed_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    button_label VARCHAR(100),
    button_url VARCHAR(255),
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_banners_is_active_sort
    ON public.feed_banners (is_active, sort_order);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_feed_banners_updated_at
    BEFORE UPDATE ON public.feed_banners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 3. AJOUT avatar_cloudinary_public_id DANS profiles
-- ====================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS avatar_cloudinary_public_id TEXT;

-- ====================================================================
-- 4. POLITIQUES RLS SUR feed_categories ET feed_banners
-- ====================================================================

ALTER TABLE public.feed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_banners ENABLE ROW LEVEL SECURITY;

-- Politiques feed_categories
DROP POLICY IF EXISTS feed_categories_select ON public.feed_categories;
CREATE POLICY feed_categories_select ON public.feed_categories
    FOR SELECT TO public
    USING (is_active = TRUE OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS feed_categories_insert ON public.feed_categories;
CREATE POLICY feed_categories_insert ON public.feed_categories
    FOR INSERT TO authenticated
    WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS feed_categories_update ON public.feed_categories;
CREATE POLICY feed_categories_update ON public.feed_categories
    FOR UPDATE TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS feed_categories_delete ON public.feed_categories;
CREATE POLICY feed_categories_delete ON public.feed_categories
    FOR DELETE TO authenticated
    USING (public.current_user_role() = 'admin');

-- Politiques feed_banners
DROP POLICY IF EXISTS feed_banners_select ON public.feed_banners;
CREATE POLICY feed_banners_select ON public.feed_banners
    FOR SELECT TO public
    USING (is_active = TRUE OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS feed_banners_insert ON public.feed_banners;
CREATE POLICY feed_banners_insert ON public.feed_banners
    FOR INSERT TO authenticated
    WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS feed_banners_update ON public.feed_banners;
CREATE POLICY feed_banners_update ON public.feed_banners
    FOR UPDATE TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS feed_banners_delete ON public.feed_banners;
CREATE POLICY feed_banners_delete ON public.feed_banners
    FOR DELETE TO authenticated
    USING (public.current_user_role() = 'admin');

-- ====================================================================
-- 5. SEED INITIAL DES CATÉGORIES EXISTANTES ISSUES DE products
-- ====================================================================

INSERT INTO public.feed_categories (name, sort_order)
VALUES
    ('Céréales', 10),
    ('Tubercules et racines', 20),
    ('Légumes', 30),
    ('Légumes-feuilles / Produits locaux', 40),
    ('Fruits', 50),
    ('Légumineuses', 60),
    ('Oléagineux', 70),
    ('Épices et aromates', 80),
    ('Autres productions agricoles', 90)
ON CONFLICT (LOWER(TRIM(name))) DO NOTHING;
