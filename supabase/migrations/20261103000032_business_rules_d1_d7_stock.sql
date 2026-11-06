-- ============================================================================
-- MIGRATION 32 — RÈGLES MÉTIER D1–D7, C1–C3 ET STOCK AGRÉGÉ DES REVENDEURS
-- Date : 2026-11-03
-- Référence : ADR-046 (docs/decisions-log.md), docs/business-rules.md
--
-- ⚠️  NON APPLIQUÉE. Prérequis : migrations 029, 030 et 031 (non modifiées).
--     À valider sur l'environnement de test avec
--     supabase/tests/business_rules_032_test.sql.
--
-- Décisions couvertes :
--   C1  clôture automatique des campagnes 'active' ET 'paused' expirées
--   C2  une campagne effectivement expirée n'engage plus de volume
--   C3  réouverture par report d'au moins une destination, sans prolonger la
--       date générale si celle-ci est encore valide
--   D1  produit / unité d'une production engagée figés
--   D2  campagne créée / ouverte uniquement sur une production récoltée
--   D3  passage public → non public et archivage interdits si production engagée
--   D5  règles de date générale à la réouverture
--   D6  une campagne expirée ne contourne pas la réouverture en modifiant sa date
--   Stock revendeur : disponible agrégé, sans réservation individuelle exposée
--
-- Sécurité : toutes les nouvelles fonctions utilisent search_path = '' et des
-- noms entièrement qualifiés (aucune dépendance au schéma public pour la
-- résolution des noms). create_order_with_reservation est reprise de la 031 à
-- l'identique avec un seul ajout marqué C2 ; son search_path est vidé (R-1, revue 032).
-- Idempotente, sans suppression de données ni de tables, sans écriture sur les
-- lignes existantes. Planification de la clôture : migration 33.
-- Finalisation (revue 032) : destinations gardées aussi sur une campagne expirée
-- par sa date générale (§6), D2 revérifié à toute réouverture (§5), modification
-- atomique campagne + destinations (§7 bis, C-6), droits de
-- create_order_with_reservation réaffirmés (§11). Arbitrage C3 : une destination
-- créée après l'expiration de sa date limite ne rouvre jamais une campagne (§6).
-- Dates : convention UTC partout (comme l'application). CURRENT_DATE et les conversions
-- timestamptz::date suivent le fuseau de la session, qu'un client peut changer.
-- Décisions de réouverture et de clôture (ADR-047) : la date générale prévaut sur les
-- destinations ; statut d'origine conservé par status_before_completion (§0) ; aucun
-- administrateur ne rouvre ; opérations sans utilisateur limitées aux sessions directes
-- avec motif (§0 bis) ; réouvertures journalisées (§5, §6) ; clôture réservée au
-- propriétaire et à la tâche planifiée de la migration 33 (§10, §11).
-- ============================================================================


-- ============================================================================
-- 0. STATUT D'ORIGINE D'UNE CAMPAGNE TERMINÉE (ADR-047)
--    Renseignée et protégée uniquement par le trigger du §5, pour tous les rôles.
--    Vide pour les campagnes déjà terminées avant cette migration : elles reviennent
--    à 'active' (l'ancienne clôture ne fermait que des campagnes actives).
-- ============================================================================
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS status_before_completion VARCHAR(30);

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS chk_campaigns_status_before_completion;
ALTER TABLE public.campaigns ADD CONSTRAINT chk_campaigns_status_before_completion CHECK (
    status_before_completion IS NULL
    OR (status = 'completed' AND status_before_completion IN ('draft', 'active', 'paused'))
);


-- ============================================================================
-- 0 bis. OPÉRATIONS TECHNIQUES ET AUTORISATION DE RÉOUVERTURE (ADR-047)
--    Opération technique = session directe à la base (session_user dans la liste
--    ci-dessous) ET motif explicite. Une requête API (PostgREST se connecte en
--    'authenticator', y compris avec la clé service_role) n'en est jamais une : elle
--    ne peut pas changer session_user, qui ne dépend ni de SET ROLE ni de
--    SECURITY DEFINER. Fonctions internes, non exposées à l'API (§11).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.technical_operation_identity()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_reason text := NULLIF(btrim(current_setting('radiza.technical_reason', true)), '');
BEGIN
    IF session_user::text NOT IN ('postgres', 'supabase_admin') OR v_reason IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object('actor_type', 'system', 'system_actor', session_user::text, 'reason', v_reason,
        'application_name', current_setting('application_name', true));
END;
$function$;

-- Renvoie l'identité à journaliser, ou refuse la réouverture
CREATE OR REPLACE FUNCTION public.authorize_campaign_reopening(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_identity jsonb;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        IF COALESCE(public.current_user_role(), '') = 'admin' THEN
            RAISE EXCEPTION 'Un administrateur ne peut pas rouvrir une campagne.';
        END IF;
        IF NOT public.is_company_member_or_creator(p_company_id) THEN
            RAISE EXCEPTION 'Action non autorisée sur cette campagne.';
        END IF;
        RETURN jsonb_build_object('actor_type', 'company_user');
    END IF;

    v_identity := public.technical_operation_identity();
    IF v_identity IS NULL THEN
        RAISE EXCEPTION 'Réouverture refusée : opération technique non identifiée.';
    END IF;
    RETURN v_identity;
END;
$function$;


-- ============================================================================
-- 1. CAMPAGNE EFFECTIVEMENT OUVERTE (C2) — miroir de src/lib/utils/campaignStatus.ts
--    Ouverte si : statut draft/active/paused, date générale non dépassée (NULL =
--    sans limite), et au moins une destination ouverte (date limite NULL = sans
--    limite, donc ouverte) OU aucune destination définie.
--    Les dates sont comparées à la date UTC, jamais à CURRENT_DATE (qui suit le
--    fuseau de la session, modifiable par le client), comme l'interface
--    (toISOString().split("T")[0]).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_campaign_effectively_open(
    p_status text,
    p_end_date date,
    p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT p_status IN ('draft', 'active', 'paused')
       AND (p_end_date IS NULL OR p_end_date >= (now() AT TIME ZONE 'UTC')::date)
       AND (
            NOT EXISTS (SELECT 1 FROM public.campaign_destinations d
                        WHERE d.campaign_id = p_campaign_id)
         OR EXISTS (SELECT 1 FROM public.campaign_destinations d
                    WHERE d.campaign_id = p_campaign_id
                      AND (d.order_deadline_date IS NULL OR d.order_deadline_date >= (now() AT TIME ZONE 'UTC')::date))
       );
$$;


-- ============================================================================
-- 2. VOLUME ENGAGÉ D'UNE PRODUCTION (A3 + C2) — même signature que la 031
--    = volume commercialisable des campagnes EFFECTIVEMENT ouvertes
--    + réservations actives/livrées hors de ces campagnes (campagnes closes ou
--      expirées, commandes issues de propositions).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_production_committed_quantity(
    p_production_id uuid,
    p_exclude_campaign_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        COALESCE((
            SELECT SUM(c.marketable_quantity)
            FROM public.campaigns c
            WHERE c.production_id = p_production_id
              AND c.id IS DISTINCT FROM p_exclude_campaign_id
              AND public.is_campaign_effectively_open(c.status, c.end_date, c.id)
        ), 0)
      + COALESCE((
            SELECT SUM(sr.quantity)
            FROM public.stock_reservations sr
            LEFT JOIN public.campaigns c ON c.id = sr.campaign_id
            WHERE sr.status IN ('active', 'confirmed')
              AND (sr.production_id = p_production_id OR c.production_id = p_production_id)
              AND (c.id IS NULL
                   OR (c.id IS DISTINCT FROM p_exclude_campaign_id
                       AND NOT public.is_campaign_effectively_open(c.status, c.end_date, c.id)))
        ), 0)::numeric;
$$;


-- ============================================================================
-- 3. COMMANDE SUR CAMPAGNE (C2) — fonction de la 031 + contrôle d'ouverture
--    effective (cas d'un revendeur couvert par une zone de livraison sans
--    destination propre, qui échappait au contrôle des dates limites).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
    p_reseller_id uuid,
    p_campaign_id uuid,
    p_quantity numeric,
    p_delivery_province_id uuid DEFAULT NULL::uuid,
    p_delivery_city character varying DEFAULT NULL::character varying,
    p_delivery_address text DEFAULT NULL::text,
    p_notes text DEFAULT NULL::text,
    p_destination_id uuid DEFAULT NULL::uuid,
    p_depot_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(order_id uuid, order_number character varying, total_amount numeric, reserved_quantity numeric)
LANGUAGE plpgsql
SECURITY DEFINER
-- R-1 (revue 032) : search_path vide. Vérifié avant changement : toutes les tables
-- sont qualifiées public., auth.uid() est qualifié, et les fonctions / opérateurs /
-- types non qualifiés (TRIM, TO_CHAR, UPPER, SUBSTRING, NOW, gen_random_uuid,
-- jsonb_build_object, ||, ::text, NUMERIC, VARCHAR…) appartiennent à pg_catalog,
-- toujours consulté en premier. Aucun objet ne peut plus être substitué via public.
SET search_path = ''
AS $function$
DECLARE
    v_campaign RECORD; v_destination RECORD; v_depot RECORD; v_reseller RECORD;
    v_product_name TEXT; v_reseller_province_id UUID; v_is_eligible BOOLEAN;
    v_reserved_qty NUMERIC(12,2); v_available_qty NUMERIC(12,2);
    v_production_expected NUMERIC(12,2); v_production_available NUMERIC(12,2);
    v_new_order_id UUID; v_order_number VARCHAR; v_total_amount NUMERIC(14,2);
    v_final_city VARCHAR(100); v_final_address TEXT; v_arrival_date DATE; v_depot_name VARCHAR(255);
    v_final_destination_id UUID := NULL; v_final_depot_id UUID := NULL; v_notif_user_id UUID := NULL;
    v_today DATE := (NOW() AT TIME ZONE 'UTC')::date;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour passer commande.';
    END IF;
    IF auth.uid() <> p_reseller_id AND COALESCE(public.current_user_role(), '') <> 'admin' THEN
        RAISE EXCEPTION 'Acces refuse';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reseller_id AND role = 'reseller') THEN
        RAISE EXCEPTION 'Seuls les revendeurs enregistres peuvent passer commande';
    END IF;
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantite commandee doit etre strictement superieure a zero';
    END IF;

    SELECT * INTO v_reseller FROM public.resellers WHERE id = p_reseller_id;
    IF NOT FOUND OR v_reseller.province_id IS NULL THEN
        RAISE EXCEPTION 'Profil revendeur incomplet : province de rattachement introuvable';
    END IF;
    v_reseller_province_id := v_reseller.province_id;

    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable'; END IF;
    IF v_campaign.status <> 'active' THEN
        RAISE EXCEPTION 'La campagne n''est pas ouverte aux commandes (Statut : %)', v_campaign.status;
    END IF;

    -- C2 (migration 32) : la campagne doit être EFFECTIVEMENT ouverte (date générale
    -- non dépassée, au moins une destination ouverte ou aucune destination). Couvre le
    -- revendeur desservi par une zone de livraison sans destination propre.
    IF NOT public.is_campaign_effectively_open(v_campaign.status, v_campaign.end_date, v_campaign.id) THEN
        RAISE EXCEPTION 'La campagne n''est plus dans sa periode de commercialisation (date de fin ou dates limites de toutes ses destinations depassees)';
    END IF;
    IF (v_campaign.start_date > v_today) OR (v_campaign.end_date IS NOT NULL AND v_campaign.end_date < v_today) THEN
        RAISE EXCEPTION 'La campagne n''est plus dans sa periode de commercialisation';
    END IF;
    IF p_quantity < v_campaign.min_order_quantity THEN
        RAISE EXCEPTION 'Quantite inferieure au minimum autorise';
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.campaign_destinations WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id)
        OR EXISTS(SELECT 1 FROM public.campaign_delivery_zones WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id)
      INTO v_is_eligible;
    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre region';
    END IF;

    v_final_city := TRIM(COALESCE(p_delivery_city, v_reseller.city));
    v_final_address := TRIM(COALESCE(p_delivery_address, v_reseller.delivery_address));

    IF p_destination_id IS NOT NULL THEN
        SELECT * INTO v_destination FROM public.campaign_destinations WHERE id = p_destination_id AND campaign_id = p_campaign_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'La destination specifiee n''appartient pas a cette offre'; END IF;
        IF v_destination.province_id <> v_reseller_province_id THEN
            RAISE EXCEPTION 'Cette campagne n''est pas disponible dans votre region';
        END IF;
        v_final_destination_id := v_destination.id;
        v_arrival_date := v_destination.expected_arrival_date;
        v_final_city := v_destination.city_name;
    ELSE
        SELECT * INTO v_destination FROM public.campaign_destinations WHERE campaign_id = p_campaign_id AND province_id = v_reseller_province_id LIMIT 1;
        IF FOUND THEN
            v_final_destination_id := v_destination.id;
            v_arrival_date := v_destination.expected_arrival_date;
            v_final_city := v_destination.city_name;
        END IF;
    END IF;

    IF v_final_destination_id IS NOT NULL AND v_destination.order_deadline_date IS NOT NULL THEN
        IF v_destination.order_deadline_date < v_today THEN
            RAISE EXCEPTION 'La periode de commande pour la destination "%" est terminee depuis le %. Aucune nouvelle commande ne peut etre acceptee pour cette region.',
                v_destination.city_name, TO_CHAR(v_destination.order_deadline_date, 'DD/MM/YYYY');
        END IF;
    END IF;

    IF p_depot_id IS NOT NULL THEN
        SELECT * INTO v_depot FROM public.campaign_depots WHERE id = p_depot_id AND campaign_id = p_campaign_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Le depot selectionne n''appartient pas a cette campagne'; END IF;
        IF v_final_destination_id IS NOT NULL AND v_depot.campaign_destination_id <> v_final_destination_id THEN
            RAISE EXCEPTION 'Le depot selectionne ne correspond pas a la destination de votre region';
        END IF;
        v_final_depot_id := v_depot.id;
        v_depot_name := v_depot.name || ' (' || v_depot.commune || CASE WHEN v_depot.quartier IS NOT NULL THEN ' - ' || v_depot.quartier ELSE '' END || ')';
        IF v_final_address IS NULL OR v_final_address = '' THEN
            v_final_address := v_depot.address || CASE WHEN v_depot.complement IS NOT NULL THEN ' (' || v_depot.complement || ')' ELSE '' END;
        END IF;
    END IF;

    -- Stock de la campagne (A11) : commandes en cours ET commandes livrées
    v_reserved_qty := public.get_campaign_consumed_quantity(p_campaign_id);
    v_available_qty := v_campaign.marketable_quantity - v_reserved_qty;
    IF p_quantity > v_available_qty THEN
        RAISE EXCEPTION 'Stock disponible insuffisant (Disponible : %, Demande : %)', v_available_qty, p_quantity;
    END IF;

    -- NOUVEAU : stock physique de la production (verrou partagé avec les propositions)
    SELECT expected_quantity INTO v_production_expected
    FROM public.productions WHERE id = v_campaign.production_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Production source introuvable'; END IF;
    v_production_available := v_production_expected - public.get_production_reserved_quantity(v_campaign.production_id);
    IF p_quantity > v_production_available THEN
        RAISE EXCEPTION 'Stock disponible insuffisant sur la production (Disponible : %, Demande : %)', v_production_available, p_quantity;
    END IF;

    v_total_amount := (p_quantity * v_campaign.unit_price)::NUMERIC(14,2);
    v_order_number := 'CMD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
    SELECT name INTO v_product_name FROM public.products WHERE id = v_campaign.product_id;
    SELECT created_by INTO v_notif_user_id FROM public.companies WHERE id = v_campaign.company_id LIMIT 1;

    INSERT INTO public.orders(order_number, reseller_id, company_id, campaign_id, total_amount, currency,
        delivery_province_id, delivery_city, delivery_address, notes, destination_id, depot_id,
        expected_arrival_date_snapshot, destination_city_snapshot, depot_name_snapshot, status)
    VALUES (v_order_number, p_reseller_id, v_campaign.company_id, p_campaign_id, v_total_amount, v_campaign.currency,
        v_reseller_province_id, v_final_city, v_final_address, TRIM(p_notes), v_final_destination_id, v_final_depot_id,
        v_arrival_date, v_final_city, v_depot_name, 'pending')
    RETURNING id INTO v_new_order_id;

    INSERT INTO public.order_items(order_id, product_id, quantity, unit, unit_price, subtotal, product_name_snapshot)
    VALUES (v_new_order_id, v_campaign.product_id, p_quantity, v_campaign.unit, v_campaign.unit_price, v_total_amount, v_product_name);

    INSERT INTO public.stock_reservations(campaign_id, order_id, production_id, quantity, status)
    VALUES (p_campaign_id, v_new_order_id, v_campaign.production_id, p_quantity, 'active');

    IF v_notif_user_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, message, related_entity_type, related_entity_id, action_url)
        VALUES (v_notif_user_id, 'COMMANDE_CREEE', 'Nouvelle commande recue !',
            'Un revendeur a passe commande de ' || p_quantity || ' ' || v_campaign.unit || ' sur votre offre ' || v_campaign.title || '.'
                || CASE WHEN v_final_city IS NOT NULL THEN ' Destination : ' || v_final_city ELSE '' END,
            'order', v_new_order_id, '/dashboard/company/orders/' || v_new_order_id);
    END IF;

    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'ORDER_CREATED_WITH_RESERVATION', 'order', v_new_order_id,
        jsonb_build_object('campaign_id', p_campaign_id, 'reseller_id', p_reseller_id, 'quantity', p_quantity,
            'unit_price', v_campaign.unit_price, 'total_amount', v_total_amount,
            'destination_id', v_final_destination_id, 'depot_id', v_final_depot_id,
            'reseller_province_id', v_reseller_province_id, 'delivery_city', v_final_city,
            'destination_deadline_checked', v_destination.order_deadline_date::text));

    RETURN QUERY SELECT v_new_order_id, v_order_number, v_total_amount, p_quantity;
END;
$function$;


-- ============================================================================
-- 4. PROTECTION DES PRODUCTIONS ENGAGÉES (A4, D1, D3)
--    Remplace trg_guard_production_status (031). Une production est engagée si
--    une campagne 'active' ou 'paused' EFFECTIVEMENT ouverte en dépend (C2).
--    Comparaisons IS DISTINCT FROM : une mise à jour qui renvoie des valeurs
--    inchangées (formulaire d'édition descriptive) n'est jamais bloquée.
-- ============================================================================
DROP TRIGGER IF EXISTS trg_guard_production_status ON public.productions;
DROP FUNCTION IF EXISTS public.guard_production_status();

CREATE OR REPLACE FUNCTION public.guard_production_commitments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- C-4 — UNITÉ DE MESURE (contrôlée en premier, indépendamment de l'engagement D1) :
    -- toute quantité déjà exprimée dans l'unité de la production doit le rester.
    -- Bloquent le changement : une campagne non annulée (brouillon compris : son unité
    -- est celle de la production), une réservation en cours ('active'), une proposition
    -- commerciale ouverte ('proposed'/'accepted'). Ne bloquent PAS : les campagnes
    -- annulées, les réservations libérées ('released') ou déjà livrées ('confirmed') qui
    -- ne relèvent plus d'une campagne non annulée.
    IF NEW.unit IS DISTINCT FROM OLD.unit AND (
           EXISTS (SELECT 1 FROM public.campaigns c
                   WHERE c.production_id = NEW.id AND c.status <> 'cancelled')
        OR EXISTS (SELECT 1 FROM public.stock_reservations sr
                   LEFT JOIN public.campaigns c ON c.id = sr.campaign_id
                   WHERE sr.status = 'active'
                     AND (sr.production_id = NEW.id OR c.production_id = NEW.id))
        OR EXISTS (SELECT 1 FROM public.demand_responses dr
                   WHERE dr.production_id = NEW.id AND dr.status IN ('proposed', 'accepted'))
    ) THEN
        RAISE EXCEPTION 'Impossible de changer l''unité de mesure d''une production tant qu''une campagne non annulée, une réservation en cours ou une proposition ouverte y est rattachée.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.production_id = NEW.id
          AND c.status IN ('active', 'paused')
          AND public.is_campaign_effectively_open(c.status, c.end_date, c.id)
    ) THEN
        RETURN NEW;
    END IF;

    -- A4 (message identique à la 031) — inclut l'archivage (status 'cancelled')
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Impossible de modifier le statut d''une production récoltée tant qu''une campagne active ou suspendue y est rattachée. Terminez ou annulez d''abord la campagne.';
    END IF;

    -- D1 — produit (directement ou via la configuration produit de l'exploitation)
    IF NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.company_product_id IS DISTINCT FROM OLD.company_product_id THEN
        RAISE EXCEPTION 'Impossible de changer le produit d''une production tant qu''une campagne active ou suspendue y est rattachée.';
    END IF;

    -- D3 — public → non public (le passage inverse reste autorisé)
    IF OLD.is_public IS TRUE AND NEW.is_public IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Impossible de rendre non publique une production tant qu''une campagne active ou suspendue y est rattachée.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_production_commitments ON public.productions;
CREATE TRIGGER trg_guard_production_commitments
    BEFORE UPDATE OF status, product_id, company_product_id, unit, is_public ON public.productions
    FOR EACH ROW EXECUTE FUNCTION public.guard_production_commitments();


-- ============================================================================
-- 4 bis. COHÉRENCE CAMPAGNE / PRODUCTION (C-4 : unité) — reprise de la fonction de
--    la 031 (même entreprise, même produit, campagne ≤ production, réduction
--    impossible sous le consommé A11) + unité identique à celle de la production.
--    Le trigger (créé par la 030) est recréé pour réagir aussi à la colonne unit.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_campaign_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_consumed numeric;
    v_production record;
BEGIN
    SELECT p.company_id, p.product_id, p.expected_quantity, p.unit INTO v_production
    FROM public.productions p WHERE p.id = NEW.production_id;

    IF NOT FOUND OR v_production.company_id <> NEW.company_id THEN
        RAISE EXCEPTION 'La production d''une campagne doit appartenir à la même exploitation.';
    END IF;

    IF NEW.product_id <> v_production.product_id THEN
        RAISE EXCEPTION 'Le produit de la campagne doit être celui de la production source.';
    END IF;

    -- C-4 : les quantités d'une campagne s'expriment dans l'unité de sa production
    -- (sinon A3 comparerait des quantités d'unités différentes).
    IF NEW.unit IS DISTINCT FROM v_production.unit THEN
        RAISE EXCEPTION 'L''unité de la campagne (%) doit être celle de sa production (%).',
            COALESCE(NEW.unit, 'non précisée'), COALESCE(v_production.unit, 'non précisée');
    END IF;

    IF NEW.marketable_quantity > v_production.expected_quantity THEN
        RAISE EXCEPTION 'La quantité commercialisable (%) dépasse la quantité de la production (%).',
            NEW.marketable_quantity, v_production.expected_quantity;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.marketable_quantity < OLD.marketable_quantity THEN
        v_consumed := public.get_campaign_consumed_quantity(NEW.id);
        IF NEW.marketable_quantity < v_consumed THEN
            RAISE EXCEPTION 'La quantité commercialisable (%) ne peut pas être inférieure au volume déjà réservé ou livré (%).',
                NEW.marketable_quantity, v_consumed;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_campaign_consistency ON public.campaigns;
CREATE TRIGGER trg_guard_campaign_consistency
    BEFORE INSERT OR UPDATE OF production_id, company_id, product_id, marketable_quantity, unit ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_consistency();


-- ============================================================================
-- 5. RÈGLES DES CAMPAGNES (A3, A12, A12-bis, C2, C3, D2, D5, D6)
--    Redéfinition de la fonction du trigger trg_guard_campaign_business_rules (créé
--    par la 031), recréé en fin de section pour réagir aussi à status_before_completion.
--    Une campagne terminée ne revient qu'à son statut d'origine : une campagne suspendue
--    reste suspendue après réouverture, jusqu'à sa reprise explicite (ADR-047).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_campaign_business_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_production_status text;
    v_expected numeric;
    v_committed numeric;
    v_old_open boolean := FALSE;
    v_new_open boolean;
    v_reopening boolean := FALSE;
    v_end_date_expired boolean := FALSE;
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_actor jsonb;
BEGIN
    v_new_open := public.is_campaign_effectively_open(NEW.status, NEW.end_date, NEW.id);
    IF TG_OP = 'UPDATE' THEN
        v_old_open := public.is_campaign_effectively_open(OLD.status, OLD.end_date, OLD.id);
        -- Réouverture = campagne close (completed) remise dans un statut ouvert,
        -- ou campagne au statut ouvert mais effectivement expirée qui redevient ouverte.
        v_reopening := (OLD.status = 'completed' AND NEW.status IN ('draft', 'active', 'paused'))
                    OR (OLD.status IN ('draft', 'active', 'paused') AND NOT v_old_open AND v_new_open);
    END IF;

    -- A12 — une campagne annulée n'est jamais réactivée
    IF TG_OP = 'UPDATE' AND OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
        RAISE EXCEPTION 'Une campagne annulée ne peut pas être réactivée.';
    END IF;

    -- ADR-047 — une campagne terminée ne revient qu'à son statut d'origine
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status IN ('draft', 'active', 'paused')
       AND NEW.status IS DISTINCT FROM COALESCE(OLD.status_before_completion, 'active') THEN
        RAISE EXCEPTION 'Une campagne terminée ne peut revenir qu''à son statut précédent (%).',
            COALESCE(OLD.status_before_completion, 'active');
    END IF;

    -- ADR-047 — statut d'origine : toute valeur transmise est ignorée
    IF TG_OP = 'INSERT' THEN
        NEW.status_before_completion := NULL;
    ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        NEW.status_before_completion := OLD.status;
    ELSIF NEW.status = 'completed' THEN
        NEW.status_before_completion := OLD.status_before_completion;
    ELSE
        NEW.status_before_completion := NULL;
    END IF;

    -- ADR-047 — aucun administrateur, aucune opération non identifiée
    IF v_reopening THEN
        v_actor := public.authorize_campaign_reopening(NEW.company_id);
    END IF;

    -- D2 — production récoltée exigée à la création (même en brouillon), au
    --      changement de production, à toute activation / réactivation, et à toute
    --      réouverture sans changement de statut (BR-CMP-09 : ex. campagne 'active'
    --      expirée par sa date générale, rouverte par une nouvelle date)
    IF TG_OP = 'INSERT'
       OR NEW.production_id IS DISTINCT FROM OLD.production_id
       OR (NEW.status IN ('active', 'paused') AND NEW.status IS DISTINCT FROM OLD.status)
       OR v_reopening THEN
        SELECT p.status INTO v_production_status FROM public.productions p WHERE p.id = NEW.production_id;
        IF v_production_status IS DISTINCT FROM 'harvested' THEN
            RAISE EXCEPTION 'Une campagne ne peut être créée ou ouverte que sur une production récoltée (statut actuel de la production : %).',
                COALESCE(v_production_status, 'inconnu');
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_end_date_expired := OLD.end_date IS NOT NULL AND OLD.end_date < v_today;

        -- D5 / D6 — si l'expiration vient de la date générale, une nouvelle date est
        -- obligatoire. Toute modification de date à la réouverture, ou de la date
        -- d'une campagne déjà expirée par sa date, respecte D5. (C3 : si la date
        -- générale est encore valide, la réouverture n'exige pas de la prolonger.)
        IF (v_reopening AND v_end_date_expired)
           OR (v_reopening AND NEW.end_date IS DISTINCT FROM OLD.end_date)
           OR (v_end_date_expired AND NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
            IF NEW.end_date IS NULL OR NEW.end_date < v_today THEN
                RAISE EXCEPTION 'Réouverture : la nouvelle date de fin est obligatoire et doit être au moins égale à aujourd''hui.';
            END IF;
            IF OLD.end_date IS NOT NULL AND NEW.end_date <= OLD.end_date THEN
                RAISE EXCEPTION 'Réouverture : la nouvelle date de fin doit être strictement postérieure à l''ancienne (%).',
                    to_char(OLD.end_date, 'DD/MM/YYYY');
            END IF;
        END IF;

        -- A12-bis / C3 — une réouverture doit aboutir à une campagne réellement
        -- ouverte : si toutes les destinations sont expirées, au moins une date
        -- limite doit avoir été reportée (reopen_campaign le fait dans la même
        -- transaction, avant cette mise à jour).
        IF OLD.status = 'completed' AND NEW.status IN ('draft', 'active', 'paused') AND NOT v_new_open THEN
            RAISE EXCEPTION 'Réouverture impossible : toutes les destinations sont expirées. Reportez au moins une date limite de destination.';
        END IF;
    END IF;

    -- A3 (+ C2) — volume engagé contrôlé quand la campagne devient ou reste
    -- effectivement ouverte avec un engagement nouveau ou accru.
    IF v_new_open AND (
           TG_OP = 'INSERT'
        OR NOT v_old_open
        OR NEW.production_id IS DISTINCT FROM OLD.production_id
        OR NEW.marketable_quantity > OLD.marketable_quantity) THEN
        SELECT p.expected_quantity INTO v_expected
        FROM public.productions p WHERE p.id = NEW.production_id FOR UPDATE;

        v_committed := public.get_production_committed_quantity(NEW.production_id, NEW.id);
        IF v_committed + NEW.marketable_quantity > v_expected THEN
            RAISE EXCEPTION 'Volume insuffisant sur la production : % déjà engagé(s) sur % ; disponible pour cette campagne : %.',
                v_committed, v_expected, GREATEST(v_expected - v_committed, 0);
        END IF;
    END IF;

    -- ADR-047 — journal écrit après tous les contrôles (une réouverture = une ligne ;
    -- un report qui rouvre seul est journalisé au §6, et n'arrive donc pas ici)
    IF v_reopening THEN
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'CAMPAIGN_REOPENED', 'campaign', NEW.id,
            v_actor || jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status,
                'old_end_date', OLD.end_date, 'new_end_date', NEW.end_date));
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_campaign_business_rules ON public.campaigns;
CREATE TRIGGER trg_guard_campaign_business_rules
    BEFORE INSERT OR UPDATE OF status, production_id, marketable_quantity, end_date, status_before_completion ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_business_rules();


-- ============================================================================
-- 6. DESTINATIONS : DÉPLACEMENT, AJOUT, SUPPRESSION ET REPORT (C-2, C-3, R-4, C3, D2, A3)
--    Règles (décisions validées) :
--      * une destination ne change jamais de campagne (C-2) ;
--      * seul le REPORT de la date limite d'une destination existante peut rouvrir
--        une campagne expirée (C3) ; un AJOUT ou une SUPPRESSION ne le peut jamais
--        (y compris la suppression de la dernière destination expirée, qui rendrait la
--        campagne « sans destination » donc ouverte) ;
--      * un report qui rouvre une campagne au statut ouvert revérifie D2 et A3 ;
--        pour une campagne 'completed', ces contrôles ont lieu au changement de
--        statut (trigger §5, via reopen_campaign) ;
--      * la suppression en cascade d'une campagne n'est jamais bloquée ;
--      * arbitrage C3 : seule une destination créée AVANT l'expiration de sa propre
--        date limite (date UTC de created_at ≤ order_deadline_date) peut rouvrir ; created_at
--        est fixé par la base à l'insertion et ne peut plus être modifié.
--    « Ouverte » s'évalue ici sur les seules destinations, sans tenir compte du
--    statut ni de la date générale (au moins une destination ouverte, ou aucune
--    destination) : une campagne terminée ou expirée par sa date ne doit pas devenir
--    rouvrable autrement que par un report.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_campaign_destination_reopening()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_campaign_id uuid;
    v_row_id uuid;
    v_campaign record;
    v_others_exist boolean;
    v_others_open boolean;
    v_row_open_after boolean;
    v_before boolean;
    v_after boolean;
    v_production record;
    v_committed numeric;
    v_today date := (now() AT TIME ZONE 'UTC')::date;
    v_actor jsonb;
BEGIN
    -- C-2 : jamais de déplacement vers une autre campagne
    IF TG_OP = 'UPDATE' AND NEW.campaign_id IS DISTINCT FROM OLD.campaign_id THEN
        RAISE EXCEPTION 'Une destination ne peut pas être déplacée vers une autre campagne.';
    END IF;

    -- C3 (arbitrage) : la date de création fonde l'antériorité d'une destination ;
    -- elle est fixée par la base et jamais modifiable (aucune antidatation).
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := now();
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.created_at := OLD.created_at;
    END IF;

    -- Suppression en cascade (suppression de la campagne parente, exécutée par le
    -- trigger d'intégrité référentielle) : jamais bloquée.
    IF TG_OP = 'DELETE' AND pg_catalog.pg_trigger_depth() > 1 THEN
        RETURN OLD;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_campaign_id := OLD.campaign_id;
        v_row_id := OLD.id;
    ELSE
        v_campaign_id := NEW.campaign_id;
        v_row_id := NEW.id;
    END IF;

    SELECT c.id, c.company_id, c.status, c.end_date, c.production_id, c.marketable_quantity
    INTO v_campaign
    FROM public.campaigns c WHERE c.id = v_campaign_id;

    -- Campagne absente (suppression en cours) ou annulée (jamais rouverte) : la
    -- destination ne peut rien rouvrir.
    -- Une campagne expirée par sa date générale N'EST PAS exemptée (revue 032) : si
    -- toutes ses destinations sont aussi expirées, un ajout ou une suppression
    -- préparerait une réouverture par simple nouvelle date, sans report (BR-CMP-09).
    IF NOT FOUND OR v_campaign.status = 'cancelled' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    -- État des AUTRES destinations (BEFORE : la ligne courante est encore dans son état initial)
    v_others_exist := EXISTS (SELECT 1 FROM public.campaign_destinations d
                              WHERE d.campaign_id = v_campaign_id AND d.id IS DISTINCT FROM v_row_id);
    v_others_open := EXISTS (SELECT 1 FROM public.campaign_destinations d
                             WHERE d.campaign_id = v_campaign_id AND d.id IS DISTINCT FROM v_row_id
                               AND (d.order_deadline_date IS NULL OR d.order_deadline_date >= v_today));

    -- Avant l'opération
    IF TG_OP = 'INSERT' THEN
        v_before := v_others_open OR NOT v_others_exist;
    ELSE
        v_before := v_others_open
                 OR OLD.order_deadline_date IS NULL OR OLD.order_deadline_date >= v_today;
    END IF;

    -- Après l'opération
    IF TG_OP = 'DELETE' THEN
        v_after := v_others_open OR NOT v_others_exist;
    ELSE
        v_row_open_after := NEW.order_deadline_date IS NULL OR NEW.order_deadline_date >= v_today;
        v_after := v_others_open OR v_row_open_after;
    END IF;

    -- Fermeture, modification sans effet, ou campagne déjà ouverte : rien à contrôler
    IF v_before OR NOT v_after THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    -- Ici, l'opération ferait passer la campagne de fermée à ouverte.
    IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'L''ajout d''une destination ne permet pas de rouvrir une campagne expirée. Reportez la date limite d''une destination existante (« Rouvrir la campagne »).';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'La suppression d''une destination ne permet pas de rouvrir une campagne expirée. Reportez la date limite d''une destination existante (« Rouvrir la campagne »).';
    END IF;

    -- ADR-047 — aucun administrateur, aucune opération non identifiée, y compris pour un
    -- report qui ne rouvre pas encore seul (campagne terminée ou date générale dépassée)
    v_actor := public.authorize_campaign_reopening(v_campaign.company_id);

    -- C3 (arbitrage) : seule une destination qui existait avant l'expiration de sa
    -- propre date limite peut rouvrir la campagne. Une destination créée déjà expirée
    -- (ajout permis, sans effet) ne peut pas être prolongée pour contourner C3.
    IF (OLD.created_at AT TIME ZONE 'UTC')::date > OLD.order_deadline_date THEN
        RAISE EXCEPTION 'Cette destination a été créée après l''expiration de sa date limite : elle ne peut pas servir à rouvrir la campagne. Reportez la date limite d''une destination existante avant son expiration.';
    END IF;

    -- UPDATE : véritable report d'une destination existante (C3). Pour une campagne au
    -- statut ouvert dont la date générale est valide, la réouverture est effective
    -- immédiatement : D2 et A3 revérifiés. Si la date générale est dépassée, le report
    -- seul ne rouvre rien : D2 et A3 seront contrôlés au §5 avec la nouvelle date.
    IF v_campaign.status IN ('draft', 'active', 'paused')
       AND (v_campaign.end_date IS NULL OR v_campaign.end_date >= v_today) THEN
        SELECT p.status, p.expected_quantity INTO v_production
        FROM public.productions p WHERE p.id = v_campaign.production_id FOR UPDATE;

        IF v_production.status IS DISTINCT FROM 'harvested' THEN
            RAISE EXCEPTION 'Une campagne ne peut être créée ou ouverte que sur une production récoltée (statut actuel de la production : %).',
                COALESCE(v_production.status, 'inconnu');
        END IF;

        v_committed := public.get_production_committed_quantity(v_campaign.production_id, v_campaign.id);
        IF v_committed + v_campaign.marketable_quantity > v_production.expected_quantity THEN
            RAISE EXCEPTION 'Volume insuffisant sur la production : % déjà engagé(s) sur % ; disponible pour cette campagne : %.',
                v_committed, v_production.expected_quantity,
                GREATEST(v_production.expected_quantity - v_committed, 0);
        END IF;

        -- ADR-047 — le report rouvre ici : journal (sinon, le §5 journalise)
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'CAMPAIGN_REOPENED', 'campaign', v_campaign.id,
            v_actor || jsonb_build_object('previous_status', v_campaign.status, 'new_status', v_campaign.status,
                'destination_id', NEW.id, 'old_deadline', OLD.order_deadline_date, 'new_deadline', NEW.order_deadline_date));
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_campaign_destination_reopening ON public.campaign_destinations;
CREATE TRIGGER trg_guard_campaign_destination_reopening
    BEFORE INSERT OR DELETE OR UPDATE OF order_deadline_date, campaign_id, created_at ON public.campaign_destinations
    FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_destination_reopening();


-- ============================================================================
-- 7. RÉOUVERTURE D'UNE CAMPAGNE (A12, A12-bis, C3, D5) — atomique
--    SECURITY INVOKER : les politiques RLS de l'appelant s'appliquent
--    (campaigns_manage, campaign_destinations_all_owner). Les règles métier sont
--    appliquées par les triggers des §5 et §6.
--    p_destination_deadlines : [{"destination_id": "<uuid>", "order_deadline_date": "AAAA-MM-JJ"}, …]
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reopen_campaign(
    p_campaign_id uuid,
    p_new_end_date date DEFAULT NULL,
    p_destination_deadlines jsonb DEFAULT '[]'::jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
    v_campaign record;
    v_item jsonb;
    v_destination_id uuid;
    v_deadline date;
    v_updated integer;
    v_new_status text;
    v_final_status text;
    v_final_end_date date;
    v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    IF p_destination_deadlines IS NULL OR jsonb_typeof(p_destination_deadlines) <> 'array' THEN
        RAISE EXCEPTION 'Format des dates de destination invalide.';
    END IF;
    IF jsonb_array_length(p_destination_deadlines) > 200 THEN
        RAISE EXCEPTION 'Trop de destinations transmises.';
    END IF;

    SELECT c.id, c.company_id, c.status, c.end_date, c.status_before_completion
    INTO v_campaign
    FROM public.campaigns c WHERE c.id = p_campaign_id FOR UPDATE;

    -- Même message que la campagne soit introuvable ou non autorisée (pas
    -- d'énumération) ; la RLS limite déjà la lecture. L'administrateur n'est pas
    -- autorisé (ADR-047), et les triggers le refusent aussi sur les autres canaux.
    IF NOT FOUND OR NOT public.is_company_member_or_creator(v_campaign.company_id) THEN
        RAISE EXCEPTION 'Action non autorisée sur cette campagne.';
    END IF;

    IF v_campaign.status = 'cancelled' THEN
        RAISE EXCEPTION 'Une campagne annulée ne peut pas être réactivée.';
    END IF;

    IF public.is_campaign_effectively_open(v_campaign.status, v_campaign.end_date, v_campaign.id) THEN
        RAISE EXCEPTION 'Cette campagne est déjà ouverte.';
    END IF;

    -- 1. Report des dates limites de destination (C3). Les destinations qui existaient
    --    avant l'expiration de leur date limite sont traitées d'abord : le résultat ne
    --    dépend pas de l'ordre transmis (arbitrage C3, trigger §6).
    FOR v_item IN
        SELECT e.value
        FROM jsonb_array_elements(p_destination_deadlines) WITH ORDINALITY AS e(value, ord)
        LEFT JOIN public.campaign_destinations d
               ON d.campaign_id = p_campaign_id AND d.id::text = e.value ->> 'destination_id'
        ORDER BY (d.order_deadline_date IS NULL OR (d.created_at AT TIME ZONE 'UTC')::date <= d.order_deadline_date) DESC NULLS LAST, e.ord
    LOOP
        BEGIN
            v_destination_id := (v_item ->> 'destination_id')::uuid;
            v_deadline := (v_item ->> 'order_deadline_date')::date;
        EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR invalid_datetime_format THEN
            RAISE EXCEPTION 'Destination ou date limite invalide.';
        END;

        IF v_destination_id IS NULL OR v_deadline IS NULL OR v_deadline < v_today THEN
            RAISE EXCEPTION 'Chaque date limite reportée doit être au moins égale à aujourd''hui.';
        END IF;

        UPDATE public.campaign_destinations d
        SET order_deadline_date = v_deadline, updated_at = now()
        WHERE d.id = v_destination_id AND d.campaign_id = p_campaign_id;
        GET DIAGNOSTICS v_updated = ROW_COUNT;
        IF v_updated = 0 THEN
            RAISE EXCEPTION 'Une destination transmise n''appartient pas à cette campagne.';
        END IF;
    END LOOP;

    -- 2. Date générale et statut d'origine (D5, A12-bis contrôlés par le trigger §5)
    v_new_status := CASE WHEN v_campaign.status = 'completed'
                         THEN COALESCE(v_campaign.status_before_completion, 'active')
                         ELSE v_campaign.status END;

    UPDATE public.campaigns c
    SET end_date = COALESCE(p_new_end_date, c.end_date),
        status = v_new_status,
        updated_at = now()
    WHERE c.id = p_campaign_id;

    -- 3. Résultat effectif
    SELECT c.status, c.end_date INTO v_final_status, v_final_end_date
    FROM public.campaigns c WHERE c.id = p_campaign_id;

    IF NOT public.is_campaign_effectively_open(v_final_status, v_final_end_date, p_campaign_id) THEN
        IF v_final_end_date IS NOT NULL AND v_final_end_date < v_today THEN
            RAISE EXCEPTION 'Réouverture : la nouvelle date de fin est obligatoire et doit être au moins égale à aujourd''hui.';
        END IF;
        RAISE EXCEPTION 'Réouverture impossible : toutes les destinations sont expirées. Reportez au moins une date limite de destination.';
    END IF;

    RETURN v_new_status;
END;
$function$;


-- ============================================================================
-- 7 bis. MODIFICATION ATOMIQUE D'UNE CAMPAGNE ET DE SES DESTINATIONS (C-6)
--    Remplace la suite d'appels séparés de updateCampaignAction : champs de la
--    campagne, zones de livraison, destinations et dépôts sont écrits dans UNE
--    transaction (tout ou rien, plus d'état intermédiaire persisté).
--    SECURITY INVOKER : RLS et triggers (§4 bis, §5, §6) s'appliquent comme pour
--    les écritures directes de l'application. Le plan (ordre des écritures) est
--    calculé par src/lib/utils/destinationSync.ts et exécuté ici dans cet ordre :
--      early_deletes → updates_open → inserts → updates_closing →
--      depot_deletes → deletes → depots.
--    Verrou FOR UPDATE sur la campagne : sérialisé avec create_order_with_reservation.
--    p_fields : {title, description, marketable_quantity, unit_price, currency,
--                min_order_quantity, start_date, end_date, availability_period}
--    p_destination_plan (NULL = destinations inchangées) :
--      {early_deletes:[uuid], updates_open:[dest], inserts:[dest],
--       updates_closing:[dest], depot_deletes:[uuid], deletes:[uuid],
--       depots:[{city_name, id?, name, commune, quartier?, address, complement?}]}
--      dest = {id?, province_id, city_name, expected_arrival_date, order_deadline_date?}
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_campaign_with_destinations(
    p_campaign_id uuid,
    p_fields jsonb,
    p_province_ids uuid[],
    p_destination_plan jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
    v_campaign record;
    v_country_id uuid;
    v_item jsonb;
    v_removed_dest_ids uuid[];
    v_removed_depot_ids uuid[];
    v_destination_id uuid;
    v_rows integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;
    IF p_fields IS NULL OR jsonb_typeof(p_fields) <> 'object' THEN
        RAISE EXCEPTION 'Données de campagne invalides.';
    END IF;
    IF p_destination_plan IS NOT NULL AND jsonb_typeof(p_destination_plan) <> 'object' THEN
        RAISE EXCEPTION 'Format des destinations transmises invalide.';
    END IF;

    SELECT c.id, c.company_id INTO v_campaign
    FROM public.campaigns c WHERE c.id = p_campaign_id FOR UPDATE;

    -- Même message que la campagne soit introuvable ou non autorisée (pas d'énumération)
    IF NOT FOUND OR NOT public.is_company_member_or_creator(v_campaign.company_id) THEN
        RAISE EXCEPTION 'Action non autorisée sur cette campagne.';
    END IF;

    -- 1. Champs de la campagne (règles §4 bis et §5 appliquées par les triggers)
    UPDATE public.campaigns c
    SET title = p_fields ->> 'title',
        description = p_fields ->> 'description',
        marketable_quantity = (p_fields ->> 'marketable_quantity')::numeric,
        unit_price = (p_fields ->> 'unit_price')::numeric,
        currency = p_fields ->> 'currency',
        min_order_quantity = (p_fields ->> 'min_order_quantity')::numeric,
        start_date = (p_fields ->> 'start_date')::date,
        end_date = (p_fields ->> 'end_date')::date,
        availability_period = p_fields ->> 'availability_period'
    WHERE c.id = p_campaign_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Action non autorisée sur cette campagne.';
    END IF;

    -- 2. Zones de livraison (provinces), si le pays de l'exploitation est connu
    SELECT co.country_id INTO v_country_id FROM public.companies co WHERE co.id = v_campaign.company_id;
    IF v_country_id IS NOT NULL THEN
        DELETE FROM public.campaign_delivery_zones z WHERE z.campaign_id = p_campaign_id;
        INSERT INTO public.campaign_delivery_zones (campaign_id, country_id, province_id)
        SELECT DISTINCT p_campaign_id, v_country_id, prov
        FROM unnest(COALESCE(p_province_ids, '{}'::uuid[])) AS prov
        WHERE prov IS NOT NULL;
    END IF;

    IF p_destination_plan IS NULL THEN
        RETURN;
    END IF;

    -- 3. Destinations et dépôts retirés : jamais s'ils sont référencés par une commande
    --    (la suppression mettrait orders.destination_id / depot_id à NULL)
    SELECT COALESCE(array_agg(x::uuid), '{}'::uuid[]) INTO v_removed_dest_ids
    FROM (SELECT jsonb_array_elements_text(COALESCE(p_destination_plan -> 'early_deletes', '[]'::jsonb))
          UNION ALL
          SELECT jsonb_array_elements_text(COALESCE(p_destination_plan -> 'deletes', '[]'::jsonb))) AS t(x);

    SELECT COALESCE(array_agg(DISTINCT dp.id), '{}'::uuid[]) INTO v_removed_depot_ids
    FROM public.campaign_depots dp
    WHERE dp.campaign_id = p_campaign_id
      AND (dp.campaign_destination_id = ANY (v_removed_dest_ids)
           OR dp.id IN (SELECT x::uuid FROM jsonb_array_elements_text(
                            COALESCE(p_destination_plan -> 'depot_deletes', '[]'::jsonb)) AS t(x)));

    IF EXISTS (SELECT 1 FROM public.orders o WHERE o.destination_id = ANY (v_removed_dest_ids)) THEN
        RAISE EXCEPTION 'Une destination que vous avez retirée est liée à des commandes existantes. Conservez-la dans la campagne (vous pouvez avancer sa date limite de commande) puis réessayez.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.orders o WHERE o.depot_id = ANY (v_removed_depot_ids)) THEN
        RAISE EXCEPTION 'Un point de dépôt que vous avez retiré est lié à des commandes existantes. Conservez-le dans la campagne puis réessayez.';
    END IF;

    -- 3.a. Destinations retirées dont la ville est reprise par une destination renommée
    DELETE FROM public.campaign_destinations d
    WHERE d.campaign_id = p_campaign_id
      AND d.id IN (SELECT x::uuid FROM jsonb_array_elements_text(
                       COALESCE(p_destination_plan -> 'early_deletes', '[]'::jsonb)) AS t(x));

    -- 3.b. Mises à jour qui laissent la destination ouverte (dont les reports C3) ;
    --      destinations antérieures à l'expiration de leur date limite d'abord (arbitrage C3)
    FOR v_item IN
        SELECT e.value
        FROM jsonb_array_elements(COALESCE(p_destination_plan -> 'updates_open', '[]'::jsonb)) WITH ORDINALITY AS e(value, ord)
        LEFT JOIN public.campaign_destinations d
               ON d.campaign_id = p_campaign_id AND d.id::text = e.value ->> 'id'
        ORDER BY (d.order_deadline_date IS NULL OR (d.created_at AT TIME ZONE 'UTC')::date <= d.order_deadline_date) DESC NULLS LAST, e.ord
    LOOP
        UPDATE public.campaign_destinations d
        SET province_id = (v_item ->> 'province_id')::uuid,
            city_name = v_item ->> 'city_name',
            expected_arrival_date = (v_item ->> 'expected_arrival_date')::date,
            order_deadline_date = (v_item ->> 'order_deadline_date')::date
        WHERE d.id = (v_item ->> 'id')::uuid AND d.campaign_id = p_campaign_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RAISE EXCEPTION 'La destination % n''a pas pu être mise à jour.', v_item ->> 'city_name';
        END IF;
    END LOOP;

    -- 3.c. Ajouts (destinations ouvertes d'abord : ordre du plan)
    FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_destination_plan -> 'inserts', '[]'::jsonb)) LOOP
        INSERT INTO public.campaign_destinations (campaign_id, province_id, city_name, expected_arrival_date, order_deadline_date)
        VALUES (p_campaign_id,
                (v_item ->> 'province_id')::uuid,
                v_item ->> 'city_name',
                (v_item ->> 'expected_arrival_date')::date,
                (v_item ->> 'order_deadline_date')::date);
    END LOOP;

    -- 3.d. Mises à jour qui ferment la destination
    FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_destination_plan -> 'updates_closing', '[]'::jsonb)) LOOP
        UPDATE public.campaign_destinations d
        SET province_id = (v_item ->> 'province_id')::uuid,
            city_name = v_item ->> 'city_name',
            expected_arrival_date = (v_item ->> 'expected_arrival_date')::date,
            order_deadline_date = (v_item ->> 'order_deadline_date')::date
        WHERE d.id = (v_item ->> 'id')::uuid AND d.campaign_id = p_campaign_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RAISE EXCEPTION 'La destination % n''a pas pu être mise à jour.', v_item ->> 'city_name';
        END IF;
    END LOOP;

    -- 3.e. Dépôts retirés des destinations conservées
    DELETE FROM public.campaign_depots dp
    WHERE dp.campaign_id = p_campaign_id
      AND dp.id IN (SELECT x::uuid FROM jsonb_array_elements_text(
                        COALESCE(p_destination_plan -> 'depot_deletes', '[]'::jsonb)) AS t(x));

    -- 3.f. Destinations retirées (en dernier : aucune fermeture transitoire)
    DELETE FROM public.campaign_destinations d
    WHERE d.campaign_id = p_campaign_id
      AND d.id IN (SELECT x::uuid FROM jsonb_array_elements_text(
                       COALESCE(p_destination_plan -> 'deletes', '[]'::jsonb)) AS t(x));

    -- 3.g. Dépôts : mise à jour des dépôts existants de la campagne, ajout des autres,
    --      rattachés à la destination de même ville
    FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_destination_plan -> 'depots', '[]'::jsonb)) LOOP
        SELECT d.id INTO v_destination_id
        FROM public.campaign_destinations d
        WHERE d.campaign_id = p_campaign_id AND d.city_name = v_item ->> 'city_name';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La destination % est introuvable après enregistrement.', v_item ->> 'city_name';
        END IF;

        v_rows := 0;
        IF NULLIF(v_item ->> 'id', '') IS NOT NULL THEN
            UPDATE public.campaign_depots dp
            SET name = v_item ->> 'name',
                commune = v_item ->> 'commune',
                quartier = v_item ->> 'quartier',
                address = v_item ->> 'address',
                complement = v_item ->> 'complement'
            WHERE dp.id = (v_item ->> 'id')::uuid AND dp.campaign_id = p_campaign_id;
            GET DIAGNOSTICS v_rows = ROW_COUNT;
        END IF;
        IF v_rows = 0 THEN
            INSERT INTO public.campaign_depots (campaign_destination_id, campaign_id, name, commune, quartier, address, complement)
            VALUES (v_destination_id, p_campaign_id, v_item ->> 'name', v_item ->> 'commune',
                    v_item ->> 'quartier', v_item ->> 'address', v_item ->> 'complement');
        END IF;
    END LOOP;
END;
$function$;


-- ============================================================================
-- 8. DISPONIBILITÉ DES PRODUCTIONS POUR LES CAMPAGNES (D4)
--    Réservée aux membres / créateurs de l'entreprise propriétaire (et admin).
--    Productions non autorisées ou inexistantes : omises (pas d'énumération).
--    p_exclude_campaign_id : campagne en cours de modification (prise en compte
--    seulement si elle appartient à la production concernée).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_productions_campaign_availability(
    p_production_ids uuid[],
    p_exclude_campaign_id uuid DEFAULT NULL)
RETURNS TABLE(production_id uuid, production_status text, unit text,
              expected_quantity numeric, committed_quantity numeric, available_quantity numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_is_admin boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;
    IF p_production_ids IS NULL OR cardinality(p_production_ids) = 0 THEN
        RETURN;
    END IF;
    IF cardinality(p_production_ids) > 200 THEN
        RAISE EXCEPTION 'Trop de productions demandées (200 au maximum).';
    END IF;

    v_is_admin := COALESCE(public.current_user_role(), '') = 'admin';

    RETURN QUERY
    SELECT p.id,
           p.status::text,
           p.unit::text,
           p.expected_quantity,
           x.committed,
           GREATEST(p.expected_quantity - x.committed, 0)
    FROM public.productions p
    CROSS JOIN LATERAL (
        SELECT public.get_production_committed_quantity(
                   p.id,
                   CASE WHEN EXISTS (SELECT 1 FROM public.campaigns c
                                     WHERE c.id = p_exclude_campaign_id AND c.production_id = p.id)
                        THEN p_exclude_campaign_id END) AS committed
    ) x
    WHERE p.id = ANY (p_production_ids)
      AND (v_is_admin OR public.is_company_member_or_creator(p.company_id));
END;
$function$;


-- ============================================================================
-- 9. DISPONIBLE AGRÉGÉ DES CAMPAGNES POUR LES REVENDEURS (stock revendeur)
--    Renvoie UNIQUEMENT (campaign_id, available_quantity) pour les campagnes
--    au statut 'active' et effectivement ouvertes (C2). Aucune réservation,
--    commande, quantité individuelle ni identifiant de revendeur n'est exposé.
--    Accès : revendeurs, administrateurs, et membres de l'entreprise de la
--    campagne. Campagnes non éligibles : omises (pas d'énumération).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_campaigns_available_quantity(p_campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid, available_quantity numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;
    IF p_campaign_ids IS NULL OR cardinality(p_campaign_ids) = 0 THEN
        RETURN;
    END IF;
    IF cardinality(p_campaign_ids) > 200 THEN
        RAISE EXCEPTION 'Trop de campagnes demandées (200 au maximum).';
    END IF;

    v_role := COALESCE(public.current_user_role(), '');

    RETURN QUERY
    SELECT c.id,
           GREATEST(c.marketable_quantity - public.get_campaign_consumed_quantity(c.id), 0)
    FROM public.campaigns c
    WHERE c.id = ANY (p_campaign_ids)
      AND c.status = 'active'
      AND public.is_campaign_effectively_open(c.status, c.end_date, c.id)
      AND (v_role IN ('reseller', 'admin') OR public.is_company_member_or_creator(c.company_id));
END;
$function$;


-- ============================================================================
-- 10. CLÔTURE AUTOMATIQUE (C1) — même signature (RETURNS integer)
--     Clôt les campagnes 'active' ou 'paused' qui ne sont plus effectivement
--     ouvertes. La date générale prévaut : une fois dépassée, la campagne est close
--     même si des destinations restent ouvertes (BR-CMP-06). Si la date générale est
--     valide, une destination ouverte empêche la clôture.
--     Seul le statut de la campagne change : commandes, réservations et productions
--     ne sont pas touchées. Le statut d'origine est conservé par le trigger du §5.
--     Concurrence : FOR UPDATE SKIP LOCKED — une campagne verrouillée par une
--     commande en cours est ignorée et sera traitée au passage suivant.
--     Idempotente : un second appel ne trouve plus rien à clore.
--     Journal : une ligne audit_logs par campagne (actor_id NULL, identité système
--     dans details). Opération technique identifiée obligatoire (§0 bis).
--     Planification : tâche inactive de la migration 33.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_close_expired_campaigns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_count integer;
    v_actor jsonb := public.technical_operation_identity();
BEGIN
    IF v_actor IS NULL THEN
        RAISE EXCEPTION 'Clôture refusée : opération technique non identifiée.';
    END IF;

    WITH candidates AS (
        SELECT c.id, c.status
        FROM public.campaigns c
        WHERE c.status IN ('active', 'paused')
          AND NOT public.is_campaign_effectively_open(c.status, c.end_date, c.id)
        FOR UPDATE SKIP LOCKED
    ), closed AS (
        UPDATE public.campaigns c
        SET status = 'completed', updated_at = now()
        FROM candidates k
        WHERE c.id = k.id
        RETURNING c.id, k.status AS previous_status
    ), logged AS (
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        SELECT NULL, 'CAMPAIGN_AUTO_CLOSED', 'campaign', closed.id,
               v_actor || jsonb_build_object('previous_status', closed.previous_status, 'closed_on', (now() AT TIME ZONE 'UTC')::date)
        FROM closed
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM closed;

    RETURN v_count;
END;
$function$;


-- ============================================================================
-- 10 bis. update_destination_order_deadline — fonction de la 030 à l'identique, sauf
--     la date du jour en UTC (décide de la notification de fermeture). La 030 n'est
--     pas modifiée ; droits et signature conservés par CREATE OR REPLACE.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_destination_order_deadline(
    p_destination_id uuid,
    p_new_deadline_date date
)
RETURNS TABLE(success boolean, notified_resellers_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_dest RECORD; v_campaign RECORD; v_old_deadline DATE; v_order RECORD; v_count INT := 0; v_is_closing BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_dest FROM public.campaign_destinations WHERE id = p_destination_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination introuvable'; END IF;

    SELECT c.*, p.name AS product_name INTO v_campaign
    FROM public.campaigns c JOIN public.products p ON p.id = c.product_id
    WHERE c.id = v_dest.campaign_id;

    IF NOT (public.is_company_member_or_creator(v_campaign.company_id) OR COALESCE(public.current_user_role(), '') = 'admin') THEN
        RAISE EXCEPTION 'Action non autorisee';
    END IF;

    v_old_deadline := v_dest.order_deadline_date;
    v_is_closing := (p_new_deadline_date IS NOT NULL AND p_new_deadline_date < (now() AT TIME ZONE 'UTC')::date);

    UPDATE public.campaign_destinations
    SET order_deadline_date = p_new_deadline_date, updated_at = NOW()
    WHERE id = p_destination_id;

    IF v_is_closing THEN
        FOR v_order IN
            SELECT DISTINCT o.id AS order_id, o.order_number, o.reseller_id
            FROM public.orders o
            WHERE o.destination_id = p_destination_id AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
        LOOP
            INSERT INTO public.notifications(user_id, type, title, message, related_entity_type, related_entity_id, action_url)
            VALUES (v_order.reseller_id, 'DESTINATION_FERMEE',
                'Offre commerciale fermee a ' || v_dest.city_name,
                'Les commandes pour la destination ' || v_dest.city_name || ' sur l''offre ' || v_campaign.title
                    || ' sont desormais cloturees. Votre commande ' || v_order.order_number || ' reste valide.',
                'order', v_order.order_id, '/dashboard/reseller/orders/' || v_order.order_id);
            v_count := v_count + 1;
        END LOOP;
    END IF;

    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'DESTINATION_DEADLINE_UPDATED', 'campaign_destination', p_destination_id,
        jsonb_build_object('campaign_id', v_dest.campaign_id, 'city_name', v_dest.city_name,
            'old_deadline', v_old_deadline, 'new_deadline', p_new_deadline_date,
            'is_closing', v_is_closing, 'notified_orders', v_count));

    RETURN QUERY SELECT TRUE, v_count,
        CASE WHEN v_is_closing THEN 'Destination FERMEE. ' || v_count || ' revendeur(s) notifie(s).'
             ELSE 'Date limite mise a jour.' END;
END;
$function$;


-- ============================================================================
-- 11. PRIVILÈGES
--     Fonctions internes / de trigger : non appelables par l'API.
--     Fonctions applicatives : authenticated uniquement (jamais PUBLIC ni anon).
--     Clôture : propriétaire et tâche planifiée uniquement (service_role retiré).
-- ============================================================================
-- is_campaign_effectively_open est SECURITY INVOKER et appelée par reopen_campaign
-- (elle aussi INVOKER) : authenticated doit pouvoir l'exécuter. Elle ne renvoie qu'un
-- booléen et, sous les droits de l'appelant, la RLS des destinations s'applique.
REVOKE ALL ON FUNCTION public.is_campaign_effectively_open(text, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_campaign_effectively_open(text, date, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_production_committed_quantity(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_production_commitments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_campaign_business_rules() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_campaign_destination_reopening() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_campaign_consistency() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_effectively_open(text, date, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_production_committed_quantity(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.reopen_campaign(uuid, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_campaign(uuid, date, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_campaign_with_destinations(uuid, jsonb, uuid[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_campaign_with_destinations(uuid, jsonb, uuid[], jsonb) TO authenticated, service_role;

-- create_order_with_reservation est redéfinie au §3 : CREATE OR REPLACE conserve les
-- droits posés par la 030 (anon et PUBLIC retirés). Réaffirmés ici, à l'identique de
-- la 030, pour ne pas dépendre de l'ordre d'application (défense en profondeur).
REVOKE ALL ON FUNCTION public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_reservation(uuid, uuid, numeric, uuid, character varying, text, text, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_productions_campaign_availability(uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_productions_campaign_availability(uuid[], uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_campaigns_available_quantity(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaigns_available_quantity(uuid[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_and_close_expired_campaigns() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_close_expired_campaigns() TO postgres;

REVOKE ALL ON FUNCTION public.technical_operation_identity() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.authorize_campaign_reopening(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- ============================================================================
-- FIN DE LA MIGRATION 32
-- ============================================================================
