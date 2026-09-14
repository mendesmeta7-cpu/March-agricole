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
| **8** | **Détail Production & Profil Public** | 🟢 **TERMINÉ** | Page détaillée de production enrichie, profil public d'entreprise agricole, liste des productions publiques actives, étanchéité RLS absolue, suite de tests validée. |
| **9** | **Campagnes Commerciales** | ⚪ *À VENIR* | Création de campagne adossée à une production, fixation des prix/dates, sélection des provinces desservies (`campaign_delivery_zones`). |
| **10** | **Commandes et Réservation de Stock** | ⚪ *À VENIR* | Contrôle d'éligibilité géographique, transaction atomique de réservation anti-surréservation, cycle de statut des commandes. |
| **11** | **Tests, Sécurité RLS et Recette V1** | ⚪ *À VENIR* | Recette de bout en bout de la boucle réelle, audit RLS, tests de concurrence de réservation, validation finale V1. |

---

## 2. BILAN DÉTAILLÉ DE LA PHASE 8 — DÉTAIL PRODUCTION ET PROFIL PUBLIC ENTREPRISE V1

* **Date de réalisation** : 2026-09-15
* **Stack appliquée** : Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, PostgreSQL (PL/pgSQL), Supabase Auth SSR, `@supabase/ssr`.
* **Résultats obtenus** :
  - [x] **Respect strict du principe fondamental de séparation (Règle d'Or 3)** :
    * $\text{PRODUCTION} \neq \text{CAMPAGNE} \neq \text{COMMANDE} \neq \text{STOCK} \neq \text{RÉSERVATION}$
    * Libellé strict des volumes : **"Quantité planifiée : X tonnes"** (aucun "Stock disponible" ni "Quantité disponible" fictif).
    * Absence absolue de prix commercial ou de bouton "Commander" (réservés aux Campagnes et Commandes des Phases 9 et 10).
  - [x] **Sécurisation RLS & Données Publiques Uniquement** :
    * Les profils publics des entreprises (`getPublicCompanyProfile`) n'exposent aucune donnée administrative privée (email interne, téléphone privé, documents RCCM, membres internes).
    * Seules les entreprises actives (`is_active = TRUE`) sont consultables publiquement.
    * Seules les productions publiques actives (`is_public = TRUE` et statuts `planned`, `growing`, `harvested`) apparaissent sur le profil public de l'entreprise.
    * Les productions brouillons (`draft`), privées (`is_public = FALSE`) et annulées (`cancelled`) sont rigoureusement invisibles.
    * Le revendeur ne dispose d'aucun droit d'écriture sur les entreprises ou productions (RLS restrictif en lecture seule).
  - [x] **Couche de données (`src/lib/queries/companies.ts`)** :
    * `getPublicCompanyProfile(companyId)` : chargement sécurisé des attributs publics (nom, logo, description, ville, province, pays, badge de vérification, date d'enregistrement).
    * `getCompanyPublicProductions(companyId)` : extraction exclusive des productions publiques actives de l'exploitation.
  - [x] **Composants d'Interface Dédiés (`src/components/companies/`)** :
    * `CompanyPublicHeader.tsx` : en-tête valorisant l'exploitation (logo réel avec fallback neutre, badge vérifié, localisation géographique, date d'inscription, description culturale).
    * `CompanyPublicProductionsList.tsx` : grille responsive des productions publiques réelles avec photos réelles dominantes, badges de statuts culturaux, tonnages prévisionnels étiquetés "Quantité planifiée", calendrier cultural et liens vers la fiche détail. État vide soigné sans mock data : *"Cette entreprise n'a encore aucune production publique."*
    * `CompanyPublicProfileView.tsx` : vue d'assemblage avec barre d'actions, lien de retour contextuel et note de découplage commercial.
  - [x] **Pages et Routes Activées** :
    * `src/app/dashboard/reseller/companies/[id]/page.tsx` : consultation du profil public d'une exploitation dans l'espace revendeur.
    * `src/app/companies/[id]/page.tsx` : route publique universelle pour la consultation directe du profil de l'exploitation.
    * `src/app/dashboard/reseller/productions/[id]/page.tsx` : fiche détail enrichie avec encadré exploitation cliquable vers son profil public, bouton *"Consulter le profil de l'exploitation →"*, retour au flux et étiquetage strict "Quantité planifiée".
    * `src/components/feed/FeedProductionCard.tsx` : mise à jour des cartes du flux avec lien cliquable sur le logo et nom d'entreprise vers son profil public.
  - [x] **Validation SQL & Tests Transactionnels (`supabase/tests/phase8_detail_and_profile_test.sql`)** :
    * 100% conforme : consultation profil entreprise active, invisibilité entreprise inactive, filtrage strict des productions publiques, exclusion totale des brouillons/privées/annulées, rejet d'écriture par le revendeur, invariants (0 campagne, 0 commande, 0 stock réservé).

---

## 3. PROCHAINE ÉTAPE

### PHASE 9 — CAMPAGNES COMMERCIALES V1
* **Déclencheur** : En attente de l'instruction utilisateur explicite (**Prompt 9**).
* **Objectifs de la Phase 9** :
  - Création et paramétrage d'une campagne commerciale adossée à une production existante ;
  - Fixation du volume commercialisable dédié, du prix unitaire ferme et des dates de validité ;
  - Sélection explicite des provinces desservies (`campaign_delivery_zones`) ;
  - Gestion du cycle de vie des campagnes (`draft`, `active`, `suspended`, `closed`, `cancelled`).
