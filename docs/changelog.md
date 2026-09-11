# JOURNAL DES MODIFICATIONS (docs/changelog.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*

Toutes les modifications notables apportées à ce projet sont consignées dans ce document de manière chronologique.

## [0.7.0-demands] - 2026-09-11
### Implémentation Complète du Module Demandes et Analyse Territoriale V1 (Phase 6)

#### Ajouté
* **Principe Fondamental et Découplage Métier (Règles d'Or 2 et 3)** :
  - Respect absolu de l'indépendance des concepts : $\text{Demande} \neq \text{Commande} \neq \text{Réservation} \neq \text{Campagne} \neq \text{Stock} \neq \text{Livraison}$.
  - Une demande revendeur exprime un besoin prévisionnel volumique et temporel sans impacter les stocks, sans réserver de lots et sans créer de commande.
  - Découplage territorial total : le revendeur peut émettre un besoin sur n'importe quel territoire géographique (pays, province, ville), indépendamment des zones de livraison couvertes par les entreprises.
* **Sécurisation RLS et Confidentialité Stricte (Migration 12 / ADR-020)** :
  - `supabase/migrations/20260911000012_secure_demands_rls_and_aggregation.sql` :
    * Suppression de la politique ouverte `demands_select` (`status = 'active'`).
    * Restriction d'accès direct sur la table brute `demands` : un revendeur lit uniquement ses propres demandes (`auth.uid() = reseller_id`) et les administrateurs bénéficient d'un accès de supervision.
    * Interdiction d'accès direct aux entreprises sur `/rest/v1/demands` afin de garantir l'anonymat intégral des revendeurs.
    * Vue d'agrégation décloisonnée `v_market_demands_aggregated` accessible aux entreprises authentifiées et utilisateurs publics : fournit les métriques consolidées (`total_demands`, `total_quantity`, `unique_resellers_count`, `min_needed_date`, `max_needed_date`) par produit, pays, province et unité, sans divulguer d'identifiants, téléphones ou notes privées.
* **Couche Applicative et Server Actions (`src/lib/`)** :
  - `src/lib/queries/demands.ts` : `getResellerDemands(resellerId)` pour l'historique personnel et `getAggregatedMarketDemands(filters)` pour l'analyse macro-marché.
  - `src/lib/actions/demands.ts` :
    * `createDemandAction` : Création de besoin avec validation des quantités (> 0), cohérence des dates (`delivery_deadline >= needed_from`), contrôle d'authentification et ciblage optionnel d'exploitation.
    * `updateDemandAction` : Modification sécurisée de ses propres demandes actives.
    * `cancelDemandAction` : Annulation douce (`status = 'cancelled'`) pour préserver l'historique sans impact destructif.
* **Composants d'Interface Dédiés (`src/components/demands/`)** :
  - `DemandStatusBadge.tsx` : Badges visuels de statut (`active`, `converted`, `cancelled`, `expired`).
  - `ResellerDemandCard.tsx` : Carte interactive revendeur avec volume, géographie ciblée, délais, producteur ciblé et actions contextuelles.
  - `DemandFormModal.tsx` : Boîte de dialogue responsive (mobile-friendly) de saisie/modification de besoin avec sélecteur de produit, territoire, dates et mention d'avertissement de non-réservation.
  - `ResellerDemandsView.tsx` : Espace revendeur avec 4 cartouches d'indicateurs dynamiques réels, filtres par statut et recherche live, et état vide soigné sans mock data.
  - `MarketDemandsAnalysisView.tsx` : Espace d'intelligence économique pour les entreprises agricoles présentant les volumes demandés par produit et province, note de confidentialité, indicateurs de tendance et filtres géographiques.
* **Pages et Routes Déployées** :
  - `src/app/dashboard/reseller/demands/page.tsx` : Gestion et suivi des besoins par le revendeur.
  - `src/app/dashboard/company/demands/page.tsx` : Vue d'analyse de marché macroscopique pour l'entreprise agricole.
  - `src/app/dashboard/reseller/page.tsx` : Activation du module "Mes Demandes" (statut Actif).
  - `src/components/dashboard/AppSidebar.tsx` : Retrait du badge "Phase 6" sur les liens Revendeur et Entreprise.
* **Suite de Tests de Validation (`supabase/tests/phase6_demands_test.sql`)** :
  - Tests transactionnels validant les contraintes de base de données, la non-création d'artefacts tiers (0 stock, 0 campagne, 0 commande), le recalcul dynamique des agrégats dans la vue et l'isolation RLS.

---

## [0.6.0-productions] - 2026-09-10
### Implémentation Complète de la Gestion des Productions V1 (Phase 5)

#### Ajouté
* **Principe Fondamental et Séparation Métier (Règle d'Or 3)** :
  - Respect strict de la dissociation : $\text{Produit} \neq \text{Production} \neq \text{Récolte} \neq \text{Stock} \neq \text{Campagne} \neq \text{Commande}$.
  - La quantité saisie est strictement une **quantité planifiée** (`expected_quantity`), sans aucun impact sur les stocks physiques ni génération de lots ou de campagnes.
* **Liaison Obligatoire au Produit d'Exploitation** :
  - Rattachement obligatoire à un produit actif de l'entreprise (`company_products` et `products`).
  - Validation serveur empêchant la déclaration d'une culture sur un produit non autorisé ou inactif.
* **Couche Applicative et Server Actions (`src/lib/`)** :
  - `src/lib/queries/productions.ts` : `getCompanyProductions(companyId)` avec jointure produit et nom coutumier, et `getProductionById(productionId, companyId)`.
  - `src/lib/actions/productions.ts` : Server Actions sécurisées avec contrôles d'accès :
    * `createProductionAction` : Déclaration de cycle avec upload photo vers `public-assets/productions/*` (ou fallback visuel catalogue), validation des dates (`period_end >= period_start`), de la quantité positive (> 0) et des statuts autorisés.
    * `updateProductionAction` : Mise à jour des informations culturales, localisation et volumes prévisionnels sans modification de propriété (`company_id`).
    * `updateProductionStatusAction` : Transitions de statut (`draft`, `planned`, `growing`, `harvested`, `cancelled`).
    * `toggleProductionVisibilityAction` : Contrôle de la visibilité publique (`is_public = true/false`).
* **Composants d'Interface Dédiés (`src/components/productions/`)** :
  - `ProductionStatusBadge.tsx` : Badges visuels élégants pour chaque statut du cycle cultural.
  - `ProductionCard.tsx` : Carte responsive avec visuel réel, étiquette de visibilité revendeurs, indicateur "Volume prévisionnel" et actions.
  - `ProductionFormModal.tsx` : Modale/drawer responsive (optimisée mobile) pour la création et modification avec sélection de produit, champs de période, localisation, photo et rappel du principe de planification.
  - `CompanyProductionsView.tsx` : Vue principale interactive avec 4 cartouches de statistiques réelles, filtres combinés par statut et par produit, recherche live et état vide soigné (*Règle d'Or 2*).
  - `ProductionDetailView.tsx` : Fiche détaillée de la production (`/dashboard/company/productions/[id]`) avec rappel d'intégrité, prévisions culturales et pilotage du cycle de vie.
* **Pages et Routes Déployées** :
  - `src/app/dashboard/company/productions/page.tsx` : Page serveur de listing des productions réelles.
  - `src/app/dashboard/company/productions/[id]/page.tsx` : Route dynamique de consultation de fiche détaillée.
  - `src/app/dashboard/company/page.tsx` : Activation du module Productions (statut "Actif" et liaison directe).
  - `src/components/dashboard/AppSidebar.tsx` : Retrait du badge "Phase 5" sur le lien Productions & Récoltes.
* **Suite de Tests de Validation (`supabase/tests/phase5_productions_test.sql`)** :
  - Test transactionnel validant les contraintes DB (quantité positive, cohérence des dates, statuts autorisés), l'absence absolue de création automatique de stock ou de campagne, les transitions de statut et le nettoyage intégral.

---

## [0.5.0-products] - 2026-09-10
### Implémentation Complète de la Gestion des Produits V1 (Phase 4)

#### Ajouté
* **Migration Supabase / PostgreSQL (Migration 11)** :
  - `20260910000011_products_company_management.sql` :
    * Politique RLS `products_company_insert` autorisant les rôles `company` et `admin` à insérer des denrées actives dans le catalogue `products`.
    * Procédure stockée `public.create_custom_product_and_associate` (`SECURITY DEFINER`) avec contrôle d'authentification (`auth.uid() IS NOT NULL`), appartenance d'entreprise (`is_company_member`), normalisation (`TRIM` et réduction d'espaces) et recherche insensible à la casse (`LOWER(name) = LOWER(v_clean_name)`).
    * En cas de correspondance dans le catalogue national, réutilisation de l'ID existant et association sans duplication.
* **Couche Applicative et Server Actions (`src/lib/`)** :
  - `src/lib/queries/products.ts` : Fonctions d'extraction du catalogue national (`getCatalogProducts`) et des produits associés à l'exploitation (`getCompanyProducts`).
  - `src/lib/actions/products.ts` : Server Actions sécurisées avec gestion d'erreurs et revalidation de chemin (`associateCatalogProductAction`, `createAndAssociateProductAction`, `updateCompanyProductAction`, `toggleCompanyProductStatusAction`).
  - Intégration de l'upload d'images vers le bucket Supabase Storage `public-assets/products/*`.
* **Composants d'Interface Dédiés (`src/components/products/`)** :
  - `AddProductModal.tsx` : Boîte de dialogue modale à double volet (Recherche et sélection dans le catalogue / Création d'une nouvelle denrée absente).
  - `EditProductModal.tsx` : Boîte de dialogue de personnalisation du nom coutumier et de la description d'exploitation.
  - `CompanyProductsView.tsx` : Vue réactive principale avec recherche instantanée, filtres par catégorie et statut, dialogue de confirmation, et état vide soigné invitant à l'ajout.
* **Mise à Jour de la Navigation et Espaces** :
  - `src/app/dashboard/company/products/page.tsx` : Rendu serveur intégré de l'espace produits connecté directement à Supabase.
  - `src/components/dashboard/AppSidebar.tsx` : Activation définitive du lien "Mes Produits" dans l'espace exploitation.
  - `src/components/SubmitButton.tsx` : Prise en charge de la propriété `disabled`.
  - `package.json` : Optimisation du script de build Next.js avec allocation mémoire Node.js `--max-old-space-size=4096`.
* **Suite de Tests de Validation (`supabase/tests/phase4_test.sql`)** :
  - Couverture complète des 14 scénarios imposés (états vides réels, association catalogue, ajout nouveau produit via RPC, isolation multi-entreprises, restriction revendeur, blocage anonyme, validation des données, et nettoyage intégral sans mock data).

#### Respect des Contraintes
* Règle d'Or 1 : Aucune création de production, récolte, volume ou stock couplée aux produits.
* Règle d'Or 2 : Zéro donnée fictive ("No Mock Data") dans les interfaces et la base de données.
* Règle d'Or 3 : Séparation stricte et pérenne entre l'entité Référentiel (`products`) et l'entité Association (`company_products`).

---

## [0.4.0-ui] - 2026-09-09
### Implémentation Complète des Interfaces et des Espaces Utilisateurs V1 (Phase 3)

#### Ajouté
* **Système de Composants UI Partagés (`src/components/ui/`)** :
  - `Badge.tsx` : Badges visuels contextuels (`forest`, `earth`, `neutral`, `success`, `warning`).
  - `Card.tsx` : Conteneurs de cartes modernes et épurés avec styles d'ombres réactifs.
  - `EmptyState.tsx` : Composant de restitution des états vides avec mention explicite du jalonnement futur et appel à l'action.
  - `PageHeader.tsx` : En-têtes hiérarchisés avec titres, descriptions, badges de statut et boutons d'action.
  - `StatCard.tsx` : Cartes métriques connectées aux données réelles de la base (comptabilisation exacte sans simulation).
* **Architecture des Layouts Partagés (`src/components/dashboard/`)** :
  - `AppSidebar.tsx` : Barre latérale avec navigation filtrée par rôle (`company`, `reseller`, `admin`), détection de route active, badges de phase future et cartouche d'identité utilisateur.
  - `AppHeader.tsx` : En-tête supérieur responsive avec déclencheur de menu mobile (hamburger), identité de marque, localisation pivot et bouton de déconnexion rapide via Server Action.
  - `DashboardLayout.tsx` : Enveloppe client gérant l'état du menu mobile et la grille responsive desktop/mobile.
* **Espace Entreprise Agricole (`/dashboard/company`)** :
  - `src/app/dashboard/company/layout.tsx` : Contrôle RBAC d'accès et injection des données d'exploitation.
  - `src/app/dashboard/company/page.tsx` : Tableau de bord principal avec cartouche d'exploitation, statut de vérification, 4 métriques réelles (0 produits, 0 productions, 0 campagnes, 0 commandes) et états vides soignés.
  - `src/app/dashboard/company/profile/page.tsx` : Fiche détaillée de l'exploitation agricole (raison sociale, slug, description, contact et implantation territoriale RDC).
  - Sous-pages modulaires jalonnées avec état vide explicite : `products/` (Phase 4), `productions/` (Phase 5), `demands/` (Phase 6), `campaigns/` (Phase 9), `orders/` (Phase 10).
* **Espace Revendeur (`/dashboard/reseller`)** :
  - `src/app/dashboard/reseller/layout.tsx` : Contrôle RBAC d'accès et injection des données revendeur.
  - `src/app/dashboard/reseller/page.tsx` : Tableau de bord principal avec badge du territoire d'opération pivot, typologie d'achat et métriques réelles.
  - `src/app/dashboard/reseller/profile/page.tsx` : Fiche profil revendeur mettant en valeur le territoire clé d'éligibilité aux campagnes.
  - Sous-pages modulaires jalonnées avec état vide explicite : `feed/` (Phase 7), `demands/` (Phase 6), `orders/` (Phase 10).
* **Espace Administrateur (`/dashboard/admin`)** :
  - `src/app/dashboard/admin/layout.tsx` : Contrôle strict du rôle administrateur.
  - `src/app/dashboard/admin/page.tsx` : Vue générale du système avec comptage réel des enregistrements sur 7 tables de la base de données et audit de sécurité RLS 100%.
  - Sous-pages modulaires de modération et supervision : `companies/`, `resellers/`, `products/`, `productions/`, `demands/`, `campaigns/`, `orders/`.
* **Tests de Validation (`supabase/tests/phase3_test.sql`)** :
  - Validation de l'intégrité relationnelle, des requêtes des 3 dashboards et nettoyage complet post-test (0 résidu).

#### Respect des Contraintes
* Règle d'Or 1 : Aucune création de production couplée aux interfaces d'onboarding.
* Règle d'Or 2 : Zéro donnée fictive ("No Mock Data") dans les interfaces, états vides élégants et soignés.

---

## [0.3.0-auth] - 2026-09-09
### Implémentation Complète de l'Authentification, des Profils et des Rôles V1 (Phase 2)

#### Ajouté
* **Migration Supabase / PostgreSQL (Migration 10)** :
  - `20260909000010_auth_roles_and_registration.sql` :
    * Trigger `check_profile_creation_role` interdisant l'auto-attribution du rôle `admin`.
    * Trigger `prevent_profile_role_escalation` protégeant la table `profiles` contre toute modification frauduleuse du champ `role`.
    * Trigger `handle_new_company_created` assignant automatiquement le créateur comme `owner` dans `company_members` (BR-COMP-05).
    * Trigger `handle_new_user_registration` sur `auth.users` synchronisant les profils et les entités spécifiques (`companies`, `resellers`) de façon atomique.
    * Ajustement de la politique RLS `company_members_manage` pour intégrer le créateur.
* **Projet Web Next.js 14+ / TypeScript / Tailwind CSS** :
  - Initialisation de la structure App Router dans `src/` avec `@supabase/ssr` et `@supabase/supabase-js`.
  - Helpers SSR : `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`.
  - Middleware racine `middleware.ts` pour la persistance de session et la protection des espaces RBAC (`/dashboard/company`, `/dashboard/reseller`, `/dashboard/admin`).
  - Server Actions d'authentification : `src/lib/actions/auth.ts` (`loginAction`, `registerCompanyAction`, `registerResellerAction`, `logoutAction`).
  - Requêtes de géographie dynamique : `src/lib/queries/geography.ts` (`fetchCountries`, `fetchProvinces`, `fetchCities`).
  - Composants interactifs : `GeographySelector.tsx`, `SubmitButton.tsx`.
* **Interfaces Utilisateur Déployées (UI Auth Exclusive)** :
  - `src/app/page.tsx` : Page d'accueil présentant les deux espaces acteurs et orientant les flux d'inscription.
  - `src/app/login/page.tsx` : Page de connexion avec gestion des erreurs et redirection automatique selon le rôle.
  - `src/app/register/page.tsx` : Page de sélection du profil d'acteur (Entreprise vs Revendeur).
  - `src/app/register/company/page.tsx` : Formulaire d'inscription entreprise avec sélection géographique réelle et upload optionnel de logo vers Supabase Storage (`public-assets/logos/*`).
  - `src/app/register/reseller/page.tsx` : Formulaire d'inscription revendeur avec typologie commerciale et territoire d'opération pivot.
  - `src/app/dashboard/company/page.tsx` : Espace d'accueil minimal entreprise (confirmation Phase 2, statut owner, bouton déconnexion).
  - `src/app/dashboard/reseller/page.tsx` : Espace d'accueil minimal revendeur (confirmation Phase 2, territoire, bouton déconnexion).
  - `src/app/dashboard/admin/page.tsx` : Espace d'accueil minimal administrateur (confirmation Phase 2, bouton déconnexion).
  - `src/app/unauthorized/page.tsx` : Page d'erreur d'accès non autorisé.
* **Suite de Tests de Validation** :
  - `supabase/tests/phase2_test.sql` : Validation intégrale des 17 scénarios A à Q (création compte, profil, compagnie, owner, revendeur, territoire pivot, connexions, déconnexion, isolation RBAC, étanchéité RLS, blocage strict de l'escalade admin, gestion d'erreurs, rafraîchissement de session et nettoyage total à 0 donnée résiduelle).

#### Respect des Contraintes
* Aucun produit, production, campagne, demande ou commande fictive n'a été créé (Règle d'Or 1 et Règle d'Or 2).
* Nettoyage intégral post-test : base propre à 0 donnée fictive résiduelle.

---

## [0.2.0-db] - 2026-09-09
### Implémentation Complète de la Database V1 (Phase 1)

#### Ajouté
* **Migrations Supabase / PostgreSQL (9 migrations ordonnées)** :
  1. `20260909000001_create_extensions_and_geography.sql` : Extensions `uuid-ossp`, `pgcrypto`, trigger `update_updated_at_column`, tables `countries`, `provinces`, `cities` et référentiel officiel RDC (26 provinces).
  2. `20260909000002_create_identity_and_actors.sql` : Tables `profiles`, `companies`, `company_members`, `resellers` et fonctions helpers `current_user_role`, `is_company_member`, `is_company_admin_or_owner`.
  3. `20260909000003_create_products_and_productions.sql` : Tables `products`, `company_products`, `productions` avec contraintes CHECK de périodes et de volumes.
  4. `20260909000004_create_demands_and_analysis.sql` : Table `demands` et vue SQL décloisonnée `v_market_demands_aggregated`.
  5. `20260909000005_create_campaigns_and_delivery_zones.sql` : Tables `campaigns` et `campaign_delivery_zones` avec contraintes de dates et seuils minimaux.
  6. `20260909000006_create_orders_reservations_and_audit.sql` : Tables `orders`, `order_items`, `stock_reservations` et `audit_logs`.
  7. `20260909000007_create_reservation_rpc_and_logic.sql` : Procédures stockées `create_order_with_reservation` (verrouillage pessimiste `FOR UPDATE`), `cancel_order_and_release_reservation` et `get_campaign_stock_summary`.
  8. `20260909000008_create_rls_policies.sql` : Politiques Row Level Security activées et configurées sur les 17 tables publiques.
  9. `20260909000009_create_storage_buckets.sql` : Configuration des buckets `public-assets` et `private-documents` avec politiques d'accès sur `storage.objects`.
* **Tests de Validation** :
  - Script `supabase/tests/database_test.sql` validant les 14 scénarios minimaux (profils, productions, demandes, vue agrégée, campagnes, commande valide, réservation de stock, rejet de sur-réservation, rejet de zone inéligible, annulation/restitution, nettoyage total).

---

## [0.1.0-doc] - 2026-09-09
### Initialisation de la Memory Bank V1 (Phase 0)
* Initialisation des règles d'or (`AGENTS.md`), du cadrage V1 (`PROJECT_CONTEXT.md`), des règles métier (`docs/business-rules.md`), du modèle relationnel cible (`docs/data-model.md`), de la sécurité (`docs/security-rules.md`), des décisions d'architecture (`docs/decisions-log.md`) et du statut de développement (`docs/development-status.md`).
