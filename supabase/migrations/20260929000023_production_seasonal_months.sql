-- Migration 23: Remplacement des dates calendaires par des saisons agricoles mensuelles
-- Date: 2026-09-29
-- Objectif: La période de plantation/récolte doit être représentée par des mois récurrents (1-12)
--           et non par des dates complètes avec une année spécifique.
--           Cela permet de décrire un calendrier cultural récurrent : "Plantation : avril–juin"
--           valable en 2027, 2028, etc., jusqu'à modification explicite par la société.

-- ÉTAPE 1: Ajout des nouvelles colonnes saisonnières (mois cycliques, 1=janvier à 12=décembre)
-- -----------------------------------------------------------------------------------------

ALTER TABLE public.productions
  ADD COLUMN IF NOT EXISTS planting_start_month SMALLINT,
  ADD COLUMN IF NOT EXISTS planting_end_month SMALLINT,
  ADD COLUMN IF NOT EXISTS harvest_start_month SMALLINT,
  ADD COLUMN IF NOT EXISTS harvest_end_month SMALLINT;

-- ÉTAPE 2: Contraintes CHECK sur les valeurs de mois (1 à 12 uniquement)
-- -----------------------------------------------------------------------------------------

-- Contrainte : les mois doivent être dans l'intervalle [1, 12]
ALTER TABLE public.productions
  ADD CONSTRAINT chk_planting_start_month
    CHECK (planting_start_month IS NULL OR (planting_start_month >= 1 AND planting_start_month <= 12));

ALTER TABLE public.productions
  ADD CONSTRAINT chk_planting_end_month
    CHECK (planting_end_month IS NULL OR (planting_end_month >= 1 AND planting_end_month <= 12));

ALTER TABLE public.productions
  ADD CONSTRAINT chk_harvest_start_month
    CHECK (harvest_start_month IS NULL OR (harvest_start_month >= 1 AND harvest_start_month <= 12));

ALTER TABLE public.productions
  ADD CONSTRAINT chk_harvest_end_month
    CHECK (harvest_end_month IS NULL OR (harvest_end_month >= 1 AND harvest_end_month <= 12));

-- NOTE ARCHITECTURALE IMPORTANTE:
-- On NE supprime PAS les anciennes colonnes period_start et period_end.
-- Elles peuvent contenir des données historiques utiles (ex: une vraie date opérationnelle).
-- La contrainte chk_productions_period (period_end >= period_start) reste en place car
-- elle concerne uniquement les anciennes colonnes, qui ne sont plus renseignées pour les
-- nouvelles productions.
-- Les nouvelles colonnes seasonales n'ont PAS de contrainte "start < end" car une saison
-- peut traverser l'année civile (ex: octobre(10) → février(2) est valide même si 10 > 2).
-- Cette logique cyclique est gérée côté applicatif et d'affichage.

-- ÉTAPE 3: Migration des données existantes (CONSERVATRICE)
-- -----------------------------------------------------------------------------------------
-- Pour les productions existantes ayant des period_start/period_end:
-- On extrait le mois de début comme planting_start_month
-- et le mois de fin comme harvest_end_month.
-- On NE définit PAS planting_end_month et harvest_start_month car on ne peut pas
-- les déduire de manière fiable depuis des dates calendaires.
-- Cette migration est informative uniquement — elle ne doit jamais inventer des données.

UPDATE public.productions
SET
  planting_start_month = EXTRACT(MONTH FROM period_start)::SMALLINT,
  harvest_end_month = CASE
    WHEN period_end IS NOT NULL THEN EXTRACT(MONTH FROM period_end)::SMALLINT
    ELSE NULL
  END
WHERE
  period_start IS NOT NULL
  AND planting_start_month IS NULL; -- N'écrase pas les données déjà migrées

-- ÉTAPE 4: Index pour les requêtes saisonnières
-- -----------------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_productions_planting_start_month
  ON public.productions(planting_start_month)
  WHERE planting_start_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_harvest_end_month
  ON public.productions(harvest_end_month)
  WHERE harvest_end_month IS NOT NULL;

-- ÉTAPE 5: Commentaires documentaires sur les colonnes
-- -----------------------------------------------------------------------------------------

COMMENT ON COLUMN public.productions.planting_start_month IS
  'Mois de début de la période de plantation (1=janvier, 12=décembre). Représentation saisonnière récurrente, sans année.';

COMMENT ON COLUMN public.productions.planting_end_month IS
  'Mois de fin de la période de plantation. Peut être inférieur à planting_start_month si la saison traverse l''année civile (ex: 10→2 = octobre→février).';

COMMENT ON COLUMN public.productions.harvest_start_month IS
  'Mois de début de la période de récolte (1=janvier, 12=décembre). Représentation saisonnière récurrente, sans année.';

COMMENT ON COLUMN public.productions.harvest_end_month IS
  'Mois de fin de la période de récolte. Peut être inférieur à harvest_start_month si la saison de récolte traverse l''année civile.';

COMMENT ON COLUMN public.productions.period_start IS
  '[HISTORIQUE] Ancienne colonne de date calendaire de début de cycle. Conservée pour compatibilité avec l''historique. Remplacée par planting_start_month/planting_end_month pour les nouvelles productions.';

COMMENT ON COLUMN public.productions.period_end IS
  '[HISTORIQUE] Ancienne colonne de date calendaire de fin de cycle/récolte. Conservée pour compatibilité. Remplacée par harvest_start_month/harvest_end_month pour les nouvelles productions.';
