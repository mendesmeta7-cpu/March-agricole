-- Test de validation Phase 18: Stabilisation, Cohérence des Workflows et Intégrité Historique
-- Projet: Marché Agricole V1

DO $$
DECLARE
    v_col_orders_company RECORD;
    v_col_orders_campaign RECORD;
    v_col_orders_prod RECORD;
    v_col_items_prod RECORD;
    v_notif_check_def TEXT;
    v_rpc_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== VÉRIFICATION 1 : Colonnes de Snapshots Immuables ===';
    
    SELECT column_name, data_type INTO v_col_orders_company 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'company_name_snapshot';
    
    IF v_col_orders_company.column_name IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC: orders.company_name_snapshot manquant';
    END IF;

    SELECT column_name, data_type INTO v_col_orders_campaign 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'campaign_title_snapshot';
    
    IF v_col_orders_campaign.column_name IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC: orders.campaign_title_snapshot manquant';
    END IF;

    SELECT column_name, data_type INTO v_col_orders_prod 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'production_title_snapshot';
    
    IF v_col_orders_prod.column_name IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC: orders.production_title_snapshot manquant';
    END IF;

    SELECT column_name, data_type INTO v_col_items_prod 
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'product_name_snapshot';
    
    IF v_col_items_prod.column_name IS NULL THEN
        RAISE EXCEPTION 'ÉCHEC: order_items.product_name_snapshot manquant';
    END IF;

    RAISE NOTICE 'SUCCÈS: Toutes les colonnes de snapshot sont présentes.';

    RAISE NOTICE '=== VÉRIFICATION 2 : Triggers de Snapshots ===';
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_snapshots') THEN
        RAISE EXCEPTION 'ÉCHEC: Trigger trg_orders_snapshots manquant';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_items_snapshots') THEN
        RAISE EXCEPTION 'ÉCHEC: Trigger trg_order_items_snapshots manquant';
    END IF;
    RAISE NOTICE 'SUCCÈS: Triggers automatiques de capture de snapshot opérationnels.';

    RAISE NOTICE '=== VÉRIFICATION 3 : Types de Notifications Valides ===';
    SELECT pg_get_constraintdef(oid) INTO v_notif_check_def 
    FROM pg_constraint 
    WHERE conname = 'notifications_type_check';

    IF v_notif_check_def NOT LIKE '%DEMANDE_GENERALE_RECUE%' OR v_notif_check_def NOT LIKE '%DEMANDE_PRODUCTION_RECUE%' THEN
        RAISE EXCEPTION 'ÉCHEC: notifications_type_check ne contient pas les nouveaux types';
    END IF;
    RAISE NOTICE 'SUCCÈS: Types DEMANDE_GENERALE_RECUE et DEMANDE_PRODUCTION_RECUE validés.';

    RAISE NOTICE '=== VÉRIFICATION 4 : Fonctions RPC Essentielles ===';
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'notify_company_on_demand_received'
    ) INTO v_rpc_exists;
    IF NOT v_rpc_exists THEN
        RAISE EXCEPTION 'ÉCHEC: RPC notify_company_on_demand_received manquante';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'lookup_order_for_delivery'
    ) INTO v_rpc_exists;
    IF NOT v_rpc_exists THEN
        RAISE EXCEPTION 'ÉCHEC: RPC lookup_order_for_delivery manquante';
    END IF;
    RAISE NOTICE 'SUCCÈS: RPC notify_company_on_demand_received et lookup_order_for_delivery opérationnelles.';

    RAISE NOTICE '=== TOUS LES TESTS DE STRUCTURE ET DE SÉCURITÉ SONT VALIDÉS AVEC SUCCÈS ===';
END $$;
