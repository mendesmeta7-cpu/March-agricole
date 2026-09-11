# ÉTAT DU DÉVELOPPEMENT ET FEUILLE DE ROUTE V1 (docs/development-status.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-10 — Phase 4 Terminée*

---

## 1. VUE SYNTHÉTIQUE DE L'AVANCEMENT

| Phase | Intitulé du Jalon | Statut | Livrables Principaux |
| :---: | :--- | :---: | :--- |
| **0** | **Initialisation de la Memory Bank** | 🟢 **TERMINÉ** | Cadre documentaire, règles d'or, modèle relationnel, matrice de sécurité, feuille de route. |
| **1** | **Base de Données (Database)** | 🟢 **TERMINÉ** | 9 migrations appliquées, 17 tables, RLS active, RPC de réservation atomique, buckets Storage, suite de 14 tests validée. |
| **2** | **Authentification et Rôles** | 🟢 **TERMINÉ** | Supabase Auth SSR, profils `company` / `reseller` / `admin`, migration 10 (triggers anti-escalade & auto-owner), middleware RBAC, suite de 17 tests validée. |
| **3** | **Interfaces et Espaces Applicatifs** | 🟢 **TERMINÉ** | Layouts responsive, navigation contextuelle, architecture modulaire `/dashboard/company`, `/dashboard/reseller`, `/dashboard/admin`, compos| **4** | **Gestion des Produits** | 🟢 **TERMINÉ** | Distinction `products` vs `company_products`, sélection catalogue, contribution décentralisée avec anti-doublon normalisé (RPC), édition personnalisée, archivage doux (`is_active`), suite de 14 tests validée. |
| **5** | **Gestion des Productions** | 🟢 **TERMINÉ** | Cycle cultural complet, distinction stricte Produit != Production != Stock != Campagne, liaison obligatoire `company_products`, upload Storage `public-assets/productions`, RLS, page détail. |
| **6** | **Gestion des Demandes** | 🟢 **TERMINÉ** | Expression de besoins revendeurs, décloisonnement territorial, vue d'agrégation `v_market_demands_aggregated`, tableau de bord macro pour producteurs, anonymat RLS. |
| **7** | **Feed Revendeur** | ⚪ *À VENIR* | Flux de découverte des productions avec visuels, filtres par produit/région, gestion élégante des états vides. |
| **8** | **Détail Production & Profil Public** | ⚪ *À VENIR* | Page détaillée de production, fiche publique d'entreprise agricole, historique des offres sans fuite de données privées. |
| **9** | **Campagnes Commerciales** | ⚪ *À VENIR* | Création de campagne adossée à une production, fixation des prix/dates, sélection des provinces desservies (`campaign_delivery_zones`). |
| **10** | **Commandes et Réservation de Stock** | ⚪ *À VENIR* | Contrôle d'éligibilité géographique, transaction atomique de réservation anti-surréservation, cycle de statut des commandes. |
| **11** | **Tests, Sécurité RLS et Recette V1** | ⚪ *À VENIR* | Recette de bout en bout de la boucle réelle, audit RLS, tests de concurrence de réservation, validation finale V1. |

---

## 2. BILAN DÉTAILLÉ DE LA PHASE 6 — DEMANDES ET ANALYSE TERRITORIALE V1

* **Date de réalisation** : 2026-09-11
* **Stack appliquée** : Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, PostgreSQL (PL/pgSQL), Supabase Auth SSR, `@supabase/ssr`.
* **Résultats obtenus** :
  - [x] **Respect strict du principe fondamental de séparation (Règle d'Or 3)** :
    * $\text{DEMANDE} \neq \text{COMMANDE} \neq \text{RÉSERVATION} \neq \text{CAMPAGNE} \neq \text{STOCK} \neq \text{LIVRAISON}$
    * L'expression de besoin ne réserve aucun stock physique, n'engage aucun paiement et ne génère aucune commande.
    * Décloisonnement territorial : un revendeur peut exprimer un besoin dans n'importe quelle province, même si aucune entreprise ne la dessert actuellement.
  - [x] **Sécurisation RLS & Anonymat Revendeur (Migration 12)** :
    * Politique RLS `demands_select` restreinte strictement aux propriétaires (`auth.uid() = reseller_id`) et aux administrateurs.
    * Interdiction d'accès direct des entreprises agricoles à la table brute `demands` via l'API REST.
    * Accès producteur exclusif via la vue SQL sécurisée `v_market_demands_aggregated` pour garantir l'anonymat absolu des acheteurs.
  - [x] **Couche de données et Server Actions (`src/lib/`)** :
    * `src/lib/queries/demands.ts` : `getResellerDemands()`, `getDemandById()`, `getAggregatedMarketDemands()`.
    * `src/lib/actions/demands.ts` : `createDemandAction()`, `updateDemandAction()`, `cancelDemandAction()`.
  - [x] **Composants d'Interface Dédiés (`src/components/demands/`)** :
    * `DemandStatusBadge.tsx` : Badges visuels pour les statuts (`active`, `converted`, `cancelled`, `expired`).
    * `ResellerDemandCard.tsx` : Carte de demande revendeur avec volume recherché, localisation et actions.
    * `DemandFormModal.tsx` : Modale/drawer responsive pour l'expression de besoin (sélection produit, territoire, dates, notes).
    * `ResellerDemandsView.tsx` : Vue principale revendeur (`/dashboard/reseller/demands`) avec statistiques réelles, filtres et annulation douce.
    * `MarketDemandsAnalysisView.tsx` : Tableau de bord d'intelligence macro (`/dashboard/company/demands`) avec 4 métriques réelles, filtres par produit/province et cartographie tabulaire des opportunités solvables.
  - [x] **Pages et Dashboards Activés** :
    * `src/app/dashboard/reseller/demands/page.tsx` : Page serveur de gestion des demandes acheteur.
    * `src/app/dashboard/company/demands/page.tsx` : Page serveur d'analyse territoriale pour les producteurs.
    * `src/app/dashboard/reseller/page.tsx` : Activation du cartouche Demandes (statut "Actif").
    * `src/components/dashboard/AppSidebar.tsx` : Retrait des badges "Phase 6".
  - [x] **Vérification du Build et Validation SQL** :
    * `npm run build` : code 0 (29 routes compilées sans erreur).
    * `supabase/tests/phase6_demands_test.sql` : 100% conforme (création, rejet quantité non positive, rejet dates inversées, agrégation temps réel, mise à jour dynamique, exclusion des demandes annulées, et validation Stock = 0, Campagnes = 0, Commandes = 0).

---

## 3. PROCHAINE ÉTAPE

### PHASE 7 — FEED REVENDEUR V1
* **Déclencheur** : En attente de l'instruction utilisateur explicite (**Prompt 7**).
* **Objectifs de la Phase 7** :
  - Flux de découverte des productions agricoles publiques actives (`/dashboard/reseller/feed`) ;
  - Cartes visuelles de récoltes réelles avec photographies issues de Supabase Storage ;
  - Filtres par produit, par région/province et recherche textuelle ;
  - Gestion élégante des états vides sans mock data.
