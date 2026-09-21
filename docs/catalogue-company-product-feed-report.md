# RAPPORT D'HOMOLOGATION : CATALOGUE GLOBAL, PRODUITS SOCIÉTÉ, PHOTOS INDÉPENDANTES, ACCÈS ADMIN ET FLUX REVENDEUR (PHASE 14)
*Plateforme Agricole V1 Expérimentale*
*Date d'exécution : 2026-09-21*

---

## 1. RÉSUMÉ EXÉCUTIF & OBJECTIFS

La Phase 14 a permis de corriger une anomalie structurelle de conception relative à la gestion des produits agricoles et à l'affichage des visuels, tout en dotant la plateforme d'un espace d'administration de catalogue centralisé et en repositionnant le flux des récoltes au cœur de l'expérience revendeur.

### Problèmes identifiés avant Phase 14 :
1. **Contamination du catalogue global** : Toute création manuelle de produit par une société agricole créait une entrée partagée avec risque de doublons ou de saisies désordonnées.
2. **Écrasement des photographies** : Les photos téléversées par une société écrasaient l'image générique du produit, affectant d'autres exploitations et le flux public.
3. **Absence d'espace de modération catalogue** : L'administrateur système ne disposait pas d'une interface dédiée pour gérer le catalogue de référence.
4. **Flux revendeur en retrait** : La page d'accueil `/dashboard/reseller` présentait des compteurs statiques plutôt que le flux direct des productions disponibles.

### Résultats obtenus après Phase 14 :
* 🟢 **Découplage strict** : Catalogue Global Officiel (`is_global = TRUE`, `created_by_company_id = NULL`) vs Produits Privés Société (`is_global = FALSE`, `created_by_company_id = company_id`) vs Configurations d'Exploitation (`company_products`).
* 🟢 **Indépendance des visuels** : La photo d'une société est confinée à `company_products.image_url`. Les photos de référence du catalogue sont protégées par RLS et par le trigger PostgreSQL `trg_protect_global_product_images`.
* 🟢 **Parcours d'ajout en 2 étapes** : Recherche intuitive dans le catalogue officiel (avec option de création privée si absent), puis personnalisation locale (dénomination, unité, notes, photo d'exploitation).
* 🟢 **Espace Admin officiel** : Interface `/dashboard/admin/products` complète et compte administrateur dédié `admin@marcheagricole.cd` sans lien d'accès public sur la vitrine.
* 🟢 **Flux Revendeur comme Accueil** : `/dashboard/reseller` affiche directement le flux des récoltes avec recherche textuelle instantanée, sélecteur de catégories sous forme de « pills » horizontaux scrollables sur mobile, et filtres par province et statut cultural.
* 🟢 **Catalogue de référence semé** : 73 produits agricoles de référence insérés dans la base réelle.
* 🟢 **Intégrité préservée** : Données existantes (entreprise Mendes meta, produit Manioc doux, production de Matadi) intégralement conservées.

---

## 2. DÉCOUPLAGE STRUCTUREL DES ENTITÉS PRODUITS

| Entité | Rôle & Propriété | Colonnes Clés | Visibilité & Contrôle |
| :--- | :--- | :--- | :--- |
| **Produit Global du Catalogue** (`products`) | Denrée officielle de référence administrée par la plateforme | `is_global = TRUE`<br>`created_by_company_id = NULL`<br>`image_url` (photo officielle) | Visible par tous les acteurs authentifiés et publics. Modifiable exclusivement par l'Admin. |
| **Produit Personnalisé Société** (`products`) | Produit créé à titre exceptionnel par une exploitation hors-catalogue | `is_global = FALSE`<br>`created_by_company_id = UUID`<br>`image_url` (photo originale) | Visible et modifiable **exclusivement** par l'entreprise créatrice (RLS). Invisible pour les autres exploitations. |
| **Configuration d'Exploitation** (`company_products`) | Association d'un produit (global ou privé) au catalogue propre d'une ferme | `custom_name` (variété locale)<br>`unit` (ex: sac de 50 kg)<br>`notes` (qualité, sol)<br>`image_url` (photo d'exploitation) | Gérée par les collaborateurs de l'entreprise. Sert de base obligatoire à la déclaration des cycles culturaux. |

---

## 3. GARDE-FOUS DE SÉCURITÉ ET INDÉPENDANCE DES PHOTOS

1. **Trigger de protection des images globales (`trg_protect_global_product_images`)** :
   Empêche au niveau du moteur PostgreSQL toute altération de la colonne `image_url` sur un produit `is_global = TRUE` si l'exécutant n'a pas le rôle `admin`.
2. **Politiques RLS étanches sur `products`** :
   - `SELECT` : Produits globaux actifs OR Produits privés dont l'utilisateur est membre de la société OR Admin.
   - `INSERT` : Utilisateur membre d'une société pour produits privés (`is_global = FALSE`) OR Admin pour produits globaux.
   - `UPDATE` : Société propriétaire uniquement pour ses produits privés (`is_global = FALSE`) OR Admin pour les produits globaux.
3. **Priorisation en cascade de l'image de production (`createProductionAction`)** :
   $$\text{Photo spécifiquement téléversée} \longrightarrow \text{Photo exploitation } (company\_products.image\_url) \longrightarrow \text{Photo catalogue } (products.image\_url)$$

---

## 4. EXPÉRIENCE UTILISATEUR & INTERFACES

### 4.1 Parcours Société (`/dashboard/company/products`)
* **Étape 1 — Découverte & Recherche** :
  Recherche dynamique par mot-clé et filtrage par catégorie dans les 73 produits officiels.
  Si la denrée est introuvable, un état vide explicite propose la création d'un produit privé d'exploitation sans altérer le catalogue national.
* **Étape 2 — Personnalisation** :
  L'exploitant configure sa dénomination locale (ex: "Manioc doux de Matadi"), son unité de vente par défaut, ses notes agronomiques, et peut ajouter sa propre photo de champ tout en prévisualisant le visuel de référence officiel.

### 4.2 Espace Administrateur (`/dashboard/admin/products`)
* Accessible exclusivement aux profils `role = 'admin'`.
* Recherche réactive, filtre par catégorie et filtre par statut (Actifs / Archivés).
* Modal de création et d'édition de produit de référence avec upload de photos officielles dans `public-assets/products`.
* Bascule d'activation/désactivation immédiate (`toggleAdminCatalogProductStatusAction`).

### 4.3 Flux Revendeur Direct (`/dashboard/reseller`)
* Remplace la page statique de statistiques.
* Bandeau d'en-tête synthétique rappelant l'ancrage territorial de l'acheteur avec raccourcis discrets vers Offres, Demandes et Commandes.
* Barre de filtrage moderne :
  - Champ de recherche textuel réactif ;
  - Barre de "pills" de catégories horizontaux avec défilement fluide (scrollable) sur mobile et ordinateur ;
  - Filtre par province géographique ;
  - Filtre par état du cycle cultural (Planifié, En cours de culture, Récolté).
* Redirection propre de `/dashboard/reseller/feed` vers `/dashboard/reseller`.

---

## 5. RÉSULTATS DES TESTS AUTOMATISÉS DE CONFORMITÉ

La suite de validation automatisée (`supabase/tests/phase14_catalog_and_feed_test.sql`) a été exécutée directement sur la base de données :

| Identifiant | Intitulé du Test | Résultat | Commentaire |
| :---: | :--- | :---: | :--- |
| **TEST 1** | Référentiel catalogue global >= 70 produits | 🟢 **SUCCÈS** | 73 produits de référence semés et vérifiés (`is_global = TRUE`, `created_by_company_id IS NULL`). |
| **TEST 2** | Profil et rôle administrateur dédié | 🟢 **SUCCÈS** | Compte `admin@marcheagricole.cd` vérifié avec `role = 'admin'` dans `profiles`. |
| **TEST 3** | Intégrité des données antérieures existantes | 🟢 **SUCCÈS** | Produit « Manioc doux » présent, association `company_products` pour Mendes meta intacte, production de Matadi active. |
| **TEST 4** | Colonnes étendues `company_products` | 🟢 **SUCCÈS** | Colonnes `image_url`, `unit`, `notes` présentes et opérationnelles. |
| **TEST 5** | Politiques de sécurité RLS `products` | 🟢 **SUCCÈS** | `products_select_policy` étanche (produits globaux publics, produits privés isolés). |
| **TEST 6** | Trigger de protection des photos officielles | 🟢 **SUCCÈS** | Trigger `trg_protect_global_product_images` actif et vérifié. |
| **TEST 7** | Procédure RPC `create_custom_product_and_associate` | 🟢 **SUCCÈS** | Fonction disponible, paramétrée avec `is_global = FALSE` pour isolation absolue. |
| **TYPECHECK** | Compilation TypeScript (`tsc --noEmit`) | 🟢 **SUCCÈS** | 0 erreur TypeScript dans l'ensemble du projet. |

---

## 6. RESPECT DES RÈGLES D'OR DE LA V1

1. **Règle 1 (Séparation Inscription / Production)** :
   L'inscription des entreprises et revendeurs reste strictement découplée de toute création de produit ou production.
2. **Règle 2 (Aucune Donnée Fictive — No Mock Data)** :
   Les 73 produits semés sont des définitions botaniques/agronomiques standard de référence nationale, sans aucune donnée commerciale fictive (aucun faux prix, aucun faux stock, aucune fausse commande). Tous les flux et tableaux de bord affichent des données transactionnelles réelles ou des états vides informatifs.
3. **Règle 3 (Séparation Stricte des Entités Métier)** :
   $\text{Produit Global} \neq \text{Produit Privé} \neq \text{Configuration Exploitation} \neq \text{Production} \neq \text{Demande} \neq \text{Campagne} \neq \text{Commande}$.
4. **Règle 4 (Discipline Opérationnelle)** :
   Respect strict du périmètre du Prompt 14. Aucune fonctionnalité V2 anticipée.
