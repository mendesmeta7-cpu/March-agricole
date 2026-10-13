-- ============================================================
-- MIGRATION 27 : VERROUILLAGE SÉCURISÉ DU TYPE DE COMPTE (AUTH-4.38)
-- ============================================================
-- Objectifs :
-- 1. Ajouter la colonne `public.profiles.intended_role` (VARCHAR(20), NULLABLE).
-- 2. Restreindre ses valeurs à 'company', 'reseller' ou NULL via CHECK.
-- 3. Mettre à jour le trigger `handle_new_user_registration` (SECURITY DEFINER)
--    pour capturer le choix d'inscription depuis user_metadata de façon immuable.
-- 4. Reprise rétroactive chirurgicale des profils en attente dont le choix est connu.
-- 5. Mettre à jour la RPC `complete_user_onboarding` (SECURITY DEFINER)
--    pour imposer la concordance absolue entre p_role et intended_role en base.
--
-- GARANTIES DE SÉCURITÉ :
-- - Idempotence complète (IF NOT EXISTS, CREATE OR REPLACE, DO $$).
-- - Zero régression sur les 10 profils historiques complétés.
-- - Préservation des profils en attente sans choix connu (intended_role = NULL).
-- - Aucun droit UPDATE accordé au rôle authenticated sur intended_role.
-- - Aucune modification de schéma destructrice (aucune suppression de données).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. CONTRÔLE DES PRÉREQUIS
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'onboarding_status'
    ) THEN
        RAISE EXCEPTION 'Prérequis manquant : la table public.profiles doit posséder la colonne onboarding_status (Migration 26 requise).';
    END IF;
END $$;

-- ------------------------------------------------------------
-- 1. COLONNE profiles.intended_role ET CONTRAINTE CHECK
-- ------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS intended_role VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_profiles_intended_role' 
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_intended_role
            CHECK (intended_role IS NULL OR intended_role IN ('company', 'reseller'));
    END IF;
END $$;

-- ------------------------------------------------------------
-- 2. PRIVILÈGES SUR intended_role
-- ------------------------------------------------------------
-- Le rôle authenticated ne dispose d'aucun droit UPDATE table (Migration 26).
-- On garantit explicitement que seuls SELECT est accessible.
GRANT SELECT (intended_role) ON TABLE public.profiles TO authenticated;

-- ------------------------------------------------------------
-- 3. TRIGGER handle_new_user_registration (SECURITY DEFINER)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_full_name VARCHAR;
    v_phone VARCHAR;
    v_intended_role VARCHAR;
BEGIN
    -- 1. Extraction exclusive des informations d'identité personnelle
    v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Utilisateur');
    v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

    -- 2. Capture sécurisée du rôle d'intention initial :
    -- Seules 'company' ou 'reseller' sont acceptées. Toute autre valeur est ignorée (NULL).
    v_intended_role := NULL;
    IF NEW.raw_user_meta_data->>'preferred_role' IN ('company', 'reseller') THEN
        v_intended_role := NEW.raw_user_meta_data->>'preferred_role';
    END IF;

    -- 3. Initialisation du profil utilisateur :
    -- - role : TOUJOURS 'unassigned' (aucun privilège avant complétion)
    -- - onboarding_status : TOUJOURS 'pending'
    -- - intended_role : type verrouillé capturé lors de l'inscription (ou NULL)
    INSERT INTO public.profiles (id, role, full_name, phone, onboarding_status, intended_role)
    VALUES (NEW.id, 'unassigned', v_full_name, v_phone, 'pending', v_intended_role)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_registration();

-- ------------------------------------------------------------
-- 4. REPRISE RÉTROACTIVE DES PROFILS EN ATTENTE EXISTANTS
-- ------------------------------------------------------------
-- Ne traite QUE les profils en attente (role = 'unassigned' et onboarding_status = 'pending')
-- dont intended_role n'est pas encore renseignée, avec preferred_role valide ('company' | 'reseller').
-- Jointure stricte par UUID (p.id = u.id).
UPDATE public.profiles p
SET intended_role = u.raw_user_meta_data->>'preferred_role'
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'unassigned'
  AND p.onboarding_status = 'pending'
  AND p.intended_role IS NULL
  AND u.raw_user_meta_data->>'preferred_role' IN ('company', 'reseller');

-- ------------------------------------------------------------
-- 5. RPC complete_user_onboarding AVEC VERROUILLAGE intended_role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
    p_role character varying,
    p_country_id uuid,
    p_province_id uuid,
    p_city character varying DEFAULT NULL::character varying,
    p_company_name character varying DEFAULT NULL::character varying,
    p_company_description text DEFAULT NULL::text,
    p_company_address text DEFAULT NULL::text,
    p_company_phone character varying DEFAULT NULL::character varying,
    p_business_name character varying DEFAULT NULL::character varying,
    p_reseller_type character varying DEFAULT 'wholesaler'::character varying,
    p_delivery_address text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

    -- 3bis. Contrôle inviolable du verrouillage de type de compte (AUTH-4.38)
    -- Si un intended_role est présent, le rôle demandé DOIT lui correspondre strictement.
    IF v_profile.intended_role IS NOT NULL AND v_profile.intended_role <> p_role THEN
        RAISE EXCEPTION 'Action interdite : le type de compte demandé (%) ne correspond pas au choix initial d''inscription (%).',
            p_role, v_profile.intended_role;
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
    -- Enregistre également intended_role = p_role si elle était NULL (cas libre finalisé)
    UPDATE public.profiles 
    SET role = p_role, 
        onboarding_status = 'completed',
        intended_role = COALESCE(intended_role, p_role)
    WHERE id = v_caller_id;

    -- 9. Retour d'information structuré
    RETURN jsonb_build_object(
        'success', TRUE,
        'role', p_role,
        'onboarding_status', 'completed',
        'intended_role', COALESCE(v_profile.intended_role, p_role),
        'company_id', v_new_company_id
    );
END;
$function$;

-- Révocation et attribution stricte des privilèges d'exécution
REVOKE ALL ON FUNCTION public.complete_user_onboarding(varchar, uuid, uuid, varchar, varchar, text, text, varchar, varchar, varchar, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_user_onboarding(varchar, uuid, uuid, varchar, varchar, text, text, varchar, varchar, varchar, text) TO authenticated;

-- ------------------------------------------------------------
-- 6. VÉRIFICATIONS POSTÉRIEURES D'INTÉGRITÉ
-- ------------------------------------------------------------
DO $$
DECLARE
    v_corrupt_count INT;
BEGIN
    -- 1. Contrôle : aucun profil historique complété n'a été altéré
    SELECT COUNT(*) INTO v_corrupt_count
    FROM public.profiles
    WHERE onboarding_status = 'completed'
      AND role NOT IN ('admin', 'company', 'reseller');

    IF v_corrupt_count > 0 THEN
        RAISE EXCEPTION 'Contrôle post-migration échoué : des profils complétés ont un rôle invalide (% lignes).', v_corrupt_count;
    END IF;

    -- 2. Contrôle : la colonne intended_role existe bien
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'intended_role'
    ) THEN
        RAISE EXCEPTION 'Contrôle post-migration échoué : la colonne profiles.intended_role n''a pas été créée.';
    END IF;
END $$;

COMMIT;

-- ============================================================
-- PROCÉDURE DE RETOUR ARRIÈRE SÛRE (DOC ROLLBACK)
-- ============================================================
-- En cas de besoin de rollback immédiat :
-- 1. Restaurer complete_user_onboarding à sa version Migration 26 (sans le check 3bis).
-- 2. Restaurer handle_new_user_registration à sa version Migration 26 (sans intended_role).
-- 3. La colonne profiles.intended_role étant nullable, sa présence ne bloque aucun flux existant.
--    Elle peut être supprimée si nécessaire :
--    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_intended_role;
--    ALTER TABLE public.profiles DROP COLUMN IF EXISTS intended_role;
-- ============================================================
