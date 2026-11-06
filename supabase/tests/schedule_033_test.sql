-- ============================================================================
-- TESTS — MIGRATION 33 (TÂCHE DE CLÔTURE INACTIVE)
-- À exécuter UNIQUEMENT sur l'environnement de test, APRÈS les migrations 032 et 033.
-- JAMAIS en production. Tout est encadré par BEGIN ... ROLLBACK.
-- Attendu : notices P1 OK … P4 OK puis « ✅ PLANIFICATION 033 VALIDÉE ».
-- ============================================================================
BEGIN;

-- P1 — Extension installée, tâche unique, inactive, horaire et commande attendus
DO $$
DECLARE
    v_job record;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE EXCEPTION 'P1 ÉCHEC : pg_cron non installée';
    END IF;
    IF (SELECT count(*) FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns') <> 1 THEN
        RAISE EXCEPTION 'P1 ÉCHEC : la tâche n''existe pas exactement une fois';
    END IF;
    SELECT * INTO v_job FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns';
    IF v_job.active THEN RAISE EXCEPTION 'P1 ÉCHEC : tâche active à la création'; END IF;
    IF v_job.schedule <> '5 0 * * *' THEN RAISE EXCEPTION 'P1 ÉCHEC : horaire %', v_job.schedule; END IF;
    IF v_job.command NOT LIKE '%campaign_closure_job%' OR v_job.command NOT LIKE '%check_and_close_expired_campaigns%' THEN
        RAISE EXCEPTION 'P1 ÉCHEC : commande inattendue';
    END IF;
    RAISE NOTICE 'P1 OK — tâche unique et inactive';
END $$;

-- P2 — Aucune exécution : l'application de la migration n'a fermé aucune campagne
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job_run_details r JOIN cron.job j ON j.jobid = r.jobid
               WHERE j.jobname = 'radiza_close_expired_campaigns') THEN
        RAISE EXCEPTION 'P2 ÉCHEC : la tâche a déjà été exécutée';
    END IF;
    IF EXISTS (SELECT 1 FROM public.audit_logs WHERE action = 'CAMPAIGN_AUTO_CLOSED'
               AND details ->> 'reason' = 'campaign_closure_job') THEN
        RAISE EXCEPTION 'P2 ÉCHEC : une clôture planifiée est journalisée';
    END IF;
    RAISE NOTICE 'P2 OK — aucune clôture à l''application';
END $$;

-- P3 — Rejouable : la condition de la migration ne crée pas de doublon et ne touche
--      pas à une tâche déjà activée
DO $$
DECLARE
    v_job bigint := (SELECT jobid FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns');
BEGIN
    PERFORM cron.alter_job(v_job, active := true);
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns') THEN
        PERFORM cron.schedule_in_database('radiza_close_expired_campaigns', '5 0 * * *', 'SELECT 1', current_database(), NULL, false);
    END IF;
    IF (SELECT count(*) FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns') <> 1
       OR NOT (SELECT active FROM cron.job WHERE jobid = v_job) THEN
        RAISE EXCEPTION 'P3 ÉCHEC : doublon ou tâche activée modifiée';
    END IF;
    PERFORM cron.alter_job(v_job, active := false);
    IF (SELECT active FROM cron.job WHERE jobid = v_job) THEN
        RAISE EXCEPTION 'P3 ÉCHEC : désactivation sans effet';
    END IF;
    RAISE NOTICE 'P3 OK — activation, désactivation, absence de doublon';
END $$;

-- P4 — La commande de la tâche s'exécute et s'identifie comme opération système
DO $$
DECLARE
    v_rows integer;
BEGIN
    EXECUTE (SELECT command FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns');
    SELECT count(*) INTO v_rows FROM public.audit_logs
    WHERE action = 'CAMPAIGN_AUTO_CLOSED' AND details ->> 'reason' <> 'campaign_closure_job'
      AND created_at = now();
    IF v_rows <> 0 THEN RAISE EXCEPTION 'P4 ÉCHEC : clôture journalisée sans le motif de la tâche'; END IF;
    RAISE NOTICE 'P4 OK — commande exécutée (annulée par le ROLLBACK)';
END $$;

DO $$ BEGIN RAISE NOTICE '✅ PLANIFICATION 033 VALIDÉE'; END $$;

ROLLBACK;
