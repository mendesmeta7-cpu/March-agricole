-- ==============================================================================
-- TEST SUITE : PHASE 14 — CATALOGUE GLOBAL, PRODUITS SOCIÉTÉ, ACCÈS ADMIN ET FLUX
-- ==============================================================================

DO $$
DECLARE
  v_global_count INTEGER;
  v_admin_role TEXT;
  v_mendes_company_id UUID;
  v_manioc_id UUID;
  v_company_prod RECORD;
BEGIN
  RAISE NOTICE '>>> DÉBUT DE LA SUITE DE TESTS PHASE 14 <<<';

  -- TEST 1: Vérification du catalogue global (>= 70 produits de référence)
  SELECT COUNT(*) INTO v_global_count
  FROM products
  WHERE is_global = TRUE AND created_by_company_id IS NULL;

  IF v_global_count < 70 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1: Catalogue global insuffisant (% produits trouvés, attendu >= 70)', v_global_count;
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 1: Catalogue global de référence validé (% produits globaux)', v_global_count;

  -- TEST 2: Vérification du compte administrateur dédié
  SELECT p.role INTO v_admin_role
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'admin@marcheagricole.cd';

  IF v_admin_role IS NULL OR v_admin_role <> 'admin' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 2: Profil admin introuvable ou rôle incorrect (%)', v_admin_role;
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 2: Compte administrateur validé (admin@marcheagricole.cd, role=admin)';

  -- TEST 3: Intégrité des données existantes (Manioc doux & Production Matadi)
  SELECT id INTO v_manioc_id
  FROM products
  WHERE name = 'Manioc doux' AND is_global = TRUE;

  IF v_manioc_id IS NULL THEN
    RAISE EXCEPTION 'ÉCHEC TEST 3: Produit Manioc doux introuvable dans le catalogue';
  END IF;

  SELECT cp.* INTO v_company_prod
  FROM company_products cp
  WHERE cp.product_id = v_manioc_id
  LIMIT 1;

  IF v_company_prod.id IS NULL THEN
    RAISE EXCEPTION 'ÉCHEC TEST 3: Association company_products pour Manioc doux introuvable';
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 3: Données existantes intactes (Manioc doux associé: cp.id=%)', v_company_prod.id;

  -- TEST 4: Vérification des colonnes étendues de company_products
  PERFORM 1 FROM information_schema.columns WHERE table_name = 'company_products' AND column_name = 'image_url';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC TEST 4: Colonne image_url manquante dans company_products';
  END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'company_products' AND column_name = 'unit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC TEST 4: Colonne unit manquante dans company_products';
  END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'company_products' AND column_name = 'notes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC TEST 4: Colonne notes manquante dans company_products';
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 4: Colonnes étendues image_url, unit, notes présentes dans company_products';

  -- TEST 5: Vérification de l'étanchéité des RLS
  PERFORM 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_select_policy';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC TEST 5: Politique products_select_policy introuvable';
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 5: Politiques de sécurité RLS actives sur products';

  -- TEST 6: Vérification du trigger d'étanchéité des photos
  PERFORM 1 FROM pg_trigger WHERE tgname = 'trg_protect_global_product_images';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC TEST 6: Trigger trg_protect_global_product_images introuvable';
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 6: Trigger de protection des images globales actif';

  -- TEST 7: Vérification de la fonction RPC create_custom_product_and_associate
  PERFORM 1 FROM pg_proc WHERE proname = 'create_custom_product_and_associate';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC TEST 7: Fonction RPC create_custom_product_and_associate introuvable';
  END IF;
  RAISE NOTICE 'SUCCÈS TEST 7: Fonction RPC create_custom_product_and_associate disponible';

  RAISE NOTICE '>>> TOUS LES TESTS AUTOMATISÉS DE LA PHASE 14 ONT RÉUSSI AVEC SUCCÈS ! <<<';
END $$;
