-- Migration 26: Authentification V1 — Onboarding Découplé, Rôle Provisoire & Sécurisation des Rôles (AUTH-4.1)
-- Date: 2026-10-11
-- Périmètre: Découplage Inscription / Onboarding, Rôle 'unassigned', Statut 'onboarding_status',
--            Neutralisation du trigger d'inscription, Privilèges de colonnes PostgREST stricts,
--            Trigger anti-escalade bi-dimensionnel (rôle + statut), RPC complete_user_onboarding sécurisée.

BEGIN;

-- 1. Évolution de la contrainte CHECK sur profiles.role pour intégrer le rôle transitoire 'unassigned'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('company', 'reseller', 'admin', 'unassigned'));

-- 2. Ajout de la colonne onboarding_status avec préservation rétrocompatible immédiate des comptes existants
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) 
    NOT NULL DEFAULT 'completed' 
    CHECK (onboarding_status IN ('pending', 'completed'));

-- Bascule de la valeur par défaut pour tous les futurs comptes créés vers 'pending'
ALTER TABLE public.profiles ALTER COLUMN onboarding_status SET DEFAULT 'pending';

-- Rattrapage explicite garantissant que tous les comptes existants sont marqués complétés
UPDATE public.profiles 
SET onboarding_status = 'completed' 
WHERE role IN ('company', 'reseller', 'admin');

-- 3. Sécurisation matérielle des privilèges de modification sur public.profiles
-- Règle PostgreSQL : Révoquer le privilège UPDATE au niveau table pour authenticated/anon/PUBLIC,
-- puis réaccorder le droit UPDATE EXCLUSIVEMENT sur les colonnes applicatives autorisées.
-- Les colonnes 'id', 'role', 'onboarding_status', 'created_at' restent strictement INTERDITES à l'API.
REVOKE UPDATE ON public.profiles FROM authenticated, anon, PUBLIC;

GRANT UPDATE (full_name, phone, avatar_url, avatar_cloudinary_public_id, updated_at) 
ON public.profiles TO authenticated;

-- 4. Réécriture du trigger d'inscription automatique depuis auth.users
-- Neutralise la création automatique d'entités métier au signup et l'attribution silencieuse du rôle 'reseller'
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name VARCHAR;
    v_phone VARCHAR;
BEGIN
    -- Extraction exclusive des informations d'identité personnelle
    v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Utilisateur');
    v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

    -- Initialisation universelle et neutre du profil :
    -- Le rôle est TOUJOURS 'unassigned' et le statut d'onboarding TOUJOURS 'pending'.
    -- Tout rôle ou métadonnée métier transmis au signUp() est délibérément ignoré.
    INSERT INTO public.profiles (id, role, full_name, phone, onboarding_status)
    VALUES (NEW.id, 'unassigned', v_full_name, v_phone, 'pending')
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le trigger est bien rattaché sur auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_registration();

-- 5. Trigger anti-escalade de rôle et de statut d'onboarding (prevent_profile_role_escalation)
-- Surveille simultanément les modifications de 'role' ET de 'onboarding_status'.
-- Autorise la transition unique 'unassigned/pending' -> ('company'/'reseller' / 'completed')
-- UNIQUEMENT si l'entité liée correspondante existe déjà en base pour cet utilisateur.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_role VARCHAR;
BEGIN
    -- 1. Contrôle strict de toute modification de rôle OU de statut d'onboarding
    IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status) THEN
        
        -- CAS UNIQUE D'ONBOARDING LÉGITIME :
        -- a. L'ancien rôle doit être STRICTEMENT 'unassigned'
        -- b. Le nouveau rôle doit être STRICTEMENT 'company' ou 'reseller' (JAMAIS 'admin')
        -- c. L'ancien statut doit être STRICTEMENT 'pending'
        -- d. Le nouveau statut doit être STRICTEMENT 'completed'
        -- e. Contrôle structurel matériel : l'entité liée doit obligatoirement EXISTER déjà en base
        IF OLD.role = 'unassigned' 
           AND NEW.role IN ('company', 'reseller') 
           AND OLD.onboarding_status = 'pending' 
           AND NEW.onboarding_status = 'completed' THEN
            
            IF NEW.role = 'company' AND NOT EXISTS (
                SELECT 1 FROM public.companies WHERE created_by = NEW.id
            ) THEN
                RAISE EXCEPTION 'Action interdite : aucune entreprise agricole rattachée.';
            ELSIF NEW.role = 'reseller' AND NOT EXISTS (
                SELECT 1 FROM public.resellers WHERE id = NEW.id
            ) THEN
                RAISE EXCEPTION 'Action interdite : aucun profil revendeur rattaché.';
            END IF;

            -- Transition contractuelle structurellement prouvée
            RETURN NEW;
        END IF;

        -- DANS TOUS LES AUTRES CAS :
        -- Seul un administrateur authentifié peut modifier le rôle ou le statut d'onboarding
        IF auth.uid() IS NOT NULL THEN
            SELECT role INTO v_actor_role FROM public.profiles WHERE id = auth.uid();
            IF v_actor_role IS NULL OR v_actor_role <> 'admin' THEN
                IF NEW.role IS DISTINCT FROM OLD.role THEN
                    RAISE EXCEPTION 'Action interdite : modification non autorisée du rôle utilisateur.';
                ELSE
                    RAISE EXCEPTION 'Action interdite : modification non autorisée du statut d''onboarding.';
                END IF;
            END IF;
        ELSIF COALESCE(auth.role(), '') = 'authenticated' THEN
            RAISE EXCEPTION 'Action interdite : modification non autorisée du profil de sécurité.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- S'assurer que le trigger est actif sur public.profiles
DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 6. Procédure stockée RPC de complétion sécurisée de l'onboarding
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
    p_role VARCHAR,
    p_country_id UUID,
    p_province_id UUID,
    p_city VARCHAR DEFAULT NULL,
    -- Paramètres Société
    p_company_name VARCHAR DEFAULT NULL,
    p_company_description TEXT DEFAULT NULL,
    p_company_address TEXT DEFAULT NULL,
    p_company_phone VARCHAR DEFAULT NULL,
    -- Paramètres Revendeur
    p_business_name VARCHAR DEFAULT NULL,
    p_reseller_type VARCHAR DEFAULT 'wholesaler',
    p_delivery_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_profile RECORD;
    v_new_company_id UUID;
    v_company_slug VARCHAR;
    v_clean_company_name VARCHAR;
    v_clean_business_name VARCHAR;
    v_clean_city VARCHAR;
    v_reseller_type VARCHAR;
BEGIN
    -- 1. Vérification de l'authentification de l'appelant
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié : une session active est requise.';
    END IF;

    -- 2. Verrouillage pessimiste de la ligne du profil (Protection anti-concurrence / anti-double clic)
    SELECT * INTO v_profile 
    FROM public.profiles 
    WHERE id = v_caller_id 
    FOR UPDATE;

    IF v_profile.id IS NULL THEN
        RAISE EXCEPTION 'Profil utilisateur introuvable.';
    END IF;

    -- 3. Vérification du statut d'onboarding (Idempotence & Anti-répétition)
    IF v_profile.onboarding_status = 'completed' OR v_profile.role <> 'unassigned' THEN
        RAISE EXCEPTION 'L''onboarding de ce compte a déjà été finalisé.';
    END IF;

    -- 4. Contrôle de sécurité sur le rôle demandé (Interdiction absolue du rôle admin)
    IF p_role = 'admin' THEN
        RAISE EXCEPTION 'Action interdite : auto-attribution du rôle administrateur non autorisée.';
    END IF;

    IF p_role NOT IN ('company', 'reseller') THEN
        RAISE EXCEPTION 'Rôle invalide : seuls ''company'' ou ''reseller'' sont acceptés.';
    END IF;

    -- 5. Contrôle d'intégrité territoriale (Cohérence Province ∈ Pays)
    IF p_country_id IS NULL OR p_province_id IS NULL THEN
        RAISE EXCEPTION 'Le pays et la province sont obligatoires.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.countries 
        WHERE id = p_country_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Pays invalide ou inactif.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.provinces 
        WHERE id = p_province_id AND country_id = p_country_id
    ) THEN
        RAISE EXCEPTION 'Incohérence territoriale : la province sélectionnée n''appartient pas au pays sélectionné.';
    END IF;

    v_clean_city := NULLIF(TRIM(p_city), '');

    -- 6. Détection et rejet explicite de toute entité préexistante en conflit (Sécurité anti-écrasement)
    IF EXISTS (SELECT 1 FROM public.companies WHERE created_by = v_caller_id) THEN
        RAISE EXCEPTION 'Conflit : une entreprise agricole est déjà associée à ce compte.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.resellers WHERE id = v_caller_id) THEN
        RAISE EXCEPTION 'Conflit : un profil revendeur est déjà associé à ce compte.';
    END IF;

    -- 7. Branchement selon le rôle choisi
    IF p_role = 'company' THEN
        v_clean_company_name := NULLIF(TRIM(p_company_name), '');
        IF v_clean_company_name IS NULL THEN
            RAISE EXCEPTION 'La dénomination de l''entreprise est obligatoire.';
        END IF;

        -- Génération déterministe et unique du slug
        v_company_slug := LOWER(REGEXP_REPLACE(v_clean_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_company_slug := TRIM(BOTH '-' FROM v_company_slug);
        IF v_company_slug = '' THEN
            v_company_slug := 'entreprise';
        END IF;
        v_company_slug := v_company_slug || '-' || SUBSTRING(v_caller_id::text, 1, 6);

        -- Insertion de l'entreprise agricole (Le trigger AFTER INSERT crée automatiquement le membership 'owner')
        INSERT INTO public.companies (
            name, slug, description, address, phone, email,
            country_id, province_id, city, created_by
        ) VALUES (
            v_clean_company_name,
            v_company_slug,
            NULLIF(TRIM(p_company_description), ''),
            NULLIF(TRIM(p_company_address), ''),
            COALESCE(NULLIF(TRIM(p_company_phone), ''), v_profile.phone),
            (SELECT email FROM auth.users WHERE id = v_caller_id),
            p_country_id,
            p_province_id,
            v_clean_city,
            v_caller_id
        ) RETURNING id INTO v_new_company_id;

    ELSIF p_role = 'reseller' THEN
        v_clean_business_name := COALESCE(NULLIF(TRIM(p_business_name), ''), v_profile.full_name);
        v_reseller_type := COALESCE(NULLIF(TRIM(p_reseller_type), ''), 'wholesaler');
        
        IF v_reseller_type NOT IN ('wholesaler', 'semi_wholesaler', 'retailer', 'processor') THEN
            v_reseller_type := 'wholesaler';
        END IF;

        -- Insertion du profil revendeur professionnel (Sans écrasement silencieux)
        INSERT INTO public.resellers (
            id, business_name, country_id, province_id, city, delivery_address, reseller_type
        ) VALUES (
            v_caller_id,
            v_clean_business_name,
            p_country_id,
            p_province_id,
            v_clean_city,
            NULLIF(TRIM(p_delivery_address), ''),
            v_reseller_type
        );
    END IF;

    -- 8. Mise à jour transactionnelle du profil vers le rôle définitif et le statut completed
    UPDATE public.profiles 
    SET role = p_role, 
        onboarding_status = 'completed'
    WHERE id = v_caller_id;

    -- 9. Retour d'information structuré
    RETURN jsonb_build_object(
        'success', TRUE,
        'role', p_role,
        'onboarding_status', 'completed',
        'company_id', v_new_company_id
    );
END;
$$;

-- 7. Sécurisation des privilèges d'exécution de la RPC
REVOKE EXECUTE ON FUNCTION public.complete_user_onboarding FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_user_onboarding TO authenticated;

COMMIT;
