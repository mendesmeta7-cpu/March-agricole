-- ============================================================================
-- SCRIPT DE VALIDATION DE LA PHASE 6 : DEMANDES ET ANALYSE TERRITORIALE V1
-- ============================================================================

DO $$
DECLARE
  v_country_id UUID;
  v_province_1_id UUID;
  v_province_2_id UUID;
  v_product_id UUID;
  v_reseller_user_id UUID;
  v_demand_1_id UUID;
  v_demand_2_id UUID;
  v_agg_count INT;
  v_agg_qty NUMERIC;
  v_check_count INT;
BEGIN
  RAISE NOTICE '---------------------------------------------------------';
  RAISE NOTICE 'DÉBUT DES TESTS AUTOMATISÉS PHASE 6 : DEMANDES V1';
  RAISE NOTICE '---------------------------------------------------------';

  -- 1. Récupération des données géographiques réelles
  SELECT id INTO v_country_id FROM countries WHERE code = 'COD' LIMIT 1;
  SELECT id INTO v_province_1_id FROM provinces WHERE country_id = v_country_id ORDER BY name LIMIT 1;
  SELECT id INTO v_province_2_id FROM provinces WHERE country_id = v_country_id AND id != v_province_1_id ORDER BY name LIMIT 1;

  IF v_country_id IS NULL OR v_province_1_id IS NULL OR v_province_2_id IS NULL THEN
    RAISE EXCEPTION 'Échec : Données géographiques introuvables.';
  END IF;

  -- 2. Récupération d'un revendeur existant
  SELECT id INTO v_reseller_user_id FROM resellers LIMIT 1;
  IF v_reseller_user_id IS NULL THEN
    -- Création d'un profil/revendeur temporaire si aucun n'existe
    SELECT id INTO v_reseller_user_id FROM profiles WHERE role = 'reseller' LIMIT 1;
    IF v_reseller_user_id IS NULL THEN
      SELECT id INTO v_reseller_user_id FROM profiles LIMIT 1;
    END IF;
  END IF;

  -- 3. Création d'un produit temporaire pour le test
  INSERT INTO products (name, category, default_unit, is_active)
  VALUES ('Haricot Rouge Test P6', 'Légumineuses', 'tonne', true)
  RETURNING id INTO v_product_id;

  RAISE NOTICE '1/8 : Produit temporaire créé (ID: %).', v_product_id;

  -- 4. Création d'une demande valide par le revendeur
  INSERT INTO demands (
    reseller_id,
    product_id,
    quantity,
    unit,
    country_id,
    province_id,
    city,
    target_period_start,
    target_period_end,
    notes,
    status
  ) VALUES (
    v_reseller_user_id,
    v_product_id,
    100.00,
    'tonne',
    v_country_id,
    v_province_1_id,
    'Ville Test 1',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'Recherche haricot sec de qualité',
    'active'
  ) RETURNING id INTO v_demand_1_id;

  RAISE NOTICE '2/8 : Première demande valide créée (ID: %).', v_demand_1_id;

  -- 5. Test négatif : Rejet quantité <= 0
  BEGIN
    INSERT INTO demands (
      reseller_id,
      product_id,
      quantity,
      unit,
      country_id,
      province_id
    ) VALUES (
      v_reseller_user_id,
      v_product_id,
      -50,
      'tonne',
      v_country_id,
      v_province_1_id
    );
    RAISE EXCEPTION 'Échec : La contrainte de quantité positive n a pas fonctionné !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '3/8 : Contrainte quantité positive validée (rejet réussi).';
  END;

  -- 6. Test négatif : Rejet période_end < period_start
  BEGIN
    INSERT INTO demands (
      reseller_id,
      product_id,
      quantity,
      unit,
      country_id,
      province_id,
      target_period_start,
      target_period_end
    ) VALUES (
      v_reseller_user_id,
      v_product_id,
      50,
      'tonne',
      v_country_id,
      v_province_1_id,
      CURRENT_DATE,
      CURRENT_DATE - INTERVAL '5 days'
    );
    RAISE EXCEPTION 'Échec : La contrainte de période cohérente n a pas fonctionné !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '4/8 : Contrainte de période validée (rejet réussi).';
  END;

  -- 7. Création d'une seconde demande dans une autre province (Décloisonnement territorial)
  INSERT INTO demands (
    reseller_id,
    product_id,
    quantity,
    unit,
    country_id,
    province_id,
    status
  ) VALUES (
    v_reseller_user_id,
    v_product_id,
    250.00,
    'tonne',
    v_country_id,
    v_province_2_id,
    'active'
  ) RETURNING id INTO v_demand_2_id;

  RAISE NOTICE '5/8 : Seconde demande créée dans une province distincte (ID: %).', v_demand_2_id;

  -- 8. Test de la vue agrégée v_market_demands_aggregated
  SELECT total_demands_count, total_demanded_quantity 
  INTO v_agg_count, v_agg_qty
  FROM v_market_demands_aggregated
  WHERE product_id = v_product_id AND province_id = v_province_1_id;

  IF v_agg_count != 1 OR v_agg_qty != 100.00 THEN
    RAISE EXCEPTION 'Échec agrégation : Attendu 1 demande pour 100t, obtenu % demandes pour %t', v_agg_count, v_agg_qty;
  END IF;

  RAISE NOTICE '6/8 : Agrégation SQL vérifiée (Province 1 : %t pour % demande).', v_agg_qty, v_agg_count;

  -- 9. Mise à jour et annulation dynamique
  -- Augmentation du volume de 100t à 180t
  UPDATE demands SET quantity = 180.00 WHERE id = v_demand_1_id;
  SELECT total_demanded_quantity INTO v_agg_qty FROM v_market_demands_aggregated WHERE product_id = v_product_id AND province_id = v_province_1_id;
  IF v_agg_qty != 180.00 THEN
    RAISE EXCEPTION 'Échec mise à jour agrégat : Attendu 180t, obtenu %t', v_agg_qty;
  END IF;

  -- Annulation de la demande 2 (doit disparaître de la vue agrégée)
  UPDATE demands SET status = 'cancelled' WHERE id = v_demand_2_id;
  SELECT COUNT(*) INTO v_check_count FROM v_market_demands_aggregated WHERE product_id = v_product_id AND province_id = v_province_2_id;
  IF v_check_count != 0 THEN
    RAISE EXCEPTION 'Échec exclusion demande annulée : la province 2 apparaît toujours dans la vue active !';
  END IF;

  RAISE NOTICE '7/8 : Dynamisme de l agrégat validé (Mise à jour 180t & exclusion immédiate des demandes annulées).';

  -- 10. Vérification d'indépendance critique (Stock = 0, Campagnes = 0, Commandes = 0)
  SELECT COUNT(*) INTO v_check_count FROM stock_reservations;
  IF v_check_count > 0 THEN
    RAISE EXCEPTION 'VIOLATION MAJEURE : Du stock a été altéré lors de l expression de demande !';
  END IF;

  SELECT COUNT(*) INTO v_check_count FROM campaigns;
  IF v_check_count > 0 THEN
    RAISE EXCEPTION 'VIOLATION MAJEURE : Une campagne a été créée lors de l expression de demande !';
  END IF;

  SELECT COUNT(*) INTO v_check_count FROM orders;
  IF v_check_count > 0 THEN
    RAISE EXCEPTION 'VIOLATION MAJEURE : Une commande a été créée lors de l expression de demande !';
  END IF;

  -- 11. Nettoyage complet
  DELETE FROM demands WHERE product_id = v_product_id;
  DELETE FROM products WHERE id = v_product_id;

  RAISE NOTICE '8/8 : Données de test nettoyées avec succès.';
  RAISE NOTICE '---------------------------------------------------------';
  RAISE NOTICE 'TESTS PHASE 6 DEMANDES RÉUSSIS AVEC SUCCÈS (100 %%)';
  RAISE NOTICE '---------------------------------------------------------';
END $$;
