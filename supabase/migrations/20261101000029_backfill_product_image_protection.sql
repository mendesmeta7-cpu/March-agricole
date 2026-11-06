-- ============================================================================
-- MIGRATION 29 bis — RATTRAPAGE : protection des photos officielles du catalogue
-- Date : 2026-11-01
--
-- Cet objet existe en production (BR-PROD-04) mais n'était défini dans aucune
-- migration du dépôt : une base reconstruite depuis le dépôt (environnement de
-- test) en était dépourvue. Définition reprise À L'IDENTIQUE de la production
-- (pg_get_functiondef / pg_get_triggerdef, lecture seule du 2026-11-01).
--
-- Idempotente et sans effet sur la production (recrée la même fonction et le
-- même trigger). Le search_path est figé ensuite par la migration 30.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_global_product_image_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.is_global = TRUE AND NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    IF COALESCE(public.current_user_role(), '') <> 'admin' THEN
      RAISE EXCEPTION 'Interdiction : La photo officielle du catalogue global ne peut être modifiée que par un administrateur.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_global_product_images ON public.products;
CREATE TRIGGER trg_protect_global_product_images
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.check_global_product_image_protection();
