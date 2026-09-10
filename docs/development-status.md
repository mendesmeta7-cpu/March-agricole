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
| **6** | **Gestion des Demandes** | ⚪ *À VENIR* | Formulaire d'expression de besoin revendeur, agrégation par province et tableau de bord d'analyse de marché pour l'entreprise. |
| **7** | **Feed Revendeur** | ⚪ *À VENIR* | Flux de découverte des productions avec visuels, filtres par produit/région, gestion élégante des états vides. |
| **8** | **Détail Production & Profil Public** | ⚪ *À VENIR* | Page détaillée de production, fiche publique d'entreprise agricole, historique des offres sans fuite de données privées. |
| **9** | **Campagnes Commerciales** | ⚪ *À VENIR* | Création de campagne adossée à une production, fixation des prix/dates, sélection des provinces desservies (`campaign_delivery_zones`). |
| **10** | **Commandes et Réservation de Stock** | ⚪ *À VENIR* | Contrôle d'éligibilité géographique, transaction atomique de réservation anti-surréservation, cycle de statut des commandes. |
| **11** | **Tests, Sécurité RLS et Recette V1** | ⚪ *À VENIR* | Recette de bout en bout de la boucle réelle, audit RLS, tests de concurrence de réservation, validation finale V1. |

---

## 2. BILAN DÉTAILLÉ DE LA PHASE 5 — GESTION DES PRODUCTIONS V1

* **Date de réalisation** : 2026-09-10
* **Stack appliquée** : Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, PostgreSQL (PL/pgSQL), Supabase Storage (`public-assets`), `@supabase/ssr`.
* **Résultats obtenus** :
  - [x] **Respect absolu du principe fondamental de séparation (Règle d'Or 3)** :
    * $\text{PRODUIT} \neq \text{PRODUCTION} \neq \text{RÉCOLTE} \neq \text{STOCK / LOT} \neq \text{CAMPAGNE} \neq \text{COMMANDE}$
    * La quantité saisie est strictement une **quantité planifiée** (`expected_quantity`).
    * Aucun stock n'est créé ou modifié automatiquement.
    * Aucune campagne commerciale n'est générée automatiquement.
  - [x] **Liaison obligatoire au produit de l'exploitation (Règle 4)** :
    * Toute production est rattachée obligatoirement à un produit actif de l'entreprise (`company_products` et `products`).
    * Impossibilité de déclarer une production hors catalogue d'exploitation.
  - [x] **Cycle de vie et statuts validés** :
    * Statuts conformes aux contraintes DB : `draft`, `planned`, `growing`, `harvested`, `cancelled`.
    * Transitions fluides et traçables depuis la liste et la page de détail.
  - [x] **Visibilité publique découplée** :
    * Drapeau `is_public` (visibilité revendeurs sans mise en vente, préparant le feed de la Phase 7).
    * Respect strict RLS : seules les productions publiques avec statut actif (`planned`, `growing`, `harvested`) sont accessibles hors entreprise.
  - [x] **Téléversement Supabase Storage** :
    * Upload des photographies de champ/culture dans `public-assets/productions/{uuid}.{ext}` avec validation de format (JPG, PNG, WebP) et taille (< 5 Mo).
    * Fallback automatique sur l'image du produit catalogue si aucune photo spécifique n'est fournie.
  - [x] **Couche de données et Server Actions (`src/lib/`)** :
    * `src/lib/queries/productions.ts` : `getCompanyProductions()`, `getProductionById()`.
    * `src/lib/actions/productions.ts` : `createProductionAction()`, `updateProductionAction()`, `updateProductionStatusAction()`, `toggleProductionVisibilityAction()`.
  - [x] **Composants d'Interface Dédiés (`src/components/productions/`)** :
    * `ProductionStatusBadge.tsx` : Badges visuels pour chaque état du cycle cultural.
    * `ProductionCard.tsx` : Carte responsive avec visuel réel, avertissement quantité planifiée, localisation et actions.
    * `ProductionFormModal.tsx` : Modale/drawer responsive de création et édition.
    * `CompanyProductionsView.tsx` : Vue principale avec statistiques réelles, filtres multi-critères, recherche et état vide soigné (*Règle d'Or 2*).
    * `ProductionDetailView.tsx` : Page détaillée de consultation et pilotage du cycle cultural (`/dashboard/company/productions/[id]`).
  - [x] **Vérification du Build et Validation SQL** :
    * `npm run build` : code 0 (29 routes compilées sans erreur).
    * `supabase/tests/phase5_productions_test.sql` : 100% conforme (contraintes de quantité positive, cohérence de période, contrôle de statut, et vérification que Stock = 0 et Campagnes = 0).

---

## 3. PROCHAINE ÉTAPE

### PHASE 6 — DEMANDES ET ANALYSE TERRITORIALE V1
* **Déclencheur** : En attente de l'instruction utilisateur explicite (**Prompt 6**).
* **Objectifs de la Phase 6** :
  - Formulaire d'expression de besoin pour les revendeurs (`/dashboard/reseller/demands`) ;
  - Rattachement géographique complet (Pays, Province, Ville) et produit du catalogue ;
  - Vue d'agrégation territoriale `v_market_demands_aggregated` pour les entreprises agricoles ;
  - Tableau de bord d'analyse de la demande pour orienter les futures productions.emis, récolte prévisionnelle) ;
  - Upload de photos réelles des parcelles dans Supabase Storage (`production-media`) ;
  - États de production (`planned`, `in_progress`, `harvested`, `cancelled`).
