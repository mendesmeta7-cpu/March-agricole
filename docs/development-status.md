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
| **9** | **Campagnes Commerciales** | 🟢 **TERMINÉ** | Création de campagne adossée à une production, fixation quantité/prix/dates, territoires desservis (`campaign_delivery_zones`), exploration revendeur avec badges d'éligibilité, suite de 7 tests validée. |
| **10** | **Commandes et Réservation de Stock** | ⚪ *À VENIR* | Contrôle d'éligibilité géographique, transaction atomique de réservation anti-surréservation, cycle de statut des commandes. |
| **11** | **Tests, Sécurité RLS et Recette V1** | ⚪ *À VENIR* | Recette de bout en bout de la boucle réelle, audit RLS, tests de concurrence de réservation, validation finale V1. |

---

## 2. BILAN DÉTAILLÉ DE LA PHASE 9 — CAMPAGNES COMMERCIALES V1

* **Date de réalisation** : 2026-09-15
* **Stack appliquée** : Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, PostgreSQL (PL/pgSQL), Supabase Auth SSR, `@supabase/ssr`.
* **Résultats obtenus** :
  - [x] **Respect strict du principe fondamental de séparation (Règles d'Or 2 et 3)** :
    * $\text{Production} \neq \text{Campagne} \neq \text{Commande} \neq \text{Stock} \neq \text{Réservation}$.
    * Une campagne est une **offre commerciale ferme**, obligatoirement adossée à une production existante de l'entreprise authentifiée.
    * La création d'une campagne ne réserve aucun stock, ne décrémente aucun lot et ne crée aucune commande (invariants strictement validés).
    * **Scénario 30 validé** : Une demande existante dans une province ciblée par une nouvelle campagne reste 100% autonome, active et non altérée.
  - [x] **Intégrité Métier et Règles de Validation (`src/lib/actions/campaigns.ts`)** :
    * Volume commercialisable strictement positif ($> 0$) et plafonné à la quantité prévisionnelle de la production associée.
    * Prix unitaire ferme obligatoirement supérieur à 0 avec devise (`USD` / `CDF`).
    * Cohérence temporelle (`end_date >= start_date`).
    * Territoire de livraison : sélection obligatoire d'au moins une province de desserte (`campaign_delivery_zones`).
    * Assistance indicative de la demande du marché (issue de `v_market_demands_aggregated`) lors de la configuration sans liaison contraignante.
    * Gestion complète du cycle de vie (`draft`, `active`, `paused`, `completed`, `cancelled`).
  - [x] **Sécurisation RLS & Isolation Multi-Tenant** :
    * Les campagnes brouillons (`draft`) sont strictement invisibles aux revendeurs et aux tiers.
    * Les campagnes actives (`active`) sont consultables publiquement par tous les acheteurs authentifiés.
    * Une entreprise ne peut modifier ou supprimer que ses propres campagnes.
    * Le revendeur ne dispose d'aucun droit de modification ou de création sur les campagnes.
  - [x] **Couche de Données (`src/lib/queries/campaigns.ts`)** :
    * `getCompanyCampaigns(companyId)` : liste exhaustive des campagnes de l'exploitation avec compteurs par statut et volumes.
    * `getCompanyEligibleProductions(companyId)` : productions actives éligibles pour l'adossement de nouvelles campagnes.
    * `getResellerCampaigns(resellerId, filters)` : exploration des offres avec calcul d'éligibilité territoriale pour le revendeur.
  - [x] **Composants d'Interface Dédiés (`src/components/campaigns/`)** :
    * `CampaignStatusBadge.tsx` : badges visuels distincts pour chaque statut (`draft`, `active`, `paused`, `completed`, `cancelled`).
    * `CompanyCampaignCard.tsx` : fiche de gestion entreprise avec métriques commerciales, zones couvertes, indicateur de rattachement cultural et boutons d'actions contextuelles (activer, mettre en pause, clôturer, modifier).
    * `CampaignFormModal.tsx` : formulaire interactif avec sélection de production, quantité, prix/devise, dates, sélecteur multi-provinces avec boutons de commodité (*Toutes / Kinshasa seule / Effacer*), et volet d'intelligence de marché affichant la demande agrégée réelle.
    * `CompanyCampaignsView.tsx` : tableau de bord de gestion avec 4 compteurs réactifs réels, filtres et état vide soigné sans mock data.
    * `ResellerCampaignCard.tsx` : carte d'exploration commerciale valorisant la photo réelle de production, le prix unitaire, le volume offert, les dates, l'exploitation productrice et le **badge d'éligibilité territoriale** (*"Votre province est desservie"* vs *"Non desservie"*). Mention claire d'anticipation de la Phase 10 pour l'ouverture des commandes.
    * `ResellerCampaignsView.tsx` : espace de découverte revendeur avec filtres par produit, province et statut de desserte.
  - [x] **Pages et Navigation** :
    * `src/app/dashboard/company/campaigns/page.tsx` : page complète de gestion des campagnes de l'entreprise.
    * `src/app/dashboard/reseller/campaigns/page.tsx` : page complète d'exploration des offres commerciales pour les revendeurs.
    * `src/components/dashboard/AppSidebar.tsx` : activation du lien "Offres Commerciales" pour le revendeur et retrait du badge Phase 9.
    * `src/app/dashboard/company/page.tsx` & `src/app/dashboard/reseller/page.tsx` : compteurs dynamiques réels d'offres actives et cartes modules activées.
  - [x] **Validation SQL & Tests Transactionnels (`supabase/tests/phase9_campaigns_test.sql`)** :
    * 7 suites de tests automatisés validées à 100% sur Supabase : contraintes CHECK (quantité > 0, prix > 0, dates cohérentes), adossement obligatoire, étanchéité RLS, isolation multi-tenant, Scénario 30 (indépendance absolue demande/campagne), invariants (0 commande, 0 réservation de stock).

---

## 3. PROCHAINE ÉTAPE

### PHASE 10 — COMMANDES ET RÉSERVATION DE STOCK V1
* **Déclencheur** : En attente de l'instruction utilisateur explicite (**Prompt 10**).
* **Objectifs de la Phase 10** :
  - Contrôle transactionnel d'éligibilité géographique du revendeur lors du passage de commande ;
  - Transaction atomique de réservation de stock avec verrouillage optimiste/pessimiste (`reserve_stock` RPC) contre la surréservation ;
  - Gestion du cycle de vie des commandes (`pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`) ;
  - Tableau de bord des commandes côté entreprise et côté revendeur.
