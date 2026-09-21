-- Migration 14: Catalogue Global Admin, Découplage Produits Société, Photos Indépendantes et Seed de Référence
-- Date: 2026-09-21
-- Prompt: 14 - Stabilisation V1

-- ====================================================================
-- 1. ÉVOLUTION DE LA TABLE public.products
-- ====================================================================

-- Ajout des colonnes de qualification du catalogue global vs personnalisé
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_by_company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Indexation
CREATE INDEX IF NOT EXISTS idx_products_is_global ON public.products(is_global);
CREATE INDEX IF NOT EXISTS idx_products_created_by_company_id ON public.products(created_by_company_id);

-- Remplacement de la contrainte UNIQUE stricte par deux index uniques partiels :
-- 1) Unicité insensible à la casse sur le catalogue global (is_global = TRUE)
-- 2) Unicité par entreprise sur les produits personnalisés (is_global = FALSE)
DO $$
BEGIN
    -- Suppression de l'ancienne contrainte UNIQUE sur 'name' si elle existe
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_name_key' AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products DROP CONSTRAINT products_name_key;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_global_name_unique 
    ON public.products (LOWER(TRIM(name))) 
    WHERE is_global = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_custom_name_unique 
    ON public.products (created_by_company_id, LOWER(TRIM(name))) 
    WHERE is_global = FALSE;

-- ====================================================================
-- 2. ÉVOLUTION DE LA TABLE public.company_products
-- ====================================================================

ALTER TABLE public.company_products
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT 'tonne',
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migration des données existantes : synchronisation de la photo personnalisée
-- afin que l'entreprise existante conserve son visuel d'origine
UPDATE public.company_products cp
SET image_url = p.image_url
FROM public.products p
WHERE cp.product_id = p.id
  AND cp.image_url IS NULL
  AND p.image_url IS NOT NULL;

-- ====================================================================
-- 3. POLITIQUES DE SÉCURITÉ RLS SUR public.products
-- ====================================================================

-- Suppression des anciennes politiques sur products
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_company_insert" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;

-- 1) Lecture : Catalogue global actif visible par tous, produits personnalisés visibles par leur société ou par l'admin
CREATE POLICY "products_select_policy" ON public.products
    FOR SELECT USING (
        (is_global = TRUE AND is_active = TRUE)
        OR (
            created_by_company_id IS NOT NULL 
            AND public.is_company_member(created_by_company_id)
        )
        OR public.current_user_role() = 'admin'
    );

-- 2) Écriture Admin : L'administrateur peut tout faire sur les produits du catalogue
CREATE POLICY "products_admin_manage" ON public.products
    FOR ALL USING (
        public.current_user_role() = 'admin'
    ) WITH CHECK (
        public.current_user_role() = 'admin'
    );

-- 3) Insertion Entreprise : Une entreprise ne peut insérer QUE des produits personnalisés non-globaux
CREATE POLICY "products_company_insert_custom" ON public.products
    FOR INSERT WITH CHECK (
        (public.current_user_role() = 'company' OR public.current_user_role() = 'admin')
        AND is_global = FALSE
        AND created_by_company_id IS NOT NULL
        AND public.is_company_member(created_by_company_id)
    );

-- 4) Mise à jour Entreprise : Une entreprise peut mettre à jour ses propres produits personnalisés
CREATE POLICY "products_company_update_custom" ON public.products
    FOR UPDATE USING (
        is_global = FALSE
        AND created_by_company_id IS NOT NULL
        AND public.is_company_member(created_by_company_id)
    ) WITH CHECK (
        is_global = FALSE
        AND created_by_company_id IS NOT NULL
        AND public.is_company_member(created_by_company_id)
    );

-- ====================================================================
-- 4. RÉVISION DE LA PROCÉDURE create_custom_product_and_associate
-- ====================================================================
-- Cette procédure est appelée lorsqu'une entreprise crée un produit absent du catalogue global.
-- Le produit créé est strictement privé (is_global = FALSE, created_by_company_id = p_company_id).

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
    v_result JSONB;
BEGIN
    -- 1. Contrôle d'authentification et d'autorisation
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Action non autorisée : utilisateur non authentifié.';
    END IF;

    IF NOT public.is_company_member(p_company_id) AND COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Action non autorisée : vous devez être membre de cette entreprise.';
    END IF;

    -- 2. Normalisation du libellé produit
    v_clean_name := TRIM(REGEXP_REPLACE(p_name, '\s+', ' ', 'g'));
    IF LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Le nom du produit doit comporter au moins 2 caractères.';
    END IF;

    -- 3. Vérification si la société a déjà créé ce produit personnalisé
    SELECT id INTO v_product_id 
    FROM public.products 
    WHERE created_by_company_id = p_company_id 
      AND LOWER(name) = LOWER(v_clean_name)
      AND is_global = FALSE
    LIMIT 1;

    -- 4. Si inexistant, insertion en tant que produit personnalisé PRIVÉ (is_global = FALSE)
    IF v_product_id IS NULL THEN
        INSERT INTO public.products (
            name, 
            category, 
            default_unit, 
            description, 
            image_url, 
            is_active,
            is_global,
            created_by_company_id
        ) VALUES (
            v_clean_name, 
            TRIM(p_category), 
            COALESCE(NULLIF(TRIM(p_default_unit), ''), 'tonne'), 
            NULLIF(TRIM(p_product_description), ''), 
            NULLIF(TRIM(p_image_url), ''), 
            TRUE,
            FALSE, -- STRICTEMENT PRIVÉ À CETTE SOCIÉTÉ
            p_company_id
        )
        RETURNING id INTO v_product_id;
    END IF;

    -- 5. Gestion de l'association company_products avec stockage de la photo personnalisée
    SELECT id INTO v_company_product_id
    FROM public.company_products
    WHERE company_id = p_company_id AND product_id = v_product_id;

    IF v_company_product_id IS NOT NULL THEN
        UPDATE public.company_products
        SET 
            is_active = TRUE,
            custom_name = COALESCE(NULLIF(TRIM(p_custom_name), ''), custom_name),
            description = COALESCE(NULLIF(TRIM(p_company_description), ''), description),
            image_url = COALESCE(NULLIF(TRIM(p_image_url), ''), image_url),
            unit = COALESCE(NULLIF(TRIM(p_default_unit), ''), unit),
            updated_at = NOW()
        WHERE id = v_company_product_id;
    ELSE
        INSERT INTO public.company_products (
            company_id,
            product_id,
            custom_name,
            description,
            image_url,
            unit,
            is_active
        ) VALUES (
            p_company_id,
            v_product_id,
            NULLIF(TRIM(p_custom_name), ''),
            NULLIF(TRIM(p_company_description), ''),
            NULLIF(TRIM(p_image_url), ''),
            COALESCE(NULLIF(TRIM(p_default_unit), ''), 'tonne'),
            TRUE
        )
        RETURNING id INTO v_company_product_id;
    END IF;

    v_result := jsonb_build_object(
        'success', TRUE,
        'product_id', v_product_id,
        'company_product_id', v_company_product_id,
        'is_custom', TRUE
    );

    RETURN v_result;
END;
$$;

-- ====================================================================
-- 5. INITIALISATION DU CATALOGUE GLOBAL (PARTIE X - SEED IDEMPOTENT)
-- ====================================================================
-- Insertion de denrées agricoles de référence sans aucune donnée commerciale fictive.

INSERT INTO public.products (name, category, default_unit, is_global, is_active) VALUES
-- CÉRÉALES
('Maïs', 'Céréales', 'tonne', TRUE, TRUE),
('Riz', 'Céréales', 'tonne', TRUE, TRUE),
('Blé', 'Céréales', 'tonne', TRUE, TRUE),
('Sorgho', 'Céréales', 'tonne', TRUE, TRUE),
('Mil', 'Céréales', 'tonne', TRUE, TRUE),
('Avoine', 'Céréales', 'tonne', TRUE, TRUE),
('Orge', 'Céréales', 'tonne', TRUE, TRUE),
('Fonio', 'Céréales', 'tonne', TRUE, TRUE),

-- LÉGUMINEUSES
('Haricot', 'Légumineuses', 'tonne', TRUE, TRUE),
('Soja', 'Légumineuses', 'tonne', TRUE, TRUE),
('Pois', 'Légumineuses', 'tonne', TRUE, TRUE),
('Pois chiche', 'Légumineuses', 'tonne', TRUE, TRUE),
('Lentille', 'Légumineuses', 'tonne', TRUE, TRUE),
('Niébé', 'Légumineuses', 'tonne', TRUE, TRUE),
('Arachide', 'Légumineuses', 'tonne', TRUE, TRUE),

-- TUBERCULES ET RACINES
('Manioc', 'Tubercules et racines', 'tonne', TRUE, TRUE),
('Patate douce', 'Tubercules et racines', 'tonne', TRUE, TRUE),
('Pomme de terre', 'Tubercules et racines', 'tonne', TRUE, TRUE),
('Igname', 'Tubercules et racines', 'tonne', TRUE, TRUE),
('Taro', 'Tubercules et racines', 'tonne', TRUE, TRUE),
('Macabo', 'Tubercules et racines', 'tonne', TRUE, TRUE),

-- LÉGUMES
('Tomate', 'Légumes', 'tonne', TRUE, TRUE),
('Oignon', 'Légumes', 'tonne', TRUE, TRUE),
('Ail', 'Légumes', 'tonne', TRUE, TRUE),
('Poivron', 'Légumes', 'tonne', TRUE, TRUE),
('Piment', 'Légumes', 'tonne', TRUE, TRUE),
('Aubergine', 'Légumes', 'tonne', TRUE, TRUE),
('Concombre', 'Légumes', 'tonne', TRUE, TRUE),
('Courgette', 'Légumes', 'tonne', TRUE, TRUE),
('Chou', 'Légumes', 'tonne', TRUE, TRUE),
('Carotte', 'Légumes', 'tonne', TRUE, TRUE),
('Laitue', 'Légumes', 'tonne', TRUE, TRUE),
('Épinard', 'Légumes', 'tonne', TRUE, TRUE),
('Gombo', 'Légumes', 'tonne', TRUE, TRUE),
('Haricot vert', 'Légumes', 'tonne', TRUE, TRUE),
('Brocoli', 'Légumes', 'tonne', TRUE, TRUE),
('Chou-fleur', 'Légumes', 'tonne', TRUE, TRUE),
('Betterave', 'Légumes', 'tonne', TRUE, TRUE),
('Radis', 'Légumes', 'tonne', TRUE, TRUE),

-- LÉGUMES-FEUILLES / PRODUITS LOCAUX
('Feuilles de manioc', 'Légumes-feuilles / Produits locaux', 'sac_50kg', TRUE, TRUE),
('Feuilles de patate douce', 'Légumes-feuilles / Produits locaux', 'sac_50kg', TRUE, TRUE),
('Amarante', 'Légumes-feuilles / Produits locaux', 'sac_50kg', TRUE, TRUE),
('Épinard local', 'Légumes-feuilles / Produits locaux', 'sac_50kg', TRUE, TRUE),
('Feuilles de patate', 'Légumes-feuilles / Produits locaux', 'sac_50kg', TRUE, TRUE),
('Pondu / feuilles de manioc', 'Légumes-feuilles / Produits locaux', 'sac_50kg', TRUE, TRUE),

-- FRUITS
('Banane', 'Fruits', 'tonne', TRUE, TRUE),
('Banane plantain', 'Fruits', 'tonne', TRUE, TRUE),
('Ananas', 'Fruits', 'tonne', TRUE, TRUE),
('Mangue', 'Fruits', 'tonne', TRUE, TRUE),
('Papaye', 'Fruits', 'tonne', TRUE, TRUE),
('Orange', 'Fruits', 'tonne', TRUE, TRUE),
('Mandarine', 'Fruits', 'tonne', TRUE, TRUE),
('Citron', 'Fruits', 'tonne', TRUE, TRUE),
('Avocat', 'Fruits', 'tonne', TRUE, TRUE),
('Pastèque', 'Fruits', 'tonne', TRUE, TRUE),
('Melon', 'Fruits', 'tonne', TRUE, TRUE),
('Goyave', 'Fruits', 'tonne', TRUE, TRUE),
('Fruit de la passion', 'Fruits', 'tonne', TRUE, TRUE),
('Noix de coco', 'Fruits', 'tonne', TRUE, TRUE),

-- OLÉAGINEUX
('Sésame', 'Oléagineux', 'tonne', TRUE, TRUE),
('Tournesol', 'Oléagineux', 'tonne', TRUE, TRUE),
('Palmier à huile', 'Oléagineux', 'tonne', TRUE, TRUE),

-- ÉPICES ET AROMATES
('Gingembre', 'Épices et aromates', 'tonne', TRUE, TRUE),
('Curcuma', 'Épices et aromates', 'tonne', TRUE, TRUE),
('Vanille', 'Épices et aromates', 'kg', TRUE, TRUE),
('Poivre', 'Épices et aromates', 'kg', TRUE, TRUE),
('Basilic', 'Épices et aromates', 'kg', TRUE, TRUE),
('Coriandre', 'Épices et aromates', 'kg', TRUE, TRUE),

-- AUTRES PRODUCTIONS AGRICOLES
('Café', 'Autres productions agricoles', 'tonne', TRUE, TRUE),
('Cacao', 'Autres productions agricoles', 'tonne', TRUE, TRUE),
('Miel', 'Autres productions agricoles', 'kg', TRUE, TRUE),
('Champignon', 'Autres productions agricoles', 'kg', TRUE, TRUE)

ON CONFLICT DO NOTHING;

-- ====================================================================
-- 6. PROVISIONNEMENT DU COMPTE ADMINISTRATEUR INITIAL
-- ====================================================================
-- Permet à l'administrateur de tester et superviser l'espace /dashboard/admin
-- Email : admin@marcheagricole.cd
-- Mot de passe temporaire : AdminAgri2026!

DO $$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
    v_admin_email VARCHAR := 'admin@marcheagricole.cd';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_email) THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            reauthentication_token,
            phone_change,
            phone_change_token,
            is_sso_user,
            is_anonymous,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_admin_email,
            crypt('AdminAgri2026!', gen_salt('bf', 10)),
            NOW(),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            false,
            false,
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object(
                'sub', 'a0000000-0000-0000-0000-000000000001',
                'email', v_admin_email,
                'role', 'admin',
                'full_name', 'Administrateur Plateforme',
                'email_verified', true
            ),
            NOW(),
            NOW()
        );

        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_admin_id,
            json_build_object(
                'sub', v_admin_id,
                'email', v_admin_email,
                'role', 'admin',
                'full_name', 'Administrateur Plateforme'
            ),
            'email',
            v_admin_id::TEXT,
            NOW(),
            NOW(),
            NOW()
        ) ON CONFLICT (provider, provider_id) DO NOTHING;

        -- Attribution explicite et sécurisée du rôle 'admin'
        UPDATE public.profiles 
        SET role = 'admin', full_name = 'Administrateur Plateforme'
        WHERE id = v_admin_id;
    ELSE
        -- Si l'utilisateur existe déjà, s'assurer que son rôle dans profiles est 'admin'
        UPDATE public.profiles
        SET role = 'admin'
        WHERE id = (SELECT id FROM auth.users WHERE email = v_admin_email);
    END IF;
END $$;
