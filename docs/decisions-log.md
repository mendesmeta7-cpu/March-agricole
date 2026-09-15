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

## 12. DÉCISIONS DE REPORT FONCTIONNEL (FONCTIONNALITÉS FUTURES)

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


