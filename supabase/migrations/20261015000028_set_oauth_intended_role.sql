-- ============================================================================
-- MIGRATION 28 : VERROUILLAGE ATOMIQUE INTENDED_ROLE POUR OAUTH (AUTH-5.11)
-- ============================================================================
-- Permet à un utilisateur authentifié venant d'un flux OAuth externe (Google)
-- de fixer irrévocablement son type de compte ('company' ou 'reseller') dans
-- public.profiles.intended_role, dès son retour sur /auth/callback.
--
-- GARANTIES DE SÉCURITÉ :
-- 1. SECURITY DEFINER avec search_path fixé strictement à 'public', 'pg_temp'.
-- 2. Authentification obligatoire : vérification stricte de auth.uid().
-- 3. Isolation utilisateur : ne peut modifier que sa propre ligne dans profiles.
-- 4. Whitelist stricte : seuls 'company' et 'reseller' sont acceptés.
--    Rejet immédiat de 'admin' ou de toute autre chaîne.
-- 5. Immuabilité (One-way ratchet) :
--    - Ne peut être appelé QUE si onboarding_status = 'pending' et role = 'unassigned'.
--    - Si intended_role est déjà renseigné et identique, l'appel est idempotent.
--    - Si intended_role est déjà renseigné et différent, l'appel lève une exception stricte.
-- 6. Révocation des privilèges d'exécution pour PUBLIC et anon.
--    Attribution exclusive au rôle authenticated.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_user_intended_role(p_role VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_caller_id UUID;
    v_profile RECORD;
BEGIN
    -- 1. Vérification de l'authentification de l'appelant
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié : une session active est requise.';
    END IF;

    -- 2. Validation stricte du rôle demandé (Interdiction absolue du rôle admin)
    IF p_role IS NULL OR p_role NOT IN ('company', 'reseller') THEN
        RAISE EXCEPTION 'Rôle invalide : seuls ''company'' ou ''reseller'' sont autorisés.';
    END IF;

    -- 3. Verrouillage pessimiste de la ligne profil (Protection anti-concurrence)
    SELECT id, role, onboarding_status, intended_role
    INTO v_profile
    FROM public.profiles
    WHERE id = v_caller_id
    FOR UPDATE;

    IF v_profile.id IS NULL THEN
        RAISE EXCEPTION 'Profil utilisateur introuvable.';
    END IF;

    -- 4. Vérification du statut d'onboarding
    IF v_profile.onboarding_status = 'completed' OR v_profile.role <> 'unassigned' THEN
        RAISE EXCEPTION 'Action interdite : l''onboarding de ce compte a déjà été finalisé.';
    END IF;

    -- 5. Contrôle d'immuabilité (Un rôle déjà fixé ne peut jamais être remplacé)
    IF v_profile.intended_role IS NOT NULL THEN
        IF v_profile.intended_role = p_role THEN
            -- Idempotence : le rôle est déjà correctement verrouillé sur cette valeur
            RETURN jsonb_build_object(
                'success', TRUE,
                'intended_role', v_profile.intended_role,
                'status', 'already_locked'
            );
        ELSE
            RAISE EXCEPTION 'Action interdite : le type de compte a déjà été irrévocablement verrouillé sur ''%''.',
                v_profile.intended_role;
        END IF;
    END IF;

    -- 6. Fixation atomique de intended_role dans profiles
    UPDATE public.profiles
    SET intended_role = p_role,
        updated_at = NOW()
    WHERE id = v_caller_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'intended_role', p_role,
        'status', 'locked'
    );
END;
$$;

-- Révocation et attribution stricte des privilèges d'exécution
REVOKE ALL ON FUNCTION public.set_user_intended_role(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_intended_role(VARCHAR) TO authenticated;
