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

---

## 20. DÉCISIONS DU PARCOURS D'AUTHENTIFICATION & ONBOARDING (PHASES AUTH)

### ADR-030 : Séquencement Officiel de la Feuille de Route d'Authentification Post AUTH-3
* **Date** : 2026-10-11 | **Statut** : Validé (Cadrage documentaire)
* **Contexte** : Suite à la clôture et validation en production des phases AUTH-2 (confirmation d'e-mail) et AUTH-3 (mot de passe oublié et réinitialisation), la feuille de route d'authentification devait être formellement structurée pour intégrer l'organisation de l'inscription et l'accueil ultérieur des fournisseurs sociaux (Google et Apple).
* **Décision** :
  1. **Ordonnancement strict des phases** :
     $$\text{AUTH-4 (Refonte Inscription \& Onboarding Découplé)} \longrightarrow \text{AUTH-5 (Connexion Google)} \longrightarrow \text{AUTH-6 (Connexion Apple)}$$
  2. **Statut de Google et Apple** : Google (AUTH-5) et Apple (AUTH-6) demeurent des **phases ultérieures distinctes** et ne doivent faire l'objet d'aucune implémentation avant la clôture complète d'AUTH-4.
  3. **Découpage interne d'AUTH-4 en 4 sous-étapes opérationnelles** :
     - **AUTH-4.1** : Schéma SQL, migration des comptes existants et mécanisme sécurisé de complétion (RPC `SECURITY DEFINER`).
     - **AUTH-4.2** : Middleware SSR et protection hermétique des accès dashboards.
     - **AUTH-4.3** : Interfaces UI/UX (`/onboarding` et refonte épurée de `/register`).
     - **AUTH-4.4** : Recette intégrale, tests de non-régression et validation manuelle en production.
  4. **Interdiction de démarrage prématuré** : La sous-étape **AUTH-4.1 n'est pas encore autorisée à démarrer** et requiert une autorisation explicite de l'utilisateur.
* **Justification** : Dépendance structurelle absolue : les connexions sociales Google et Apple ne fournissent aucune métadonnée métier agricole ni de localisation provinciale. L'onboarding est le socle préalable indispensable à toute authentification moderne.

### ADR-031 : Modèle d'Inscription et d'Onboarding Découplé (Option B) et Garde-fous Techniques
* **Date** : 2026-10-11 | **Statut** : Validé (Cadrage documentaire — Aucune implémentation)
* **Contexte** : Les formulaires d'inscription initiaux (`/register/company` et `/register/reseller`) sont monolithiques et tentent d'enregistrer l'intégralité des identités et du territoire au moment du `signUp()`. Ce modèle est incompatible avec les retours OAuth et augmente les frictions d'inscription.
* **Décision** :
  1. **Parcours cible retenu (Option B)** :
     - Étape 1 : Création du compte avec identifiants minimaux (e-mail + mot de passe + nom complet).
     - Étape 2 : Confirmation de l'adresse e-mail selon le protocole AUTH-2 validé (déconnexion temporaire $\rightarrow$ `/login?verified=true`).
     - Étape 3 : Connexion explicite par identifiants sur `/login`.
     - Étape 4 : Détection de profil incomplet et redirection obligatoire vers `/onboarding` (accès aux dashboards bloqué par le middleware).
     - Étape 5 : Sur `/onboarding` : choix du type de compte (Entreprise agricole vs Revendeur) et saisie des données métier obligatoires (pays, province, ville, raison sociale, etc.).
     - Étape 6 : Validation serveur, création atomique de l'entité (`companies` ou `resellers`) et redirection vers le dashboard métier respectif.
     - Étape 7 : Les connexions futures d'un compte complété accèdent directement au dashboard sans repasser par `/onboarding`.
  2. **Réserves techniques et garde-fous stricts** :
     - ⚠️ **Stratégie de rôle provisoire** : Le simple ajout d'un indicateur `is_onboarded` n'est pas suffisant tant que la stratégie de rôle initial (gestion du `CHECK` sur `profiles.role` et trigger `handle_new_user_registration`) n'est pas techniquement formalisée. Aucune attribution silencieuse par défaut du rôle `reseller` ne doit être utilisée pour masquer un profil non complété.
     - ⚠️ **Maintien inviolable du trigger anti-escalade** : Le trigger `prevent_profile_role_escalation` ne doit en aucun cas être affaibli ou désactivé.
     - ⚠️ **Vérification d'identité dans la RPC privilégiée** : Toute future fonction RPC de complétion (`SECURITY DEFINER`) devra impérativement vérifier l'identité de l'appelant (`auth.uid()`), refuser formellement l'attribution du rôle `admin`, et valider l'intégrité des clés étrangères territoriales (`country_id`, `province_id`).
     - ⚠️ **Préservation intégrale des comptes existants et Admin** : Les comptes existants déjà opérationnels et le compte Admin (`admin@marcheagricole.cd`) doivent être préservés sans aucune régression ni interruption de service.
     - ⚠️ **Règle d'or 1 respectée** : L'inscription et l'onboarding ne doivent **jamais** permettre la création d'une production agricole, d'un produit d'exploitation ou d'une campagne.
     - ⚠️ **Non-régression absolue** : Préservation intégrale des garanties de validation d'AUTH-2 (confirmation e-mail et protection des dashboards) et d'AUTH-3 (mot de passe oublié et réinitialisation).

### ADR-032 : Spécification Technique de la Migration SQL 26, Privilèges de Colonnes et Validation Structurelle de l'Onboarding (AUTH-4.1)
* **Date** : 2026-10-11 | **Statut** : Validé et Implémenté Localement (Scripts SQL corrigés et durcis — Non exécuté en production)
* **Contexte** : Dans le cadre de la sous-étape AUTH-4.1, la mise en place du rôle transitoire `unassigned` et du statut `onboarding_status` nécessitait d'empêcher formellement tout contournement par requête directe client, de neutraliser le trigger d'inscription automatique au signup et de garantir l'étanchéité absolue de la RPC privilégiée suite à l'audit de sécurité final.
* **Décision & Corrections de Sécurité Appliquées** :
  1. **Privilèges de Colonnes Strictes (`REVOKE UPDATE global` + `GRANT UPDATE sélectif`)** :
     - Révocation formelle du privilège `UPDATE` sur l'ensemble de la table `profiles` pour `authenticated`, `anon` et `PUBLIC`.
     - Réattribution chirurgicale du privilège `UPDATE` à `authenticated` uniquement sur les colonnes applicatives autorisées : `full_name`, `phone`, `avatar_url`, `avatar_cloudinary_public_id`, `updated_at`.
     - Garantie physique PostgreSQL : aucune requête directe client PostgREST ne peut modifier `role` ou `onboarding_status` sans lever une erreur `42501` (permission denied).
  2. **Contrôle d'Intégrité Bi-dimensionnel dans le Trigger Anti-Escalade** :
     - Le trigger `prevent_profile_role_escalation` surveille simultanément toute variation de `role` OU de `onboarding_status` : `(NEW.role IS DISTINCT FROM OLD.role) OR (NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status)`.
     - Bloque toute tentative de modifier isolément `onboarding_status` sans respecter la transition légitime d'onboarding.
     - Valide la transition unique et légitime : `OLD.role = 'unassigned' AND OLD.onboarding_status = 'pending' AND NEW.role IN ('company', 'reseller') AND NEW.onboarding_status = 'completed'` en vérifiant la présence effective et matérielle de l'entité liée en base (`companies` avec `created_by = NEW.id` ou `resellers` avec `id = NEW.id`).
     - Interdiction absolue et inconditionnelle de toute transition vers le rôle `admin`.
  3. **RPC `complete_user_onboarding` (`SECURITY DEFINER`) et Anti-Écrasement** :
     - Fige `search_path = public, pg_temp` pour prévenir toute injection de schéma.
     - Privilège d'exécution restreint à `authenticated` (`REVOKE FROM PUBLIC`).
     - Verrouillage pessimiste immédiat (`SELECT ... FOR UPDATE`) sur le profil appelant pour éliminer les doubles clics et attaques concurrentes.
     - Rejet formel si `p_role = 'admin'` ou si le profil est déjà complété (`onboarding_status = 'completed'`).
     - Validation relationnelle stricte : vérification que `p_province_id` appartient formellement à `p_country_id`.
     - Protection anti-écrasement sans `ON CONFLICT DO UPDATE` aveugle : vérification préalable de non-existence d'entité en conflit et levée d'exception explicite si une entité existe déjà.
     - Génération déterministe du slug d'entreprise et insertion atomique.
  4. **Neutralisation du Trigger d'Inscription `handle_new_user_registration`** :
     - Suppression de toute création automatique dans `companies` ou `resellers` lors du `signUp()`.
     - Ignorance explicite de toute valeur de rôle ou de données métier transmise dans `raw_user_meta_data`.
     - Initialisation systématique de tout nouvel utilisateur avec `role = 'unassigned'` et `onboarding_status = 'pending'`.
  5. **Garantie Rétrocompatible et Règle d'Or 1** :
     - 100% des comptes existants (Société, Revendeur, Admin) sont préservés avec `onboarding_status = 'completed'`.
     - Zéro création de production agricole lors de l'onboarding.
* **Fichiers livrés** :
  - [`supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql`](file:///d:/Marché%20agricole/supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql)
  - [`supabase/tests/phase_auth4_1_onboarding_db_test.sql`](file:///d:/Marché%20agricole/supabase/tests/phase_auth4_1_onboarding_db_test.sql) (9 scénarios de test d'homologation)

### ADR-033 : Validation Locale, Homologation et Traitement des Erreurs de l'Interface d'Onboarding et de la Server Action (AUTH-4.3 & AUTH-4.4)
* **Date** : 2026-10-12 | **Statut** : Validé et Recetté Localement (Suite de 28 tests validée à 100%, TypeScript 0 erreur, Build ✓ 41/41 routes — Non exécuté en production)
* **Contexte** : Dans le cadre d'AUTH-4.3 et de la recette AUTH-4.4, l'implémentation de la page `/onboarding` et de sa Server Action `completeOnboardingAction` devait garantir la cohérence contractuelle parfaite avec la RPC `complete_user_onboarding`, l'absence de régression sur les parcours existants (AUTH-2, AUTH-3, dashboards), et l'étanchéité absolue face aux erreurs et doubles soumissions.
* **Décisions & Garanties Validées** :
  1. **Contrat d'Appel Strict & Alignement 1:1 des Paramètres** :
     - Les 11 paramètres attendus par la RPC PostgreSQL (`p_role`, `p_country_id`, `p_province_id`, `p_city`, `p_company_name`, `p_company_description`, `p_company_address`, `p_company_phone`, `p_business_name`, `p_reseller_type`, `p_delivery_address`) sont extraits, validés et transmis fidèlement par `completeOnboardingAction`.
     - Les champs non pertinents pour un rôle donné sont formellement transmis à `null` pour prévenir toute pollution croisée.
  2. **Défense en Profondeur sur l'Attribution des Rôles** :
     - Barrière 1 (Client) : Cartes interactives restreintes exclusivement à `company` et `reseller`.
     - Barrière 2 (Server Action) : Rejet immédiat de toute valeur de rôle différente de `'company'` ou `'reseller'` (rejet explicite de `'admin'`).
     - Barrière 3 (RPC `complete_user_onboarding`) : Exception levée si `p_role = 'admin'` ou `p_role NOT IN ('company', 'reseller')`.
     - Barrière 4 (Trigger `prevent_profile_role_escalation`) : Blocage inconditionnel si `NEW.role` n'est pas dans `('company', 'reseller')`.
  3. **Protection Anti-Double Soumission & Idempotence** :
     - Au niveau client, le composant `SubmitButton` (`useFormStatus`) désactive physiquement le bouton et affiche un indicateur de chargement dès le premier clic.
     - Au niveau base de données, la RPC effectue un verrou pessimiste `SELECT ... FOR UPDATE` sur le profil et rejette toute soumission répétée (`onboarding_status = 'completed'`).
     - Au niveau Server Action, la détection d'un profil déjà complété déclenche une redirection gracieuse vers le tableau de bord sans écran d'erreur bloquant.
  4. **Isolation et Non-Régression** :
     - Redirection hermétique des comptes `unassigned/pending` vers `/onboarding` depuis toute route `/dashboard/*`.
     - Préservation intégrale des comptes existants (`company`, `reseller`, `admin`), confirmée par les suites de tests de session (`test-session-isolation.mjs` : 20/20 validés).
     - Maintien des flux AUTH-2 (e-mail confirmation $\rightarrow$ `/login?verified=true`) et AUTH-3 (recovery $\rightarrow$ `/reset-password` $\rightarrow$ `/login?password_updated=true`), confirmés par `test-auth2-redirects.mjs` (10/10 validés).
  5. **Condition Préalable Impérative d'Homologation en Production** :
     - ⚠️ La migration SQL 26 doit être appliquée en base Supabase **AVANT** le déploiement du code Next.js contenant la relecture de `onboarding_status`. Dans le cas contraire, l'absence de la colonne `onboarding_status` provoquerait le rejet des profils vers `/login?error=profile_missing`.
* **Fichiers livrés** :
  - [`src/lib/actions/auth.ts`](file:///d:/Marché%20agricole/src/lib/actions/auth.ts) (`completeOnboardingAction`)
  - [`src/components/onboarding/OnboardingForm.tsx`](file:///d:/Marché%20agricole/src/components/onboarding/OnboardingForm.tsx)
  - [`src/app/onboarding/page.tsx`](file:///d:/Marché%20agricole/src/app/onboarding/page.tsx)
  - [`scripts/test-auth4-onboarding-matrix.mjs`](file:///d:/Marché%20agricole/scripts/test-auth4-onboarding-matrix.mjs) (28 tests unitaires/intégration)

### ADR-034 : Protocole d'Exécution Sécurisée et Fiche Opérationnelle de la Migration 26 (AUTH-4.13)
* **Date** : 2026-10-12 | **Statut** : Validé (En attente d'autorisation humaine d'application)
* **Contexte** : Avant toute modification sur la base de production `gonerlgkdnbdewjbebvq`, un audit d'outillage approfondi a démontré une incompatibilité formelle de l'outil MCP `apply_migration` avec les scripts enveloppés dans `BEGIN; ... COMMIT;` (conflit de transactions imbriquées sous PostgreSQL). Il a été requis d'établir une procédure d'application rigoureuse, vérifiable, sans ambiguïté et zéro risque pour les 10 comptes existants.
* **Décisions & Garanties Validées** :
  1. **Mode d'Exécution Unique Retenu** :
     - Utilisation exclusive du **SQL Editor du Dashboard Supabase** pour l'application directe de `20261011000026_auth_onboarding_and_provisional_role.sql`.
     - L'éditeur web transmettant directement le flux au moteur PostgreSQL, l'atomicité transactionnelle native `BEGIN ... COMMIT` est respectée.
  2. **Contrôles Post-Migration et Zéro Perte de Données** :
     - 6 requêtes en lecture seule strictes sont définies avec critères d'arrêt stricts pour vérifier les colonnes, contraintes, RPC, triggers, privilèges colonnes et la parité 1:1 exacte avec la table de sauvegarde `public._backup_profiles_pre_auth4`.
  3. **Innocuité de la Suite de 9 Tests SQL** :
     - La suite `supabase/tests/phase_auth4_1_onboarding_db_test.sql` est certifiée sans effet de bord : tests 1 à 8 sur catalogues système, test 9 appelant la RPC hors session et rejeté immédiatement dès la vérification `auth.uid() IS NULL` sans aucune écriture persistée.
  4. **Ordonnancement Strict et Séparation des Autorisations** :
     - Découpage étanche en 9 étapes : précontrôles $\rightarrow$ autorisation migration $\rightarrow$ exécution SQL Editor $\rightarrow$ contrôles post-migration $\rightarrow$ tests SQL $\rightarrow$ rapport de validation $\rightarrow$ autorisation distincte CLI repair $\rightarrow$ autorisation déploiement Vercel $\rightarrow$ recette fonctionnelle.
     - Aucune synchronisation anticipée ni déploiement automatique.
* **Fichiers associés** :
  - [`supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql`](file:///d:/Marché%20agricole/supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql)
  - [`supabase/tests/phase_auth4_1_onboarding_db_test.sql`](file:///d:/Marché%20agricole/supabase/tests/phase_auth4_1_onboarding_db_test.sql)

### ADR-035 : Levée des Réserves Techniques, Privilèges Colonnes et Cohérence Chirurgicale des Profils (AUTH-4.14)
* **Date** : 2026-10-12 | **Statut** : Validé (En attente d'autorisation humaine d'application)
* **Contexte** : Avant le passage en production, un réexamen approfondi a été mené pour éliminer toute affirmation abusive (« atomicité garantie »), clarifier la matrice des privilèges PostgreSQL sur `public.profiles`, verrouiller le contrôle de non-régression des 10 profils historiques et expliciter les impacts de la fenêtre de transition sur les utilisateurs.
* **Décisions & Garanties Validées** :
  1. **Réserve Explicite sur l'Atomicité du SQL Editor** :
     - Confirmation : PostgreSQL garantit l'atomicité transactionnelle au niveau moteur si le bloc `BEGIN ... COMMIT` lui parvient intact.
     - Réserve : Supabase Studio (interface web) n'offre pas de SLA contractuel sur le transport HTTP de scripts multi-instructions volumineux. L'affirmation d'atomicité inconditionnelle est remplacée par une réserve documentée recommandant l'absence de coupure réseau lors du clic « Run ».
  2. **Matrice Précise des Privilèges de Colonnes** :
     - La révocation `REVOKE UPDATE ON public.profiles` fait passer `has_table_privilege` à `FALSE` pour `authenticated`.
     - L'accès n'est rouvert qu'au niveau colonne via `GRANT UPDATE (...)` sur `full_name`, `phone`, `avatar_url`, `avatar_cloudinary_public_id`, `updated_at`.
     - Les colonnes structurelles (`id`, `role`, `onboarding_status`, `created_at`) restent strictement interdites aux utilisateurs directs.
  3. **Contrôle Chirurgical de Parité des Profils Historiques** :
     - Le contrôle post-migration C6 est renforcé pour effectuer une vérification croisée entre `_backup_profiles_pre_auth4` et `profiles`, garantissant 0 perte d'identifiant, 0 altération de rôle, 100% de passage à `completed` et 0 doublon.
  4. **Gestion Déterministe de la Fenêtre de Transition** :
     - Les profils historiques conservent leur accès au dashboard sans régression (leurs rôles sont préservés et les Server Actions de profil respectent la liste des colonnes autorisées).
     - Tout nouvel utilisateur inscrit durant la fenêtre reçoit le rôle provisoire `unassigned` et doit patienter jusqu'au déploiement Vercel (où le middleware le dirigera vers `/onboarding`). Aucune modification manuelle de rôle n'est permise.

### ADR-036 : Validation des Critères Bloquants et Durcissement Strict du Test 9 (AUTH-4.15)
* **Date** : 2026-10-12 | **Statut** : Validé (En attente d'autorisation humaine d'application)
* **Contexte** : Dans le cadre de l'audit final avant autorisation humaine de migration, validation absolue des requêtes de non-régression, vérification formelle de l'innocuité des tests SQL et durcissement de la chaîne de rejet d'authentification du Test 9.
* **Décisions & Garanties Validées** :
  1. **Enrichissement du Contrôle 6** : Ajout de la métrique `new_unassigned_accounts` pour différencier immédiatement tout nouveau compte créé pendant la fenêtre de transition des 10 profils historiques sauvegardés.
  2. **Durcissement Matériel du Test 9** : Remplacement du matching partiel par l'égalité stricte du message d'erreur (`SQLERRM = 'Non authentifié : session utilisateur requise pour finaliser l''onboarding.'`). Confirmation mathématique qu'aucune exception d'échec ne peut être absorbée par le test.
  3. **Isolation et Règle d'Innocuité** : Aucune écriture résiduelle n'est générée par la suite de tests SQL.
* **Fichiers associés** :
  - [`supabase/tests/phase_auth4_1_onboarding_db_test.sql`](file:///d:/Marché%20agricole/supabase/tests/phase_auth4_1_onboarding_db_test.sql) (durcissement appliqué localement)

### ADR-037 : Clôture de l'Audit, Validation du Précontrôle Transactionnel et Délimitation des Risques (AUTH-4.16)
* **Date** : 2026-10-12 | **Statut** : Validé (En attente d'autorisation humaine d'application)
* **Contexte** : Avant de clôturer l'audit préalable à l'autorisation humaine de migration, analyse approfondie du mécanisme de précontrôle transactionnel face au pooler de Supabase Studio, confirmation de l'inviolabilité du fichier de tests et cadrage exhaustif des responsabilités et garanties système.
* **Décisions & Garanties Validées** :
  1. **Analyse du Précontrôle Transactionnel & Mode Pooler** :
     - Les tables temporaires (`TEMP TABLE`) étant isolées à la session PostgreSQL active, toute vérification dans une requête SQL Editor ultérieure présente un risque d'ambiguïté si le pooler (Supavisor) alloue un backend différent.
     - Recommandation d'un précontrôle mono-requête autonome par bloc PL/pgSQL ou vérification immédiate du code d'erreur `22012` renvoyé lors de la tentative.
  2. **Sanctuarisation des Profils Provisoires** :
     - Règle d'or : tout utilisateur s'inscrivant entre l'application de la migration et le déploiement Vercel conserve obligatoirement son statut `unassigned/pending`. Aucune altération manuelle n'est tolérée.
  3. **Cartographie des 4 Niveaux de Responsabilité Technique** :
     - (a) Moteur PostgreSQL : atomicité native DDL prouvée ; (b) Supabase Studio : absence de SLA sur les coupures HTTP proxy ; (c) Fenêtre Vercel : redirection temporaire 404 sur `/dashboard/unassigned` nécessitant une fenêtre minimale ; (d) Sauvegarde `_backup_profiles_pre_auth4` : couverture limitée à la table `profiles` locale.

### ADR-038 : Contrôle Final Pré-Migration et Alignement Strict du Test 9 (AUTH-4.17)
* **Date** : 2026-10-12 | **Statut** : Validé (En attente d'autorisation humaine d'application)
* **Contexte** : Contrôle technique ultime avant autorisation humaine d'application de la migration 26 sur Supabase Production.
* **Décisions & Garanties Validées** :
  1. **Validation DDL Intégrale de la Migration 26** :
     - 300 lignes inspectées, compatibilité transactionnelle PostgreSQL complète, contraintes, RPC `SECURITY DEFINER` avec `SET search_path = public, pg_temp`, triggers d'inscription et anti-escalade opérationnels.
  2. **Correction et Alignement 1:1 du Test 9** :
     - Détection d'une discordance textuelle entre la ligne 168 de la migration (`'Non authentifié : une session active est requise.'`) et l'assertion du test 9.
     - Correction locale appliquée dans `phase_auth4_1_onboarding_db_test.sql` pour assurer la stricte égalité 1:1 et éliminer tout risque de faux échec lors de la recette.
  3. **Séquencement Opératoire Strict** :
     - Ordonnancement étanche en 9 étapes maintenant une barrière stricte entre la migration, les tests, le repair CLI éventuel et le déploiement Vercel.
* **Fichiers associés** :
  - [`supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql`](file:///d:/Marché%20agricole/supabase/migrations/20261011000026_auth_onboarding_and_provisional_role.sql)
  - [`supabase/tests/phase_auth4_1_onboarding_db_test.sql`](file:///d:/Marché%20agricole/supabase/tests/phase_auth4_1_onboarding_db_test.sql) (SHA256: `01e84cc5becfea92f1c476ed596a27f4a568021b6efc61f2f4149b4a66ff56e3`)

### ADR-039 : Validation Opérationnelle Finale et Protocole en 10 Étapes (AUTH-4.18)
* **Date** : 2026-10-12 | **Statut** : Validé (En attente d'autorisation humaine d'application)
* **Contexte** : Validation matérielle ultime sur disque des fichiers de migration et de test avant soumission pour décision humaine d'application.
* **Décisions & Garanties Validées** :
  1. **Certification des Empreintes sur Disque** :
     - Migration 26 : 299 lignes, 12 818 octets, SHA256: `f4a47871c64c088c578439e68f5ff5482129bff6c9091e6e87026ccc405adf8f`.
     - Tests SQL : 201 lignes, 10 030 octets, SHA256: `01e84cc5becfea92f1c476ed596a27f4a568021b6efc61f2f4149b4a66ff56e3`.
     - Correspondance stricte 1:1 du message d'erreur d'authentification entre la RPC et le Test 9 (`'Non authentifié : une session active est requise.'`).
  2. **Protocole Opérationnel en 10 Étapes** :
     - Établissement d'une séquence rigoureuse pour l'intervention : préconditions $\rightarrow$ fenêtre d'atténuation $\rightarrow$ application SQL Editor $\rightarrow$ arrêt strict sur anomalie $\rightarrow$ 6 contrôles lecture seule $\rightarrow$ 9 tests SQL $\rightarrow$ rapport complet $\rightarrow$ autorisation distincte migration repair $\rightarrow$ autorisation distincte Vercel $\rightarrow$ recette post-déploiement.
  3. **Principe de Préservation Inconditionnelle** :
     - En cas d'erreur ou d'incident, interdiction absolue de suppression de compte utilisateur, de modification manuelle de rôle ou de rollback improvisé.

### ADR-040 : Incompatibilité Démontrée du MCP apply_migration et Verrouillage SQL Editor (AUTH-4.20)
* **Date** : 2026-10-13 | **Statut** : Validé (Verdict C — MCP Incompatible)
* **Contexte** : Audit technique approfondi de l'outil `apply_migration` du MCP Supabase pour déterminer s'il peut appliquer la migration 26 sans intervention manuelle dans le SQL Editor.
* **Preuves et Décisions Validées** :
  1. **Conflit d'Encapsulation Transactionnelle (`BEGIN;` / `COMMIT;`)** :
     - L'outil MCP relaie la requête à l'API Management Supabase (`POST /v1/projects/{ref}/database/migrations`), qui encapsule déjà le script dans une transaction backend.
     - Les instructions explicites `BEGIN;` (L. 7) et `COMMIT;` (L. 299) provoquent un avertissement à l'ouverture et une clôture prématurée de la transaction PostgreSQL. Cela brise l'atomicité gérée par l'API, rend impossible le rollback automatique et expose le driver à des erreurs de protocole transactionnel.
  2. **Désalignement Matériel de Version dans `schema_migrations`** :
     - Constat en base : la table `supabase_migrations.schema_migrations` stocke un timestamp dynamique généré à la volée par l'API (ex. `20260929212306` pour la migration 24) au lieu du préfixe numérique du fichier local (`20261011000026`).
     - L'appel via MCP briserait l'alignement avec les outils de CLI standard (`supabase migration list`, `supabase migration repair`).
  3. **Verdict Officiel** :
     - **C — MCP INCOMPATIBLE**.
     - Maintien exclusif de l'exécution manuelle dans le SQL Editor Dashboard pour garantir l'atomicité native du bloc transactionnel complet (300 lignes de `BEGIN;` à `COMMIT;`).

### ADR-041 : Audit Final et Certification Pré-Déploiement GitHub / Vercel (AUTH-4.29)
* **Date** : 2026-10-13 | **Statut** : Validé (Prêt pour publication par l'utilisateur)
* **Contexte** : Audit complet du périmètre Git, validation de l'absence de fuite de secrets, certification de la chaîne de compilation et non-régression avant push GitHub et déploiement Vercel.
* **Preuves et Décisions Validées** :
  1. **Étanchéité Git & Absence de Secrets** : Aucun fichier .env* avec secrets n'est inclus dans le suivi Git. .env.local est strictement ignoré via .gitignore. 0 secret en dur détecté dans les modifications.
  2. **Certification Compilation & Typage** : npx tsc --noEmit validé avec 0 erreur (code 0). npm run build certifié avec 41/41 routes compilées sans erreur (code 0), incluant la route SSR dynamique /onboarding (8.05 kB).
  3. **Couverture de Tests** : 28/28 tests de la matrice d'onboarding réussis (100%), 10/10 tests de non-régression AUTH-2 réussis (100%), 20/20 tests d'isolation de session réussis (100%).
  4. **Périmètre Délimité & Immuable** : Seuls les fichiers spécifiques à AUTH-4 sont inclus. Aucun push Git ni modification Supabase n'est exécuté sans action directe de l'utilisateur.

### ADR-042 : Double Verrouillage du Rejet Google OAuth /login et Préservation de la Liaison d'Identités Vérifiées (AUTH-5.16)
* **Date** : 2026-10-26 | **Statut** : Validé et Appliqué Localement
* **Contexte** : L'audit AUTH-5.15 a identifié qu'un utilisateur sans compte Radiza utilisant le bouton Google de `/login` parvenait à accéder à `/onboarding` et à choisir son rôle, contournant la séparation stricte Inscription / Connexion. L'analyse a démontré : (1) sur la branche `!effectiveIntendedRole` de `/auth/callback`, la recopie brute de `cookieStore.getAll()` réémettait les cookies de session actifs sur la réponse au lieu de les expirer ; (2) le middleware interceptait la redirection vers `/register` pour cet utilisateur avec rôle `unassigned` et le déviait automatiquement vers `/onboarding`. Par ailleurs, les comptes créés avec mot de passe se connectant avec Google avec la même adresse vérifiée bénéficient de la liaison automatique Supabase GoTrue sans duplication de profil.
* **Décisions & Garanties Validées** :
  1. **Purge Exhaustive des Cookies de Session dans le Route Handler Callback** :
     - Sur la branche `!effectiveIntendedRole` de `src/app/auth/callback/route.ts`, appel de `supabase.auth.signOut({ scope: "local" })` avec journalisation des erreurs.
     - Invalidation inviolable de tous les cookies de session Supabase (`sb-*`, `auth-token`, `supabase`) et du cookie de rôle éphémère (`radiza_oauth_role`) avec `maxAge = 0`, `expires = new Date(0)` et suppression du `cookieStore` local.
     - Interdiction absolue de réémettre les valeurs positives des cookies de session sur la réponse `noRoleResponse`.
  2. **Double Verrouillage Défensif dans le Middleware SSR (`middleware.ts`)** :
     - Exception formelle dans `updateSession` : si la route est `/register` avec le paramètre `error=no_account_google`, toute redirection vers `/onboarding` est **strictement prohibée**, même en présence d'un profil `unassigned` ou de cookies résiduels.
     - Purge défensive additionnelle de tous les cookies de session sur la réponse `supabaseResponse`.
  3. **Préservation de la Liaison Native d'Identités Google pour Comptes Existants (Scénario D)** :
     - Supabase GoTrue lie nativement les identités Google vérifiées aux comptes e-mail existants sous le même `user_id`.
     - Inspection directe en lecture seule : 0 compte dupliqué, 0 profil dupliqué. Le profil existant et complété (`onboarding_status = 'completed'`) est immédiatement dirigé vers son tableau de bord respectif sans mot de passe redondant.
  4. **Garantie de Reprise d'Inscription Normale (Scénario B)** :
     - Tout compte Auth incomplet créé lors d'une tentative `/login` rejetée peut reprendre son inscription via `/register/company` ou `/register/reseller`. Le rôle choisi est verrouillé par `set_user_intended_role` sans conflit d'identité ni duplication de profil.
* **Fichiers modifiés** :
  - [`src/app/auth/callback/route.ts`](file:///d:/Marché%20agricole/src/app/auth/callback/route.ts)
  - [`src/lib/supabase/middleware.ts`](file:///d:/Marché%20agricole/src/lib/supabase/middleware.ts)
  - [`scripts/test-auth5-google-oauth.mjs`](file:///d:/Marché%20agricole/scripts/test-auth5-google-oauth.mjs)


---

### ADR-043 : Durcissement de Sécurité Post-Audit — Migration 30 (Non Appliquée)
* **Date** : 2026-11-01 | **Statut** : Préparé localement — **NON appliqué en production** — en attente d'un environnement isolé et de validation humaine
* **Contexte** : L'audit global du 2026-11-01 (dossier `audit-radiza`) a confirmé en production, en lecture seule, plusieurs contournements des règles métier directement via l'API REST publique (clé `anon`) : RPC `SECURITY DEFINER` dont le contrôle est sauté pour un appelant anonyme (`IF auth.uid() IS NOT NULL AND …`), commandes modifiables directement (statut, montant, entreprise), prix des propositions réécrivables par le revendeur, notifications et journaux d'audit falsifiables, auto-attribution du badge « vérifiée », absence de contrôle du stock des productions, fuite de commande via `lookup_order_for_delivery` pour un anonyme.
* **Décisions** :
  1. Toute écriture sur `orders`, `order_items`, `stock_reservations`, `audit_logs` et toute création de `notifications` passe exclusivement par des fonctions serveur `SECURITY DEFINER` (plus aucun privilège d'écriture directe pour `anon`/`authenticated`).
  2. Les RPC applicatives ne sont plus exécutables par `anon` ; toute RPC exige `auth.uid()` ; les helpers RLS restent exécutables par `anon` (politiques publiques).
  3. Changement de statut des commandes via la RPC `update_order_status` : progression vers l'avant uniquement (pending → confirmed → preparing → ready), entreprise vendeuse uniquement. *Interprétation de BR-ORD-05 à confirmer par le métier.*
  4. Le prix d'une commande issue d'une proposition provient exclusivement de `demand_responses`, désormais non modifiable par le revendeur ; la commande est refusée si le prix a changé depuis l'affichage (`p_expected_unit_price`).
  5. **Contrôle physique du stock des productions** : aucune commande (campagne ou proposition) ne peut faire dépasser la quantité de la production, en comptant les réservations actives ET livrées. Le calcul du stock de CAMPAGNE reste celui de BR-STK-01 (réservations actives) en attendant l'arbitrage A11.
  6. `verification_status`, `created_by`, `is_active` des entreprises : modifiables par l'administrateur uniquement (RPC `admin_set_company_verification`). Coordonnées privées (téléphone, e-mail, adresse) non lisibles anonymement.
  7. Les administrateurs ne sont plus créés par migration (bloc de la migration 14 neutralisé : mot de passe en clair).
* **Points volontairement NON tranchés (arbitrages métier en attente)** : A3 (plafond cumulé des campagnes), A4 (statut d'une production avec campagnes actives), A5 (statut minimum de livraison, annulation revendeur en `confirmed`), A6 (écrans admin), A7 (multi-entreprises, changement de province), A11 (une commande livrée libère-t-elle du stock de campagne ?).
* **Fichiers** : `supabase/migrations/20261101000030_security_hardening.sql`, `supabase/tests/security_hardening_030_test.sql`.

### ADR-044 : Montée de Version Next.js 15.5.28 / React 19 (Correctifs de Sécurité)
* **Date** : 2026-11-01 | **Statut** : Appliqué localement (build et TypeScript validés) — non déployé
* **Contexte** : Next.js 14.2.35 est concerné par 26 avis de sécurité (dont RCE critiques sur l'Image Optimization API et l'hébergement Windows) sans correctif en 14.x.
* **Décision** : passage à `next@15.5.28` (étiquette officielle « backport », plus basse version corrigeant tous les avis jusqu'à 15.5.27), React/React DOM 19.3.1. Next 16 écarté (migration d'architecture inutile). `@supabase/ssr` conservé en 0.5.2 (compatible avec `cookies()` asynchrone).
* **Conséquences** : `createClient()` serveur asynchrone ; `params`/`searchParams` asynchrones ; `useFormState` → `useActionState`. Optimiseur d'images restreint au projet Supabase et au compte Cloudinary configurés ; en-têtes HTTP de sécurité ajoutés.
* **Résidu** : `npm audit` signale encore `postcss` 8.4.31 embarqué par Next 15.5.28 (outil de build, CSS interne uniquement) ; correction uniquement via Next 16 ou un `overrides` non supporté officiellement — décision laissée au porteur du projet.

### ADR-045 : Décisions Métier Validées A3, A4, A5, A6, A11, A12, A13
* **Date** : 2026-11-02 | **Statut** : Validé par le porteur du projet — intégré localement (migration 31 NON appliquée)
* **Décisions** :
  - **A3** — Une campagne engage la totalité de son volume ; le volume engagé d'une production (campagnes ouvertes `draft`/`active`/`paused` + réservations et livraisons hors de ces campagnes) ne dépasse jamais sa quantité (BR-CMP-03-bis).
  - **A4** — Une production `harvested` ne change pas de statut tant qu'une campagne `active` ou `paused` en dépend (BR-PRD-04-bis).
  - **A5** — Livraison uniquement depuis `ready` ; annulation : revendeur en `pending` seulement, entreprise en `pending` ou `confirmed` (BR-ORD-05-ter).
  - **A6** — Administrateur : vérification des entreprises via `admin_set_company_verification` + listes en lecture seule (BR-ADM-01/02).
  - **A11** — Une commande livrée reste consommée sur la campagne ; seule l'annulation libère du volume (BR-STK-01).
  - **A12** — Campagne annulée jamais réactivée ; campagne terminée rouverte seulement avec une date de fin prolongée (BR-CMP-05-bis).
  - **A13** — Progression des statuts de commande vers l'avant uniquement (déjà en place, migration 30 ; BR-ORD-05-bis).
* **Précisions d'implémentation retenues** : un brouillon de campagne engage aussi son volume (A3) ; une campagne `paused` compte comme rattachée (A4) ; la réouverture d'une campagne terminée exige une nouvelle date de fin renseignée, postérieure à l'ancienne et ≥ aujourd'hui (A12).
* **Implémentation** : `supabase/migrations/20261102000031_business_rules_a3_a13.sql` (fonctions de la migration 30 reprises par extraction contrôlée), `supabase/tests/business_rules_031_test.sql` (tests comportementaux R0–R7), `src/lib/utils/{stockRules,orderRules}.ts`, tests unitaires `tests/unit/businessRules.test.ts`.

### ADR-046 : Campagnes Expirées, Protection des Productions, Réouverture et Stock Revendeur (Migration 32)
* **Date** : 2026-11-03 | **Statut** : Décisions validées par le porteur du projet — implémentation locale, migration 32 **NON appliquée**
* **Décisions** : C1 (clôture automatique des campagnes `active` et `paused` expirées), C2 (une campagne effectivement expirée n'engage plus de volume), C3 (réouverture par report d'au moins une destination sans prolonger une date générale encore valide), A4/D1 (produit et unité figés), D2 (production récoltée exigée, même pour un brouillon et à toute activation), D3 (ni passage public → non public ni archivage), D5 (règles de date générale), A12-bis (report d'au moins une destination si toutes sont expirées), stock agrégé revendeur, une série par unité dans les graphiques.
* **Précisions d'implémentation** :
  - la nouvelle date générale n'est **exigée** que si l'expiration vient de la date générale ; quand une date est fournie, D5 s'applique toujours ;
  - la réouverture par simple report d'une destination (campagne restée au statut ouvert) revérifie D2 et A3 (trigger sur `campaign_destinations`), car C2 a pu libérer puis réengager son volume ;
  - commande refusée sur une campagne non effectivement ouverte, y compris pour un revendeur desservi par une zone de livraison sans destination propre (trou constaté dans la 031) ;
  - nouvelles fonctions : `search_path = ''` et noms qualifiés ; `create_order_with_reservation` aussi depuis la revue (R-1) ;
  - clôture : `FOR UPDATE SKIP LOCKED` (une campagne verrouillée par une commande en cours est traitée au passage suivant) ; une ligne `audit_logs` par campagne, `actor_id` vide (colonne nullable, migration 006).
* **Corrections de la revue ciblée (2026-11-03, intégrées dans la 032 non appliquée)** :
  - **C-2** : une destination ne peut plus être déplacée vers une autre campagne ;
  - **C-3 / R-4** (décision validée) : seul le report d'une destination existante rouvre une campagne fermée par ses destinations ; ajout et suppression ne la rouvrent jamais ; l'ouverture est évaluée avant / après l'opération, sans tenir compte du statut (une campagne `completed` n'est pas rendue rouvrable autrement que par un report) ; la suppression en cascade d'une campagne est ignorée (`pg_trigger_depth() > 1`, et campagne déjà absente) ;
  - **C-4** : unité de campagne = unité de production (`guard_campaign_consistency` redéfinie, trigger étendu à `unit`) ; unité de production figée par campagne non annulée, réservation active ou proposition ouverte ;
  - **C-5** : volumes déclarés par unité dans le catalogue produits ;
  - **C-6** : synchronisation des destinations ordonnée (suppressions anticipées pour conflit de ville → mises à jour qui restent ouvertes → ajouts, ouvertes d'abord → mises à jour qui ferment → suppressions) ; un ajout portant la ville d'une destination retirée reprend cette destination ; refus explicite, avant toute écriture, d'une modification qui rouvrirait la campagne sans report. La synchronisation reste une suite d'appels (non atomique, limitation préexistante) ; une fonction serveur unique est l'évolution proposée si elle ne suffit pas ;
  - **R-1** : `create_order_with_reservation` passe en `search_path = ''` (qualification vérifiée) ; **R-2** : fonctions 030 / 031 documentées dans `docs/security-search-path-review.md`, non modifiées.
* **Finalisation locale (2026-11-03, intégrée dans la 032 non appliquée ; 029–031 inchangées, aucune migration 033)** :
  - **C-3 / R-4 complété** : une campagne expirée par sa **date générale** n'est plus exemptée du contrôle des destinations ; sinon, si toutes ses destinations étaient aussi expirées, ajouter une destination ouverte ou supprimer la dernière destination expirée permettait ensuite de la rouvrir par une simple nouvelle date, sans report (contraire à BR-CMP-09). Le report sur une telle campagne ne déclenche pas D2 / A3 dans le trigger de destination : ils sont contrôlés au §5 avec la nouvelle date ;
  - **D2 à toute réouverture** : le trigger de campagne revérifie la production récoltée aussi quand une campagne au statut ouvert mais expirée redevient ouverte sans changement de statut (ex. nouvelle date générale) — cas non couvert jusque-là (BR-CMP-09) ;
  - **C-6 atomique** : `update_campaign_with_destinations` (SECURITY INVOKER, `search_path = ''`, verrou de la campagne) écrit campagne, zones, destinations et dépôts dans une seule transaction, dans l'ordre du plan `destinationSync.ts` ; la protection des destinations et dépôts commandés y est revérifiée. Remplace la suite d'appels de `updateCampaignAction` (plus d'état « campagne incomplète » en modification). La création (`createCampaignAction`) n'est pas concernée ;
  - **`create_order_with_reservation`** : la 030 retire déjà `EXECUTE` à `PUBLIC` et `anon` (conservé par `CREATE OR REPLACE` en 031 / 032) et la fonction refuse tout appel sans `auth.uid()` ; la 032 réaffirme les droits à l'identique (défense en profondeur). Seul appelant applicatif : `createOrderAction`, client de session (clé anon + JWT utilisateur), `p_reseller_id` = utilisateur authentifié.
* **Arbitrage C3 (2026-11-04, décision du porteur du projet, intégrée dans la 032 non appliquée)** : une destination ne peut servir à rouvrir une campagne expirée que si elle existait avant l'expiration de son propre délai de commande ; une destination créée après son expiration ne peut pas être prolongée pour contourner C3.
  - **Données** : `campaign_destinations.created_at` (migration 018, NOT NULL) comparé à la date limite courante (`created_at::date ≤ order_deadline_date`, dates dans le fuseau de la base comme `CURRENT_DATE`). L'historique des dates limites n'étant pas conservé, la date limite **courante** fait foi.
  - **Fiabilité** : `created_at` était modifiable par l'API ; le trigger de destination le fixe désormais à `now()` à l'insertion et le rend immuable (trigger étendu à `created_at`). Côté application, toute date limite saisie est ≥ aujourd'hui (création, modification, réouverture) : une destination créée par l'application satisfait toujours la règle. Seule l'action serveur `updateDestinationOrderDeadlineAction` (sans interface) permet une date passée.
  - **Ordre** : `reopen_campaign` et `update_campaign_with_destinations` traitent d'abord les destinations éligibles, le résultat ne dépend pas de l'ordre transmis.
* **Effet sur le test 031** : le scénario R5 (« terminée non rouverte sans prolongation ») est assoupli par C3 quand la date générale est valide ; le test 031 s'exécute **avant** l'application de la 032.
* **Fichiers** : `supabase/migrations/20261103000032_business_rules_d1_d7_stock.sql`, `supabase/tests/business_rules_032_test.sql`, `src/lib/utils/{productionRules,campaignReopenRules}.ts`, `tests/unit/rules032.test.ts`.

### ADR-047 : Réouverture, Clôture et Opérations Techniques des Campagnes (Migrations 32 et 33)
* **Date** : 2026-11-06 | **Statut** : Décisions validées par le porteur du projet — implémentation locale, migrations 32 et 33 **NON appliquées**
* **Décisions** :
  - **Modèle B encadré** : une campagne fermée par ses destinations se rouvre par le report d'une destination créée avant l'expiration de sa propre date limite ; ni ajout ni suppression ne la rouvrent ;
  - **la date générale prévaut sur les destinations** (BR-CMP-06) : BR-CMP-08 et le commentaire de la 032, qui affirmaient qu'une campagne ayant une destination ouverte n'est jamais close, sont corrigés ;
  - **statut d'origine conservé** par `campaigns.status_before_completion` : une campagne `paused` reste `paused` après réouverture ; `draft` suit les mêmes règles ; `cancelled` n'est jamais rouverte ;
  - **aucun administrateur humain ne rouvre**, quel que soit le canal ;
  - **opérations techniques** : admises seulement en session directe avec motif, identifiées dans `audit_logs` ; une requête `service_role` n'est pas légitime d'office ;
  - **réouvertures journalisées** dans les triggers, une ligne par réouverture, tous canaux ;
  - **planification** : tâche quotidienne de 00 h 05 UTC, créée inactive (migration 33), activée sur autorisation distincte ;
  - **dates en UTC** partout.
* **Choix d'implémentation** :
  - `session_user` sert de preuve : il ne dépend ni de `SET ROLE` ni de `SECURITY DEFINER`, et un client API ne peut pas le changer. Le motif seul ne prouve rien ;
  - liste autorisée (`postgres`, `supabase_admin`) plutôt que liste refusée ;
  - la clôture perd le droit `service_role`, accordé par la 030 : aucun code n'utilise cette clé et la tâche tourne avec le rôle propriétaire ;
  - `audit_logs.actor_id` référence `profiles` : l'identité système va dans `details` ;
  - `cron.schedule_in_database(..., active := false)` crée la tâche inactive en un seul appel ; une tâche existante n'est jamais modifiée.
* **Données de production prises en compte (2026-11-06)** : Tomates de Kananga, Riz de Bandundu et Maïs de Matadi, campagnes `active` à date générale dépassée, passeront à `completed` lors de la première clôture autorisée, sans effet sur leurs commandes, réservations et productions.
* **Risque préexistant non traité** : droits d'écriture de l'administrateur sur les campagnes, voir `docs/security-rules.md` §8.
* **Rotation du mot de passe administrateur (2026-11-06)** : effectuée, testée et confirmée par le porteur du projet ; clé temporaire révoquée.
* **Fichiers** : migrations 32 et 33, `supabase/tests/{security_hardening_030,business_rules_032,schedule_033}_test.sql`, `src/components/feed/ResellerProductionDetailActions.tsx`.

### ADR-048 : Barre Mobile Revendeur et Libellés Visibles (Lot 1 UX/UI)
* **Date** : 2026-11-07 | **Statut** : Décisions validées par le porteur du projet — implémentation locale, non commitée
* **Décisions** :
  - **barre mobile revendeur** à cinq entrées : Tableau de bord, Campagnes, Demandes, Commandes, Plus. Notifications et Mon profil passent dans Plus, avec badge. L'ancienne consigne de code « aucun raccourcissement » n'avait pas d'ADR et est retirée ;
  - **actions des cartes de demande** sur deux lignes, sans menu supplémentaire ;
  - **libellés** : Région pivot devient Région principale ; Territoire Pivot devient Territoire principal ; Territoire d'Opération Pivot devient Territoire principal d'intervention ; Province Pivot devient Province principale ; Identifiant Unique (UUID) devient Identifiant du compte ; Snapshot devient Prix au moment de la commande ; Copier le slug devient Copier l'identifiant ; Identifiant Slug Public devient Identifiant public ;
  - **statuts techniques** présentés en français : réservation Active, Libérée, Confirmée ; demande Convertie en commande, Annulée, Expirée.
* **Réserves vérifiées avant décision** :
  - **« Vérifié SSR »** : texte fixe affiché à tout revendeur, lié à aucune donnée et absent de la documentation. Il n'apporte aucune information : la mention est supprimée, sans remplacement ;
  - **« Prêt pour S4 »** : S4 désigne la phase de développement « Productions & Récoltes Société », sans sens métier. La mention devient « Prêt pour une production », affichée pour les seuls produits actifs, car un produit archivé ne peut pas recevoir de production.
* **Fichiers** : `src/components/reseller/ResellerBottomNav.tsx`, `src/components/demands/ResellerDemandCard.tsx`, `src/components/reseller/ResellerProfileView.tsx`, `src/components/reseller/ResellerProfileTerritoryCard.tsx`, `src/components/reseller/ResellerEditLocationDrawer.tsx`, `src/components/products/CompanyProductCard.tsx`, `src/components/orders/CompanyOrderDetailView.tsx`, `src/components/demands/CompanyDemandDetailView.tsx`.

### ADR-049 : Pannes de Lecture et Faux Vides (Lot 2A UX/UI)
* **Date** : 2026-11-09 | **Statut** : Périmètre validé par le porteur du projet — implémentation locale, non commitée
* **Décisions** :
  - **une panne n'est jamais une liste vide** : les lectures de listes lèvent une erreur au lieu de renvoyer `[]` ;
  - **lecture principale en échec** : la frontière `error.tsx` existante affiche l'indisponibilité et « Réessayer » ;
  - **lecture secondaire en échec** (formulaire, analyse, bloc du tableau de bord) : elle est isolée par `settleRead` et signalée par `DataUnavailableNotice`, la page reste utilisable ;
  - **« Réessayer »** enchaîne `router.refresh()` et `reset()`, car `reset()` seul ne relit pas les composants serveur ;
  - **aucune politique RLS modifiée**, aucune migration.
* **Laissé en l'état** : `getUnreadNotificationCount` renvoie 0 en cas d'erreur, car le lever ferait tomber tout le layout pour un simple badge.

### ADR-050 : Accessibilité Clavier des Modales (Lot 5A UX/UI)
* **Date** : 2026-11-09 | **Statut** : Périmètre validé par le porteur du projet — implémentation locale, non commitée
* **Décisions** :
  - **modales existantes conservées** : le comportement clavier est ajouté avec `useFocusTrap`, sans migration vers `Dialog` ou `Drawer` ni changement d'apparence ; la migration reste au Lot 5B ;
  - **Échap suit la logique de la modale** : bloqué pendant un envoi, comme le bouton Annuler ;
  - **formulaires d'administration** : l'envoi est signalé sur l'événement `submit`, car React diffère les mises à jour d'état effectuées dans une action de formulaire ;
  - **liste déroulante ouverte** : Échap la ferme seule, la modale reste ouverte ; règle appliquée dans `useFocusTrap`, donc aussi à `Dialog` et `Drawer`.
* **Non traité** : `EditCompanyProfileModal`, non importé. `ResellerLocationEditModal` est corrigé mais n'est atteignable depuis aucun écran.

### ADR-051 : Présentation des Graphiques du Tableau de Bord Société (Lot 4A UX/UI)
* **Date** : 2026-11-10 | **Statut** : Périmètre et décisions validés par le porteur du projet — implémentation locale, non commitée
* **Décisions** :
  - **une unité à la fois** : un sélecteur affiche une seule unité avec sa propre échelle, sans conversion (BR-FIN-04). Remplace les courbes superposées issues d'ADR-046, dont le principe « une série par unité » reste respecté ; « Nb demandes » reste la seule vue toutes unités ;
  - **classement des régions** : par quantité dans l'unité sélectionnée, puis nombre de demandes, puis nom ;
  - **« Voir tout »** : au-delà de 5 régions, un bouton déplie la liste dans la carte, sans nouvelle route ;
  - **unités distinctes** : seules la casse et les espaces sont normalisés, comme avant ; « tonne » et « tonnes » restent deux unités ;
  - **survol réservé à la souris** : le `mouseleave` émis après un toucher refermerait l'infobulle ; le toucher et le clavier passent par le clic et le focus.
* **Inchangé** : requêtes, RLS, migrations et dépendances npm ; badge « Données réelles », sens de la courbe et limite de 500 demandes (Lot 4B) ; graphiques de la page d'accueil.

### ADR-052 : Retours d'Action (Lot 2B UX/UI)
* **Date** : 2026-11-10 | **Statut** : Périmètre et décisions validés par le porteur du projet — implémentation locale, non commitée
* **Décisions** :
  - **messages d'erreur** : une exception n'affiche jamais son texte brut, seulement son message de repli ; le détail reste dans les journaux. Les erreurs métier (`P0001` et traductions existantes) restent affichées telles quelles ;
  - **photos** : compression dans le navigateur, 900 Ko au plus, limitée à `ProductionDrawer` et `AddProductDrawer`. `next.config` n'est pas modifié : Next limite par défaut les actions serveur à 1 Mo ;
  - **pas de pourcentage d'envoi** : la photo part avec le formulaire, aucune progression n'est disponible ; l'interface indique « Envoi de la photo… » ;
  - **échec de compression** : message sous le champ photo, pas de notification, car elle recouvrirait le bouton d'envoi du tiroir ;
  - **confirmation de commande** : notification puis encadré sur le détail ; le paramètre d'URL `commande=enregistree` est retiré à l'arrivée ;
  - **fil revendeur** : le squelette ne s'affiche que s'il n'y a aucune carte à conserver.
* **Non traité** : les cinq extensions du Lot 2C ; les autres formulaires photo (`EditProductDrawer`, profils, administration) ; `EditCompanyProfileModal`, non importé.

### ADR-053 : Envoi des Photos des Formulaires (Lot 2D UX/UI)
* **Date** : 2026-11-12 | **Statut** : Terminé techniquement, validé par le porteur du projet le 2026-11-12
* **Décisions** :
  - **taille envoyée** : 900 Ko au plus, sans modifier `next.config`, dont la limite par défaut des actions serveur est de 1 Mo ;
  - **taille de l'image choisie** : inchangée, 8 Mo pour une bannière, 5 Mo ailleurs, désormais aussi contrôlée dans le navigateur ; les limites serveur restent en défense ;
  - **formats** : JPEG, PNG et WebP ; tout autre format est refusé avant l'envoi ;
  - **transparence** : conservée pour le logo, la catégorie et le produit du catalogue, en WebP, ou en PNG réduit si le navigateur ne produit pas de WebP ; désactivée ailleurs ;
  - **logique commune** : `usePhotoForUpload` et `PhotoUploadFeedback` ; `AddProductDrawer` passe sur ce hook pour ses deux champs ;
  - **photo du revendeur** : envoyée dès le choix, notification existante conservée ;
  - **échec d'envoi** : intercepté dans les trois modales d'administration et `ProductionDrawer`, avec message de repli et fenêtre débloquée.
* **Inchangé** : actions serveur, règles métier, destinations de stockage, `next.config`, migrations.
* **Non traité** : `ResellerAvatarSection`, `EditCompanyProfileModal` et `EditProductModal`, non importés (Lot 8) ; d'après le code, les champs fichier masqués des modales d'administration et du logo ne sont pas atteignables au clavier (Lot 5B).
* **Validation (2026-11-12)** : typecheck sans erreur ; 80/80 tests unitaires ; 270/270 tests des formulaires ; 243/243 contrôles de composants et 49/49 contrôles serveur du Lot 2B ; 18/18 tests de coupure des actions serveur ; build réussi (48 routes, 10 pages statiques).
* **Réserves maintenues, non résolues** : envois réels vers Cloudinary et Supabase non testés ; erreur métier préexistante à l'enregistrement du logo dans la base simulée, indépendante de la photo ; Safari sur iPhone et lecteur d'écran non testés ; champs photo masqués à corriger au Lot 5B ; performances sur téléphones modestes avec des images source de 8 Mo à vérifier.

### ADR-054 : Pannes de Lecture des Détails, de la Société Courante et des Formulaires (Lot 2C UX/UI)
* **Date** : 2026-11-12 | **Statut** : Périmètre validé par le porteur du projet — implémentation locale, non commitée, en attente de validation
* **Principe** (prolonge ADR-049) : une erreur de lecture n'est jamais présentée comme une absence (« introuvable », liste vide, zéro, « aucune campagne », « aucune proposition »). Une absence réelle garde son affichage d'origine.
* **Décisions** :
  - **pages de détail** : `getProductionById`, `getDemandById`, `getResellerOrderById`, `getCompanyOrderById`, `getPublicProductionDetail` et `getPublicCompanyProfile` lèvent une erreur en cas de panne, ce qui affiche l'écran d'erreur existant avec « Réessayer ». `null`, donc « Page introuvable », est réservé à la ligne absente ou à un identifiant d'URL mal formé (code PostgreSQL `22P02`) ;
  - **société courante** (`getCurrentCompanyId`) : une panne lève une erreur au lieu d'afficher « Aucune exploitation n'est rattachée à votre compte ». Le code `PGRST116` (« plusieurs lignes ») n'est pas une panne : postgrest-js 2.x le crée lui-même après une réponse reçue sans erreur. Il garde le repli existant à l'identique (société créée par l'utilisateur, sinon `null`). Aucune règle de choix entre plusieurs sociétés n'est ajoutée ;
  - **lectures secondaires** isolées par `settleRead` et signalées par `DataUnavailableNotice`, la page restant utilisable : analyse des demandes d'une production, productions publiques d'une société, campagne active sur la fiche production revendeur, listes des formulaires (provinces, pays, exploitations, productions de la société) ;
  - **campagne active illisible** : encadré « Offre commerciale non vérifiée », sans « Expression de besoin directe » ni offre inventée ; la demande reste possible, comme lorsqu'une campagne existe ;
  - **proposition existante illisible** (lecture `demand_responses` du détail de demande) : formulaire de nouvelle proposition remplacé par un message, pour éviter un doublon. La contrainte `uq_demand_company_response` garantit au plus une ligne : toute erreur à cet endroit est une panne ;
  - **productions illisibles dans les demandes Société** : « Productions non vérifiées » sur chaque carte et bouton « Répondre » désactivé, sans modifier `CompanyDemandProposalModal` (Lot 5B) ;
  - **administration** : les listes de bannières et de catégories sont les lectures principales de leur page, une panne affiche donc l'écran d'erreur. Si le comptage des produits par catégorie est illisible, aucun nombre n'est affiché ;
  - **utilitaire commun** `src/lib/utils/readErrors.ts` : `isMultipleRowsError`, `isMalformedIdError`, `readRows`, `readOptionalRow`.
* **Inchangé** : actions serveur, requêtes SQL (mêmes requêtes, seul le traitement de l'erreur change), RLS, migrations, configuration, règles métier, dépendances npm.
* **Laissé en l'état** (décisions du Lot 2A ou autres lots) : badge des commandes en attente, bannières et catégories du fil, `GeographySelector` (Lot 5B), `getCompanyCampaignById` non utilisée (Lot 8), compteurs de vérification de l'administration.
* **Constaté, hors périmètre, non corrigé** : `getCurrentProfile` renvoie `null` en cas de panne, et le layout Société redirige alors vers `/unauthorized` ; la lecture du profil revendeur sur la fiche production ignore une panne (éligibilité calculée sans province) ; le nom de la société sur les détails Société et les informations de l'acheteur sur le détail de demande retombent sur « Exploitation agricole » et « Acheteur professionnel ».

### ADR-055 : Vocabulaire des Menus, des Titres et des Repères de Navigation (Lot 6A-1 UX/UI)
* **Date** : 2026-11-14 | **Statut** : Terminé techniquement, validé par le porteur du projet le 2026-11-14 (périmètre strict 178/178 ; 5 contrôles différés au Lot 6A-2, conservés) — implémentation locale, non commitée
* **Contexte** : fiches NAV-03 (vocabulaire instable) et TXT-03 (casse) de l'audit UX/UI. Le Lot 6A est découpé en 6A-1 (menus et repères, 38 fichiers) et 6A-2 (textes des écrans, environ 120 fichiers, non commencé).
* **Lexique de référence** : Société, Revendeur, Campagne, Demande, Produit, Tableau de bord, Vérifiée, Proposition.
* **Principe** : une rubrique porte le même nom dans tous les menus actifs, dans le titre (`h1`) de sa page, dans les fils d'Ariane et liens de retour qui y mènent, et dans les raccourcis ou cartes servant de liens. Une forme courte reste admise dans la barre mobile si elle garde le même nom (« Commandes » pour « Commandes reçues »). Seuls les textes affichés changent : routes, identifiants de navigation, destinations, valeurs, statuts et comportements sont inchangés.
* **Décisions** :
  - **D1, menus** : Revendeur « Flux des Productions », « Offres Commerciales », « Mes Demandes d'Achat », « Mes Commandes », « Mon Profil » → « Tableau de bord », « Campagnes », « Mes demandes », « Mes commandes », « Mon profil ». Société « Dashboard », « Catalogue Produits », « Productions & Récoltes », « Demande du marché », « Campagne de vente », « Profil entreprise » → « Tableau de bord », « Catalogue produits », « Productions & récoltes », « Demandes du marché », « Campagnes », « Profil de la société ». Administration « Vue Générale », « Entreprises Agricoles », « Catalogue Produits », « Catégories du Flux », « Bannières du Flux », « Demandes Marché » → « Tableau de bord », « Sociétés », « Catalogue produits », « Catégories du tableau de bord revendeur », « Bannières du tableau de bord revendeur », « Demandes » ; en-tête « Administration Système » → « Administration », ligne « Supervision Centrale » retirée, rôle affiché « Supervision Admin » → « Administrateur » ;
  - **identité des espaces** : « Espace Entreprise » et « Espace Entreprise Agricole » → « Espace Société » ; « Mon Entreprise » → « Ma société » ; « Producteur Agricole » → « Société » ; « Revendeur Agréé » et « Revendeur / Distributeur » → « Revendeur » ; « Mon Compte » → « Mon compte » ; « espace Entreprise » → « espace Société » dans les confirmations de déconnexion ;
  - **titres et sur-titres** : chaque titre de page reprend le nom de son menu (par exemple « Supervision des Entreprises Agricoles » → « Sociétés », « Mes Commandes d'Achat » → « Mes commandes », « Notifications Commerciales & Événements » → « Notifications ») ; le sur-titre n'indique plus que l'espace (« Espace Société — Commandes Reçues » → « Espace Société », « Approvisionnement B2B Décentralisé » → « Espace Revendeur ») ;
  - **liens de retour** : « Retour au flux », « Retour au flux des productions », « Retour à l'accueil revendeur » et « Retour à la vue générale » → « Retour au tableau de bord » ; « Retour aux opportunités & demandes » → « Retour aux demandes du marché » ;
  - **décisions complémentaires du 2026-11-14** : fils d'Ariane « Flux des Productions » → « Tableau de bord » (`ResellerDemandsView`, `ResellerNotificationsView`), « Mes Commandes » → « Mes commandes » (`ResellerOrderDetailView`), « Productions & Récoltes » → « Productions & récoltes » (`ProductionDetailView`) ; raccourcis du profil revendeur « Mes Commandes », « Mes Demandes d'Achat », « Offres Commerciales » → « Mes commandes », « Mes demandes », « Campagnes » ; cartes-liens du profil Société « Productions Enregistrées », « Campagnes de Vente », « Commandes Reçues » → « Productions & récoltes », « Campagnes », « Commandes reçues » ; cartes-liens du tableau de bord d'administration « Supervision des Entreprises », « Supervision des Revendeurs » → « Sociétés », « Revendeurs ». Intitulés seulement : descriptions des cartes, destinations et comportements inchangés ;
  - **D2, badge de vérification** (fiche production revendeur, `reseller/productions/[id]/page.tsx`) : « Producteur vérifié sur la plateforme » était affiché sans condition. « Société vérifiée » s'affiche désormais seulement si `verification_status === "verified"` ; tout autre cas (`pending`, `rejected`, champ absent, valeur inconnue) affiche le libellé neutre « Société inscrite sur la plateforme ». Valeurs vérifiées : `pending`, `verified`, `rejected` (contrainte de la table `companies`, fonction `admin_set_company_verification`, BR-ADM-01). Le champ est ajouté à la seule lecture `getPublicProductionDetail` (`src/lib/queries/feed.ts`, type `verification_status?: string | null`), sans changement de RLS ; `campaigns.ts` lisait déjà ce champ avec la même session revendeur ;
  - **textes du Lot 2C** : « Offre commerciale non vérifiée » → « Campagne non vérifiée » (avec « campagne » au lieu de « campagne de vente » et « l'offre »), badge « Offre commerciale » → « Campagne », « d'exploitations » → « de sociétés », « cette exploitation » et « votre exploitation » → « cette société » et « votre société » ;
  - **seule modification hors texte** : dans la barre mobile Société, « Tableau de bord » (67 px, 72 px en gras, pour 64 px disponibles) passe sur deux lignes (`line-clamp-2`, même réglage que la barre Revendeur du Lot 1) au lieu d'être tronqué.
* **Exceptions conservées** : « commande ferme », « Prix unitaire ferme », « Réservation ferme », « En culture » (statut d'une production), « Proposition », « flux » au sens de flux de données (pages légales), « besoin » dans une phrase qui explique ce qu'est une demande.
* **Inchangé** : routes, identifiants de navigation, requêtes (sauf le champ D2), RLS, migrations, actions serveur, configuration, règles métier, dépendances npm.
* **Exclu** : textes des écrans et messages des actions serveur (Lot 6A-2) ; textes SQL (D3, sous-lot avec migration) ; pages légales (D4) ; accueil public et code mort, dont les sections Société et Revendeur d'`AppSidebar` (Lot 8) ; titres d'onglet du navigateur et navigations mobiles (Lot 6B) ; profils et rôles (Lot 7) ; classes CSS (Lot 3).
* **Reporté** :
  - **Lot 6B** : à 320 px, « Commandes » dans la barre basse Revendeur (`ResellerBottomNav`, inchangé depuis le Lot 1) dépasse sa case de 1,8 px (59,8 px de texte pour 58 px, police Segoe UI du poste de test), sans coupure visible sur capture ; chaque page a deux `h1`, celui de l'en-tête et celui de la page (modèle d'en-tête NAV-02) ;
  - **Lot 6A-2** : anciens termes encore affichés dans des textes d'écran : « Dernières Commandes Reçues » (`CompanyRecentActivity`), filtres et étiquettes « Commandes Reçues » et « Demandes Marché » (`CompanyNotificationsView`), phrase « module Productions & Récoltes » (`CompanyProfileView`), indicateurs non cliquables « Entreprises Agricoles » et « Catalogue Produits » (`admin/page.tsx`), sous-titres « Bannières du Flux » et « Catégories du Flux » et descriptions « Flux revendeur » (administration), badge « Supervision Admin » (page Sociétés), titre « Accès Rapides », descriptions des cartes-liens, liens d'action (« Mes demandes d'achat », « Explorer le flux des productions », « Découvrir les offres commerciales », « Consulter mes campagnes de vente », « Voir les offres », « Explorer les offres ») et titre de tiroir « Filtres des Offres Commerciales ». Cinq de ces textes font échouer un contrôle du banc 6A-1 (tableau de bord, notifications et profil Société ; deux indicateurs de l'administration) : ces contrôles sont classés « différés 6A-2 », avec leur exigence inchangée, et non comptés comme échecs du Lot 6A-1 (résultat brut 178/183, périmètre strict 178/178).

### ADR-056 : Vocabulaire des Textes d'Écran (Lot 6A-2 UX/UI)
* **Date** : 2026-11-15 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-15 (cartographie, arbitrages C1 à C11, F1 à F10 et arbitrages de clôture validés par le porteur du projet ; build officiel réussi) — implémentation locale, non commitée, en attente de validation finale
* **Contexte** : suite du Lot 6A (NAV-03, TXT-03). Le Lot 6A-1 (ADR-055) a traité menus, titres et repères ; le Lot 6A-2 traite les textes affichés dans les écrans, y compris `aria-label`, `title`, `placeholder` et `alt`, en deux missions : contrôles différés et espace Société (35 fichiers, 192 remplacements), puis espace Revendeur, fiches publiques, inscription et administration restante (42 fichiers examinés, 41 modifiés, 187 remplacements), plus un complément C7 de 2 remplacements dans `CompanyDemandDetailView` (fichier compté dans la mission 1). Total des deux missions : 381 remplacements, 386 textes modifiés, 76 fichiers de code distincts. Un complément de clôture, décrit plus bas, a suivi.
* **Règles appliquées** (lexique : Société, Revendeur, Campagne, Demande, Produit, Tableau de bord, Vérifiée, Proposition) :
  - « exploitation », « entreprise », « producteur » → « société » ; « acheteur », « acheteur professionnel » → « revendeur » ; accords repris (par exemple « la société a été notifiée », « Toutes les sociétés ») ;
  - « offre commerciale », « campagne de vente », « offre de vente » → « campagne » ; « offre ferme » → « campagne » ou « proposition » selon le contexte (C9) ;
  - réponse à une demande : « devis », « offres » → « proposition(s) » (C7) ;
  - « expression de besoin », « besoin » désignant une demande, « opportunité » → « demande » ; « besoin » conservé dans les phrases qui expliquent ce qu'est une demande ;
  - « denrée » → « produit » ; « culture » → « produit » ou « production » selon le sens (C8) ; « En culture » et les usages agronomiques conservés ;
  - « flux » → « tableau de bord » pour l'espace revendeur, « activité » pour les indicateurs (C10) ;
  - casse corrigée seulement dans les textes modifiés et les titres de section désignant une rubrique (C4).
* **Contrôles différés du Lot 6A-1** : « Dernières commandes reçues », « Commandes reçues » (notifications Société), phrase « rubrique Productions & récoltes » (profil Société), indicateurs « Catalogue produits » et « Sociétés » (tableau de bord d'administration). Groupe « différés 6A-2 » du banc 6A-1 : 5/5.
* **Arbitrages F1 à F10** :
  - **F1** (demandes du marché, onglet « Analyse territoriale ») : colonnes « Statut » et « Demandes » au lieu de « Opportunité » et « Acheteurs » ; badge « Demandes actives » au lieu de « Bassin solvable » (la vue `v_market_demands_aggregated` ne compte que les demandes `active`) ; « Total : n demande(s) » et « n demande(s) » (détail de production) au lieu d'« acheteur(s) » ;
  - **F2** : repli « Production : non précisée » au lieu de « Stock certifié », « Société » au lieu d'« Entreprise agricole » ;
  - **F3** : « Réservation du stock et retrait », réservation décrite sans promesse absolue, « QR code unique associé à votre commande », « à présenter lors du retrait de la commande » ;
  - **F4** : « prix affichés, volumes disponibles » ;
  - **F5** : « Stock réservé », « Réservation du stock », « Volume réservé » au lieu des formulations « garanti » ; « commande ferme » n'est employée dans aucun texte modifié ;
  - **F6** : pour tout statut autre que `verified`, libellé neutre « Société inscrite sur la plateforme » (tableau de bord, profil et fiche publique), sans « vérification en cours » ni « audit » ; texte neutre du profil sans affirmation d'examen en cours ; aucune valeur ni règle de statut modifiée ;
  - **F7** : « Statut de vérification », « Société vérifiée », « Votre société a été vérifiée par l'administration Radiza : le badge « Société vérifiée » apparaît sur votre fiche publique et sur vos productions. » ;
  - **F8** : « Une campagne met en vente tout ou partie d'une production, à un prix et dans des conditions fixés. » ;
  - **F9** : « Privé (masqué aux revendeurs) » ;
  - **F10** : « Inscription sur Radiza • Fournissez des informations exactes » ; « — Inscription sécurisée » remplacé par « — Inscription sur Radiza » sur la page de choix de profil.
* **Affirmations corrigées (C6)** : repli « Acheteur vérifié » → « Revendeur » ; « Accès au flux de récoltes réelles vérifiées » → « Accès aux productions publiées par les sociétés » ; « intérêt solvable » → « intérêt » ; « campagnes de vente sécurisées » → « campagnes » ; « QR Code sécurisé » → « QR code unique associé à votre commande ».
* **Inchangé** : routes, identifiants, valeurs de statut, règles métier, requêtes, actions serveur, RLS, migrations, configuration, classes CSS, structures de formulaires, dépendances npm. Une garde « texte seul » (arbre syntaxique TypeScript comparé avant et après) prouve, fichier par fichier, que seuls des textes affichés ont changé.
* **Exclu, conformément aux arbitrages** : messages issus de `src/lib` (actions serveur, requêtes, services, `currentCompany`) (C1) ; motifs d'annulation enregistrés en base ; composant `CompanyAccountMissing` (son texte vient de `src/lib`) ; libellés de rôle et de responsabilité (« Société / Producteur », « Inscription Entreprise Agricole », « Revendeur (Acheteur Pro) », « Titulaire légal habilité à engager l'exploitation », « Owner (Fondateur de l'exploitation) ») (C2, C3, Lot 7) ; accueil public et code non importé (Lot 8) ; pages légales ; textes SQL.
* **Exceptions conservées** : « En culture » et usages agronomiques de « culture » ; « ferme » comme type de société (« ferme, plantation ou coopérative ») et dans « réservation ferme », « engagement ferme », « Prix unitaire ferme » ; « besoin » dans les phrases explicatives ; exemples de contenu saisi par l'utilisateur ; « ni une récolte certifiée » (négation).
* **Complément de clôture** (2026-11-15, arbitrages après vérification ciblée) : 64 remplacements, 64 textes, 31 fichiers dont 2 nouveaux (`CompanyCampaignDetailDrawer`, `FeedProductionCard`) ; garde « texte seul » 31/31.
  - **« commande ferme »** : les 8 textes affichés sont reformulés (« Passer une commande », « Confirmer la commande », « Lignes de commande », « Commandes », « ne constitue pas une commande », « transformer votre proposition en commande », « Aucune commande ni réservation directe de stock n'est possible sans campagne active », « Vous n'avez pas encore passé de commande »). L'expression ne subsiste que dans les pages légales et dans deux messages de `src/lib/actions/orders.ts` (C1).
  - **« SYNAPTA Identity »** (écran « Vérifiez votre boîte mail » des inscriptions Société et Revendeur) : « Sécurité propulsée par » / « SYNAPTA Identity » → « Plateforme éditée par » / « Synapta SARL » (éditeur mentionné dans les CGU) ; aucun service d'identité n'est annoncé, la confirmation par e-mail relevant de Supabase Auth.
  - **« offre » au sens de campagne** : 42 occurrences → « campagne », accords repris (par exemple « Cette campagne n'est pas ouverte… », « campagne(s) livrable(s) », « Campagne fermée », « Les campagnes sont accessibles selon les zones de livraison… ») ; la statistique « Offres ouvertes » des notifications revendeur, qui compte les notifications d'ouverture, devient « Campagnes annoncées ». Valeur par défaut du bouton des bannières : « Voir les offres » → « Voir les campagnes », pour les nouvelles bannières seulement (les libellés déjà enregistrés en base ne changent pas).
  - **Conservés** : « calibrer son offre » (sens économique de ce que la société mettra en vente) ; carte de rôle « Gestion des offres et des campagnes » (Lot 7) ; `NotificationsView`, code non importé (Lot 8).
* **Flux de refus (constats sur le code, sans changement de logique)** :
  - **Flux A, refus d'une demande par une société** : `refuseDemandAction` (bouton de `MarketDemandsAnalysisView`) enregistre une ligne `demand_responses` au statut `refused`, sans production ; une société ne peut poser que `proposed` ou `refused` (déclencheur de sécurité). Aucune notification n'est créée : `notify_reseller_of_demand_response` ne notifie que le statut `proposed`, et aucun code n'insère `DEMANDE_REFUSEE`. Sens confirmé par le code, libellés harmonisés : côté Société, « Écarter cette demande » → « Refuser cette demande », fenêtre « Refuser cette demande ? », « Vous allez refuser la demande… », « Confirmer le refus », notification toast « Demande refusée », détail « Demande refusée » / « Vous avez refusé cette demande » ; côté revendeur, badge « Refusée » → « Demande refusée » dans la liste des réponses (`DemandResponsesModal`).
  - **Flux B, refus d'une proposition par un revendeur** : non implémenté. Aucune action, aucun RPC ni aucun bouton ne permet au revendeur de refuser une proposition ; il peut seulement « Accepter et Commander » (statut `ordered`). Aucun libellé « Proposition rejetée » ne correspond donc à un événement existant.
  - **Notifications `DEMANDE_ACCEPTEE` et `DEMANDE_REFUSEE`** : autorisées par la contrainte de la table, jamais créées. Leurs libellés, contradictoires d'un écran à l'autre (revendeur « Demande acceptée » / « Offre refusée » ; Société « Proposition Acceptée » / « Proposition Rejetée »), sont conservés : le code n'établit pas l'événement qu'elles représenteront.
* **Points non résolus, qui demandent une décision ou un changement de logique** :
  - libellés des notifications `DEMANDE_ACCEPTEE` et `DEMANDE_REFUSEE`, à fixer avec la règle qui les créera (SQL, hors périmètre) ;
  - le revendeur n'est pas notifié d'un refus de sa demande : il ne le voit que dans la liste des réponses ;
  - côté revendeur, un refus est compté avec les propositions (« Propositions (n) », « n proposition(s) », « Avec propositions (n) », « Propositions reçues (n) ») et affiché avec « Proposition adossée à : Production réelle », repli d'une production vide ; corriger demande un filtre par statut ou une condition d'affichage, situation antérieure au lot (les compteurs s'appelaient « Offres ») ;
  - flux B à concevoir s'il est souhaité.
* **Vérification finale** (2026-11-15) :
  - **chiffres de clôture**, missions et complément réunis : 445 remplacements (192 + 187 + 2 + 64) ; 450 modifications de textes (198 + 186 + 2 + 64), portant sur 447 textes distincts, 3 textes ayant été modifiés lors de deux phases (dans `ResellerCampaignsView`, `CompanyPublicProfileView` et `ResellerEditLocationDrawer`) ; 78 fichiers de code distincts ;
  - **build officiel** : relancé après redémarrage du poste (une première tentative avait été arrêtée par la garde disque pendant la vérification des types), code de sortie 0, `BUILD_ID` présent, 48 routes générées dont 10 statiques et 38 dynamiques, aucun avertissement ni erreur, 3 013 Mo libres sur C: après le build ;
  - **limites** : vérifications sur base simulée, sans vraie base Supabase, compte réel, téléphone réel ni lecteur d'écran ; bancs serveur non rejoués après le complément de clôture, qui ne modifie que des textes (garde 31/31).

### ADR-057 : Réactivation du Socle Visuel (Lot 3A UX/UI)
* **Date** : 2026-11-15 (réalisation), 2026-11-16 (vérification) | **Statut** : Terminé techniquement et vérifié localement le 2026-11-16, validé par le porteur du projet le 2026-11-16 — implémentation locale, non commitée
* **Contexte** : le Lot 3 de l'audit UX/UI (socle visuel) est découpé en 3A (réactivation : SYS-01, SYS-03, RET-08, LAN-04), 3B (lisibilité : A11-02, A11-03) et 3C (valeurs de base et formats : SYS-04, SYS-05), validés séparément. Le projet est en Tailwind 3 (3.4) alors qu'une partie du code emploie la syntaxe de Tailwind 4 ou d'une extension d'animation jamais installée : ces classes sont ignorées en silence. Un détecteur fondé sur le moteur Tailwind du projet en a recensé environ 590 usages avant le lot (ombres, animations, flous, `outline-hidden`, `font-display`, point de rupture `xs`, proportions, dégradés, valeurs inexistantes).
* **Décisions du 2026-11-15 appliquées au Lot 3A** : police système conservée ; point de rupture `xs` à 480 px, points de rupture Tailwind préservés ; copyright visible dès 320 px ; aucune dépendance npm ; composants `Dialog`, `Drawer` et `Toast` non modifiés (Lot 5B), dépendances des animations cartographiées et changements compatibles proposés ; composants inutilisés (Lot 8) et structures des modales maison (Lot 5B) exclus.
* **Configuration (`tailwind.config.ts`)** :
  - `screens` : `xs` à 480 px déclaré avant `sm` 640, `md` 768, `lg` 1024, `xl` 1280 et `2xl` 1536, inchangés ;
  - valeurs reprises de Tailwind 4 : `boxShadow` `2xs` (`0 1px rgb(0 0 0 / 0.05)`) et `xs` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`), `dropShadow` `xs`, `blur` `xs` (4 px, utilisé aussi par `backdrop-blur-xs`) ;
  - `fontFamily.display` = police système du texte courant : aucun changement visible, point d'ancrage si une police de marque est choisie ;
  - greffon local d'animations d'entrée, écrit dans la configuration (aucune dépendance) : `animate-in`, `fade-in`, `zoom-in`, `slide-in-from-top|bottom|left|right` ; une seule animation (`radiza-enter`) qui part de l'opacité, de l'échelle et du décalage demandés vers l'état normal, au moyen des propriétés `translate` et `scale` individuelles (la transformation propre de l'élément est conservée, et elles restent à `none` quand rien n'est demandé) ; durée lue sur la classe `duration-*` du même élément (150 ms par défaut), par une variable limitée aux valeurs du thème pour ne pas rendre ambiguës les durées arbitraires (`duration-[180ms]`) ; `zoom-in` sans valeur part de 0,95 ; courbe `cubic-bezier(0.16, 1, 0.3, 1)` de `globals.css` ; `prefers-reduced-motion` neutralise déjà les animations dans `globals.css` ;
  - palette `forest` et `earth` inchangée.
* **Remplacements de classes** : 85 remplacements dans 36 fichiers, classes seulement, appliqués par paires dont le nombre d'occurrences est contrôlé, fins de ligne conservées :
  - `outline-hidden` → `outline-none` (44) : 39 champs ont déjà un anneau de focus ; les 5 champs des dépôts de la modale de campagne reçoivent l'anneau de leurs voisins (`focus:ring-2 focus:ring-forest-500`) pour ne pas perdre leur repère de focus ;
  - proportions des photos (4) : `aspect-16/10 sm:aspect-16/9` → `aspect-[16/10] sm:aspect-[16/9]` (détail de production revendeur, fiche publique), `aspect-21/9` → `aspect-[21/9]` (bannières d'administration) ;
  - `bg-linear-to-*` → `bg-gradient-to-*` (4) ; `scrollbar-none`, `scrollbar-hide` → `no-scrollbar` de `globals.css` (3) ;
  - valeurs inexistantes remplacées par la plus proche (27) : `py-0.2` → `py-px` (8) ; `active:scale-98`, `active:scale-97`, `group-hover:scale-103` → `active:scale-[0.98]`, `active:scale-[0.97]`, `group-hover:scale-[1.03]` (11) ; `duration-180`, `duration-250`, `duration-400` → valeurs arbitraires (4) ; `sm:p-4.5` → `sm:p-[18px]`, `sm:h-13` → `sm:h-[52px]`, `backdrop-blur-2xs` → `backdrop-blur-[2px]`, `decoration-current/40` → `decoration-[color:color-mix(in_srgb,currentColor_40%,transparent)]` (4) ;
  - `bg-sand-50/40` retiré de la fiche publique (couleur absente de la charte, sans effet : rendu inchangé) (1) ;
  - LAN-04 : `hidden xs:inline` retiré des deux éléments du pied de page d'accueil (2) : « © 2026 Radiza » est visible dès 320 px, sur la même ligne que la signature.
* **Contrôle automatique** : test `tests/unit/tailwindClasses.test.ts` (5 tests). Il interroge le moteur Tailwind du projet, avec sa configuration, pour chaque classe écrite dans `src` : aucune classe sans effet n'est admise hors des 9 composants inutilisés (Lot 8) et des exceptions justifiées ; les exceptions doivent rester présentes et sans effet (sinon, les retirer de la liste) ; points de rupture, valeurs réactivées et palette sont vérifiés. Une copie du code où trois classes sans effet ont été réintroduites fait échouer le test sur les trois.
* **Exceptions conservées et documentées** (décision du 2026-11-16) :
  - `sm:animate-slide-in-down` dans `Toast` : variante `sm:` d'une animation déclarée hors `@layer` dans `globals.css`, sans effet ; `Toast` est réservé au Lot 5B ;
  - `prose prose-sm` dans `CompanyProfileView` (extension `@tailwindcss/typography` non installée) et `preserve-3d` dans `src/app/page.tsx` (classe inexistante en Tailwind 3, sur un élément sans transformation 3D) : trouvées par le contrôle automatique, hors liste de l'audit, conservées sans correction ;
  - `backdrop-blur-2xs` dans `ResellerAvatarSection`, composant inutilisé exclu (Lot 8).
* **Animations, dépendances** : le greffon rend effectives, sans modifier leurs fichiers pour cela, les animations des 15 modales maison (structures réservées au Lot 5B), du menu mobile (`DashboardLayout`), de la liste `Select` et d'une dizaine d'encadrés et de messages ; la pastille de `ResellerBottomNav` (Lot 6B) en profite aussi. `Dialog`, `Drawer` et `Toast` sont inchangés (`modalPop` 320 ms, `slideInRight` 360 ms mesuré identique avant et après).
* **Propositions compatibles pour le Lot 5B** : à la migration d'une modale maison vers `Dialog` ou `Drawer`, retirer ses classes `animate-in` (l'animation du composant partagé prend le relais) ; rendre `sm:animate-slide-in-down` effectif dans `Toast` en déclarant les animations de `globals.css` dans `@layer utilities`, puis retirer l'exception du test ; aligner, si souhaité, les durées sur l'audit (`Dialog` 200 ms, `Drawer` 240 ms).
* **Effets visibles** : ombres légères des cartes et des boutons ; flou de 4 px derrière les modales maison et le menu mobile ; apparitions de 150 à 200 ms ; un seul repère de focus, l'anneau, au lieu du contour natif doublé ; photos dans un cadre de proportion fixe (une photo verticale est recadrée) ; copyright du pied de page ; dégradés du catalogue ; pastilles de statut plus hautes de 2 px ; marge de 18 px des cartes de campagne revendeur à partir de 640 px ; entre 480 et 639 px, en-têtes un peu plus grands (titre Société 14 px, lieu 11 px sur 190 px au plus).
* **Inchangé** : textes, routes, requêtes, actions serveur, RLS, migrations, règles métier, palette, `globals.css`, `Dialog`, `Drawer`, `Toast`, structures des modales, dépendances npm.
* **Exclu** : contrastes et tailles de texte (Lot 3B), valeurs de base et formats de nombres (Lot 3C), barres de navigation (Lot 6B), composants inutilisés (Lot 8).
* **Vérification** (2026-11-15 et 2026-11-16) :
  - garde « classes seules » : chaque fichier modifié est exactement sa sauvegarde avec les paires approuvées, chaque paire ne retire que des classes sans effet (ou les retraits prévus) et n'ajoute que des classes qui produisent du CSS ; 36/36, aucun autre fichier de `src` modifié ;
  - typecheck sans erreur ; 95/95 tests unitaires (90 + 5) ;
  - feuille CSS complète : 1 725 règles avant, 1 773 après ; aucune supprimée ; 6 règles `duration-*` reçoivent seulement la variable de durée ; 48 ajoutées ; 149,8 Ko → 155,6 Ko (non minifié) ;
  - banc 3A sur vrai serveur Next avec base simulée, mesures avant et après (113) : 100/100, réactivation 35/35, non-régression 65/65 (aucun débordement horizontal nouveau sur 11 pages à 320, 390 et 768 px, animations du tiroir partagé identiques, « Commandes » de la barre revendeur à 320 px pas plus débordant qu'avant) ; une première passe à 94/100 venait du banc lui-même (sélecteur des cadres photo ignorant l'écriture `aspect-[…]`), corrigé et conservé ;
  - rejeux identiques à la référence relevée avant le lot, avec les mêmes contrôles en échec : 6A-1 183/183 (original et copie), 6A-2 359/359, 2C 154/160 et copie 160/160, 2A 180/186, variante titre 4A 182/186 et copie 186/186, 2B 49/49, 2D 18/18, 5A 178/182 et copie 198/198, composants 520/521, 2B 243/243 et 2D 270/270 (copies), originaux 2B et 2D arrêtés sur le bouton renommé au Lot 6A-2 ; les échecs des bancs originaux portent sur des textes déjà changés par les lots précédents ;
  - build officiel réussi le 2026-11-16 : 48 routes dont 10 statiques, 15 pages générées, aucun avertissement, au moins 3 015 Mo libres sur C: pendant le build ; le 2026-11-15, deux builds de la copie isolée avaient été arrêtés par la garde disque (C: à 944 puis 363 Mo), réussis après redémarrage du poste.
* **Observé hors périmètre** : l'en-tête de l'espace Société reste au-dessus du voile de la modale de campagne, avant comme après le lot (Lot 5B) ; « Commandes » dépasse de sa case à 320 px dans la barre basse revendeur, sans aggravation (Lot 6B).
* **Limites** : base simulée, sans vraie base Supabase ni compte réel ; Chrome seul (Safari, Firefox et vrais téléphones non testés ; un navigateur sans propriétés `translate` et `scale` individuelles, antérieur à Chrome 104 ou Safari 14.1, n'affiche que le fondu) ; coût du flou sur un téléphone d'entrée de gamme non mesuré ; lecteur d'écran non testé.

### ADR-058 : Préparation du Lot 5B — Présentation des Formulaires et Défilement (UX/UI)
* **Date** : 2026-11-16 (demande et cartographie), 2026-11-17 (décisions) | **Statut** : Décisions de préparation validées par le porteur du projet le 2026-11-17 ; développement réalisé localement les 2026-11-17 et 2026-11-18 dans le Lot 5B, vérifié localement et validé le 2026-11-19, voir ADR-061 (points ouverts tranchés ou documentés dans l'ADR-061)
* **Contexte** : le Lot 5B (modales et formulaires) couvre déjà les fiches SYS-02 (composants partagés contournés), MOB-08 (liste déroulante ouverte sous le pied d'une modale), MOB-09 (validation de commande hors écran), MOB-12 (montants coupés), A11-05 (libellés non reliés), A11-06 (erreurs non reliées), A11-10 (éléments interactifs imbriqués), RET-07 (confirmations natives `confirm()`) et AUT-01 (mot de passe non affichable). Le 2026-11-16, le porteur du projet y ajoute la réévaluation du mode de présentation des formulaires, jugés trop longs pour des fenêtres, et la correction du défilement de la page arrière.
* **Constats mesurés** (2026-11-16, lecture seule, copie isolée avec base simulée, vrai Chrome, 390, 768 et 1 280 px ; doigt simulé par de vrais événements tactiles à 390 et 768 px, molette à 1 280 px) :
  - aucune des 14 modales maison ne verrouille le défilement : une fois le formulaire au bout, la page arrière défile (par exemple 4 235 px à 390 px et 3 488 px à 1 280 px pour la proposition de la société, 3 446 px pour la demande générale, 2 050 px pour la campagne) ;
  - `Dialog` et `Drawer` partagés verrouillent (`overflow: hidden` sur `body`, aucune fuite mesurée), mais sans compteur : une fenêtre imbriquée qui se ferme libère la page alors que la fenêtre parente reste ouverte (confirmation « Réactiver la campagne ? » dans le tiroir de détail de campagne : 1 561 px à 390 px, 481 px à 768 px, 129 px à 1 280 px) ;
  - aucune zone de défilement ne porte `overscroll-behavior: contain` ;
  - longueurs, en écrans à 390 / 768 / 1 280 px : campagne 2,3 / 1,1 / 1,3 à l'ouverture et 8,9 / 4,1 / 4,6 avec toutes les destinations (67 champs, 7 sections) ; production 2,5 / 1,5 / 1,7 (20 champs) ; commande 1,6 / 1,0 / 1,1 ; demande générale 1,7 / 0,9 / 1,0 ; proposition 1,1 / 0,7 / 0,8 ; demande sur production 1,1 / 0,7 / 0,8 ; bannière et produit du catalogue 1,0 / 0,6 / 0,7 ; catégorie 0,7 ; statuts de commande 0,4 ; confirmation de livraison 0,9 ; bouton d'envoi hors écran à 390 px pour la campagne, la commande, la demande générale, la demande sur production, la proposition, la bannière et le produit du catalogue.
* **Décisions du 2026-11-17** :
  1. **pages dédiées** : création et modification de campagne ; création et modification de production ;
  2. **grands `Drawer`** : commande (plein écran sur mobile, total et bouton de validation dans un pied de page fixe) ; demande générale ; proposition de la société ; demande sur production ; propositions reçues puis commande ; bannière et produit du catalogue (administration) ;
  3. **`Dialog` classiques** conservés pour les formulaires courts, les confirmations, les changements de statut, le QR code et les autres interactions ponctuelles : catégorie (administration), statuts de commande (liste et détail), confirmation de livraison, QR code et scanner (plein écran sur mobile), report de date dans le détail de campagne, réouverture de campagne, annulation de commande, `ConfirmDialog` ;
  4. **protection des saisies** : sur une page dédiée modifiée, confirmation avant de quitter sans enregistrer ; aucune confirmation si rien n'a été modifié ; en cas d'échec, saisie, validations et messages d'erreur conservés ;
  5. **défilement** : verrouillage global corrigé, y compris pour un `Dialog` ouvert au-dessus d'un `Drawer` ; la fermeture d'un élément imbriqué ne libère pas la page tant qu'une fenêtre reste ouverte ; défilement interne maîtrisé par `overscroll-behavior: contain`, sans dégrader le comportement tactile ;
  6. **responsive** : vérification à 320, 360, 390, 768 et 1 280 px ; le pied de page fixe ne masque aucun champ, message d'erreur ni bouton ;
  7. **clavier et focus** vérifiés pour chaque mode de présentation.
* **Routes, après vérification de l'architecture (2026-11-17)** :
  - **campagnes** : `/dashboard/company/campaigns` (liste ; le détail s'ouvre dans un tiroir) et `/dashboard/company/campaigns/new` existent. `/new` affiche aujourd'hui la liste avec le formulaire ouvert en modale ; `?production_id=` pré-remplit la production ; les liens « Lancer une campagne » (carte de production) et « Créer une campagne commerciale » (détail de production) y mènent. Il n'existe aucune route `/campaigns/[id]`. La modification s'ouvre depuis la carte et depuis le bouton « Modifier » du tiroir de détail. La lecture `getCompanyCampaignById` existe, sans usage actuel. Proposé : `/campaigns/new` affiche le formulaire en page, à la même adresse, liens et paramètre conservés ; nouvelle route `/dashboard/company/campaigns/[id]/edit`, alimentée par `getCompanyCampaignById` ;
  - **productions** : `/dashboard/company/productions` (liste, `getCompanyProductions` et `getCompanyProducts`) et `/dashboard/company/productions/[id]` (détail, `getProductionById`) existent. Le formulaire s'ouvre depuis « Nouvelle production », « Déclarer une production » (liste vide) et « Modifier » (liste et détail). Chemins proposés : `/dashboard/company/productions/new` (segment fixe, prioritaire sur `[id]`) et `/dashboard/company/productions/[id]/edit` ; données `getCompanyProducts` et `getProductionById` ; règles de protection des productions engagées conservées ;
  - **sécurité et rafraîchissement** : le middleware réserve tout le préfixe `/dashboard/company` au rôle Société, nouvelles routes comprises ; les `revalidatePath` existants couvrent `/dashboard/company/campaigns`, `/dashboard/company/productions` et `/dashboard/company/productions/[id]`.
* **Décisions complémentaires du 2026-11-17 (campagnes)**, qui précisent la décision 1 et les routes ci-dessus :
  - **page de consultation `/campaigns/[id]`** : nouvelle route, hors de `/dashboard`, sur le modèle de la page publique `/companies/[id]`. C'est la page de consultation d'une campagne pour les revendeurs et pour la consultation publique. Une société peut en partager directement le lien (WhatsApp, Facebook, autres réseaux). Elle n'affiche que les informations autorisées à la consultation publique et respecte strictement les règles de visibilité, les statuts et les conditions d'éligibilité existants. Une campagne privée, non publiée ou non autorisée n'y devient jamais accessible par la seule connaissance de son adresse : la lecture filtre explicitement le statut, sans s'en remettre aux droits plus larges de la société propriétaire, de l'administration ou d'un revendeur qui y a commandé ;
  - **espace privé de la société conservé** (`/dashboard/company/campaigns`, liste et tiroir de détail) pour consulter et gérer ses propres campagnes ;
  - **modification** sur page dédiée (`/dashboard/company/campaigns/[id]/edit`) ;
  - **création** sur page dédiée (`/dashboard/company/campaigns/new`), sous forme d'assistant en plusieurs étapes construit à partir des champs et des règles métier existants : aucun champ, aucune validation ni aucune fonctionnalité supprimés ; contrôles d'accès, actions serveur, pré-remplissage `?production_id=`, enregistrement (statut initial brouillon ou publiée) et notifications préservés ;
  - **exigence majeure de non-régression** : routes existantes, liens de l'application, propositions et commandes liées aux campagnes, permissions et mécanismes de publication intacts ; composants et logique existants réutilisés autant que possible.
* **Présentation actuelle d'une campagne, vérifiée le 2026-11-17** :
  - **revendeur** : liste `/dashboard/reseller/campaigns`, alimentée par `getResellerCampaigns` (campagnes `active` seulement ; éligibilité calculée selon la province du revendeur : `is_eligible`, `can_order`, `eligibility_message`). Le détail s'ouvre dans `ResellerCampaignDetailDrawer`, en 7 blocs : visuel de la production, société, prix et volumes, description, calendrier, villes et dépôts, provinces couvertes ; le bouton « Commander » n'apparaît que si le revendeur est éligible, et la commande passe par `OrderFormModal`. La fiche production revendeur (`ResellerProductionDetailActions`) présente aussi la campagne active. Les notifications de campagne mènent à `/dashboard/reseller/campaigns`, adresse écrite dans les fonctions SQL ;
  - **société** : liste `/dashboard/company/campaigns`, détail dans `CompanyCampaignDetailDrawer` (actions de statut, destinations, report de date, réouverture, « Modifier ») ;
  - aucune page de campagne n'existe hors de ces tiroirs. Le précédent le plus proche est la paire `/companies/[id]` (profil public, hors middleware) et `/dashboard/reseller/companies/[id]`.
* **Règles existantes relevées pour la page de consultation** :
  - RLS `campaigns_select` : lecture ouverte à tous pour `status = 'active'` ; sinon réservée aux membres de la société, à l'administration et aux revendeurs qui y ont commandé. `campaign_destinations` et `campaign_depots` sont lisibles quand la campagne est active. Aucune colonne de visibilité propre aux campagnes : seul le statut fait foi (`draft`, `active`, `paused`, `completed`, `cancelled`) ;
  - le stock disponible (`get_campaigns_available_quantity`) n'est calculable que pour un utilisateur connecté ; un visiteur non connecté ne peut pas le voir ;
  - une production n'est lisible publiquement que si elle est publique (`is_public`) et dans un statut actif ; les détails d'une production privée ne s'affichent donc pas sur la page d'une campagne qui s'y adosse ;
  - le middleware ne protège que `/dashboard` ; `metadataBase` est défini dans `src/app/layout.tsx` à partir de `NEXT_PUBLIC_APP_URL`, base des aperçus de lien ;
  - afficher une campagne active ne demande aucune migration ni aucun changement de RLS ; en revanche, la protection des adresses précises des dépôts en demande un (voir « Vérification de sécurité des dépôts » ci-dessous), soumis à autorisation explicite.
* **Décisions validées le 2026-11-17 (page de consultation, modification, partage, assistant)** :
  1. **accès** : `/campaigns/[id]` est consultable sans connexion ; seules les campagnes au statut `active` y sont accessibles ; pour toute autre campagne, la page affiche « Campagne indisponible » ; la commande reste réservée aux revendeurs connectés et éligibles ;
  2. **informations publiques** : prix, devise, unité et quantité proposée sont visibles publiquement ; la quantité affichée est celle de l'offre (`marketable_quantity`), jamais le stock restant ; les zones géographiques générales sont visibles (provinces, villes de destination et dates) ; les adresses précises des dépôts (rue, quartier, repères et coordonnées précises) n'apparaissent pas sur la page publique ;
  3. **modification** : page dédiée à sections navigables ; validations, actions serveur et données existantes conservées ; aucune saisie perdue en changeant de section ; modifications non enregistrées protégées ;
  4. **ancienne route Société** : `/dashboard/company/campaigns/[id]` redirige vers la liste `/dashboard/company/campaigns`, tiroir de la campagne concernée ouvert ;
  5. **partage** : bouton « Partager » qui utilise le partage natif de l'appareil, avec « Copier le lien » en solution de repli ; aucun branchement WhatsApp spécifique ;
  6. **aperçu et indexation** : aperçu du lien avec titre, description et image publique de la production, logo Radiza en image de remplacement ; `noindex` sur les pages de campagne au lancement, sans empêcher leur consultation ni leur partage ;
  7. **assistant de création** : les cinq étapes ci-dessous sont validées, avec navigation entre les étapes, progression visible, conservation intégrale des saisies et validations exigées avant le passage à l'étape suivante ; en cas d'erreur serveur, retour à l'étape concernée sans perte des autres saisies ; aucun enregistrement automatique intermédiaire, mécanisme d'envoi final existant conservé ;
  8. **consignes de réalisation** : aucun champ ni aucune fonctionnalité supprimés ; permissions, éligibilité, statuts et parcours actuels préservés ; aucune migration, aucun changement RLS, aucune opération Supabase ou Vercel, Git, commit, push ou déploiement sans autorisation explicite ; développement après la fin des Lots 3B et 3C.
* **Vérification de sécurité des dépôts (2026-11-17, d'après les migrations du dépôt)** :
  - **colonnes** : `campaign_depots` contient `id`, `campaign_destination_id`, `campaign_id`, `name`, `commune`, `quartier`, `address` (rue, avenue ou marché), `complement` (repère), `created_at` et `updated_at` ; aucune colonne de coordonnées GPS. `campaign_destinations` contient la province, la ville (`city_name`) et les dates (arrivée, arrivée précédente, date limite de commande) ;
  - **droits** : la migration 030 (`security_hardening`) retire au rôle `anon` les droits d'écriture sur toutes les tables (`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ... FROM anon`), mais pas `SELECT`. Aucune migration ne retire `SELECT` à `anon` sur `campaign_depots` : le rôle conserve la lecture accordée par défaut par Supabase ;
  - **RLS** : `campaign_depots_select` autorise la lecture des dépôts de toute campagne `active`, sans condition de rôle ;
  - **risque, existant avant le Lot 5B** : un visiteur non connecté peut lire, par l'API PostgREST et avec la clé `anon` publique présente dans l'application, toutes les colonnes des dépôts des campagnes actives, adresses précises comprises. Aucune page publique actuelle ne les interroge, mais masquer ces données dans l'interface ne les protégerait pas. Les colonnes de `campaigns` lisibles de la même façon ne contiennent que des données d'offre, déclarées publiques par la décision 2 ;
  - **limite** : constat établi d'après les migrations du dépôt ; les droits réels de la base n'ont pas été lus (aucun accès à Supabase autorisé). Une lecture seule de `information_schema.role_table_grants` sur la base réelle confirmerait le constat, avec autorisation.
* **Solution proposée, non appliquée (migration soumise à autorisation explicite)** :
  - **option A, recommandée** : retirer au seul rôle `anon` la lecture de `campaign_depots` (`REVOKE SELECT ON public.campaign_depots FROM anon;`). Les utilisateurs connectés gardent l'accès prévu par la RLS : les revendeurs voient les dépôts dans leur espace et dans la commande, la société et l'administration les gèrent. Même méthode que la migration 030 pour `companies` (lecture `anon` retirée, colonnes publiques accordées une à une). La page publique n'interroge pas les dépôts ; elle affiche provinces, villes et dates ;
  - **option B** : retirer `SELECT` à `anon`, puis lui accorder seulement `id`, `campaign_id`, `campaign_destination_id` et `commune`, si la commune est retenue comme zone générale et doit apparaître publiquement ; nom, quartier, adresse et complément restent protégés ;
  - **dans les deux cas** : aucune modification des politiques RLS, ni des droits `authenticated`, ni des parcours de commande ; test SQL de non-régression : lecture des dépôts refusée à `anon` et accordée à un revendeur connecté pour une campagne active ;
  - **page de consultation** : quel que soit le visiteur, elle n'affiche aucune adresse précise de dépôt ; un revendeur connecté retrouve les dépôts dans le tiroir de son espace et dans la commande.
* **Assistant de création (étapes validées le 2026-11-17)** : 1. production et offre (production de référence, titre, quantité avec contrôle de disponibilité, prix et devise) ; 2. calendrier et présentation (date d'ouverture, date de clôture, précision de disponibilité, description) ; 3. destinations (sélection des territoires, avec les demandes du marché, « Tout sélectionner » et « Effacer ») ; 4. configuration par destination (date d'arrivée, date limite de commande, dépôts avec nom, commune, quartier, rue et repère) ; 5. vérification et publication (récapitulatif, statut initial, message d'erreur près du bouton, envoi unique). Les validations sont reprises étape par étape, la validation serveur est inchangée et une erreur serveur ramène à l'étape concernée ; rien n'est enregistré entre les étapes.
* **Propositions du Lot 3A reprises** : retirer les classes `animate-in` des modales migrées ; rendre effectif `sm:animate-slide-in-down` dans `Toast` puis retirer l'exception du test `tailwindClasses.test.ts` ; aligner éventuellement les durées de `Dialog` (200 ms) et `Drawer` (240 ms).
* **Recouvrements** : profils et mot de passe restent en `Drawer`, leur restructuration relève du Lot 7 ; `ResellerLocationEditModal`, accessible seulement depuis une carte inutilisée, `EditCompanyProfileModal` et les enveloppes `ProductionFormModal`, `AddProductModal` et `EditProductModal` relèvent du Lot 8 ; l'en-tête Société au-dessus du voile de la modale de campagne disparaît avec la migration.
* **Dépendances** : Lot 3 (3A terminé ; 3B lisibilité et 3C valeurs de base et formats à faire avant le 5B) ; Lot 5A (accessibilité clavier des modales, terminé) ; Lot 6A (vocabulaire, terminé).
* **Vérifications prévues** : le script de mesure de la préparation, `mesure-formulaires.cjs`, servira de banc de non-régression (aucune fuite de défilement, cas imbriqués compris) ; banc clavier du Lot 5A adapté (piège du focus, Échap, retour du focus, focus sur le titre à l'arrivée sur une page dédiée) ; parcours de saisie et d'échec pour la conservation des données ; largeurs 320, 360, 390, 768 et 1 280 px.
* **Points ouverts** : page de retour après enregistrement d'une page dédiée ; vérification sur Safari et iPhone, impossible sur le poste de développement ; autorisation de la migration de protection des dépôts (option A ou B) et lecture des droits réels de la base ; confirmation que la page de consultation n'affiche aucune adresse de dépôt, y compris pour un revendeur connecté.
* **Limites de la cartographie** : non mesurés, faute de déclencheur sur la base simulée ou dans la vue par défaut : trois boutons « Filtres » (mobile seulement), réouverture de campagne, mot de passe (onglet) et propositions reçues à 1 280 px ; ces cas sont classés d'après le code.

### ADR-059 : Lisibilité — Contrastes et Tailles de Texte (Lot 3B UX/UI)
* **Date** : 2026-11-17 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-17 (mission 3B et 3C autorisée par le porteur du projet le 2026-11-17), validé par le porteur du projet le 2026-11-17 — implémentation locale, non commitée
* **Contexte** : fiches A11-02 (contrastes insuffisants) et A11-03 (texte trop petit) de l'audit UX/UI. Décisions du 2026-11-15 appliquées : mesurer les ratios réels selon WCAG avant et après, sans remplacement global aveugle (décision 6) ; 12 px minimum pour le texte courant, 11 px pour les badges et compteurs, avec exceptions justifiées, barres de navigation laissées au Lot 6B (décision 7) ; composants inutilisés (Lot 8) exclus (décision 10).
* **Méthode de mesure** : copie isolée instrumentée (chaque élément reçoit l'emplacement de sa balise dans le code ; dépôt jamais instrumenté), vrai Chrome, base simulée, 40 pages et 16 fenêtres (15 ouvertes à 390 px, 14 à 1 280 px), à 390 et 1 280 px. Pour chaque texte : couleur effective (opacités comprises), fond effectif (calques semi-transparents composés, dégradés évalués au pire cas de leurs couleurs), seuil WCAG 1.4.3 (4,5:1, ou 3:1 pour le grand texte). Éléments désactivés et d'opacité nulle exclus ; texte d'exemple des champs mesuré à part.
* **Contrastes (A11-02)** :
  - **avant** : 9 307 textes mesurés, 965 échecs (10,4 %) sur 194 emplacements ; **après** : 122 échecs (1,3 %) sur 17 emplacements, tous exemptés ou non mesurables (ci-dessous) ;
  - **corrections fondées sur la mesure** : pour chaque échec, le jeton de couleur fautif est remplacé dans la balise exacte par la teinte la plus proche de la même couleur qui atteint le seuil sur le fond mesuré, avec une marge de 0,1 (118 remplacements dans 49 fichiers, par exemple `text-gray-400` → `text-gray-500`, `text-gray-500` → `text-gray-600` sur fond gris, `text-rose-500` → `text-rose-600`, `text-red-500` → `text-red-600`, opacités relevées) ; texte blanc sur fond coloré : fond assombri (`bg-emerald-600` → `bg-emerald-700`, `bg-amber-500` → `bg-amber-700`) ;
  - **corrections manuelles**, mesurées ou calculées sur la même palette (25 remplacements dans 17 fichiers ; dans `ResellerBottomNav`, seule la couleur d'une pastille est corrigée, la taille de ses textes restant au Lot 6B) : couleur héritée d'un parent (`gray-400` → `gray-500`) ; variantes `success` et `earth` de `Button` (`emerald-700`, `earth-700`, survol en 800) ; pastilles, badges et boutons blancs sur `emerald-500/600`, `earth-600` et `amber-600` passés en 700 ; fiche de produit archivé (opacité 80 %) en `gray-700` et pastille « Archivé » en `amber-800` ; anciennes classes `placeholder-gray-400` ;
  - **défaut préexistant corrigé** : les boutons « En préparation » (`CompanyOrderDetailView`, `CompanyOrderDetailDrawer`) affichaient du texte blanc sur fond `slate-100` (1,1:1), la variante `secondary` l'emportant sur la couleur passée en `className` (`cn` ne fusionne pas les classes) ; couleurs rendues prioritaires (`!bg-indigo-700 hover:!bg-indigo-800 !text-white`), sans toucher au composant `Button` ;
  - **texte d'exemple par défaut** : règle de base dans `globals.css` (`input::placeholder, textarea::placeholder` en `gray-500`, 4,8:1) au lieu du `gray-400` de Tailwind (2,5:1, mesuré sur 70 champs) ; une classe `placeholder:*` posée sur un champ reste prioritaire ;
  - **exemptés et documentés** : séparateurs décoratifs d'un seul caractère (`·`, `•`, `/`, `|`, `↓`… : décoration pure au sens de WCAG 1.4.3 ; l'astérisque des champs obligatoires, qui porte une information, est corrigé) ; emoji ; éléments désactivés ;
  - **non mesurables** : textes posés sur une photo ou une bannière avec voile (cartes de production, bannière du fil, pastille « Photo propre ») : le fond réel dépend de l'image.
* **Tailles (A11-03)** : chaque occurrence de `text-[8px]` à `text-[11px]` est classée d'après l'ensemble des classes de son attribut `className` : texte courant → `text-xs` (12 px) ; badge, pastille ou compteur (arrondi, rembourrage, fond ou bordure) et étiquette en capitales (`uppercase`, exception justifiée par la hauteur des capitales) → `text-[11px]`. 316 occurrences passent à 12 px, 127 à 11 px, 101 badges déjà à 11 px restent inchangés, dans 85 fichiers. Barres de navigation (barres basses et latérales `CompanyBottomNav`, `ResellerBottomNav`, `CompanySidebar`, `ResellerSidebar`, `AppSidebar`) laissées au Lot 6B ; graphiques SVG du Lot 4A inchangés (taille en attribut, déjà au moins 11 px). Mesure à 390 px : part des caractères sous 12 px de 27,8 % à 8,9 % (objectif de l'audit : moins de 10 %), sous 11 px de 8,4 % à 0,7 % (barres de navigation).
* **Inchangé** : textes, routes, requêtes, actions serveur, RLS, migrations, règles métier, palette, structures des modales (Lot 5B), dépendances npm ; bordures des champs (`gray-300`, 1,5:1, critère 1.4.11 des composants) laissées en l'état : un relèvement à 3:1 demanderait `gray-500` et alourdirait l'identité visuelle, à décider séparément.
* **Vérification** : voir ADR-060 (vérification combinée des Lots 3B et 3C).

### ADR-060 : Valeurs de Base et Formats des Nombres (Lot 3C UX/UI)
* **Date** : 2026-11-17 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-17, validé par le porteur du projet le 2026-11-17 — implémentation locale, non commitée
* **Contexte** : fiches SYS-04 (valeurs de base dispersées) et SYS-05 (formats de nombres incohérents). Décisions du 2026-11-15 appliquées : montants avec deux décimales et code devise après le montant (CDF ou USD), quantités sans perte de précision réelle (décision 8) ; échelle des rayons et des graisses tirée des composants réellement utilisés, sans uniformisation arbitraire (décision 9) ; SYS-04 limité aux composants partagés (plan du 2026-11-07).
* **Échelle constatée et retenue (composants partagés `src/components/ui`)** : rayons — petits contrôles `rounded-lg` (bouton `xs`, case à cocher `rounded-md`), contrôles `rounded-xl` (boutons `sm` et `md`, champs, listes), cartes et grands boutons `rounded-2xl` (`Card`, `StatCard`, `EmptyState`, `Alert`, `Toast`, bouton `lg`), fenêtres `rounded-3xl` (`Dialog`), pastilles `rounded-full` ; graisses — titres `font-bold`, sous-titres et libellés `font-semibold`, texte `font-medium` ou normal, aucun `font-black` ni `font-extrabold` utile dans les composants partagés. Les composants respectaient déjà cette échelle : aucune uniformisation imposée. Seul écart corrigé : un seul gris neutre, `gray` au lieu de `slate` dans la variante `neutral` de `Badge` et la variante `secondary` de `Button`. Écrans hors composants partagés, `Dialog`, `Drawer` et `Toast` (Lot 5B) inchangés.
* **Formats (SYS-05)** : nouveau module pur `src/lib/utils/numberFormat.ts` :
  - `formatAmount` (deux décimales, séparateurs français) et `formatMoney` (montant et code devise après, séparés par une espace insécable) : « 2 400 000,00 USD », « 8 400 000,00 CDF » ; plus de « $US » (`Intl` en style monétaire retiré à 2 endroits) ; le CDF passe de 0 à 2 décimales comme l'exige la décision 8 ;
  - `formatQuantity` (au plus deux décimales) : les quantités sont stockées en `NUMERIC(12,2)` (montants en `NUMERIC(14,2)`), donc aucune précision réelle n'est perdue, seul le bruit des calculs flottants est retiré ;
  - `unitLabel` et `formatQuantityWithUnit` : libellé d'unité d'origine, jamais converti (BR-FIN-04), pluriel à partir de 2 selon l'usage français pour une liste fermée d'unités connues (tonne, sac, caisse, cageot, carton, panier, litre, pièce, régime, botte, bidon, unité, kilogramme, gramme) ; abréviations (kg, t) et unités inconnues inchangées ; prix « par unité » au singulier (« USD/tonne ») ; le pluriel s'applique quand l'unité suit directement la quantité ; une unité affichée comme légende séparée ou comme libellé (« Unité : tonne ») garde son libellé d'origine ;
  - valeur absente ou illisible affichée « — » au lieu de « NaN » ;
  - **application** : 110 appels remplacés (94 formes simples par un outil à motifs prudents, 13 cas manuels, 3 prix affichés sans aucun format, dont « 450000 CDF » sur la fiche production revendeur), dans les écrans Société, Revendeur et administration ; `adminFormat` délègue aux formats communs ;
  - **inchangés** : compteurs et pagination (entiers), messages des actions serveur (`src/lib/actions`, cohérent avec l'exclusion C1 du Lot 6A-2), graphiques du Lot 4A (`unitSeries`, même précision, libellés d'unité d'origine).
* **Vérification combinée des Lots 3B et 3C (2026-11-17)** :
  - garde de catégories : 101 fichiers de `src` modifiés (496 lignes de classes, 105 lignes de formats, 31 imports du module de formats, 4 fichiers à modification manuelle documentée : `globals.css`, `CompanyFinancialMetrics`, `CompanyRecentActivity`, `adminFormat`) et 2 fichiers créés (`src/lib/utils/numberFormat.ts`, `tests/unit/numberFormat.test.ts`) ; aucune autre modification ;
  - typecheck sans erreur ; 101/101 tests unitaires (95 + 6 tests de formats) ; contrôle automatique des classes Tailwind (Lot 3A) conforme ;
  - mesures de lisibilité sur la copie isolée : voir ADR-059 ;
  - banc 3A rejoué : 100/100 (aucun débordement horizontal nouveau à 320, 390 et 768 px malgré des textes plus grands et des montants plus longs) ; 12 rejeux serveur identiques à la référence, avec les mêmes contrôles en échec dans les bancs originaux (6A-1 183/183, 6A-2 359/359, 2C 154/160 et copie 160/160, 2A 180/186, 182/186 et copie 186/186, 2B 49/49, 2D 18/18, 5A 178/182 et copie 198/198) ; bancs de composants identiques (520/521, 243/243, 270/270 ; originaux 2B et 2D arrêtés sur le bouton renommé au Lot 6A-2) ;
  - build officiel réussi le 2026-11-17 : 48 routes dont 10 statiques, 15 pages générées, aucun avertissement, au moins 1 934 Mo libres sur C: pendant le build ;
  - sauvegardes et preuves : `D:\radiza-build-tmp\bench3bc` (sauvegarde intégrale de `src` avant le lot, plans de correction, mesures avant et après, journaux).
* **Limites** : base simulée et Chrome seul (Safari, Firefox, vrais téléphones et lecteur d'écran non testés) ; textes posés sur des photos non mesurables ; états non affichés par la base simulée non mesurés (les règles de correction ont été appliquées aux balises effectivement rendues) ; bordures des champs non relevées (voir ADR-059).

### ADR-061 : Formulaires, Fenêtres, Défilement et Page Publique des Campagnes (Lot 5B UX/UI)
* **Date** : 2026-11-17 au 2026-11-19 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-19 (mission complète autorisée par le porteur du projet le 2026-11-17 ; vérification finale et build officiel exécutés le 2026-11-19 après une première interruption par la garde disque, voir « Vérification »), validé par le porteur du projet le 2026-11-19 — implémentation locale, non commitée ; migration de protection des dépôts préparée, NON appliquée ni vérifiée en production
* **Contexte** : décisions de l'ADR-058 (pages dédiées, grands `Drawer`, `Dialog`, protection des saisies, défilement, page publique `/campaigns/[id]`, partage, aperçu, `noindex`, assistant en cinq étapes, option A des dépôts) et fiches SYS-02, MOB-08, MOB-09, MOB-12, A11-05, A11-06, A11-10, RET-07 et AUT-01 de l'audit.
* **Composants partagés** :
  - verrou de défilement compté (`src/components/ui/scrollLock.ts`, `useScrollLock.ts`) utilisé par `Dialog`, `Drawer` et le menu mobile de `DashboardLayout` : la page reste verrouillée tant qu'une surface est ouverte, la fermeture d'une fenêtre imbriquée ne la libère plus, styles d'origine restaurés, barre de défilement compensée ; `overscroll-behavior: contain` sur les zones défilantes des fenêtres et tiroirs ;
  - `Dialog` : option `fullScreenOnMobile` (scanner QR) ;
  - protection des saisies (`unsavedChanges.ts`, `useUnsavedChangesGuard.tsx`) : confirmation « Quitter sans enregistrer ? » sur un lien de l'application quand une page dédiée a été modifiée, alerte native du navigateur à la fermeture ou au rechargement ; rien si rien n'a changé ; désarmée après un enregistrement réussi ;
  - `Toast` : animations de `globals.css` déclarées dans `@layer utilities`, `sm:animate-slide-in-down` effectif, exception retirée du test des classes (proposition du Lot 3A).
* **Migrations de présentation** (aucun champ, aucune validation ni action serveur modifiés) :
  - grands `Drawer` : commande (`OrderFormModal`, total et validation dans le pied fixe, MOB-09), demande générale, proposition de la société, demande sur production, propositions reçues puis commande, bannière et produit du catalogue (administration ; boutons laissés dans le formulaire, `SubmitButton` reposant sur `useFormStatus`) ;
  - `Dialog` : catégorie (administration), QR code, scanner (plein écran sur mobile), confirmation de livraison, statuts de commande (liste et détail), report de date dans le tiroir de campagne ;
  - les 14 modales maison et leurs pièges de focus propres sont remplacés par les surfaces partagées ; leurs classes d'entrée `animate-in` disparaissent avec elles (proposition du Lot 3A ; restent celles qui animent un changement d'état à l'intérieur d'une fenêtre ouverte).
* **Pages dédiées** :
  - campagne : `/dashboard/company/campaigns/new` (assistant en cinq étapes : production et offre ; calendrier et présentation ; destinations ; configuration par destination ; vérification et publication), `/dashboard/company/campaigns/[id]/edit` (sections navigables) ; formulaire unique `CampaignForm` issu de `CampaignFormModal` (16 contrôles d'origine regroupés par étape, envoi final unique, erreur serveur ramenée à l'étape concernée, saisies conservées entre étapes, `?production_id=` conservé) ; après enregistrement : liste des campagnes ;
  - production : `/dashboard/company/productions/new` et `/dashboard/company/productions/[id]/edit` ; formulaire `ProductionForm` issu de `ProductionDrawer` (mêmes champs, photo, verrous des productions engagées, actions) ; après enregistrement : liste (création) ou fiche (modification) ;
  - focus sur le titre à l'arrivée ; dans l'assistant, focus sur le titre de l'étape à chaque changement ; barre d'actions fixe au-dessus de la barre basse mobile ;
  - redirections : `/dashboard/company/campaigns/[id]` → liste avec le tiroir de la campagne ouvert ; `?new=true` et `?production_id=` de la liste → page de création ;
  - la fiche production ne lit plus la liste des produits (la modification la lit elle-même) ;
  - `CampaignFormModal` et `ProductionDrawer` ne sont plus importés : conservés, à retirer au Lot 8.
* **Page publique `/campaigns/[id]`** :
  - lecture `getPublicCampaign` : filtres explicites et indépendants du visiteur (statut `active`, règle 6 de clôture par date, société active, produit du catalogue public, production publique en cycle actif), jointures internes, colonnes de la société limitées à celles accordées à `anon` ; la table des dépôts n'est jamais interrogée ; forme publique construite champ par champ (`src/lib/utils/publicCampaign.ts`) ; toute autre campagne, identifiant inconnu ou mal formé : « Campagne indisponible », sans dire pourquoi ; panne de lecture : écran d'erreur, jamais « indisponible » ;
  - contenu : offre (prix, devise, unité, quantité proposée, minimum), société (lien vers son profil public), description, période, villes de destination et dates, provinces desservies ; mention « Les points de retrait sont communiqués aux revendeurs connectés au moment de la commande » ;
  - zone « Commander » selon le visiteur : visiteur → « Se connecter pour commander » (retour à la campagne après connexion) et « Créer un compte revendeur » ; revendeur → mêmes règles que son espace (`getResellerCampaignById` : éligibilité territoriale, date limite, stock), commande par le même formulaire ; société qui publie la campagne → « Gérer cette campagne » ; autres → commande réservée aux revendeurs ;
  - aperçu (`generateMetadata`) : titre, description, image publique de la production (sinon image du produit, même règle que les tiroirs), logo Radiza `public/brand/radiza-og.png` (1 200 × 630) à défaut ; `noindex, nofollow` posé sur tout le segment `/campaigns`, écran « indisponible » compris ;
  - partage (`CampaignShareActions`) : « Partager » (partage natif de l'appareil, affiché seulement s'il existe) et « Copier le lien » (repli, copie de secours par sélection, message « Lien copié ») ; dans la page, dans le tiroir Société (campagnes ouvertes seulement, avec « Voir la page publique ») et dans le tiroir Revendeur ;
  - connexion : `/campaigns` ajouté à la liste blanche des redirections (`sanitizeRedirectPath`) et retour autorisé vers `/campaigns/…` quel que soit le rôle (page publique commune), en plus de l'espace du rôle (FUN-16).
* **Corrections de l'audit** : MOB-08 (`Select` ouvert vers le haut quand la place manque dans la zone visible, liste réduite au besoin) ; MOB-09 (validation de commande dans le pied fixe) ; MOB-12 (totaux et montants d'un seul tenant, libellé et montant empilés sur mobile dans les fiches de commande) ; A11-05 (libellés reliés dans la demande, la proposition et la campagne, groupe des destinations nommé, devise nommée, champs de recherche nommés) ; A11-06 (`FormField` relie automatiquement erreur et aide au champ : `aria-invalid`, `aria-describedby` ; `Select` nommé par son libellé) ; A11-10 (aucun lien contenant un bouton : `buttonClassName` sur les liens) ; RET-07 (`ConfirmDialog` au lieu de `confirm()` dans les listes de bannières et de catégories) ; AUT-01 (`PasswordField` : afficher ou masquer le mot de passe, cible de 44 px, sur la connexion et les deux inscriptions).
* **Sécurité des dépôts (option A, autorisation limitée du 2026-11-17)** : migration `supabase/pending/20261118000034_revoke_anon_select_campaign_depots.sql` préparée, NON appliquée, rangée hors de `supabase/migrations` pour qu'aucune commande d'application ne la prenne ; une seule instruction, `REVOKE SELECT ON public.campaign_depots FROM anon;` ; test `supabase/tests/campaign_depots_anon_test.sql` (droits de table et de colonne, RLS et politiques en place, refus réel au rôle `anon`, lecture conservée par un revendeur connecté) ; cohérence vérifiée par `tests/unit/lot5bCoherence.test.ts`. **Tant que cette migration n'est pas appliquée et vérifiée en production, les adresses des dépôts des campagnes actives restent lisibles par l'API avec la clé publique** : la page publique ne les interroge ni ne les affiche, mais cela ne les protège pas.
* **Procédure d'application et de vérification en production (sur autorisation)** : (1) lecture seule des droits réels (`information_schema.role_table_grants` et `column_privileges`, requête R1 dans l'en-tête du fichier), résultat conservé ; (2) déplacer le fichier dans `supabase/migrations/` sans le renommer et l'appliquer par la procédure habituelle ; (3) relire R1 : aucune ligne `SELECT` pour `anon`, `authenticated` conservé ; (4) exécuter le test SQL sur l'environnement de test ; (5) appel réel à l'API REST `campaign_depots` avec la clé `anon` sans session : refus attendu (erreur de permission) ; (6) avec un compte revendeur réel : dépôts visibles dans le tiroir de campagne et dans la commande, commande possible ; (7) retour arrière si nécessaire : `GRANT SELECT ON public.campaign_depots TO anon;`.
* **Décisions prises pendant la mission (dans le cadre de l'ADR-058, sans règle métier nouvelle)** :
  - page de retour après enregistrement (point ouvert de l'ADR-058) : liste des campagnes ; liste des productions après une création, fiche de la production après une modification ;
  - la page publique n'affiche une campagne que si un visiteur non connecté pourrait la lire entièrement : ses filtres reproduisent les politiques RLS publiques (`campaigns_select`, `companies_select_active`, `products_select_policy`, `productions_select`) ; une campagne sur un produit propre à une société (hors catalogue public) n'y apparaît donc pas, comme elle n'apparaît déjà pas dans la liste des revendeurs ;
  - revendeur connecté : la charge utile de la page contient les dépôts nécessaires au formulaire de commande (même lecture que sa fiche production et son tiroir de campagne, autorisée par la RLS) ; ils ne sont affichés que dans le formulaire de commande, jamais sur la page ; visiteur, société et administration : aucune donnée de dépôt, ni affichée ni transmise ;
  - formulaires d'administration (bannière, catégorie, produit) : boutons laissés dans le formulaire, sans pied fixe, car `SubmitButton` repose sur `useFormStatus` ;
  - protection des saisies : le bouton « Précédent » du navigateur n'est pas intercepté (aucune API fiable de l'App Router) ; seules l'alerte native (fermeture, rechargement, adresse saisie) et la confirmation sur les liens de l'application s'appliquent ; comportement mesuré le 2026-11-19 (voir « Vérification ») : écart à la décision 4 de l'ADR-058 limité à ce geste ; limite acceptée provisoirement par le porteur du projet le 2026-11-19, conservée comme point connu, à traiter ultérieurement avec des tests dédiés (piste : entrée d'historique de garde, à éprouver aussi sur Safari et sur le geste de retour des téléphones) ;
  - durées de `Dialog` (200 ms) et `Drawer` (240 ms) non alignées (proposition facultative du 3A), pour garder la référence d'animation du tiroir partagé vérifiée depuis le 3A ;
  - `animate-in` restants : seulement des changements d'état à l'intérieur d'une fenêtre déjà ouverte (succès d'une livraison, passage des propositions à la commande), conservés ;
  - `confirm()` restant dans `ResellerAvatarSection`, composant inutilisé (Lot 8) ;
  - harmonisation des fins de ligne : `CompanyOrdersView.tsx` et `CompanyOrderDetailView.tsx` étaient mixtes (3 lignes en LF) et sont entièrement en CRLF ; aucun autre fichier n'a changé de fins de ligne ;
  - code mort laissé pour le Lot 8 : `CampaignFormModal.tsx` et `ProductionDrawer.tsx` (plus importés).
* **Limites** : base simulée (enregistrements réels de campagne, de production et de commande non exécutés ; erreurs serveur réelles non provoquées) ; Chrome seul (Safari et iPhone non testables sur le poste : propriétés `translate`/`scale` individuelles, `env(safe-area-inset-bottom)`, partage natif iOS) ; partage natif simulé dans Chrome ; aperçus réels de WhatsApp et Facebook non vérifiés (l'adresse doit être publique) ; lecteur d'écran non testé ; Firefox et téléphone réel non testés ; bouton « Précédent » du navigateur (et geste de retour des téléphones, non testé) : après une arrivée par navigation interne, la page modifiée est quittée sans confirmation et la saisie est perdue ; « Modifier la configuration du produit » (`EditProductDrawer`, hors ADR-058) : bouton d'envoi hors écran à l'ouverture, atteignable en faisant défiler le tiroir ; protection des dépôts non garantie en production tant que la migration préparée n'est pas appliquée et vérifiée.
* **Correctif trouvé pendant la vérification** : en panne de lecture, le titre de la page publique annonçait « Campagne indisponible » ; il est désormais neutre (« Campagne — Radiza »), l'écran d'erreur s'affiche. `getCompanyCampaignById` (sans usage avant le lot, réutilisée par la page de modification) transformait une panne en « page introuvable » : elle lève désormais une erreur (règle du Lot 2C), un identifiant mal formé restant une absence.
* **Vérification** :
  - typecheck sans erreur ; 128/128 tests unitaires (101 + 27 nouveaux : `scrollLock`, `unsavedChanges`, `publicCampaign`, `selectPlacement`, `lot5bCoherence`, cas `/campaigns` de `url`) ; rejoués sur l'état final le 2026-11-19 : 0 erreur, 128/128 ;
  - banc 5B (`D:\radiza-build-tmp\bench5b\e2e5b.cjs`, vrai serveur Next, base simulée étendue, vrai Chrome) : 232/232 sur l'état final le 2026-11-19, après 224/224 sur la version précédant le correctif de `getCompanyCampaignById` ; pannes 8/8 : demande du marché en panne (liste des campagnes intacte, création et modification avec panne signalée, formulaire conservé et « Réessayer »), provinces en panne (écran d'erreur, jamais de formulaire inutilisable), produits en panne (fiche production intacte ; création et modification de production : écran d'erreur, jamais de faux « aucun produit »), campagnes en panne sur la page de modification (écran d'erreur, jamais « introuvable », vérification du correctif) ; autres groupes : assistant 29/29 (étapes, validations, saisies conservées, focus, confirmation de départ, alerte native, `?production_id=`), modification 11/11, routes et redirections 5/5, productions 10/10, page publique 38/38 (visiteur, revendeur, société, administration, campagnes suspendue, terminée, brouillon, inexistante, mal formée, production privée, société inactive, produit hors catalogue public, panne ; aucune donnée de dépôt dans le HTML ni la charge utile pour le visiteur, la société et l'administration ; aperçu, image de repli, `noindex`), partage 10/10 (copie réelle du lien, partage natif simulé, annulation, repli), défilement 13/13 (Dialog dans Drawer à 390 et 1 280 px, page immobile au doigt et à la molette), commande et MOB-08 15/15 (320, 390, 768 px), accessibilité 18/18 (AUT-01, RET-07, recherches nommées, clavier), largeurs 75/75 (7 pages × 320, 360, 390, 768, 1 280 px : aucun débordement, barre d'actions sans masquer de champ) ; les passes précédentes ont trouvé le correctif du titre et des défauts du banc lui-même (corrigés dans le banc) ;
  - mesure des fenêtres (copie adaptée de la mesure de préparation, 22 fenêtres × 3 largeurs) : 66 mesures, 0 fuite de défilement de la page arrière (jusqu'à 4 235 px avant), page verrouillée dans 66 cas sur 66, 6 cas imbriqués où la page reste verrouillée après la fermeture de la fenêtre intérieure ; bouton d'envoi hors écran : 20 mesures avant, 3 après, toutes sur « Modifier la configuration du produit » (`EditProductDrawer`, tiroir partagé non classé par l'ADR-058, inchangé) ; 12 déclenchements impossibles, les mêmes qu'à la préparation ;
  - examen de ces 3 cas le 2026-11-19 (`sonde-produit.cjs`, 15/15) : mêmes mesures qu'à la préparation (aucune régression) ; à 390, 768 et 1 280 px, « Enregistrer » est sous le bas de l'écran à l'ouverture, puis atteint en faisant défiler le tiroir (molette sur le panneau), visible, non masqué, joignable au clavier, page arrière immobile ; non modifié (hors ADR-058, dont les recouvrements placent l'enveloppe `EditProductModal` au Lot 8) ; amélioration possible dans un lot ultérieur : actions dans le pied du tiroir, comme la commande ;
  - bouton « Précédent » du navigateur, examiné le 2026-11-19 (`sonde-precedent.cjs`, création de production et assistant de campagne, 390 px, vraie frappe au clavier) : arrivée par un bouton de l'application puis Précédent → retour à la liste sans confirmation ni alerte, saisie perdue, « Suivant » rouvre un formulaire vierge (pré-rempli par défaut) ; arrivée par chargement complet puis Précédent → alerte native ; refusée, la page et la saisie restent ; acceptée, retour à la liste. Limite documentée confirmée, non corrigée ;
  - rejeux identiques à la référence : 6A-1 original 183/183 (périmètre 178/178, différés 6A-2 5/5) et copie 183/183, 6A-2 359/359, 2C 154/160 (mêmes échecs) et copie 160/160, 2D rejet 18/18, composants 6A-1 520/521 (même point du Lot 6B), composants 2D copie 270/270 (référence 270/270), composants 2D original arrêté au même point qu'avant ; banc 3A adapté (`e2e3a-5b-adapte.cjs`) 100/100 ; banc clavier 5A adapté 198/198 (l'échec isolé de la passe précédente ne se reproduit pas) ;
  - écarts attendus, dus aux décisions du lot : 2A original 175/186 (référence 180), titre 177/186 (182), copie 181/186 (186), les 5 mêmes contrôles dans les trois cas : `/new` affiche l'assistant et non plus la liste, la demande du marché n'est plus lue par la liste (elle l'est par les pages de formulaire) et les produits ne sont plus lus par la fiche production (ils le sont par la page de modification) ; contrôles équivalents écrits dans le groupe « pannes » du banc 5B ; 2B serveur 48/49 : seul « tiroir ouvert » échoue, la production étant une page, et sur cette page la photo de 2,1 Mo est préparée puis acceptée par la vraie action serveur, sans rechargement ; 3A non adapté 93/100 : ses 7 échecs visent la modale de campagne, le tiroir de production et l'ancienne modale de commande (copie adaptée `e2e3a-5b-adapte.cjs` écrite) ; composants 2B original et copie arrêtés à l'ouverture du tiroir de production depuis la liste (référence : 243/243 pour la copie) ; banc clavier 5A original 163/170 (référence 178/182) : ses 4 échecs de référence (vocabulaire du Lot 6A-2, raison de la copie) et 3 échecs visant la modale de campagne et la liste ouverte depuis « Nouvelle production », devenues des pages, 12 contrôles de moins car ces fenêtres n'existent plus ; banc 5A copie 183/186 (référence 198/198) : les 3 mêmes échecs ; la copie adaptée au 5B les remplace (report de date dans le tiroir de campagne, liste ouverte dans le tiroir de demande) et passe 198/198 ;
  - vérification finale : interrompue une première fois le 2026-11-19 par la garde disque (C: descendu à 750 Mo pendant la reconstruction de la copie isolée), puis exécutée entièrement le même jour après redémarrage du poste (C: 4,5 Go libres au départ, garde à 1 000 Mo jamais déclenchée) : reconstruction de la copie, banc 5B complet, 3A adapté, 6A-1 original, 5A original, copie et adapté, composants 2D copie (résultats ci-dessus) ;
  - build officiel `npm run build` réussi le 2026-11-19 : compilation et types valides, aucun avertissement, 53 routes (48 au build du Lot 3C), dont `/campaigns/[id]` et les pages de création et de modification de campagne et de production, 10 pages statiques, `BUILD_ID` présent ; C: au plus bas à 1 459 Mo ;
  - preuves : `D:\radiza-build-tmp\bench5b` (sauvegardes `avant-5b`, `avant-docs-5b`, `avant-docs-5b-final` et `avant-docs-5b-validation`, outils de transformation, bancs et journaux `passe-*`, `rejeux`, `final` dont `build-officiel.log`, sondes `sonde-precedent.cjs` et `sonde-produit.cjs`, mesures `formulaires`, base simulée d'avant le lot `banc-avant`).
* **Validation (2026-11-19)** : lot validé techniquement et vérifié localement par le porteur du projet, sur la base des résultats finaux du 2026-11-19. Décisions associées :
  - bouton « Précédent » du navigateur : limite acceptée provisoirement, conservée comme point connu, à traiter ultérieurement avec des tests dédiés ;
  - `EditProductDrawer` : aucune modification dans ce lot ;
  - migration de protection des dépôts : toujours en attente ; aucune intervention sur Supabase sans autorisation distincte et vérification préalable des privilèges PostgreSQL, des politiques RLS et des accès légitimes ;
  - aucun commit, push ni merge ; aucun déploiement Vercel ; le code du Lot 5B n'est plus modifié.
* **Hors périmètre, constaté le 2026-11-19** : la réserve 4 du Lot 2D (ADR-053, « champs photo masqués à corriger au Lot 5B ») ne figurait pas dans les décisions de l'ADR-058 et n'a pas été traitée par ce lot. D'après le code, le champ fichier reste masqué (`display: none`) et son déclencheur est un `label` non focalisable, donc inatteignable au clavier : bannière (`AdminBannerModal`) et catégorie (`AdminCategoryModal`) de l'administration, logo de la société (`CompanyEditProfileDrawer`), photo du revendeur (`ResellerProfileView`). Le formulaire de production (`ProductionForm`) utilise un vrai bouton. Point à rattacher à un lot ultérieur.

### ADR-062 : Accessibilité des Quatre Contrôles de Téléversement Photo (Sous-lot P UX/UI)
* **Date** : 2026-11-19 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-19 (mission commune P + 6B + 7 autorisée par le porteur du projet le 2026-11-19), en attente de validation finale — implémentation locale, non commitée, aucun déploiement.
* **Contexte** : réserve 4 du Lot 2D (ADR-053), constatée hors périmètre du Lot 5B (ADR-061, « Hors périmètre ») : quatre champs photo s'ouvraient par un `label` non focalisable, donc inatteignable au clavier.
* **Corrections** (aucune règle de préparation ou d'envoi des photos modifiée ; même champ masqué, même `usePhotoForUpload`, mêmes actions serveur) :
  - bannière (`AdminBannerModal`), catégorie (`AdminCategoryModal`), logo de la société (`CompanyEditProfileDrawer`) : le `label` devient un vrai `Button` (variante `outline`, 44 px de haut) qui ouvre le champ masqué ; libellés inchangés (« Sélectionner une photo », « Choisir une image », « Sélectionner une image » ou « Remplacer / Changer l'image ») ; message d'erreur ou de préparation relié par `aria-describedby` quand il est affiché ;
  - photo du revendeur (`ResellerProfileView`) : vrai `button` nommé « Changer la photo de profil », zone de 44 × 44 px autour de la pastille visible, qui garde sa taille ; désactivé pendant un envoi ou une suppression ; effets de survol limités à `motion-safe`.
* **Vérification (2026-11-19)** : typecheck sans erreur ; 128/128 tests unitaires ; banc des formulaires du Lot 2D (copie adaptée 6A-2) 270/270 ; copie isolée reconstruite (`next build`) ; banc P 126/126 sur vrai serveur Next (base simulée) et vrai Chrome, à 390 et 1 280 px, pour chacun des quatre contrôles : plus aucun `label` relié au champ masqué, vrai bouton `type=button`, zone tactile, nom accessible et rôle, centre non recouvert, atteinte par Tab, anneau de focus visible, ouverture du sélecteur de fichiers natif par Entrée, Espace et toucher (preuve : événement `Page.fileChooserOpened` du protocole de débogage, sélecteur intercepté), sélecteur du bon champ (type, formats), fichier choisi, Entrée n'envoie aucun formulaire ; formulaires : fenêtre restée ouverte et aucun envoi avant validation ; photo du revendeur (envoyée dès le choix) : retour affiché après l'envoi. Le sélecteur natif lui-même n'est pas affiché (intercepté par le banc) : son usage réel reste à vérifier sur appareil.
* **Hors périmètre** : `ProductionForm` utilisait déjà un vrai bouton ; aucune autre zone photo modifiée.
* **Rejeu après les Lots 6B et 7 (2026-11-19, contrôle final n° 2)** : banc P 126/126 sur la copie reconstruite avec l'état cumulé P + 6B + 7 ; banc des formulaires du Lot 2D 270/270 ; build officiel (`next build` du script `build`, dans le dossier du projet, sous garde disque) réussi le 2026-11-19 après le contrôle final n° 2 : compilation et types valides, aucun avertissement, 53 routes dont 10 pages statiques (même liste qu'au build du Lot 5B), `BUILD_ID` présent ; C: au plus bas à 1 435 Mo.

### ADR-063 : Navigation, En-têtes, Repères et Cibles Tactiles des Espaces Connectés (Lot 6B UX/UI)
* **Date** : 2026-11-19 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-19 (mission commune P + 6B + 7 autorisée par le porteur du projet le 2026-11-19, décisions D1 à D5 et D9), en attente de validation finale — implémentation locale, non commitée, aucun déploiement. Un écart reste à arbitrer : NAV-06, premier élément des listes à 390 px (voir « Écart restant »).
* **Contexte** : le Lot 6 de l'audit du 2026-11-07 contient des fiches que le Lot 6A (vocabulaire, ADR-055 et ADR-056) n'a pas traitées : NAV-01, NAV-02, NAV-04 à NAV-08, MOB-06, MOB-07, MOB-10, MOB-11, A11-04, A11-07, A11-08, A11-09 et TXT-04. S'y ajoutent deux reports : les tailles de texte des barres de navigation (Lot 3B) et « Commandes », qui dépassait de 1,8 px à 320 px dans la barre basse Revendeur (Lot 6A-1). Le travail des Lots 1 et 6A n'a pas été refait.
* **Décisions appliquées** :
  - **D1 (NAV-01)** : sous 768 px, le bouton du menu tiroir est retiré des espaces Société et Revendeur. Avant le retrait, on a vérifié que la barre basse et sa feuille « Plus » mènent à toutes les destinations du menu latéral. De 768 à 1 023 px, le bouton reste. L'administration, qui n'a pas de barre basse, garde son menu tiroir et n'est pas modifiée.
  - **D2 (NAV-05, NAV-07)** : nouveau bloc « Premiers pas » au tableau de bord Société (`CompanyFirstSteps`). Il compte trois étapes (un produit du catalogue, une production, une campagne), calculées à partir de lectures réelles. Une lecture en échec donne « indisponible », jamais « à faire » ni « fait », et le bloc disparaît quand les trois étapes sont faites. « Tout est à jour » ne s'affiche plus s'il reste une étape ou si une source n'a pas pu être lue. Un graphique n'est masqué que si sa lecture a réussi sans donnée ; s'il reste un seul graphique, il prend toute la largeur. Le tableau de bord suit un nouvel ordre : bandeau compact (NAV-07, sous 640 px), premiers pas, actions urgentes, compteurs, statistiques, graphiques, puis activité récente.
  - **D3 (A11-09)** : les alertes du bandeau du tableau de bord ne tournent plus. Elles forment une liste statique, avec trois alertes visibles et les autres derrière un bouton. Il n'y a plus ni minuterie ni animation. La bannière du fil Revendeur (`FeedHighlightBanner`) s'arrête au survol, au focus clavier et sur demande (bouton pause), et ne défile pas quand le système demande de réduire les animations.
  - **D4 (A11-07)** :
    - lien « Aller au contenu principal » en premier arrêt de tabulation, avec un `<main id="contenu-principal" tabIndex={-1}>` (`SkipLink`) ;
    - pages couvertes : les six pages publiques ou d'authentification (accueil, connexion, inscriptions Société et Revendeur, mot de passe oublié, réinitialisation), la page de choix du profil et les trois espaces connectés ;
    - les onglets de `LandingStorytelling` ne sont pas touchés (Lot 8).
  - **D5 (PRO-04)** : aucune modification. Les fiches F6 et F7 sont conservées, PRO-04 est couvert par le 6A-2, et `rejected` s'affiche déjà « Société inscrite sur la plateforme » (libellé neutre), jamais comme une validation. Aucune action n'est ajoutée.
  - **D9 (MOB-06)** : sous 640 px, `Button`, `Input`, `Select`, les liens et boutons des en-têtes, le lien du logo et les fils d'Ariane font au moins 44 px. Les dimensions ne changent pas à partir de 640 px.
* **Autres corrections** :
  - **En-têtes et titres** :
    - NAV-02 : en-tête commun `PageHeader`, avec un fil d'Ariane `Breadcrumb` dont la racine porte le libellé du menu, sur les listes Société et Revendeur ;
    - A11-04 : un seul `h1` par page (celui de la page ; l'en-tête n'en porte plus) ;
    - NAV-08 : dès 1 024 px, l'en-tête affiche la rubrique ouverte (`sectionTitles.ts`, libellés des menus du 6A-1), car le menu latéral affiche déjà le nom de l'entité.
  - **Titres d'onglet du navigateur (NAV-04)** : un titre par page, selon le modèle « … — Radiza ». Pour les pages client, un `layout.tsx` porte les métadonnées.
  - **Navigation** :
    - texte à 12 px et pastilles à 11 px dans les barres basses et les menus latéraux (report du 3B), focus visible ;
    - « Commandes » entier à 320 px : les cases ont la largeur de leur contenu ;
    - tiroir du menu (MOB-10) à la bonne largeur, sans marge parasite : `cn` ne fusionne pas les classes, le modificateur `!` est donc appliqué à l'appel, sans toucher `Drawer`.
  - **Contenu et lecture mobile** :
    - NAV-06 : les compteurs du bandeau sombre qui doublaient les cartes sont supprimés (campagnes et commandes Société) ;
    - TXT-04 et NAV-06 : les explications générales sont repliées par défaut (`InfoRepliable`) sur sept écrans, avec un texte inchangé ;
    - MOB-07 : les compteurs « Mes demandes » ne sont plus tronqués ; à 320 px, l'icône passe au-dessus du libellé et la disposition est inchangée dès 360 px ; « Total exprimé » est affiché en entier ;
    - MOB-11 : les étapes du suivi de commande Revendeur sont empilées sous 400 px.
  - **Onglets (A11-08)** : le composant `Tabs` (+ `TabPanel`) est accessible : rôles, `aria-selected`, flèches, Début et Fin, un seul onglet atteignable par Tab. Le profil Société l'utilise. La variante `ghost` garde 40 px sur ordinateur.
* **Correctifs trouvés par les contrôles** :
  - lien du logo des en-têtes : 36 px de large, porté à 44 px sous 640 px ;
  - « Converties en commande » coupé sur trois lignes à 320 px ;
  - encadré d'explication des commandes Revendeur resté déplié, désormais replié ;
  - onglets du profil passés de 40 à 36 px sur ordinateur, ramenés à 40 px.
* **Fichiers** : 75 fichiers modifiés, dont 4 retouchés ensuite par le Lot 7, et 9 créés :
  - `CompanyFirstSteps.tsx`, `sectionTitles.ts`, `InfoRepliable.tsx`, `SkipLink.tsx` ;
  - cinq `layout.tsx` de titre (connexion, mot de passe oublié, réinitialisation, inscriptions Société et Revendeur).

  Sauvegarde intégrale de `src` avant le lot : `D:\radiza-build-tmp\bench6b7\avant-6b`. Sauvegarde avant les correctifs : `avant-correctifs-6b`.
* **Vérification (2026-11-19, état cumulé P + 6B + 7, contrôle final n° 2)** :
  - typecheck sans erreur ; 128/128 tests unitaires ; copie isolée reconstruite (`next build`) ;
  - banc 6B (`D:\radiza-build-tmp\bench6b7\e2e6b.cjs`, vrai serveur Next, base simulée, vrai Chrome) à 320, 360, 390, 768, 1 024 et 1 280 px : 930/939. Détail :
    - structure à 1 280 et à 390 px 296/296 chacune : 45 pages (11 publiques, 15 Société, 9 Revendeur, 10 d'administration), avec un seul `h1` placé dans un seul `<main>`, un lien d'évitement en premier élément focalisable, un titre d'onglet propre et aucun débordement ; la fiche publique d'une société et les pages légales sont seulement relevées ;
    - titres d'onglet uniques 4/4 ; lien d'évitement 40/40 ;
    - navigation 21/21 (D1 et destinations de « Plus ») ; tiroir 12/12 ;
    - largeurs 320, 360 et 768 px 31/31 chacune ; 1 024 px 21/21 ;
    - polices des menus latéraux 3/3 ; cibles tactiles 6/6 ;
    - tableau de bord 32/32 (D2 : premiers pas, faux « Tout est à jour », graphiques en panne ou vides) ;
    - listes 64/73 ; étapes 10/10 ; carrousel et mouvement réduit 16/16 ; onglets au clavier 16/16 ;
  - sondes de mise en page avant et après, 45 pages à 390 et 1 280 px : à 390 px, cibles de moins de 44 px de 551 à 397 et `h1` de 2 à 1 sur toutes les pages des espaces connectés ; à 1 280 px, seule différence la hauteur des onglets du profil, corrigée.
* **Écart restant, à arbitrer** :
  - Fiche NAV-06, contrôle « premier élément de la liste dans le premier écran » à 390 px (écran de 740 px, barre basse à 675 px) : 9 échecs.
  - Position du premier élément, en px depuis le haut de l'écran :

    | Page | Position |
    | :--- | ---: |
    | Catalogue Société | 986 |
    | Productions | 966 |
    | Campagnes Société | 691 |
    | Commandes Société | 1 014 |
    | Demandes du marché | 922 |
    | Notifications Société | 806 |
    | Campagnes Revendeur | 743 |
    | Demandes Revendeur | 709 |
    | Commandes Revendeur | 821 (952 avant le correctif) |

  - Le critère n'a pas été assoupli.
  - Pistes, toutes hors des décisions validées :
    - compteurs compacts sur mobile ;
    - recherche et lecture QR des commandes repliées ou déplacées ;
    - cartes avec photo au-dessus ;
    - filtres dans une feuille.
* **Défauts du banc corrigés pendant la vérification**, sans changer d'exigence (v1 à v4 conservées : `e2e6b-v1.cjs` à `e2e6b-v3.cjs`) :
  - la v1 lisait la mauvaise barre de navigation ;
  - la v1 mesurait l'enveloppe plein écran au lieu du panneau du tiroir ;
  - la v1 comptait comme cibles les listes natives masquées de 1 px ;
  - la v1 lisait « TOTAL » en capitales CSS au lieu du texte source ;
  - la v1 exigeait une durée nulle, là où la règle globale de mouvement réduit fixe 0,01 ms ;
  - la v4 suit les libellés du Lot 7.
* **Écarts attendus des bancs de référence** : ils sont dus aux décisions validées, et des copies adaptées ont été écrites (les originaux sont inchangés) :
  - 6A-1 composants original : le tiroir sous 768 px (D1) et « Espace Société » dans l'en-tête dès 1 024 px (NAV-08) ;
  - 6A-1 serveur original : le lien « Retour au tableau de bord » des campagnes Revendeur est remplacé par le fil d'Ariane, et les raccourcis du profil Revendeur sont dans l'onglet « Activité » (Lot 7) ;
  - 3A copie du 5B : le titre de l'en-tête n'est plus un `h1`.

  Résultats des copies : voir « Rejeux ».
* **Rejeux (contrôle final n° 2, état cumulé P + 6B + 7)** :
  - **6A-1 serveur** :
    - original 169/183, dont le périmètre 6A-1 164/178 et les différés 6A-2 5/5. Les 14 échecs viennent tous des décisions validées : 1 du fil d'Ariane (NAV-02), 6 des raccourcis Revendeur désormais dans l'onglet « Activité » (D6) et 7 de l'onglet Société renommé « Activité » (D6) ;
    - copie adaptée 184/184 ;
  - **6A-1 composants** :
    - original 448 réussis et 5 échecs (D1 sous 768 px, et « Espace Société » dans l'en-tête dès 1 024 px, NAV-08) ;
    - copie adaptée 642/642 ;
  - **3A** : copie du 5B 95/100 (le titre de l'en-tête n'est plus un `h1`) ; copie adaptée 100/100 ;
  - **5B** 232/232 ; **5A** adapté 198/198 ;
  - **2D composants** : 270/270 ;
  - **Build officiel (`next build` du script `build`, dans le dossier du projet, sous garde disque) réussi le 2026-11-19 après le contrôle final n° 2 : compilation et types valides, aucun avertissement, 53 routes dont 10 pages statiques (même liste qu'au build du Lot 5B), `BUILD_ID` présent ; C: au plus bas à 1 435 Mo**.

  Défauts des outils corrigés avant ce contrôle :
  - la feuille CSS des bancs de composants n'était pas régénérée ; celle en place datait d'avant le 6B, si bien que le bouton du tiroir restait invisible à 768 px dans le banc seulement ;
  - la copie adaptée appliquait D1 à l'administration, qui n'a pas de barre basse (v1 conservée : `run6a-6b7-v1.mjs`).
* **Hors périmètre, constaté** :
  - `/companies/[id]` n'a pas de `<main>` ;
  - le `h1` de `/terms` et `/privacy` est dans l'en-tête.
* **Complément du 2026-11-19 (NAV-06)** : l'écart restant est traité et vérifié par l'ADR-066 : 27/27 positions conformes à 320, 360 et 390 px, banc 6B v5 959/959. Le présent ADR n'est pas réécrit.

### ADR-064 : Profils Société et Revendeur sur un Modèle Commun, Vocabulaire des Rôles (Lot 7 UX/UI)
* **Date** : 2026-11-19 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-19 (mission commune P + 6B + 7 autorisée par le porteur du projet le 2026-11-19, décisions D6 et D7), en attente de validation finale — implémentation locale, non commitée, aucun déploiement.
* **Contexte** : fiches PRO-02, PRO-03, PRO-05 et PRO-06 de l'audit du 2026-11-07. PRO-04 est couvert par le Lot 6A-2 et la décision D5. Le profil Société cachait la sécurité hors écran sur mobile, et les deux profils suivaient deux modèles différents. Un compte y était présenté comme une information juridique, et les actions étaient mal ordonnées.
* **Décisions appliquées** :
  - **D6 (PRO-02, PRO-03)** : les deux profils suivent le même modèle en quatre sections, « Identité », « Coordonnées », « Activité » et « Sécurité et session », sur le composant `Tabs` du 6B. La nouvelle disposition `layout="grid"` place les onglets sur 2 colonnes et 2 lignes sous 640 px, si bien qu'aucun n'est caché ni coupé. Ils passent sur une ligne au-delà, si la place le permet. L'ancien onglet « Gouvernance & Sécurité », hors écran sur mobile, devient « Sécurité et session », visible dès l'arrivée.
  - **D7 (vocabulaire)** : les formulations validées sont employées là où leur contexte s'y prête :
    - « Inscrite sur Radiza depuis le » (PRO-05, à la place de « Date d'immatriculation ») ;
    - « Informations de la société » (à la place de « Renseignements Juridiques & Système », PRO-05) ;
    - « Responsable du compte » (à la place de « Gérant », « Titulaire » et « Responsable de Compte », en-têtes et cartes) ;
    - « Rôle » (à la place de « Rôle de gouvernance attribué » et « Rôle système attribué ») ;
    - « Propriétaire du compte » (à la place de « Owner (Fondateur de l'exploitation) ») ;
    - « Revendeur » (à la place de « Revendeur (Acheteur Pro) » et « Revendeur Professionnel ») ;
    - « Société » (à la place de « Société / Producteur Agricole ») ;
    - « Gestion des productions et des campagnes » (choix du profil à l'inscription).

    Libellés de champ alignés sur PRO-05 (« aucune information de compte présentée comme juridique ») :
    - « Nom de la société » (à la place de « Raison Sociale Officielle ») ;
    - « Nom complet » ;
    - « Téléphone personnel » ;
    - sous-titre « Titulaire légal habilité à engager l'exploitation » retiré.

    Ces mots ne changent ni les rôles réels (`company`, `reseller`), ni les droits, ni les règles d'inscription. Les adresses `/register/company` et `/register/reseller` sont inchangées.
  - **Profil Société** :
    - « Modifier le profil » passe avant « Copier l'identifiant » (PRO-06 ; la copie reste dans l'en-tête, selon la consigne du lot) ;
    - carte « Règle d'or Radiza » retirée (PRO-06) ;
    - fil d'Ariane commun « Tableau de bord › Profil de la société ».
  - **Profil Revendeur** :
    - la longue page passe en quatre sections. « Identité » contient l'établissement : dénomination, typologie, responsable du compte. « Coordonnées » contient l'e-mail, le téléphone et la carte « Territoire » inchangée. « Activité » regroupe les trois raccourcis « Accès rapides » avec leurs nombres. « Sécurité et session » contient la carte « Compte Utilisateur » (rôle, création du compte, identifiant et copie, « Gérer le mot de passe ») et la déconnexion ;
    - le mot de passe reste dans « Compte Utilisateur » ;
    - le bandeau de chiffres (commandes, demandes, région) est remplacé par la barre d'onglets. Ses valeurs restent affichées dans « Accès rapides » et dans la carte « Territoire » ;
    - fil d'Ariane commun « Tableau de bord › Mon profil » ;
    - « Modifier le profil » passe avant « Territoire » ;
    - cibles de 44 px sous 640 px (boutons « Modifier », copie de l'identifiant).
  - **Commun** : le fil d'Ariane de `PageHeader` est exporté (`Breadcrumb`), car les deux profils gardent leur en-tête propre.
* **Correctif trouvé par les contrôles** : l'onglet « Activité » du profil Revendeur portait un compteur égal à la somme des commandes et des demandes. Or, quand une lecture échoue, la page reçoit 0 pour le nombre manquant (règle préexistante `count || 0`). La somme mêlait donc une valeur réelle et une valeur indisponible, par exemple « 9 » au lieu de 21 quand les commandes ne sont pas lues. Le compteur est retiré. Les deux nombres restent affichés séparément dans « Accès rapides », comme avant le lot.
* **Non modifiés** :
  - règles d'authentification, rôles, droits, actions serveur ;
  - tiroirs de modification : profil, territoire, logo, mot de passe ;
  - fenêtre de déconnexion ;
  - contenu de la carte « Territoire ».
* **Fichiers** : 6 modifiés :
  - `CompanyProfileView.tsx`, `ResellerProfileView.tsx` ;
  - `PageHeader.tsx`, `Tabs.tsx` ;
  - `register/page.tsx`, `OnboardingForm.tsx`.

  Sauvegardes :
  - `D:\radiza-build-tmp\bench6b7\avant-7`, état d'avant le lot ;
  - `avant-correctif-7`, avant le retrait du compteur.
* **Vérification (2026-11-19, contrôle final n° 2)** :
  - typecheck sans erreur ; 128/128 tests unitaires ; copie isolée reconstruite ;
  - banc 7 (`D:\radiza-build-tmp\bench6b7\e2e7.cjs`, vrai serveur Next, base simulée, vrai Chrome, vrais clics et vraies touches) : 374/374. Détail par groupe :
    - **onglets 156/156**, profils Société et Revendeur à 320, 390, 768 et 1 280 px : les 4 onglets nommés, dans l'ordre et visibles en entier ; « Identité » ouverte à l'arrivée ; 2 lignes et 44 × 44 px au moins sous 640 px ; aucun défilement horizontal ; contenu, liens et boutons de chaque section ; mot de passe dans « Compte Utilisateur » ;
    - **clavier 20/20** : flèches, Début, Fin, bouclage, puis Tab vers le panneau, à 390 et 1 280 px ;
    - **terminologie 44/44** : formulations D7 présentes, anciens libellés ciblés absents (toutes sections ouvertes), valeurs du rôle, date d'inscription, en-tête « Responsable du compte : <nom> », espace inchangé ;
    - **ordre 8/8** : « Modifier le profil » en premier dans le code et à l'écran, aux 4 largeurs ;
    - **statuts 20/20** : `verified`, `pending` et `rejected` à 390 et 1 280 px, ainsi qu'un statut absent et un statut inconnu. Seul `verified` affiche « Vérifiée » ; les autres ont le libellé neutre « Société inscrite sur la plateforme », sans mention de rejet ni action ajoutée ;
    - **modifications et sécurité 48/48** : 16 ouvertures (4 actions par profil : modifier le profil, logo ou territoire, mot de passe, déconnexion, à 390 et 1 280 px), chacune comparée au relevé fait avant le lot sur la copie du 6B : mêmes titres, mêmes champs et valeurs, mêmes boutons. « Rester connecté » et Échap ferment sans quitter le profil ;
    - **indisponibilité 66/66** : 21 scénarios (13 Société, 8 Revendeur) comparés au relevé d'avant le lot : normal, base vide, pannes de lecture du profil, de la société ou du revendeur, des provinces, des productions, des campagnes, des commandes, des demandes et des comptages, et cinq statuts de vérification. On y retrouve la même adresse finale, la même erreur générale et aucune donnée ni aucun message perdus. Seules exceptions : les 28 libellés renommés ou retirés par le lot, justifiés un à un dans `pertes-admises-7.json` et tous réellement constatés ;
    - **inscription 12/12** : cartes « Société » et « Revendeur », « Gestion des productions et des campagnes », description de la page, parcours inchangés et formulaire de première connexion ;
  - relevé « après » 37/37 ;
  - build officiel (`next build` du script `build`, dans le dossier du projet, sous garde disque) réussi le 2026-11-19 après le contrôle final n° 2 : compilation et types valides, aucun avertissement, 53 routes dont 10 pages statiques (même liste qu'au build du Lot 5B), `BUILD_ID` présent ; C: au plus bas à 1 435 Mo.
* **Défauts du banc corrigés pendant la vérification**, sans changer d'exigence (versions précédentes conservées, `e2e7-v1.cjs` et `e2e7-v2.cjs`) :
  - en-tête « Responsable du compte : » non trouvé, à cause du `<strong>` du nom ;
  - nom du responsable Revendeur lu alors que « Sécurité et session » était ouverte ;
  - heure des dates de la base simulée, calculée depuis le démarrage du serveur : elle est masquée sur ces seules lignes, le même jour étant exigé ;
  - liste des pertes admises : désormais justifiée ligne par ligne.
* **Limite du banc** : le texte de page enregistré pour les scénarios sans `<main>` (redirection vers `/unauthorized`) perd ses lettres « s ». En effet, `\s` devient `s` dans une chaîne modèle JavaScript (`releve7.cjs`, `e2e7.cjs`). La comparaison reste valable, car la même transformation s'applique avant et après et l'adresse finale est aussi comparée. La page elle-même est correcte (« Accès Non Autorisé »). Le relevé d'avant le lot ne peut pas être refait, car la copie a été reconstruite depuis.
* **Hors périmètre, constaté** : sur le profil Société, le compteur de l'onglet « Activité » additionne les productions, les campagnes et les commandes. Chacun de ces nombres vaut 0 quand sa lecture échoue (`count || 0` dans `dashboard/company/profile/page.tsx`). Ce comportement est antérieur au lot et n'a pas été modifié. Même règle `count || 0` pour les deux nombres du profil Revendeur (`dashboard/reseller/profile/page.tsx`). Point relevant des pannes de lecture (règle des Lots 2A et 2C), à rattacher à un lot ultérieur.
* **Complément du 2026-11-19 (faux zéros)** : sur autorisation du porteur du projet, ce point est corrigé et vérifié par l'ADR-066. Un compteur en panne affiche « Indisponible » avec « Réessayer », jamais 0. Le badge « Activité » n'apparaît que si les trois comptes sont connus. Une panne de lecture de la société n'affiche plus « Exploitation introuvable ». Banc 7 v4 393/393.

### ADR-065 : Régularisation Documentaire des Statuts des Lots UX/UI Antérieurs (Décision D8)
* **Date** : 2026-11-19 | **Statut** : Régularisation documentaire autorisée par le porteur du projet le 2026-11-19 (décision D8 de la mission commune P + 6B + 7) — documentation seule, aucun code, aucune opération Git.
* **Contexte** : plusieurs statuts des docs ne suivaient plus l'état réel. Les lignes des Lots 1 et 2A disaient « non commité » alors que ces lots ont été commités localement. Les Lots 4A, 2B, 6A-2, 5A et 2C avaient été validés sans que les docs le disent.
* **Règle appliquée** : on ajoute, on ne réécrit pas. Les ADR d'origine (048 à 056) et les entrées du changelog restent tels quels. Seule la cellule « Statut » du tableau de `development-status.md` change, car ce tableau décrit l'état courant. Chaque nouveau statut renvoie au présent ADR.
* **Constats** :
  - **Lot 1 (ADR-048)** : validé le 2026-11-09 ; commit local `d51639f` (« UX/UI Lot 1 : lisibilité mobile et libellés »).
  - **Lot 2A (ADR-049)** : validé le 2026-11-09 ; commit local `7031bc7` (« UX/UI Lot 2A : ne plus confondre panne et liste vide »).
  - **Lots 4A (ADR-051) et 2B (ADR-052)** : validés par le porteur du projet le 2026-11-10, d'après le suivi des sessions de ce jour.
  - **Lot 6A-2 (ADR-056)** : validé définitivement le 2026-11-15 ; statut voulu : « validé localement, non commité ».
  - **Lots 5A (ADR-050) et 2C (ADR-054)** : validés le 2026-11-14. Ces validations n'avaient pas été retrouvées dans les docs ni dans le suivi des sessions consulté ; le porteur du projet a confirmé le 2026-11-19 qu'elles avaient bien été prononcées à cette date. Leur état de commit reste non vérifié.
  - **Commit local `439c262`** : il figure dans l'historique local affiché par l'environnement, sous le message « 10 Nov ». Son contenu n'a pas été examiné, faute d'autorisation de lancer une commande Git, même en lecture. Aucun lot ne lui est donc attribué, et l'état de commit des Lots 4A, 2B et 5A reste non vérifié.
  - **Dépôt distant** : la présence de ces commits sur le dépôt distant n'a pas été vérifiée. Rien ne permet de l'affirmer.
* **Complément du 2026-11-19 (Lots 5A et 2C)** : à la demande du porteur du projet, les statuts des Lots 5A et 2C passent de « en attente de validation » à « validé le 2026-11-14 ». Documentation seule : aucun code modifié, aucune opération Git. Le commit `439c262` n'est toujours pas examiné ; aucun lot ne lui est attribué.
* **Complément du 2026-11-19 (en-tête du Lot 6A-2)** : à la demande du porteur du projet, la phrase d'en-tête de `development-status.md` disait encore « Lot 6A-2… en attente de validation finale » ; elle est alignée sur la ligne du tableau : validé le 2026-11-15, local et non commité. Documentation seule.

### ADR-066 : Premier Élément des Listes dans le Premier Écran (NAV-06), Faux Zéros des Profils et Hooks Conditionnels (Suite des Lots 6B et 7)
* **Date** : 2026-11-19 | **Statut** : Terminé techniquement et vérifié localement le 2026-11-19, en attente de validation finale — implémentation locale, non commitée, aucun déploiement. Autorisations du porteur du projet, toutes du 2026-11-19 : arbitrages NAV-06 A à I, puis suite « NAV-06 + corrections ciblées Lot 7 » (légendes, faux zéros, lecture de `companies`, hooks, reconstruction à parallélisme limité), puis deux leviers supplémentaires hors arbitrages A à F, choisis après simulation.
* **Contexte** :
  - l'ADR-063 laissait un écart à arbitrer, NAV-06 : à 390 px, le premier élément de 9 listes était sous le premier écran ;
  - l'ADR-064 relevait hors périmètre la règle `count || 0` des deux pages de profil, qui affiche 0 quand une lecture de compteur échoue ;
  - un `useMemo` était appelé dans un bloc conditionnel de `ResellerDemandsView`.
* **Critère NAV-06 (arbitrage G, non assoupli)** :
  - le bas de la première ligne du premier élément de la liste, plus 16 px, ne dépasse pas le haut de la barre basse ;
  - limite : 675 px, sauf 661 px sur les pages Revendeur à 320 px ;
  - écran de 740 px de haut, mesuré à 320, 360 et 390 px ;
  - aucune donnée ni fonction masquée pour réussir.
* **Décisions appliquées (NAV-06)** :
  - **A, compteurs en double retirés** (même nombre toujours visible dans un filtre ou un onglet) :
    - Notifications Société : 4 cartes ; la puce « Non lues » affiche désormais son nombre même à 0 ;
    - Productions : 4 cartes ;
    - Catalogue produits : « Total Références » et « Produits actifs » ;
    - Commandes Société : « Total », « À valider » et « Livrées » ; « En cours » reste, faute d'onglet équivalent ;
    - Demandes du marché : « Demandes actives ».
  - **Sens des légendes retirées conservé** (décision de la suite), sans renommer les rubriques (principe de l'ADR-055) :
    - puce « Demandes du marché » complétée par « exprimées par les revendeurs » ;
    - puce « Commandes reçues » complétée par « passées par les revendeurs ». Cette formulation reprend le sens de l'ancienne légende « Engagements fermes » (une commande, pas une demande), sans suggérer de garantie commerciale ;
    - catalogue produits : « Actifs : utilisables pour déclarer une production », sous le filtre de statut et relié au bouton « Actifs » (`aria-describedby`). Cette phrase reprend « Prêtes pour déclaration de récoltes ». Elle est conforme au code : `createProductionAction` refuse un produit inactif.
  - **B, compteurs compacts sous 640 px** (nom et valeur gardés ; présentation d'ordinateur inchangée) :
    - cartes plus basses sur le catalogue produits, les campagnes Société, les demandes du marché, les demandes et les commandes Revendeur ;
    - « En cours » des commandes Société : libellé et légende sur une ligne, marge de 10 px, hauteur de ligne de la valeur 24 px ;
    - demandes du marché : « Provinces en demande » et « Produits ciblés » avec libellé et valeur sur une ligne ;
    - commandes Revendeur : seules les légendes qui répétaient la valeur sont retirées (« n commande(s) passée(s) », « n lot(s) réceptionné(s) ») ; les deux autres restent.
  - **C, filtres** :
    - recherche et accès aux filtres sur une ligne : productions, catalogue produits (catégorie), commandes Société, demandes du marché, campagnes Revendeur ; barre de filtres sans cadre sous 640 px sur les demandes Revendeur ;
    - les critères choisis restent visibles et retirables d'un geste : nouveau composant `ui/FiltresActifs.tsx`, une puce « libellé : valeur » par critère, nom accessible « Retirer le filtre … », 44 px sous 640 px ;
    - Commandes Revendeur : pas de regroupement, il nuisait à la lisibilité à 320 px (décision de la suite).
  - **D, explications repliées placées après la liste**, contenu inchangé et toujours consultable :
    - Campagnes Société, Demandes du marché, Campagnes Revendeur, Demandes Revendeur ;
    - Commandes Revendeur, la cinquième page (« Réservation du stock et retrait par QR code »).
  - **E, bloc QR des commandes Société** (`CompanyOrderLookupWidget`) :
    - titre et bouton « Aide » sur une ligne ;
    - le bouton ouvre le texte d'aide, replié par défaut, au mot près (`aria-expanded`, `aria-controls`, 44 px sous 640 px) ;
    - scanner (bouton flottant sous 640 px, bouton intégré au-delà) et saisie du numéro inchangés.
  - **F, catalogue produits** : le titre de la carte passe avant la photo ; informations et actions inchangées.
  - **Leviers supplémentaires**, hors A à F, chiffrés d'abord par simulation dans le navigateur puis autorisés :
    - cartes de demande de Demandes du marché sans double marge intérieure : `Card padding="none"`, la marge `p-4 sm:p-5` interne seule ; la bande colorée revient au bord supérieur ;
    - Commandes Revendeur : 16 px entre les sections sous 640 px, 24 px au-delà.
* **Faux zéros des profils (Lot 7)** :
  - `dashboard/company/profile/page.tsx` et `dashboard/reseller/profile/page.tsx` transmettent `res.error ? null : (res.count ?? 0)` ;
  - 0 n'est affiché que si une lecture réussie le confirme ; les requêtes sont inchangées ;
  - `CompanyProfileView` (productions, campagnes, commandes) et `ResellerProfileView` (commandes, demandes) affichent « Indisponible » à la place du nombre ;
  - `DataUnavailableNotice` en tête de la section « Activité » : « Chiffres d'activité indisponibles » ou « Compteurs indisponibles ». Son bouton « Réessayer » relit le serveur (`router.refresh()`) sans recharger la page ni fermer la section ;
  - profil Société : le badge de l'onglet « Activité » n'apparaît que si les trois comptes sont connus ; il n'affiche plus de somme partielle.
* **Lecture de `companies` (profil Société)** :
  - une panne de lecture affiche l'écran d'erreur de l'espace Société, avec « Réessayer », comme le tableau de bord ;
  - elle n'affiche plus le faux message « Exploitation introuvable » ;
  - le message d'absence reste affiché quand aucune société n'est réellement rattachée.
* **Hooks conditionnels** :
  - `ResellerDemandsView` : les options du filtre Produit sont calculées une fois au niveau du composant (`productOptions`), au lieu de deux `useMemo` dont l'un était dans `{demands.length > 0 && …}` ; plus aucun hook n'est appelé après le `return` ;
  - `MarketDemandsAnalysisView`, trouvé pendant NAV-06 : deux `useMemo` étaient dans le panneau conditionnel des filtres. Ouvrir « Filtres » faisait tomber la page, à 390 comme à 1 280 px (sonde : 0/2 avant). Ils sont sortis du panneau (`productOptions`, `provinceOptions`) ;
  - recherche dans `src` : plus aucun hook passé en attribut JSX.
* **Non modifiés** :
  - requêtes métier, règles métier, RLS, droits, authentification, routes, actions serveur ;
  - libellés des rubriques ;
  - compteurs des gabarits Société, qui renvoient toujours 0 en cas d'échec (voir « Hors périmètre »).
* **Fichiers** : 15 modifiés, 1 créé.
  - NAV-06 et hooks :
    - `CompanyNotificationsView`, `CompanyProductionsView`, `CompanyProductsView`, `CompanyProductCard` ;
    - `CompanyCampaignsView`, `CompanyOrdersView`, `CompanyOrderLookupWidget` ;
    - `MarketDemandsAnalysisView`, `ResellerCampaignsView`, `ResellerDemandsView`, `ResellerOrdersView` ;
    - nouveau composant `ui/FiltresActifs.tsx`.
  - Lot 7 : les deux pages de profil, `CompanyProfileView`, `ResellerProfileView`.

  Sauvegardes : `D:\radiza-build-tmp\bench6b7\avant-nav06` (avant le correctif) et `avant-suite-nav06` (avant la suite).
* **Vérification (2026-11-19, copie isolée reconstruite avec le code final, base simulée, vrai serveur Next, vrai Chrome)** :
  - typecheck sans erreur ; 128/128 tests unitaires ;
  - reconstruction de la copie à parallélisme limité, autorisée (`experimental.cpus` = 1 par la variable `BANC_CPUS`, dans la configuration de la copie seulement ; garde et seuil de 1 000 Mo inchangés) : 4 builds complets, C: au plus bas à 2 553 Mo, garde jamais déclenchée ;
  - **positions réelles, avant puis après**, bas de la 1re ligne en px depuis le haut de l'écran, marge entre parenthèses (`nav06-mesure.cjs`, captures dans `bench6b7\nav06\avant` et `nav06\final`) :

    | Liste | 320 px | 360 px | 390 px |
    | :--- | :--- | :--- | :--- |
    | Catalogue produits | 1 047 (−372) → 644 (31) | 1 024 (−349) → 628 (47) | 1 007 (−332) → 608 (67) |
    | Productions | 1 006 (−331) → 632 (43) | 965 (−290) → 607 (68) | 984 (−309) → 626 (49) |
    | Campagnes Société | 751 (−76) → 621 (54) | 731 (−56) → 601 (74) | 709 (−34) → 579 (96) |
    | Commandes Société | 1 046 (−371) → 658 (17) | 1 029 (−354) → 658 (17) | 1 029 (−354) → 629 (46) |
    | Demandes du marché | 1 023 (−348) → 651 (24) | 1 003 (−328) → 632 (43) | 941 (−266) → 624 (51) |
    | Notifications Société | 829 (−154) → 535 (140) | 825 (−150) → 531 (144) | 825 (−150) → 531 (144) |
    | Campagnes Revendeur | 769 (−108) → 633 (28) | 769 (−94) → 633 (42) | 765 (−90) → 633 (42) |
    | Demandes Revendeur | 855 (−194) → 626 (35) | 746 (−71) → 590 (85) | 731 (−56) → 588 (87) |
    | Commandes Revendeur | 860 (−199) → 642 (19) | 836 (−161) → 618 (57) | 836 (−161) → 602 (73) |

    27/27 conformes, marge la plus faible 17 px (Commandes Société, 320 et 360 px). Étapes : 21/27 après les arbitrages A à F, 24/27 après les compléments B, 27/27 après les deux leviers supplémentaires ;
  - simulation des leviers supplémentaires avant décision (`nav06-leviers.cjs`, présentée comme simulation) : 24, 43 et 51 px projetés pour Demandes du marché, 19 px pour Commandes Revendeur à 320 px. Les mesures réelles sont identiques ;
  - **banc 6B v5** (`e2e6b.cjs`, contrôle NAV-06 durci à 320, 360 et 390 px, v4 conservée) : 959/959, dont NAV-06 30/30 (9 listes et notifications Revendeur) ;
  - **sonde « suite »** (`sonde-suite.cjs`) : 69/69 :
    - bouton Aide 20/20 à 320, 390 et 1 280 px : aide repliée au départ, ouverte au toucher ou au clic avec le texte d'origine au mot près, 44 px sous 640 px, scanner toujours ouvert par « Scanner un QR », recherche par numéro qui obtient une réponse du serveur (la base simulée répond « numéro non valide »), second appui qui replie ;
    - légendes 12/12 ;
    - profil Société 10/10 : nombres réels et badge 23, panne des commandes, des campagnes ou des trois comptes avec « Indisponible » et sans badge, « Réessayer » pendant la panne (rien ne devient 0) puis après rétablissement (relecture sans rechargement, onglet conservé), zéro réel affiché 0 ;
    - lecture de `companies` 6/6 : écran d'erreur, « Réessayer » qui affiche ensuite le profil, témoin sans société qui garde « Exploitation introuvable » ;
    - profil Revendeur 7/7 ;
    - « Mes demandes » 14/14 à 390 et 1 280 px : liste vide, puis non vide, puis vide, puis non vide, sans rechargement complet (relecture du serveur par le routeur, même mécanisme que `router.refresh()`), filtre Produit utilisable, aucune erreur de hooks ;
  - **sonde des filtres de Demandes du marché** : 2/2, panneau ouvert à 390 et 1 280 px avec ses deux listes, sans panne ;
  - **banc 7 v4** : 393/393, dont indisponibilité 85/85 ;
  - sondes du Lot 7 45/45 et 45/45 ; relevé 37/37 ;
  - **rejeux** :
    - 6A-1 serveur : original 169/183, mêmes 14 échecs qu'au contrôle final n° 2 ; copie adaptée 184/184 ;
    - 6A-1 composants : original 448 + 5 échecs attendus ; copie adaptée 642/642 ;
    - 3A : copie du 5B 95/100, comme la référence ; copie adaptée 100/100 ;
    - 5B 232/232 ; 5A adapté 198/198 ; 2D 270/270 ; P 126/126.
* **Défauts des outils corrigés**, sans changer d'exigence (versions précédentes conservées) :
  - banc 7 v3 (`e2e7-v3.cjs`) : 354/374. Ses 20 échecs se répartissent ainsi :
    - 11 viennent du décalage de jour des dates de la base simulée, datées depuis le démarrage du serveur (« 3 mai 2026 » devenu « 4 mai 2026 » en soirée) ;
    - 9 viennent des changements autorisés : faux 0 et sommes partielles « 17 », « 18 », « 11 » disparus, écran d'erreur à la place d'« Exploitation introuvable ».
  - Corrections de la v4 :
    - le jour seul est masqué sur ces dates ;
    - les pertes autorisées sont admises par scénario (`pertes-admises-7-faux-zeros.json`, chaque entrée justifiée et réellement constatée) ;
    - nouveaux contrôles positifs : « Indisponible » et l'avis présents, aucun « Indisponible » quand les comptes sont lus.
  - Sonde des filtres v1 (`sonde-filtres-demandes-v1.cjs`) : elle cherchait « Province de livraison » sans tenir compte des capitales CSS. La v2 lit le libellé sans casse, et exige en plus le panneau visible, `aria-expanded` et les deux listes.
* **Non vérifié** :
  - build officiel (`next build` dans le dossier du projet) non lancé à la fin de la suite. C: n'avait plus que 2 282 Mo libres, alors que ce build en a consommé jusqu'à 3 Go auparavant. Son parallélisme ne peut pas être limité sans modifier la configuration du projet. Un arrêt par la garde aurait laissé le `.next` du projet incomplet. Le code compile en build de production dans la copie isolée (mêmes sources, 4 builds complets), et le typecheck du projet est sans erreur ;
  - la panne de `ResellerDemandsView` d'avant la correction n'a pas été reproduite sur un build. Elle est déduite de la règle des hooks ; seul le comportement corrigé est vérifié ;
  - vraie base et volumes réels : des noms plus longs peuvent changer les marges, la plus faible étant de 17 px ;
  - téléphone réel, Safari et iPhone, polices des appareils, lecteur d'écran.
* **Hors périmètre, constaté, non modifié** :
  - le gabarit Société affiche toujours 0 en cas d'échec pour les commandes en attente et les notifications non lues (`getCompanyPendingOrdersCount`, `getUnreadNotificationCount`) ;
  - la description de « Commandes reçues » dit « Suivez les engagements fermes de vos revendeurs » (exception « engagement ferme » conservée au Lot 6A-2) ;
  - le bouton flottant « Scanner un QR » recouvre le côté droit de la première commande entre 320 et 390 px ; la première ligne reste visible.

### ADR-067 : Lancement de Radiza Mobile — Expo, React Native et TypeScript (Orientation Remplaçant FUT-10) et Décisions Préparatoires D-M1 à D-M8
* **Date** : 2026-11-20 (décisions du porteur du projet sur le rapport du 2026-11-19) | **Statut** : Décidé le 2026-11-20 ; mise en œuvre du socle en cours — local, non commité, aucun déploiement
* **Contexte** :
  - FUT-10 (§19) reportait une application mobile **Flutter**, au motif que le Web responsive couvrait les besoins initiaux. `AGENTS.md` §3.5 interdisait de l'anticiper.
  - Le 2026-11-19, le porteur du projet a lancé Radiza Mobile. Lot 0 (cartographie des API, lecture seule), puis étapes A (mémoire et cartographie du Web) et B (environnement) : `docs/mobile-development-guide.md`.
  - Rapport du 2026-11-19 : deux blocages techniques (Node 25.2.1 exclu par `expo@58` et `react-native@0.88` ; `tsconfig.json` racine qui inclut tout `**/*.ts(x)`) et deux contradictions avec la mémoire (FUT-10, Règle 2).
* **Décisions** :
  - **D-M4 — Technologie (approuvée)** : Radiza Mobile est développée avec **Expo, React Native et TypeScript**, dans `mobile/`, projet indépendant du Web. FUT-10 n'est ni supprimée ni réécrite : elle reste la trace de l'orientation initiale, que la présente décision remplace.
  - **Périmètre** : espaces Société et Revendeur ; l'administration reste exclusivement sur le Web.
  - **D-M3 — Données fictives (refusée)** : la Règle 2 d'`AGENTS.md` s'applique au mobile sans dérogation. Aucun compte, production, commande ni autre jeu de données fictives dans le code client. Interfaces, composants, formulaires, états de chargement, états vides et navigation sont construits sans données fictives.
  - **Données réelles** : la connexion aux vrais comptes et aux données existantes n'intervient qu'après la validation de la sécurité Supabase par le porteur du projet. D'ici là, aucune requête vers Supabase, Vercel ou la production.
  - **D-M1 — Node.js (approuvée)** : Node.js 24 LTS en version portable sur D:, exclusivement pour le projet mobile. L'installation Node.js du Web (v25.2.1) n'est pas modifiée.
  - **D-M2 — `tsconfig.json` racine (approuvée sous condition)** : modification minimale excluant `mobile/` de la vérification TypeScript du Web, après vérification de ses conséquences et de l'absence de problème masqué ; aucune autre configuration modifiée.
  - **D-M5 — Cache npm (approuvée)** : hors de C: pour les installations du mobile.
  - **D-M6 — Dépendances (approuvée sous contrôle)** : seulement celles nécessaires à l'architecture retenue, compatibles avec les versions d'Expo et de React Native retenues ; pas d'installation superflue.
  - **D-M7 — Appareil de test (approuvée)** : un téléphone Android réel avec Expo Go, dont la version doit correspondre au SDK choisi.
  - **D-M8 — Priorité des écrans (approuvée)** : écrans prioritaires du guide (§3), en respectant les parcours existants du Web, après le rapport sur le socle.
* **Règles complémentaires** : consulter la mémoire avant chaque intervention ; documenter les décisions dans les ADR et documents concernés ; ne pas modifier les règles métier sans validation ; ne toucher ni à Supabase, ni aux migrations SQL, ni à Vercel, ni aux données de production ; aucun commit, push ou déploiement ; en cas de blocage technique, s'arrêter et l'expliquer plutôt que contourner une règle.
* **Conséquences** :
  - `PROJECT_CONTEXT.md` §9 (ligne « Application Mobile Flutter ») et `AGENTS.md` §3.5 restent inchangés ; pour le mobile, cet ADR fait foi.
  - Le mobile ne recopie pas les règles métier : ses écrans afficheront les valeurs calculées par le serveur (statut effectif, disponible, éligibilité, totaux par devise).
  - Tant que les données réelles ne sont pas branchées, chaque service mobile répond « non connecté » et l'écran l'indique ; il n'affiche jamais de liste vide à la place d'une donnée non lue (ADR-049, ADR-054).
