-- Migration 11: Autorisation de contribution au catalogue products et procédure d'association atomique
-- Date: 2026-09-10
-- Phase: 4 - Gestion des Produits V1

-- 1. Politique permettant aux membres d'entreprises agricoles d'ajouter un nouveau produit au catalogue
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'products_company_insert'
    ) THEN
        CREATE POLICY "products_company_insert" ON public.products
            FOR INSERT WITH CHECK (
                (public.current_user_role() IN ('company', 'admin'))
                AND is_active = TRUE
            );
    END IF;
END $$;

-- 2. Procédure stockée d'ajout d'un produit inexistant et d'association immédiate sans doublon
CREATE OR REPLACE FUNCTION public.create_custom_product_and_associate(
    p_company_id UUID,
    p_name VARCHAR,
    p_category VARCHAR,
    p_default_unit VARCHAR DEFAULT 'tonne',
    p_product_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_custom_name VARCHAR DEFAULT NULL,
    p_company_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_name VARCHAR;
    v_product_id UUID;
    v_company_product_id UUID;
    v_is_existing BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- 1. Contrôle d'authentification et d'autorisation
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Action non autorisée : utilisateur non authentifié.';
    END IF;

    IF NOT public.is_company_member(p_company_id) AND COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Action non autorisée : vous devez être membre de cette entreprise.';
    END IF;

    -- 2. Normalisation du libellé produit (TRIM + compression des espaces multiples)
    v_clean_name := TRIM(REGEXP_REPLACE(p_name, '\s+', ' ', 'g'));
    IF LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Le nom du produit doit comporter au moins 2 caractères.';
    END IF;

    -- 3. Recherche insensible à la casse d'un produit équivalent dans le catalogue
    SELECT id INTO v_product_id 
    FROM public.products 
    WHERE LOWER(name) = LOWER(v_clean_name)
    LIMIT 1;

    -- 4. Si inexistant, insertion dans le catalogue products
    IF v_product_id IS NULL THEN
        INSERT INTO public.products (
            name, 
            category, 
            default_unit, 
            description, 
            image_url, 
            is_active
        ) VALUES (
            v_clean_name, 
            TRIM(p_category), 
            COALESCE(NULLIF(TRIM(p_default_unit), ''), 'tonne'), 
            NULLIF(TRIM(p_product_description), ''), 
            NULLIF(TRIM(p_image_url), ''), 
            TRUE
        )
        RETURNING id INTO v_product_id;
    ELSE
        v_is_existing := TRUE;
    END IF;

    -- 5. Gestion de l'association company_products
    SELECT id INTO v_company_product_id
    FROM public.company_products
    WHERE company_id = p_company_id AND product_id = v_product_id;

    IF v_company_product_id IS NOT NULL THEN
        -- Si déjà associé mais inactif, réactivation et mise à jour
        UPDATE public.company_products
        SET 
            is_active = TRUE,
            custom_name = COALESCE(NULLIF(TRIM(p_custom_name), ''), custom_name),
            description = COALESCE(NULLIF(TRIM(p_company_description), ''), description),
            updated_at = NOW()
        WHERE id = v_company_product_id;
    ELSE
        -- Nouvelle association
        INSERT INTO public.company_products (
            company_id,
            product_id,
            custom_name,
            description,
            is_active
        ) VALUES (
            p_company_id,
            v_product_id,
            NULLIF(TRIM(p_custom_name), ''),
            NULLIF(TRIM(p_company_description), ''),
            TRUE
        )
        RETURNING id INTO v_company_product_id;
    END IF;

    -- 6. Construction et restitution du résultat
    SELECT jsonb_build_object(
        'product_id', v_product_id,
        'company_product_id', v_company_product_id,
        'product_name', v_clean_name,
        'was_already_in_catalog', v_is_existing
    ) INTO v_result;

    RETURN v_result;
END;
$$;
