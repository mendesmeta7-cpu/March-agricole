-- Migration 20261030112554_auth_user_has_password.sql
-- AUTH-6 — Détection de mot de passe Radiza
-- Propriétaire attendu : postgres
-- Objectif : Conditionner l'affichage du champ "mot de passe actuel" dans les profils Société et Revendeur

CREATE OR REPLACE FUNCTION public.auth_user_has_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()                  -- Auto-restriction stricte : utilisateur connecté uniquement
      AND encrypted_password IS NOT NULL    -- Mot de passe renseigné
      AND encrypted_password <> ''          -- Chaîne non vide
  );
$$;

-- Révocation stricte des privilèges publics et anonymes
REVOKE ALL ON FUNCTION public.auth_user_has_password() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_has_password() FROM anon;

-- Attribution exclusive aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.auth_user_has_password() TO authenticated;

-- Documentation de la fonction dans le catalogue PostgreSQL
COMMENT ON FUNCTION public.auth_user_has_password()
IS 'Retourne TRUE si l''utilisateur connecté possède un mot de passe Radiza défini dans auth.users.
Retourne FALSE si compte OAuth pur (sans mot de passe local) ou en l''absence de session valide.
SECURITY DEFINER requis pour accéder à auth.users depuis le rôle authenticated.
Auto-restriction inviolable : WHERE id = auth.uid() — impossible d''interroger un compte tiers.';
