-- Migration 1: Extensions, Fonctions utilitaires et Référentiel Géographique
-- Date: 2026-09-09

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fonction trigger standard pour la mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Table des pays (countries)
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table des provinces / régions (provinces)
CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provinces_country_name UNIQUE (country_id, name)
);

CREATE INDEX IF NOT EXISTS idx_provinces_country_id ON public.provinces(country_id);

-- 3. Table des villes (cities)
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cities_province_name UNIQUE (province_id, name)
);

CREATE INDEX IF NOT EXISTS idx_cities_province_id ON public.cities(province_id);

-- Insertion du référentiel géographique de base (RDC et 26 provinces)
-- Données structurelles indispensables aux clés étrangères et au ciblage territorial
DO $$
DECLARE
    v_rdc_id UUID;
BEGIN
    -- Pays : RDC
    INSERT INTO public.countries (code, name, currency_code, is_active)
    VALUES ('COD', 'République Démocratique du Congo', 'USD', TRUE)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_rdc_id;

    -- Les 26 provinces officielles
    INSERT INTO public.provinces (country_id, code, name)
    VALUES
        (v_rdc_id, 'KIN', 'Kinshasa'),
        (v_rdc_id, 'KOC', 'Kongo-Central'),
        (v_rdc_id, 'KWA', 'Kwango'),
        (v_rdc_id, 'KWL', 'Kwilu'),
        (v_rdc_id, 'MND', 'Mai-Ndombe'),
        (v_rdc_id, 'KAS', 'Kasaï'),
        (v_rdc_id, 'KAC', 'Kasaï-Central'),
        (v_rdc_id, 'KAO', 'Kasaï-Oriental'),
        (v_rdc_id, 'LOM', 'Lomami'),
        (v_rdc_id, 'SAN', 'Sankuru'),
        (v_rdc_id, 'HKT', 'Haut-Katanga'),
        (v_rdc_id, 'HKL', 'Haut-Lomami'),
        (v_rdc_id, 'LUA', 'Lualaba'),
        (v_rdc_id, 'TAN', 'Tanganyika'),
        (v_rdc_id, 'MAN', 'Maniema'),
        (v_rdc_id, 'NKV', 'Nord-Kivu'),
        (v_rdc_id, 'SKV', 'Sud-Kivu'),
        (v_rdc_id, 'ITU', 'Ituri'),
        (v_rdc_id, 'HAU', 'Haut-Uele'),
        (v_rdc_id, 'BAU', 'Bas-Uele'),
        (v_rdc_id, 'TSH', 'Tshopo'),
        (v_rdc_id, 'EQU', 'Équateur'),
        (v_rdc_id, 'MOG', 'Mongala'),
        (v_rdc_id, 'NUB', 'Nord-Ubangi'),
        (v_rdc_id, 'SUB', 'Sud-Ubangi'),
        (v_rdc_id, 'TSU', 'Tshuapa')
    ON CONFLICT (country_id, name) DO NOTHING;
END $$;
