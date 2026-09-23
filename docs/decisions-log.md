# REGISTRE DES DÉCISIONS D'ARCHITECTURE ET MÉTIER (docs/decisions-log.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-09 — Phase 2 Validée et Déployée*

---

## CONTEXTE ET FORMAT DU REGISTRE

Ce document recense l'intégralité des décisions d'architecture, de conception métier, d'arbitrage fonctionnel et de délimitation de périmètre prises pour la **Plateforme Agricole V1**. Chaque décision est consignée avec son contexte, son statut et ses justifications techniques ou stratégiques.

---

## 1. DÉCISIONS DE CADRAGE STRATÉGIQUE

### ADR-001 : Cahier des Charges Principal comme Référence Cible Pluriannuelle
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Le document est retenu comme boussole stratégique globale, mais ne doit pas être interprété comme une commande de développement simultané de toutes ses briques.

### ADR-002 : Délimitation Stricte du Périmètre de la V1 Expérimentale
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : La V1 se concentre exclusivement sur : Inscription/Profils $\rightarrow$ Offre agricole (Productions) + Demande marché $\rightarrow$ Campagnes géographiquement ciblées $\rightarrow$ Commandes fermes avec réservation transactionnelle.

### ADR-003 : Développement Progressif avec Validation par Jalons
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Le développement est séquencé en 12 phases strictement délimitées (Phase 0 à Phase 11).

---

## 2. DÉCISIONS DE CONCEPTION MÉTIER ET MODÈLE DE DONNÉES

### ADR-004 : Séparation Inscription / Production (Règle d'Or 1)
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : L'inscription d'une entreprise se limite à son identité, son profil, sa localisation et son logo. La configuration des produits et la création des fiches de production s'effectuent depuis le tableau de bord après authentification.

### ADR-005 : Interdiction Absolue des Données Fictives ("No Mock Data" — Règle d'Or 2)
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Aucune donnée simulée dans le code source ou la base de données. Base vide au démarrage (hors référentiel géographique pays/provinces indispensable aux clés étrangères).

### ADR-006 : Étanchéité Absolue des 5 Entités Métier (Règle d'Or 3)
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Maintien strict de la séparation : $\text{Produit} \neq \text{Production} \neq \text{Demande} \neq \text{Campagne} \neq \text{Commande} \neq \text{Stock Réservé}$.

### ADR-007 : Décloisonnement de l'Analyse Territoriale de la Demande
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : L'entreprise agricole peut observer l'intégralité des demandes agrégées du territoire national via la vue SQL `v_market_demands_aggregated`, sans restriction sur ses propres zones de livraison actuelles.

### ADR-008 : Éligibilité à la Commande par Correspondance Territoriale
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Contrôle strict en base de données : un revendeur ne peut commander que si sa province de rattachement fait partie des zones déclarées dans `campaign_delivery_zones`.

### ADR-009 : Réservation de Stock Atomique et Anti-Surréservation
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Verrouillage pessimiste (`SELECT ... FOR UPDATE`) dans la procédure RPC `create_order_with_reservation`, garantissant qu'aucune double réservation ou dépassement de stock ne soit possible même sous forte concurrence.

### ADR-010 : Stack Technologique V1
* **Date** : 2026-09-09 | **Statut** : Validé
* **Décision** : Next.js 14+ / Supabase (PostgreSQL 17) / Tailwind CSS / TypeScript.

---

## 3. DÉCISIONS TECHNIQUES DE LA PHASE 1 (DATABASE)

### ADR-011 : Découpage Modulaire des Migrations SQL (9 Migrations)
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Contexte** : Éviter une migration monolithique fragile et illisible.
* **Décision** : Découpage en 9 migrations logiques ordonnées.

### ADR-012 : Procédures RPC Sécurisées pour les Réservations et Annulations
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Décision** : Encapsulation des mutations dans `stock_reservations` via fonctions `SECURITY DEFINER`.

### ADR-013 : Configuration Native des Buckets Supabase Storage
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Décision** : Création de deux buckets `public-assets` (public) et `private-documents` (privé) avec politiques RLS strictes sur `storage.objects`.

---

## 4. DÉCISIONS TECHNIQUES DE LA PHASE 2 (AUTHENTIFICATION ET RÔLES)

### ADR-014 : Protection Anti-Escalade de Rôle et Interdiction de l'Auto-Attribution Admin
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Contexte** : Un utilisateur malveillant pourrait tenter de modifier son rôle en `admin` via l'API client Supabase.
* **Décision** : Mise en place de deux triggers PostgreSQL en `SECURITY DEFINER` :
  1. `check_profile_creation_role` : interdit formellement d'insérer un profil avec `role = 'admin'` sans être administrateur ou `service_role`.
  2. `prevent_profile_role_escalation` : interdit formellement de modifier le champ `role` sur la table `profiles` pour tout utilisateur non-administrateur.
* **Justification** : Sécurité absolue au niveau de la base de données, indépendamment des contrôles frontend.

### ADR-015 : Synchronisation Atomique Post-Signup via Trigger Database
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Contexte** : Assurer l'intégrité de l'inscription utilisateur, profil et entité morale sans dépendre d'appels frontend successifs vulnérables aux pannes réseau.
* **Décision** : Trigger `handle_new_user_registration` sur `auth.users` et trigger `handle_new_company_created` sur `companies` (créateur assigné immédiatement comme `owner` dans `company_members` pour respecter BR-COMP-05).
* **Justification** : Opération 100% transactionnelle ACID, zéro état corrompu ou profil orphelin.

### ADR-016 : Contrôle d'Accès Hybride Middleware RBAC et Server Components
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Contexte** : Protéger les routes sensibles `/dashboard/company`, `/dashboard/reseller`, `/dashboard/admin`.
* **Décision** : 
  1. Le middleware racine Next.js rafraîchit la session JWT Supabase et intercepte les accès transversaux non autorisés pour rediriger vers le dashboard légitime de l'acteur.
  2. Chaque layout/page serveur vérifie à nouveau le rôle réel en base via `createServerClient` avant le rendu HTML.
* **Justification** : Défense en profondeur, performance et expérience utilisateur fluide.

---

## 5. DÉCISIONS TECHNIQUES DE LA PHASE 3 (INTERFACES ET ESPACES V1)

### ADR-017 : Architecture Modulaire des Dashboards, Navigation Filtrée et Gestion des États Vides
* **Date** : 2026-09-09 | **Statut** : Validé et Appliqué
* **Contexte** : Fournir une ergonomie professionnelle et responsive pour les 3 espaces d'utilisateurs (`/dashboard/company`, `/dashboard/reseller`, `/dashboard/admin`) tout en préparant les sous-modules métier des phases 4 à 10 sans rupture de structure ni injection de fausses données ("No Mock Data").
* **Décision** :
  1. **Composants d'UI génériques** : Création de briques visuelles isolées (`Badge`, `Card`, `EmptyState`, `PageHeader`, `StatCard`) respectant la charte chromatique (`forest` pour les entreprises agricoles, `earth` pour les acheteurs professionnels/revendeurs, `slate` pour l'administration système).
  2. **DashboardLayout unifié avec Drawer Mobile** : Une navigation latérale (`AppSidebar`) et supérieure (`AppHeader`) réactive, pliable sur mobile via drawer coulissant et fixe sur grand écran.
  3. **Sous-pages d'architecture jalonnées** : Déploiement de routes réservées pour chaque module futur (`products`, `productions`, `demands`, `campaigns`, `orders`) affichant un composant `EmptyState` explicite indiquant le numéro de phase d'activation, empêchant toute confusion ou sentiment d'inachèvement chez l'utilisateur.
  4. **Comptabilisation PostgreSQL directe** : Tous les compteurs de tableaux de bord proviennent de vraies requêtes `{ count: 'exact', head: true }` sur Supabase. Lorsque la base est neuve, les compteurs affichent rigoureusement `0` accompagnés d'états vides contextualisés.
* **Justification** : Conformité absolue avec les Règles d'Or 2 et 3, pérennité de l'arborescence Next.js App Router et séparation étanche des rôles.

---

## 6. DÉCISIONS TECHNIQUES DE LA PHASE 4 (GESTION DES PRODUITS V1)

### ADR-018 : Référentiel National `products`, Associations d'Exploitation `company_products`, Détection Anti-Doublons et Contribution Décentralisée
* **Date** : 2026-09-10 | **Statut** : Validé et Appliqué
* **Contexte** : Permettre aux entreprises agricoles d'exploiter un catalogue de denrées centralisé tout en autorisant l'ajout de nouvelles variétés locales absentes, sans dégrader la qualité du catalogue national par des doublons synonymes ou des fautes de casse/espaces.
* **Décision** :
  1. **Séparation Référentiel vs Exploitation** : Maintien strict de l'indépendance de `products` (donnée de référence partagée : nom officiel, catégorie, unité par défaut) et de `company_products` (donnée privée de l'exploitation : personnalisation locale, archivage doux `is_active`).
  2. **Procédure Atomique en Base (`create_custom_product_and_associate`)** :
     - Exécutée en `SECURITY DEFINER` avec contrôle d'authentification (`auth.uid() IS NOT NULL`) et vérification d'appartenance (`is_company_member`).
     - Normalisation du libellé (`TRIM` et remplacement des espaces multiples par un espace unique).
     - Détection insensible à la casse (`LOWER(name) = LOWER(v_clean_name)`).
     - Si la denrée existe déjà, réutilisation immédiate de son `id` sans générer de duplicata dans `products`.
     - Si la denrée est absente, insertion dans `products` puis association immédiate dans `company_products`.
  3. **Archivage Doux Sans Perte d'Historique** : Désactivation via le drapeau `is_active` sur `company_products` plutôt qu'une suppression physique (`DELETE`), préservant l'intégrité relationnelle pour les futures productions (Phase 5).
  4. **Stockage Public Dédié** : Téléversement direct des illustrations de produits dans le bucket Supabase Storage `public-assets/products/*`.
* **Justification** : Conformité aux Règles d'Or 2 et 3, intégrité transactionnelle ACID, zéro pollution du catalogue national et résilience opérationnelle.

---

## 7. DÉCISIONS TECHNIQUES DE LA PHASE 5 (GESTION DES PRODUCTIONS V1)

### ADR-019 : Indépendance Absolue de la Production, Rattachement Obligatoire aux Produits d'Exploitation et Visibilité Découplée
* **Date** : 2026-09-10 | **Statut** : Validé et Appliqué
* **Contexte** : Assurer la gestion des cycles culturaux agricoles (`productions`) en garantissant qu'une production ne soit jamais confondue avec un stock, une récolte certifiée ou une campagne commerciale, et que seules les denrées que l'entreprise a déclarées cultiver (`company_products`) puissent faire l'objet d'un cycle.
* **Décision** :
  1. **Découplage Strict des Concepts Métier** :
     - La quantité saisie est enregistrée comme une **quantité planifiée** (`expected_quantity`).
     - Elle n'engendre aucune écriture dans les stocks (`stock_reservations` ou lots futurs).
     - Elle ne crée aucune campagne commerciale (`campaigns`).
  2. **Contrôle d'Appartenance Produit** :
     - Une production doit obligatoirement être rattachée à un `company_product_id` actif appartenant à l'entreprise connectée.
     - L'accès direct à un produit du catalogue non configuré par l'entreprise est rejeté côté serveur.
  3. **Stockage et Médias Réels** :
     - Stockage des photographies réelles de champs/cultures dans le bucket Supabase Storage `public-assets/productions/{uuid}.{ext}`.
     - Fallback automatisé sur l'image du produit catalogue si aucune photographie spécifique n'est fournie, afin de satisfaire la contrainte d'intégrité `main_image_url NOT NULL`.
  4. **Gestion de la Visibilité et RLS** :
     - Le drapeau `is_public` permet d'anticiper le feed de découverte revendeurs (Phase 7) sans créer d'offre marchande.
     - Seules les productions avec `is_public = TRUE` et un statut actif (`planned`, `growing`, `harvested`) sont lisibles publiquement. Les productions `draft` et `cancelled` restent strictement privées à l'entreprise.
* **Justification** : Respect fondamental de la Règle d'Or 3, intégrité relationnelle, zéro ambiguïté sur la disponibilité physique des denrées.

---

## 8. DÉCISIONS TECHNIQUES DE LA PHASE 6 (DEMANDES ET ANALYSE TERRITORIALE V1)

### ADR-020 : Sécurisation RLS des Demandes, Anonymat Total et Vue Décloisonnée v_market_demands_aggregated
* **Date** : 2026-09-11 | **Statut** : Validé et Appliqué
* **Contexte** : Assurer la collecte et l'agrégation territoriale des besoins formulés par les revendeurs tout en protégeant leur identité commerciale, en interdisant toute fuite de coordonnées directes vers les producteurs concurrents et en respectant le découplage territorial complet.
* **Décision** :
  1. **Protection RLS Stricte sur la Table Brute `demands`** :
     - Suppression de la politique générale `status = 'active'` qui ouvrait la lecture des demandes brutes.
     - Un revendeur ne peut requêter (`SELECT`) que ses propres enregistrements (`auth.uid() = reseller_id`).
     - Les entreprises agricoles n'ont **aucun droit d'accès direct** à l'endpoint `/rest/v1/demands`.
  2. **Anonymat Garanti via la Vue `v_market_demands_aggregated`** :
     - Les entreprises consultent les besoins du marché exclusivement via la vue PostgreSQL consolidée.
     - La vue agrège les volumes actifs par quadruplet `(product_id, country_id, province_id, unit)`.
     - Aucune information nominative, identifiant revendeur (`reseller_id`), numéro de téléphone ou note privée n'est exposée.
  3. **Découplage Territorial et Indépendance Métier** :
     - Les revendeurs sont libres d'exprimer une demande sur n'importe quel territoire (pays, province, ville), indépendamment des zones de chalandise actuelles des entreprises.
     - Une demande ne déclenche aucune réservation de stock, ne génère aucun lot physique et ne crée aucune commande ni campagne.
* **Justification** : Conformité stricte aux Règles d'Or 2 et 3, protection de la vie privée des revendeurs, prévention du contournement de la plateforme et intégrité relationnelle.

---

## 9. DÉCISIONS TECHNIQUES DE LA PHASE 7 (FEED REVENDEUR V1)

### ADR-021 : Architecture du Feed Revendeur, Visibilité Publique et Découplage des Offres Commerciales
* **Date** : 2026-09-12 | **Statut** : Validé et Appliqué
* **Contexte** : Fournir aux revendeurs connectés un flux dynamique de découverte des productions agricoles réelles publiées par les exploitations, tout en garantissant l'étanchéité des données privées des producteurs et la non-confusion avec les campagnes et stocks.
* **Décision** :
  1. **Découplage Strict Production / Offre Commerciale** :
     - Les publications du feed reflètent fidèlement les **productions déclarées** (`is_public = TRUE` et statut parmi `planned`, `growing`, `harvested`).
     - Les tonnages affichés sont qualifiés de **"Production prévue"** et ne confèrent aucun droit de réservation immédiat ni engagement ferme de stock.
     - Aucun prix de vente ni bouton "Commander" n'est présent dans le feed (réservés aux campagnes commerciales en Phase 9 et commandes en Phase 10).
  2. **Filtrage Multicritères Réactif & Exploration Décloisonnée** :
     - Le feed n'est pas restreint arbitrairement à la province d'inscription du revendeur, lui permettant d'explorer librement les opportunités nationales.
     - Prise en charge des filtres par recherche textuelle (culture, exploitation), par catégorie de produit et par province/pays.
  3. **Protection des Données Privées & Sécurité RLS** :
     - Les productions `draft`, `cancelled` et `is_public = FALSE` sont strictement inaccessibles aux revendeurs.
     - Les documents légaux (RCCM), coordonnées privées et identités des membres d'exploitation ne sont pas inclus dans les jointures publiques du feed.
* **Justification** : Conformité aux Règles d'Or 2 et 3, protection de la vie privée des exploitants et cohérence architecturale.

---

## 10. DÉCISIONS TECHNIQUES DE LA PHASE 8 (DÉTAIL PRODUCTION ET PROFIL PUBLIC ENTREPRISE V1)

### ADR-022 : Profil Public Entreprise et Découplage de l'Espace Privé
* **Date** : 2026-09-15 | **Statut** : Validé et Appliqué
* **Contexte** : Permettre aux revendeurs et visiteurs de consulter la fiche détaillée d'une production déclarée et le profil public d'une exploitation agricole, tout en interdisant formellement l'accès à l'espace d'administration privé de l'entreprise et en maintenant l'absence de tout prix, commande ou stock prématuré.
* **Décision** :
  1. **Séparation Stricte Profil Public vs Dashboard Privé** :
     - Le dashboard privé (`/dashboard/company`) conserve l'exclusivité de la gestion interne (catalogue, parcelles, productions privées/brouillons, demandes, documents administratifs et membres).
     - Le profil public (`/dashboard/reseller/companies/[id]` et `/companies/[id]`) est servi par une requête dédiée `getPublicCompanyProfile` qui n'extrait que les informations institutionnelles publiques (raison sociale, logo, description, localisation géographique, statut de vérification, date d'inscription).
     - Les téléphones privés, emails internes, documents RCCM et identités des membres ne sont jamais transmis.
  2. **Filtrage Étanche des Productions Publiques de l'Exploitation** :
     - La fonction `getCompanyPublicProductions` n'expose que les productions actives (`is_public = TRUE` et statuts `planned`, `growing`, `harvested`).
     - Les brouillons (`draft`), productions privées (`is_public = FALSE`) et annulations (`cancelled`) sont rigoureusement invisibles pour les acheteurs et visiteurs.
  3. **Étiquetage Strict "Quantité planifiée" & Respect des Invariants** :
     - Tout volume prévisionnel d'une culture déclarée est explicitement qualifié de **"Quantité planifiée"** (jamais *"Stock disponible"* ni *"Quantité disponible"*).
     - Aucun prix de vente commercial, aucune campagne, aucune commande et aucune réservation de stock ne sont créés ou affichés dans ces fiches d'information.
  4. **Navigation Fluide et Bidirectionnelle** :
     - Feed Revendeur $\rightarrow$ Fiche Détail Production $\rightarrow$ Profil Public Entreprise $\rightarrow$ Détail Production $\rightarrow$ Retour au Feed.
* **Justification** : Respect absolu des Règles d'Or 1, 2 et 3, protection de la vie privée des producteurs, sécurité RLS et absence de promesses de stock infondées.

---

## 11. DÉCISIONS TECHNIQUES DE LA PHASE 9 (CAMPAGNES COMMERCIALES V1)

### ADR-023 : Campagnes Commerciales, Fixation des Prix et Territoires de Chalandise
* **Date** : 2026-09-15 | **Statut** : Validé et Appliqué
* **Contexte** : Permettre aux entreprises agricoles de formuler des offres commerciales fermes sur la base de leurs productions existantes, en fixant des volumes dédiés, des prix unitaires fermes, des calendriers de vente et des territoires géographiques de livraison, tout en permettant aux revendeurs de découvrir ces opportunités avec calcul d'éligibilité sans créer prématurément de commandes ou de réservations.
* **Décision** :
  1. **Adossement Obligatoire à une Production Existante** :
     - Une campagne (`campaigns`) ne peut pas exister de manière autonome sans faire référence à une production (`productions`) de l'exploitation.
     - Le volume commercialisable (`marketable_quantity`) est borné ($> 0$ et $\le \text{expected\_quantity}$ de la production).
  2. **Indépendance Absolue Demande / Campagne (Scénario 30)** :
     - La création d'une offre commerciale par une entreprise ne lie pas automatiquement les demandes de marché existantes.
     - Les demandes de revendeurs restent intactes, actives et autonomes ; aucun stock n'est décrémenté et aucune commande n'est créée sans accord explicite ultérieur.
  3. **Territoires de Desserte Explicites (`campaign_delivery_zones`)** :
     - Chaque campagne spécifie au moins une province de desserte. L'interface revendeur calcule dynamiquement la compatibilité avec sa province déclarée à l'inscription (*"Votre province est desservie"* / *"Non desservie"*).
  4. **Cycle de Vie et Visibilité RLS** :
     - Seules les campagnes avec le statut `active` sont lisibles par les revendeurs.
     - Les brouillons (`draft`), mises en pause (`paused`), achevées (`completed`) et annulées (`cancelled`) restent privées pour l'exploitation propriétaire.
  5. **Découplage Temporel Commande / Réservation (Phase 10)** :
     - Les cartes d'exploration revendeur affichent les conditions commerciales complètes et indiquent expressément l'ouverture prochaine du module de commande ferme en Phase 10.
* **Justification** : Conformité aux Règles d'Or 2 et 3, intégrité transactionnelle, respect des invariants et préparation de la boucle de réservation atomique de la Phase 10.

---

## 12. DÉCISIONS TECHNIQUES DE LA PHASE 10 (COMMANDES ET RÉSERVATION V1)

### ADR-024 : Commandes Fermes, Réservation Atomique et Protection Anti-Surbooking
* **Date** : 2026-09-15 | **Statut** : Validé et Appliqué
* **Contexte** : Permettre à un revendeur authentifié et éligible territorialement de passer commande ferme sur une campagne commerciale ouverte, d'isoler la réservation atomique de stock sous forte concurrence (protection anti-surbooking), de figer le prix contractuel et de gérer le cycle de vie des commandes jusqu'à la libération des stocks en cas d'annulation.
* **Décision** :
  1. **Contrôle d'Éligibilité Territoriale Strict** :
     - Vérification obligatoire que la province de livraison (`delivery_province_id`) est présente dans les zones desservies de la campagne (`campaign_delivery_zones`). Rejet d'erreur côté PostgreSQL et côté Server Action si inéligible.
  2. **Verrouillage Pessimiste et Anti-Surbooking Atomique (`create_order_with_reservation` RPC)** :
     - La procédure SQL applique un `SELECT ... FOR UPDATE` sur la ligne de campagne.
     - Calcul du stock disponible en temps réel : $\text{Stock Disponible} = \text{marketable\_quantity} - \sum(\text{stock\_reservations actives})$.
     - Si $\text{quantité commandée} > \text{Stock Disponible}$, la transaction est immédiatement levée en exception sans création de commande partielle ou fantôme.
  3. **Immuabilité Contractuelle du Snapshot de Prix** :
     - Le prix unitaire (`unit_price`) et le montant total (`total_amount`) sont figés au moment exact de la passation de commande dans `order_items` et `orders`.
     - Toute modification ultérieure de prix sur la campagne mère n'altère en rien les commandes déjà émises.
  4. **Cycle de Statuts et Libération Automatique de Réservation** :
     - Statuts de commande supportés : `pending` (en attente), `confirmed` (confirmée), `preparing` (en préparation), `ready` (prête pour livraison), `delivered` (livrée), `cancelled` (annulée).
     - Lors d'une annulation (`cancel_order_and_release_reservation` RPC), la réservation passe à `released` et restitue instantanément le stock disponible à la campagne.
  5. **Isolation RLS Multi-Tenant & Absence Totale de Mock Data** :
     - Un revendeur ne peut consulter que ses propres commandes.
     - Une entreprise ne peut consulter et mettre à jour que les commandes rattachées à ses campagnes.
     - Les calculs de stock reposent exclusivement sur les enregistrements de la base de données PostgreSQL.
* **Justification** : Conformité absolue aux Règles d'Or 1, 2 et 3, intégrité transactionnelle ACID, zéro surbooking possible et sécurité multi-tenant.

---

## 13. DÉCISIONS TECHNIQUES DE LA PHASE 11 (TESTS, SÉCURITÉ ET VALIDATION FINALE V1)

### ADR-025 : Homologation Globale de la V1 Expérimentale, Audit RLS et Recette Finale
* **Date** : 2026-09-16 | **Statut** : Validé et Appliqué
* **Contexte** : Réaliser l'audit final de sécurité, d'architecture, d'intégrité relationnelle, de concurrence et de performance de la V1 Expérimentale avant homologation technique.
* **Décision** :
  1. **Audit de Sécurité RLS et Secrets Client** :
     - Confirmation de l'absence totale de fuite de la clé `service_role` ou de secrets d'administration dans les bundles Next.js publics (seules `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont autorisées côté navigateur).
     - RLS activé sur 100% des 17 tables du schéma public avec fonctions d'aide `SECURITY DEFINER` évitant toute récursion.
     - Triggers PostgreSQL de protection anti-escalade (`role = 'admin'` interdit à l'inscription et au runtime pour les non-admins).
  2. **Recette Transactionnelle Complète (`phase11_final_validation_test.sql`)** :
     - 11 suites de tests automatisés validées à 100% sur Supabase : Auth anti-escalade, catalogue vs company_products, cycle cultural des productions et isolation des brouillons, demandes revendeurs décloisonnées avec anonymat RLS, création de campagnes sans effets de bord, rejet strict hors territoires desservis, passation de commande avec snapshot contractuel de prix immuable, anti-surbooking et saturation exacte sous verrouillage pessimiste `FOR UPDATE`, annulation et libération instantanée du stock dans le disponible, étanchéité multi-tenant absolue, et intégrité référentielle `RESTRICT`.
  3. **Vérification "Zéro Donnée Fictive" (Règle d'Or 2)** :
     - Certification que toutes les interfaces reposent exclusivement sur des requêtes réelles Supabase et restituent des états vides informatifs et soignés lorsqu'aucun enregistrement n'existe.
  4. **Validation de Build et de Typage** :
     - 0 erreur TypeScript (`tsc --noEmit`).
     - Build de production Next.js 14+ (`npm run build`) validé avec succès sur les 30 routes applicatives.
  5. **Cadrage et Périmètre V1 Respecté** :
     - Exclusion confirmée de toutes les fonctionnalités futures (pawaPay, abonnements payants, quotas bloquants, QR codes, Flutter natif, IA prédictive).
* **Justification** : Conformité irréprochable aux Règles d'Or 1 à 4, sécurité et intégrité technique garanties pour le déploiement de la V1 Expérimentale.

---

## 14. DÉCISIONS TECHNIQUES DE LA PHASE 12 (STABILISATION ET CORRECTIONS POST-VALIDATION V1)

### ADR-026 : Harmonisation Multi-Tenant et Durcissement Post-Audit
* **Date** : 2026-09-16 | **Statut** : Validé et Appliqué
* **Contexte** : Corriger les anomalies mineures identifiées lors de l'audit de la Phase 11 sans étendre le périmètre fonctionnel ni introduire de nouvelles fonctionnalités futures.
* **Décision** :
  1. **Harmonisation de la Résolution `company_id` (`getCompanyIdForUser`)** :
     - Uniformisation dans tous les Server Actions (`products.ts`, `productions.ts`, `campaigns.ts`, `company.ts`) pour résoudre l'identifiant d'entreprise via `company_members` (collaborateurs, délégués et owners) avec repli systématique sur `companies.created_by`.
  2. **Interception et Convivialité des Exceptions RPC (`orders.ts`)** :
     - Traduction des messages techniques PostgreSQL en formulations métier explicites à destination de l'utilisateur final.
  3. **Vérification de Non-Régression** :
     - Maintien du zéro mock data, certification du typage TypeScript (`tsc --noEmit`), et validation intégrale du build de production Next.js 14+ (30 routes générées).
  4. **Classification Officielle** :
     - Homologation du système en **Classe A — STABLE** pour son exploitation en V1 Expérimentale.
* **Justification** : Conformité aux 4 Règles d'Or et stabilité opérationnelle garantie.

---

## 15. DÉCISIONS TECHNIQUES DE LA PHASE 13 (CORRECTIONS ADMIN ET UX V1)

### ADR-026 : Espace Admin MVP, Skeleton Screens et Optimisation du Rendu
* **Date** : 2026-09-17 | **Statut** : Validé et Appliqué
* **Contexte** : Assurer l'accessibilité de l'espace administration système prévu dans le MVP et éliminer les ressentis de lenteur lors des navigations entre sections des dashboards.
* **Décision** :
  1. Implémentation des skeleton screens sur toutes les transitions des sections des dashboards.
  2. Sécurisation et fiabilisation des routes `/dashboard/admin`.
* **Justification** : Ergonomie et conformité MVP.

---

## 16. DÉCISIONS TECHNIQUES DE LA PHASE 14 (CATALOGUE GLOBAL, PRODUITS SOCIÉTÉ ET FLUX REVENDEUR)

### ADR-027 : Découplage Strict Catalogue Global vs Configuration Société, Indépendance des Visuels et Flux Revendeur Direct
* **Date** : 2026-09-21 | **Statut** : Validé et Appliqué
* **Contexte** : Correction d'une erreur de conception où les ajouts de produits par des sociétés polluaient le catalogue global et où les photos se contaminaient mutuellement.
* **Décision** :
  1. **Découplage Structurel** :
     - Les produits de référence sont strictement globaux (`is_global = TRUE`, `created_by_company_id = NULL`), gérés exclusivement par l'Admin via `/dashboard/admin/products`.
     - Les produits hors catalogue créés exceptionnellement par une entreprise sont strictement privés (`is_global = FALSE`, `created_by_company_id = company_id`).
     - Les personnalisations d'exploitation résident dans `company_products` (`custom_name`, `unit`, `notes`, `image_url`).
  2. **Indépendance des Photos et Guardrails de Sécurité** :
     - La photo d'exploitation est isolée dans `company_products.image_url`. Elle n'écrase jamais `products.image_url`.
     - Déploiement du trigger `trg_protect_global_product_images` et verrouillage RLS empêchant tout écrasement des visuels officiels.
  3. **Parcours en 2 Étapes** :
     - Étape 1 : Recherche dans le catalogue global officiel (avec proposition de création privée si absent).
     - Étape 2 : Configuration d'exploitation avec prévisualisation du visuel officiel par défaut et téléversement optionnel.
  4. **Compte Administrateur Dédié** :
     - Création de `admin@marcheagricole.cd` (role: `admin`).
     - Connexion via la route standard `/login` avec redirection automatique vers `/dashboard/admin`. Pas de lien d'administration sur la page d'accueil publique.
  5. **Flux Revendeur Direct** :
     - La page `/dashboard/reseller` affiche directement le flux des productions (`FeedView`) avec recherche textuelle instantanée, sélection des catégories par « pills » horizontaux scrollables sur mobile, et filtres par province et statut.
* **Justification** : Qualité des données, étanchéité multi-tenant, zéro contamination de visuels et clarté du flux revendeur.

---

## 17. DÉCISIONS TECHNIQUES DE LA PHASE 18 (STABILISATION, INTÉGRITÉ HISTORIQUE ET COHÉRENCE DES WORKFLOWS)

### ADR-028 : Préservation Absolue de l'Historique Commercial, Snapshots Immuables et Cohérence Transversale des Flux
* **Date** : 2026-09-22 | **Statut** : Validé et Appliqué
* **Contexte** : Constat de disparitions de commandes dans l'historique lors de modifications/désactivations de productions ou campagnes parentes, échec de scan QR lié au non-sélection de `qr_code_token`, erreur 404 sur `/dashboard/company/campaigns/new`, déconnexion entre le feed revendeur et les campagnes actives, et absence de notification société lors de l'expression de demandes.
* **Décision** :
  1. **Snapshots Immuables & Autonomie des Commandes** :
     - Ajout des colonnes de dénormalisation figées : `orders.company_name_snapshot`, `orders.campaign_title_snapshot`, `orders.production_title_snapshot`, et `order_items.product_name_snapshot`.
     - Déploiement de triggers PostgreSQL automatiques (`trg_orders_snapshots`, `trg_order_items_snapshots`) garantissant le remplissage à la création.
     - Remplacement des `INNER JOIN` par des `LEFT JOIN` sur les requêtes de commandes avec affichage prioritaire de la donnée liée et repli systématique sur le snapshot en cas d'altération de l'entité parente.
  2. **Garde-fous de Suppression et Archivage Doux** :
     - Interdiction stricte de supprimer physiquement une production (`deleteProductionAction`) ou un produit configuré d'exploitation (`deleteCompanyProductAction`) s'il existe des commandes, campagnes, demandes ou réservations actives.
     - Introduction de l'archivage/désactivation douce (`archiveProductionAction`, `is_active = FALSE`). Le catalogue global `products` reste inviolable et ne peut en aucun cas être affecté.
  3. **Ajustement des Politiques RLS de Lecture Historique** :
     - Élargissement des politiques de lecture sur `campaigns`, `productions` et `company_products` pour autoriser les revendeurs à consulter les entités liées à leurs commandes ou demandes passées, même si l'entité devient inactive ou non publique.
  4. **Résolution de l'Erreur 404 de Campagne** :
     - Création de la page `/dashboard/company/campaigns/new` avec préchargement des données d'exploitation et ouverture automatique de `CampaignFormModal` avec la production parente présélectionnée.
  5. **Bascule Dynamique du Feed et Fiches Revendeurs en Campagne Active** :
     - Les productions adossées à une campagne active affichent le badge `CAMPAGNE EN COURS`, les conditions tarifaires et de volume, et substituent le bouton de demande par `[ 🛒 Commander ]` reliant directement au flux de commande ferme.
  6. **Centre de Notifications & Ciblage Précis** :
     - Émission automatique de notifications `DEMANDE_GENERALE_RECUE` et `DEMANDE_PRODUCTION_RECUE` vers les exploitants ciblés via la RPC `notify_company_on_demand_received`.
     - Rectification du broadcast d'ouverture de campagne : notification strictement restreinte aux revendeurs ayant formulé une demande préalable sur la production concernée.
  7. **Unification et Robustesse du QR Code de Livraison** :
     - Sélection systématique de `qr_code_token` dans les requêtes de commandes.
     - Procédure RPC `lookup_order_for_delivery` et widget `CompanyOrderLookupWidget` unifiés pour résoudre identiquement le jeton opaque, le numéro de commande lisible (`CMD-...`), l'UUID ou une URL scannée.
* **Justification** : Intégrité comptable et commerciale absolue, zéro perte de données, fluidité du cycle cultural vers la vente, et respect strict des règles d'or V1.

---

## 18. DÉCISIONS TECHNIQUES DE LA PHASE 19 (ISOLATION DES SESSIONS, DÉTERMINISME SSR ET MULTI-TENANCY STRICT)

### ADR-029 : Isolation Déterministe des Sessions SSR, Propagation des Cookies de Redirection et Cloisonnement Absolu des Espaces Rôles
* **Date** : 2026-09-23 | **Statut** : Validé et Appliqué
* **Contexte** : Lors d'un test sous un compte revendeur, le clic sur « Notifications » a redirigé vers l'espace d'une société agricole précédemment connectée sur le même navigateur. L'audit a révélé : (1) perte des cookies de session rafraîchis lors de chaque `NextResponse.redirect` dans le middleware Next.js, (2) rétention des pages dans le Router Cache client (RAM) lors de la déconnexion sans hard-reload, (3) liens de redirection inter-rôles hardcodés dans `NotificationsView.tsx`, (4) absence de route déterministe pour `/dashboard` et `/dashboard/notifications`.
* **Décision** :
  1. **Propagation Obligatoire des Cookies de Session en Middleware** :
     - Tout appel à `NextResponse.redirect` dans `src/lib/supabase/middleware.ts` doit obligatoirement transférer la totalité des cookies de la réponse Supabase (helper `redirectWithCookies`).
  2. **Contrôle d'Accès par Rôle (RBAC) Imperméable et Cloisonnement de Route** :
     - Le middleware interdit formellement l'accès croisé aux sous-arborescences `/dashboard/company/*`, `/dashboard/reseller/*`, `/dashboard/admin/*`. Tout utilisateur tentant d'accéder au dashboard d'un autre rôle est immédiatement redirigé vers `/unauthorized`.
  3. **Passerelles Universelles Déterministes** :
     - Implémentation des routes de redirection déterministes `/dashboard` et `/dashboard/notifications` qui résolvent le rôle du profil (`auth.uid() -> profiles.role`) et réacheminent immédiatement l'utilisateur vers son espace dédié (`/dashboard/company/notifications`, `/dashboard/reseller/notifications` ou `/dashboard/admin/notifications`).
  4. **Purge Atomique de Session et Invalidation de Cache** :
     - Server Action `logoutAction` : appel de `supabase.auth.signOut({ scope: 'global' })`, suppression explicite de tous les cookies de chunks (`sb-*`, `auth-token`), et invalidation totale du cache Next.js via `revalidatePath('/', 'layout')`.
     - Client `AppHeader.tsx` : purge intégrale de `localStorage` et `sessionStorage`, `signOut()` client et hard reload impératif (`window.location.href = '/login'`) pour vider instantanément le Router Cache de la mémoire vive du navigateur.
  5. **Sanitisation des Cibles de Liens de Notification** :
     - `NotificationsView.tsx` : filtrage et adaptation stricte des cibles d'URL selon le rôle actif de l'utilisateur connecté (`userRole === 'reseller'` ne peut jamais générer ou suivre une URL vers `/dashboard/company/*`).
  6. **Désactivation du Cache Statique sur les Tableaux de Bord** :
     - Injection de `export const dynamic = "force-dynamic"` et `export const revalidate = 0` sur tous les layouts de dashboards (`reseller`, `company`, `admin`).
* **Justification** : Conformité absolue aux règles d'or (séparation stricte, étanchéité multi-tenant, zéro fuite de données inter-comptes, principe du moindre privilège).

---

## 19. DÉCISIONS DE REPORT FONCTIONNEL (FONCTIONNALITÉS FUTURES)

| Réf. | Fonctionnalité Reportée | Motif du Report / Échéance |
| :--- | :--- | :--- |
| **FUT-01** | **Paiement pawaPay / Mobile Money** | Période d'essai gratuit de lancement ; transactions agricoles physiques réglées directement entre acteurs. |
| **FUT-02** | **Gestion des abonnements payants** | Activation prévue post-pilote. |
| **FUT-03** | **Quotas stricts d'utilisation** | Non requis pour valider les premières boucles réelles. |
| **FUT-04** | **QR Codes de sécurisation** | Remplacé en V1 par mise à jour manuelle des statuts logistiques. |
| **FUT-05** | **Suivi logistique multi-livraisons** | V1 traite la commande comme une unité livrée globalement. |
| **FUT-06** | **Système de réputation et score (0-100)** | Exige un volume préalable d'historique transactionnel réel. |
| **FUT-07** | **IA prédictive de la demande** | Exige 6 à 24 mois de données historiques réelles. |
| **FUT-08** | **PostGIS complexe (polygones)** | Le modèle relationnel Pays/Province/Ville suffit en V1. |
| **FUT-09** | **Notifications WhatsApp Cloud API** | Reporté post-pilote ; V1 intègre le centre interne et emails. |
| **FUT-10** | **Application Mobile Flutter** | L'application web responsive Next.js couvre les cas d'usage mobiles initiaux. |


