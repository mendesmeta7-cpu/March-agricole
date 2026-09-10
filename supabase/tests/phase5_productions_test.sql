-- ============================================================================
-- SCRIPT DE VALIDATION DE LA PHASE 5 : MODULE PRODUCTIONS V1
-- ============================================================================

DO $$
DECLARE
  v_company_id UUID;
  v_product_id UUID;
  v_company_prod_id UUID;
  v_production_id UUID;
  v_check_count INT;
  v_status_check VARCHAR;
BEGIN
  RAISE NOTICE '---------------------------------------------------------';
  RAISE NOTICE 'DÉBUT DES TESTS AUTOMATISÉS PHASE 5 : PRODUCTIONS V1';
  RAISE NOTICE '---------------------------------------------------------';

  -- 1. Récupération d'une entreprise réelle existante
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Échec : Aucune entreprise trouvée en base.';
  END IF;

  -- 2. Création d'un produit temporaire pour le test
  INSERT INTO products (name, category, default_unit, is_active)
  VALUES ('Maïs Blanc Test P5', 'Céréales', 'tonne', true)
  RETURNING id INTO v_product_id;

  INSERT INTO company_products (company_id, product_id, custom_name, is_active)
  VALUES (v_company_id, v_product_id, 'Notre Maïs Sélection P5', true)
  RETURNING id INTO v_company_prod_id;

  RAISE NOTICE '1/8 : Produit temporaire et association entreprise créés.';

  -- 3. Création d'une production valide liée à l'Entreprise et au produit
  INSERT INTO productions (
    company_id,
    product_id,
    company_product_id,
    title,
    description,
    main_image_url,
    location_name,
    expected_quantity,
    unit,
    period_start,
    period_end,
    status,
    is_public
  ) VALUES (
    v_company_id,
    v_product_id,
    v_company_prod_id,
    'Grande Récolte Saison A - Test',
    'Culture de maïs en plaine alluviale',
    'https://gonerlgkdnbdewjbebvq.supabase.co/storage/v1/object/public/public-assets/test.jpg',
    'Site de Maluku, Kinshasa',
    750.00,
    'tonne',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    'planned',
    true
  ) RETURNING id INTO v_production_id;

  RAISE NOTICE '2/8 : Production valide créée avec succès (ID : %)', v_production_id;

  -- 4. Test négatif : Rejet quantité <= 0
  BEGIN
    INSERT INTO productions (
      company_id,
      product_id,
      title,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      period_start
    ) VALUES (
      v_company_id,
      v_product_id,
      'Test Quantité Négative',
      'https://example.com/test.jpg',
      'Kinshasa',
      -10,
      'tonne',
      CURRENT_DATE
    );
    RAISE EXCEPTION 'Échec : La contrainte de quantité positive n a pas fonctionné !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '3/8 : Contrainte quantité positive validée (rejet réussi).';
  END;

  -- 5. Test négatif : Rejet période_end < period_start
  BEGIN
    INSERT INTO productions (
      company_id,
      product_id,
      title,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      period_start,
      period_end
    ) VALUES (
      v_company_id,
      v_product_id,
      'Test Dates Incohérentes',
      'https://example.com/test.jpg',
      'Kinshasa',
      100,
      'tonne',
      CURRENT_DATE,
      CURRENT_DATE - INTERVAL '10 days'
    );
    RAISE EXCEPTION 'Échec : La contrainte de cohérence de période n a pas fonctionné !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '4/8 : Contrainte de période validée (rejet réussi).';
  END;

  -- 6. Test négatif : Rejet d un statut invalide
  BEGIN
    INSERT INTO productions (
      company_id,
      product_id,
      title,
      main_image_url,
      location_name,
      expected_quantity,
      unit,
      period_start,
      status
    ) VALUES (
      v_company_id,
      v_product_id,
      'Test Statut Invalide',
      'https://example.com/test.jpg',
      'Kinshasa',
      100,
      'tonne',
      CURRENT_DATE,
      'invalid_status'
    );
    RAISE EXCEPTION 'Échec : Le statut invalide a été accepté !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '5/8 : Contrainte d intégrité du statut validée (rejet réussi).';
  END;

  -- 7. Vérification stricte : Aucune création de stock ni de campagne automatique
  SELECT COUNT(*) INTO v_check_count 
  FROM stock_reservations sr 
  JOIN campaigns c ON sr.campaign_id = c.id 
  WHERE c.company_id = v_company_id;

  IF v_check_count > 0 THEN
    RAISE EXCEPTION 'VIOLATION MAJEURE : Du stock a été créé automatiquement !';
  END IF;

  SELECT COUNT(*) INTO v_check_count FROM campaigns WHERE company_id = v_company_id;
  IF v_check_count > 0 THEN
    RAISE EXCEPTION 'VIOLATION MAJEURE : Une campagne commerciale a été créée automatiquement !';
  END IF;

  RAISE NOTICE '6/8 : Règle critique respectée (Stock = 0, Campagnes = 0).';

  -- 8. Mise à jour de statut (Cycle de vie : planned -> growing -> harvested)
  UPDATE productions SET status = 'growing' WHERE id = v_production_id;
  UPDATE productions SET status = 'harvested' WHERE id = v_production_id;

  SELECT status INTO STRICT v_status_check FROM productions WHERE id = v_production_id;
  RAISE NOTICE '7/8 : Transitions de statut réussies (statut final : %)', v_status_check;

  -- 9. Nettoyage complet
  DELETE FROM productions WHERE id = v_production_id;
  DELETE FROM company_products WHERE id = v_company_prod_id;
  DELETE FROM products WHERE id = v_product_id;

  RAISE NOTICE '8/8 : Données de test nettoyées avec succès.';
  RAISE NOTICE '---------------------------------------------------------';
  RAISE NOTICE 'TESTS PHASE 5 PRODUCTIONS RÉUSSIS AVEC SUCCÈS (100 %%)';
  RAISE NOTICE '---------------------------------------------------------';
END $$;
