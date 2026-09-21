# JOURNAL DES MODIFICATIONS (docs/changelog.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*

Toutes les modifications notables apportées à ce projet sont consignées dans ce document de manière chronologique.

## [1.2.0-catalog-feed] - 2026-09-21
### Catalogue Global Admin, Produits Société, Photos Indépendantes et Flux Revendeur (Phase 14)

#### Ajouté & Amélioré
* **Découplage Strict Catalogue Global vs Configurations d'Exploitation** :
  - `products.is_global` (`BOOLEAN NOT NULL DEFAULT FALSE`) et `products.created_by_company_id` (`UUID REFERENCES companies(id)`).
  - Semence d'un catalogue officiel de référence de 73 produits agricoles couvrant 7 filières (Céréales, Tubercules, Légumes, Fruits, Légumineuses, Oléagineux, Cultures de rente).
  - Index d'unicité partiels : `idx_products_global_name_unique` sur les produits globaux et `idx_products_custom_name_unique` par entreprise pour les produits privés.
* **Indépendance Totale des Photos Officielles et Personnalisées** :
  - Colonne `company_products.image_url` dédiée : la photo téléversée par une entreprise reste confinée à son exploitation et n'altère jamais la photo officielle du catalogue (`products.image_url`).
  - Déploiement du trigger `trg_protect_global_product_images` interdisant toute modification des photos globales par les utilisateurs non-administrateurs.
  - Priorisation en cascade lors de la création d'une production : photo spécifique téléversée > photo d'exploitation (`company_products.image_url`) > photo officielle du catalogue (`products.image_url`).
* **Parcours d'Ajout de Produit en Deux Étapes (`/dashboard/company/products`)** :
  - Étape 1 : Recherche instantanée dans le catalogue officiel de référence ; si absent, proposition claire de création d'un produit privé hors-catalogue.
  - Étape 2 : Configuration d'exploitation avec dénomination locale, unité de mesure, notes agronomiques, et photo personnalisée (avec prévisualisation par défaut du visuel de référence).
* **Espace d'Administration du Catalogue Dédié (`/dashboard/admin/products`)** :
  - Création du compte administrateur dédié `admin@marcheagricole.cd`.
  - Interface complète d'administration : ajout, édition, activation/désactivation de produits de référence officiels avec téléversement de photos officielles.
  - Connexion via la route standard `/login` sans exposition d'accès admin sur la vitrine publique.
* **Flux des Productions comme Accueil Revendeur (`/dashboard/reseller`)** :
  - Remplacement de la page statique de statistiques par le flux direct des productions réelles (`FeedView`).
  - Filtrage dynamique avec barre de recherche, pills scrollables horizontalement pour les catégories sur mobile, filtres par province et statut cultural.
  - Redirection automatique de `/dashboard/reseller/feed` vers `/dashboard/reseller` et mise à jour de la barre latérale de navigation.
* **Validation & Homologation** :
  - Typecheck TypeScript (`npx tsc --noEmit`) : 0 erreur.
  - Suite de tests SQL (`supabase/tests/phase14_catalog_and_feed_test.sql`) validée avec succès sur la base de données.
  - Intégrité absolue des données existantes (Entreprise Mendes meta, produit Manioc doux, production de Matadi).

---

## [1.1.0-stab] - 2026-09-16
### Stabilisation et Corrections Post-Validation V1 (Phase 12)

#### Modifié & Corrigé
* **Harmonisation Multi-Tenant des Server Actions (`src/lib/actions/`)** :
  - Standardisation de l'identification de l'exploitation via la fonction helper `getCompanyIdForUser` dans `products.ts`, `productions.ts`, `campaigns.ts` et `company.ts`.
  - Prise en charge transparente et conjointe des membres rattachés via `company_members` (rôles `owner`, `admin`, `member`) et du créateur direct `companies.created_by`.
  - Correction du bug résiduel de nommage de variable `company.id` vers `companyId` dans `associateCatalogProductAction`.
* **Convivialité des Exceptions SQL (`src/lib/actions/orders.ts`)** :
  - Interception des erreurs de contraintes PostgreSQL levées par la fonction RPC `create_order_with_reservation` et mapping en messages métier compréhensibles pour l'utilisateur final.
* **Durcissement des Autorisations Profil Entreprise (`src/lib/actions/company.ts`)** :
  - Autorisation de modification du profil de l'exploitation étendue aux administrateurs et owners enregistrés dans `company_members`.
* **Bilan de Non-Régression & Homologation** :
  - Typecheck TypeScript (`npx tsc --noEmit`) : 0 erreur.
  - Build Next.js 14+ de production (`npm run build`) : 30 routes générées sans avertissement bloquant.
  - Zéro donnée fictive (Règle d'Or 2 certifiée).
  - Classification finale : **Classe A — STABLE (Prête pour Expérimentation)**.
  - Création du rapport officiel `docs/v1-stabilization-report.md`.

---

## [1.0.0-v1] - 2026-09-16
### Homologation Globale, Audit RLS et Validation Finale V1 (Phase 11)

#### Validé et Certifié
* **Audit de Sécurité et Confidentialité RLS** :
  - Audit complet sur les 17 tables du schéma public : Row Level Security 100% actif et étanche.
  - Triggers PostgreSQL de protection anti-escalade (`role = 'admin'` rigoureusement verrouillé).
  - Fonctions d'aide `SECURITY DEFINER` sécurisées sans risque de récursion (`current_user_role`, `is_company_member`, `is_company_admin_or_owner`).
  - Zéro secret ou clé sensible (`service_role`) exposé dans les bundles Next.js publics.
* **Suite de Tests Transactionnels Globale (`supabase/tests/phase11_final_validation_test.sql`)** :
  - 11 suites de tests automatisées validées à 100% sur Supabase :
    1. Auth & Triggers anti-escalade de rôle.
    2. Distinction catalogue `products` vs `company_products` et création RPC avec anti-doublon normalisé.
    3. Cycle cultural des productions et étanchéité de visibilité feed (brouillons strictement privés).
    4. Demandes revendeurs avec analyse macroscopique décloisonnée et anonymat RLS absolu.
    5. Création de campagnes commerciales sans altération de production ni réservation prématurée.
    6. Rejet strict des commandes hors territoires de livraison desservis.
    7. Passation de commande, réservation atomique et snapshot contractuel immuable du prix unitaire.
    8. Concurrence et anti-surbooking absolu sous verrouillage transactionnel pessimiste `FOR UPDATE`.
    9. Annulation de commande et libération instantanée du stock dans la disponibilité.
    10. Isolation RLS multi-tenant étanche (Entreprise A vs B, Revendeur A vs B).
    11. Intégrité référentielle et protection contre les suppressions destructives (`ON DELETE RESTRICT`).
* **Validation Technique & Build** :
  - Typecheck TypeScript (`npx tsc --noEmit`) : 0 erreur.
  - Build de production Next.js 14+ (`npm run build`) : 30 routes générées et optimisées avec succès.
* **Respect Absolu des 4 Règles d'Or** :
  - Règle 1 : Séparation stricte Inscription / Production.
  - Règle 2 : Zéro donnée fictive (No Mock Data). L'application s'appuie exclusivement sur la base réelle avec des états vides élégants.
  - Règle 3 : Séparation stricte des 5 entités : $\text{Produit} \neq \text{Production} \neq \text{Demande} \neq \text{Campagne} \neq \text{Commande} \neq \text{Réservation} \neq \text{Livraison}$.
  - Règle 4 : Discipline opérationnelle et respect intégral du périmètre de la V1 Expérimentale.

---

## [0.11.0-orders] - 2026-09-15
### Implémentation Complète des Commandes et de la Réservation de Stock V1 (Phase 10)

#### Ajouté
* **Principe Fondamental et Séparation des Entités (Règles d'Or 2 et 3)** :
  - Respect absolu de l'indépendance des concepts : $\text{Production} \neq \text{Campagne} \neq \text{Commande} \neq \text{Réservation} \neq \text{Livraison}$.
  - Une commande matérialise un engagement contractuel ferme passé par un revendeur sur une campagne ouverte.
  - La réservation de stock est un enregistrement transactionnel atomique bloquant une part de la quantité commercialisable.
  - Absence intégrale de données fictives (*Règle d'Or 2*) : l'état des stocks disponibles et le calcul des totaux s'appuient exclusivement sur les requêtes réelles exécutées en base.
* **Procédures Stockées Atomiques et Anti-Surbooking (`supabase/migrations/20260915000013_enhance_orders_and_reservations_rpc.sql`)** :
  - Procédure `public.create_order_with_reservation` (`SECURITY DEFINER`) :
    * Contrôle de statut de la campagne (`active`), de validité des dates (`start_date <= CURRENT_DATE` et `end_date >= CURRENT_DATE`).
    * Contrôle d'éligibilité territoriale : vérification de la présence de `delivery_province_id` dans `campaign_delivery_zones`.
    * Verrouillage pessimiste atomique (`SELECT ... FOR UPDATE`) sur la campagne évitant toute collision concurrente.
    * Calcul en temps réel du stock disponible : $\text{marketable\_quantity} - \sum(\text{réservations actives})$. Rejet si $\text{quantité} > \text{disponible}$ ou $\text{quantité} < \text{min\_order\_quantity}$.
    * Insertion atomique de `orders` avec numéro généré `ORD-YYYYMMDD-XXXX`, de `order_items` avec snapshot immuable de `unit_price`, et de `stock_reservations` (`status = 'active'`).
  - Procédure `public.cancel_order_and_release_reservation` (`SECURITY DEFINER`) :
    * Annulation de commande (`status = 'cancelled'`) et libération immédiate de la réservation associée (`status = 'released'`), restituant le stock instantanément.
  - Procédure `public.get_campaign_stock_summary` :
    * Calcul agrégé `marketable_quantity`, `reserved_quantity` et `available_quantity`.
* **Couche Applicative et Server Actions (`src/lib/`)** :
  - `src/lib/queries/orders.ts` : `getResellerOrders`, `getResellerOrderById`, `getCompanyOrders`, `getCompanyOrderById`, `getCampaignAvailableStock`.
  - `src/lib/actions/orders.ts` : `createOrderAction`, `cancelOrderAction`, `updateOrderStatusAction`.
  - `src/lib/queries/campaigns.ts` : calcul dynamique du stock restant disponible sur les campagnes.
* **Composants d'Interface Dédiés (`src/components/orders/` & `src/components/campaigns/`)** :
  - `OrderStatusBadge.tsx` : badges visuels distinctifs pour chaque statut (`pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`).
  - `OrderFormModal.tsx` : modal de commande avec vérification de stock dynamique, sélection de province de livraison filtrée par zone autorisée, calcul automatique du montant et notes.
  - `ResellerOrderCard.tsx` : carte de suivi revendeur avec volume, exploitation productrice, date et statut.
  - `ResellerOrdersView.tsx` : espace revendeur avec compteurs dynamiques réels, filtres et état vide sans fausses données.
  - `ResellerOrderDetailView.tsx` : vue unitaire de commande revendeur avec traçabilité du cycle de statut et action d'annulation.
  - `CompanyOrdersView.tsx` : espace de gestion des commandes reçues avec statistiques de ventes, filtres et recherche.
  - `CompanyOrderDetailView.tsx` : vue unitaire de traitement des commandes reçues avec changement de statut et coordonnées de livraison.
  - `ResellerCampaignCard.tsx` : affichage du volume restant disponible et bouton d'action "Commander" ouvrant la modal.
* **Pages et Navigation Déployées** :
  - `src/app/dashboard/reseller/orders/page.tsx` & `[id]/page.tsx` : suivi des commandes passées par le revendeur.
  - `src/app/dashboard/company/orders/page.tsx` & `[id]/page.tsx` : gestion des commandes reçues par l'entreprise.
  - `src/components/dashboard/AppSidebar.tsx` : retrait des badges Phase 10 sur les liens Commandes.
  - `src/app/dashboard/company/page.tsx` : activation de la carte module Commandes Reçues.
* **Suite de Tests de Validation (`supabase/tests/phase10_orders_and_reservations_test.sql`)** :
  - 8 tests transactionnels validés à 100% sur Supabase : commande normale + snapshot du prix, anti-surbooking sous concurrence, rejet territoire inéligible, rejet quantités invalides, rejet campagne expirée/brouillon, immuabilité du prix contractuel, annulation et libération de stock, étanchéité RLS multi-tenant.

---

## [0.10.0-campaigns] - 2026-09-15
### Implémentation Complète des Campagnes Commerciales V1 (Phase 9)

#### Ajouté
* **Principe Fondamental et Séparation Métier (Règles d'Or 2 et 3)** :
  - Respect absolu de l'indépendance des concepts : $\text{Production} \neq \text{Campagne} \neq \text{Commande} \neq \text{Stock} \neq \text{Réservation}$.
  - Une campagne commerciale matérialise une offre de vente ferme émise par une entreprise agricole, adossée obligatoirement à une production réelle de son exploitation.
  - La création d'une campagne ne réserve aucun stock, ne décrémente aucun volume et ne génère aucune commande.
  - **Scénario 30 (Indépendance Demande / Campagne)** : Une demande de revendeur émise sur une province reste 100% active, autonome et non altérée par la création d'une campagne ciblant cette même province.
* **Intégrité Métier et Règles de Validation (`src/lib/actions/campaigns.ts`)** :
  - `createCampaignAction` : création d'une offre avec validation du volume ($> 0$ et $\le \text{expected\_quantity}$ de la production), prix unitaire ($> 0$), devise (`USD` / `CDF`), cohérence des dates (`end_date >= start_date`), et rattachement d'au moins une province de desserte (`campaign_delivery_zones`).
  - `updateCampaignAction` : modification des paramètres commerciaux par l'entreprise propriétaire.
  - `updateCampaignStatusAction` : cycle de vie des campagnes (`draft`, `active`, `paused`, `completed`, `cancelled`).
* **Sécurisation RLS & Isolation Multi-Tenant** :
  - Seules les campagnes avec `status = 'active'` sont consultables publiquement par les revendeurs connectés.
  - Les brouillons (`draft`), suspendues (`paused`), achevées (`completed`) et annulées (`cancelled`) restent strictement privées pour les tiers.
  - Isolation multi-tenant étanche : une entreprise ne peut ni lire les brouillons d'une concurrente ni altérer ses campagnes.
  - Les revendeurs ont un droit de lecture strict sur les campagnes actives (aucun droit d'écriture).
* **Couche de Données (`src/lib/queries/campaigns.ts`)** :
  - `getCompanyCampaigns(companyId)` : chargement complet des campagnes de l'entreprise avec compteurs réactifs par statut.
  - `getCompanyEligibleProductions(companyId)` : extraction des productions actives de l'exploitation pouvant servir d'adossement.
  - `getCompanyCampaignById(campaignId, companyId)` : fiche unitaire de campagne pour l'administration.
  - `getResellerCampaigns(resellerId, filters)` : exploration paginée et filtrée des offres actives avec calcul dynamique de l'éligibilité territoriale (*desservie* vs *non desservie*).
* **Composants d'Interface Dédiés (`src/components/campaigns/`)** :
  - `CampaignStatusBadge.tsx` : badges visuels distinctifs par statut.
  - `CompanyCampaignCard.tsx` : carte de gestion producteur avec indicateurs de volume, prix, dates, zones couvertes, production rattachée et boutons d'action rapide.
  - `CampaignFormModal.tsx` : modal ergonomique avec sélecteur de production adossée, assistance indicative affichant la demande agrégée réelle du marché issue de `v_market_demands_aggregated`, sélecteur multi-provinces avec boutons de présélection (*Toutes, Kinshasa seule, Effacer*).
  - `CompanyCampaignsView.tsx` : vue d'ensemble avec 4 métriques en temps réel, filtres réactifs et état vide sans mock data.
  - `ResellerCampaignCard.tsx` : carte d'offre pour revendeur avec photographie réelle de culture, prix unitaire en devise, volume offert, calendrier de disponibilité, badge d'éligibilité géographique et mention d'ouverture prochaine des commandes (Phase 10).
  - `ResellerCampaignsView.tsx` : interface d'exploration avec filtres par produit, province et statut de desserte.
* **Pages et Navigation Déployées** :
  - `src/app/dashboard/company/campaigns/page.tsx` : espace complet de gestion des campagnes pour les entreprises.
  - `src/app/dashboard/reseller/campaigns/page.tsx` : espace de découverte des offres pour les revendeurs.
  - `src/components/dashboard/AppSidebar.tsx` : activation du lien "Offres Commerciales" pour le revendeur et retrait des badges temporaires.
  - `src/app/dashboard/company/page.tsx` & `src/app/dashboard/reseller/page.tsx` : compteurs réels d'offres actives intégrés sur les tableaux de bord d'accueil.
* **Suite de Tests de Validation (`supabase/tests/phase9_campaigns_test.sql`)** :
  - 7 tests automatisés validés : contraintes CHECK (quantité > 0, prix > 0, dates), adossement obligatoire, invisibilité RLS des brouillons, rejet d'écriture par les revendeurs, isolation multi-tenant, validation du Scénario 30 et respect des invariants V1 (0 commande, 0 réservation de stock).

---

## [0.9.0-profile] - 2026-09-15
### Implémentation Complète du Détail Production et Profil Public Entreprise V1 (Phase 8)

#### Ajouté
* **Principe Fondamental et Séparation Métier (Règles d'Or 2 et 3)** :
  - Respect strict de l'indépendance des concepts : $\text{Production} \neq \text{Campagne} \neq \text{Commande} \neq \text{Stock} \neq \text{Réservation}$.
  - La fiche détaillée de production présente la culture déclarée avec l'étiquetage explicite : **"Quantité planifiée : X [unité]"** (exclusion formelle des termes trompeurs *"Stock disponible"* ou *"Quantité disponible"*).
  - Absence absolue de prix commercial ou de bouton "Commander" (réservés aux Campagnes et Commandes des Phases 9 et 10).
  - Le profil public d'entreprise est strictement dissocié du tableau de bord privé d'exploitation : aucune fuite de documents RCCM, pièces d'identité, notes internes, liste des membres, emails ou téléphones privés.
* **Sécurisation RLS & Isolation Données Publiques / Privées** :
  - Seules les entreprises enregistrées et actives (`is_active = TRUE`) sont consultables publiquement.
  - Seules les productions avec `is_public = TRUE` et un statut cultural actif (`planned`, `growing`, `harvested`) apparaissent sur le profil public de l'entreprise.
  - Les brouillons (`draft`), productions privées (`is_public = FALSE`) et productions annulées (`cancelled`) restent rigoureusement invisibles.
  - RLS protège l'intégrité : un revendeur connecté ne peut en aucun cas altérer une entreprise ou une production.
* **Couche Applicative et Requêtes Data (`src/lib/queries/companies.ts`)** :
  - `getPublicCompanyProfile(companyId)` : extraction sécurisée des informations publiques de l'entreprise (raison sociale, logo, description, ville, province, pays, badge vérifié, date d'enregistrement).
  - `getCompanyPublicProductions(companyId)` : chargement paginé et filtré des productions publiques réelles rattachées à l'exploitation.
* **Composants d'Interface Dédiés (`src/components/companies/`)** :
  - `CompanyPublicHeader.tsx` : en-tête institutionnel avec logo réel de l'entreprise (fallback icône neutre), badge de vérification officiel, localisation hiérarchique, date d'ancienneté et présentation culturale.
  - `CompanyPublicProductionsList.tsx` : grille de fiches de productions publiques réelles avec photos réelles, statuts culturaux, quantités planifiées clairement identifiées, calendrier cultural et lien de redirection unitaire. État vide élégant sans fausses données (*Règle d'Or 2*) : *"Cette entreprise n'a encore aucune production publique."*
  - `CompanyPublicProfileView.tsx` : vue d'assemblage intégrant le compteur dynamique réel de productions, lien de retour contextuel et encarts de sensibilisation revendeur.
* **Pages et Navigation Bidirectionnelle** :
  - `src/app/dashboard/reseller/companies/[id]/page.tsx` : profil public de l'exploitation dans l'espace revendeur.
  - `src/app/companies/[id]/page.tsx` : route publique universelle pour la consultation du profil par tout visiteur.
  - `src/app/dashboard/reseller/productions/[id]/page.tsx` : fiche de détail de production enrichie avec encadré producteur cliquable vers son profil public, bouton *"Consulter le profil de l'exploitation →"*, étiquette stricte "Quantité planifiée" et lien de retour au flux des productions.
  - `src/components/feed/FeedProductionCard.tsx` : lien direct depuis le logo et le nom d'entreprise de chaque carte du feed vers `/dashboard/reseller/companies/[id]`.
* **Suite de Tests de Validation (`supabase/tests/phase8_detail_and_profile_test.sql`)** :
  - Tests transactionnels automatisés validant la visibilité RLS de l'entreprise active, l'invisibilité de l'entreprise suspendue, la sélection exclusive des productions publiques actives, l'exclusion absolue des brouillons/privées/annulées, le rejet d'écriture pour les revendeurs et les invariants (0 campagne, 0 commande, 0 réservation de stock).

---

## [0.8.0-feed] - 2026-09-12
### Implémentation Complète du Feed Revendeur V1 (Phase 7)

#### Ajouté
* **Principe Fondamental et Séparation des Entités (Règles d'Or 2 et 3)** :
  - Respect absolu de l'indépendance des concepts : $\text{Production} \neq \text{Campagne} \neq \text{Commande} \neq \text{Stock} \neq \text{Réservation}$.
  - Les publications du feed représentent des **productions déclarées** par les exploitations agricoles (`is_public = TRUE` et statuts `planned`, `growing`, `harvested`).
  - Étiquetage strict des tonnages : *"Production prévue : X tonnes"* (jamais *"Stock disponible"*).
  - Absence absolue de prix commercial ou de bouton "Commander" dans le feed (réservés aux futures phases Campagne et Commande).
* **Isolation RLS & Confidentialité** :
  - Seules les productions publiques actives sont lisibles par les revendeurs connectés.
  - Les brouillons (`draft`), productions privées (`is_public = FALSE`) et productions annulées (`cancelled`) sont totalement invisibles aux acheteurs.
  - Données administratives internes des producteurs (documents RCCM, membres de l'entreprise) non exposées.
* **Couche Applicative et Requêtes Data (`src/lib/queries/feed.ts`)** :
  - `getPublicFeedProductions(filters)` : extraction paginée des productions publiques réelles avec filtres multicritères (recherche textuelle par culture/exploitation, filtre par catégorie de produit, filtre par province/pays).
  - `getPublicProductionDetail(id)` : fiche unitaire publique d'une production avec informations culturales, exploitation et calendrier prévisionnel.
* **Composants d'Interface Dédiés (`src/components/feed/`)** :
  - `FeedProductionCard.tsx` : carte de publication avec photographie réelle dominante, avatar/logo d'exploitation, badge de statut cultural, localisation géographique, calendrier de récolte, volume prévisionnel et lien d'exploration.
  - `FeedFilters.tsx` : barre de filtres interactive (recherche instantanée, sélecteurs catégorie et province, réinitialisation).
  - `FeedSkeleton.tsx` : squelettes de chargement animés.
  - `FeedView.tsx` : vue réactive avec compteur dynamique réel, rafraîchissement instantané et état vide soigné sans mock data (*Règle d'Or 2*).
* **Pages et Navigation** :
  - `src/app/dashboard/reseller/feed/page.tsx` : page principale du flux public des productions.
  - `src/app/dashboard/reseller/productions/[id]/page.tsx` : page de consultation détaillée pour les revendeurs.
  - `src/app/dashboard/reseller/page.tsx` : mise à jour du tableau de bord d'accueil avec compteur en temps réel et accès direct au Feed.
  - `src/components/dashboard/AppSidebar.tsx` : retrait du badge temporaire "Phase 7".
* **Suite de Tests de Validation (`supabase/tests/phase7_feed_test.sql`)** :
  - Tests transactionnels validant la visibilité RLS des productions sous rôle `authenticated`, l'invisibilité des brouillons et annulations, le rejet strict des modifications par un revendeur et les invariants (0 stock, 0 campagne, 0 commande créés).

---

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
