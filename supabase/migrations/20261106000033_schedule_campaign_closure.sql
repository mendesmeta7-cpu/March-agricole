-- ============================================================================
-- MIGRATION 33 — PLANIFICATION DE LA CLÔTURE DES CAMPAGNES (C1, ADR-047)
-- Date : 2026-11-06
--
-- ⚠️  NON APPLIQUÉE. Prérequis : migration 32. À valider avec
--     supabase/tests/schedule_033_test.sql.
--
-- Crée la tâche quotidienne de 00 h 05 UTC, INACTIVE : l'application de cette
-- migration ne ferme aucune campagne. L'activation est une opération distincte,
-- sur autorisation :
--     SELECT cron.alter_job(jobid, active := true) FROM cron.job
--     WHERE jobname = 'radiza_close_expired_campaigns';
--
-- Contrôle :
--     SELECT jobid, schedule, active, username, database FROM cron.job
--     WHERE jobname = 'radiza_close_expired_campaigns';
--     SELECT status, return_message, start_time FROM cron.job_run_details
--     WHERE jobid = <jobid> ORDER BY start_time DESC LIMIT 20;
-- Désactivation : même appel avec active := false.
-- Suppression : SELECT cron.unschedule('radiza_close_expired_campaigns');
-- Ne pas supprimer l'extension pour arrêter la tâche : cela efface toutes les tâches.
--
-- Rejouable : une tâche existante n'est jamais modifiée, son état actif est conservé.
-- pg_cron utilise GMT par défaut et n'exécute jamais deux instances d'une même tâche.
-- La commande pose le motif technique exigé par check_and_close_expired_campaigns.
-- ============================================================================

-- Création seulement si l'extension est absente : sur Supabase, IF NOT EXISTS relance
-- quand même le script de droits de pg_cron, qui peut échouer sur une extension présente.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regprocedure('public.check_and_close_expired_campaigns()') IS NULL
       OR to_regprocedure('public.technical_operation_identity()') IS NULL THEN
        RAISE EXCEPTION 'Migration 33 : la migration 32 doit être appliquée d''abord.';
    END IF;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns') THEN
        RAISE NOTICE 'Tâche radiza_close_expired_campaigns déjà présente : aucune modification.';
        RETURN;
    END IF;

    PERFORM cron.schedule_in_database(
        'radiza_close_expired_campaigns',
        '5 0 * * *',
        $job$DO $close$ BEGIN PERFORM set_config('radiza.technical_reason', 'campaign_closure_job', true); PERFORM public.check_and_close_expired_campaigns(); END $close$;$job$,
        current_database(),
        NULL,
        false
    );
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION 33
-- ============================================================================
