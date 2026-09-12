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
| **7** | **Feed Revendeur** | 🟢 **TERMINÉ** | Flux de découverte des productions publiques réelles (`/dashboard/reseller/feed`), photos dominantes, filtres réactifs produit/province, pagination, états vides sans mock data, page détail `/dashboard/reseller/productions/[id]`. |
| **8** | **Détail Production & Profil Public** | ⚪ *À VENIR* | Page détaillée de production enrichie, fiche publique d'entreprise agricole, historique des offres sans fuite de données privées. |
| **9** | **Campagnes Commerciales** | ⚪ *À VENIR* | Création de campagne adossée à une production, fixation des prix/dates, sélection des provinces desservies (`campaign_delivery_zones`). |
| **10** | **Commandes et Réservation de Stock** | ⚪ *À VENIR* | Contrôle d'éligibilité géographique, transaction atomique de réservation anti-surréservation, cycle de statut des commandes. |
| **11** | **Tests, Sécurité RLS et Recette V1** | ⚪ *À VENIR* | Recette de bout en bout de la boucle réelle, audit RLS, tests de concurrence de réservation, validation finale V1. |

---

## 2. BILAN DÉTAILLÉ DE LA PHASE 7 — FEED REVENDEUR V1

* **Date de réalisation** : 2026-09-12
* **Stack appliquée** : Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, PostgreSQL (PL/pgSQL), Supabase Auth SSR, `@supabase/ssr`.
* **Résultats obtenus** :
  - [x] **Respect strict du principe fondamental de séparation (Règle d'Or 3)** :
    * $\text{PRODUCTION} \neq \text{CAMPAGNE} \neq \text{COMMANDE} \neq \text{STOCK} \neq \text{RÉSERVATION}$
    * Les publications représentent exclusivement des **productions déclarées** (`is_public = TRUE` et statuts `planned`, `growing`, `harvested`).
    * Les volumes sont étiquetés strictement : *"Production prévue : X tonnes"* (jamais *"Stock disponible"*).
    * Aucun prix commercial ni bouton "Commander" (réservés aux Campagnes et Commandes des Phases 9 et 10).
  - [x] **Sécurisation RLS & Données Publiques Uniquement** :
    * Seules les productions avec `is_public = TRUE` et un statut actif (`planned`, `growing`, `harvested`) sont accessibles au revendeur.
    * Les productions brouillons (`draft`) et annulées (`cancelled`) sont totalement invisibles aux acheteurs.
    * Aucune fuite de données privées d'entreprise (documents internes, membres).
  - [x] **Couche de données (`src/lib/queries/feed.ts`)** :
    * `getPublicFeedProductions()` : flux filtrable (recherche textuelle, catégorie, province, pays) avec pagination.
    * `getPublicProductionDetail(id)` : fiche publique unitaire pour la consultation détaillée revendeur.
  - [x] **Composants d'Interface Dédiés (`src/components/feed/`)** :
    * `FeedProductionCard.tsx` : carte avec photo dominante réelle, avatar/logo d'entreprise, localisation, statut cultural, volume prévisionnel et lien vers le détail.
    * `FeedFilters.tsx` : barre de filtres réactive (mot-clé, catégorie, province) avec bouton de réinitialisation.
    * `FeedSkeleton.tsx` : squelettes de chargement animés.
    * `FeedView.tsx` : conteneur réactif avec gestion d'état, filtres instantanés, compteur dynamique et état vide soigné sans mock data.
  - [x] **Pages et Routes Activées** :
    * `src/app/dashboard/reseller/feed/page.tsx` : page principale du flux public des productions.
    * `src/app/dashboard/reseller/productions/[id]/page.tsx` : page de consultation détaillée pour le revendeur.
    * `src/app/dashboard/reseller/page.tsx` : activation du module Feed avec comptage en temps réel des cycles publics.
    * `src/components/dashboard/AppSidebar.tsx` : retrait du badge temporaire "Phase 7".
  - [x] **Validation SQL & Tests Transactionnels (`supabase/tests/phase7_feed_test.sql`)** :
    * 100% conforme : visibilité des productions publiques sous rôle `authenticated`, exclusion des brouillons, des productions privées et des annulations, rejet d'écriture/modification par un revendeur, et validation Invariants (Stock = 0, Campagnes = 0, Commandes = 0).

---

## 3. PROCHAINE ÉTAPE

### PHASE 8 — DÉTAIL PRODUCTION ET PROFIL PUBLIC ENTREPRISE
* **Déclencheur** : En attente de l'instruction utilisateur explicite (**Prompt 8**).
* **Objectifs de la Phase 8** :
  - Page détaillée enrichie de la production agricole ;
  - Fiche publique de l'entreprise agricole accessible depuis l'avatar et le nom du producteur ;
  - Historique public des offres et productions sans exposition de données administratives privées.
