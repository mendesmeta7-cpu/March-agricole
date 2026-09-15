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
| **8** | **Détail Production & Profil Public** | 🟢 **TERMINÉ** | Page détaillée de production enrichie, profil public d'entreprise agricole, liste des produ| **9** | **Campagnes Commerciales** | 🟢 **TERMINÉ** | Création de campagne adossée à une production, fixation quantité/prix/dates, territoires desservis (`campaign_delivery_zones`), exploration revendeur avec badges d'éligibilité, suite de 7 tests validée. |
| **10** | **Commandes et Réservation de Stock** | 🟢 **TERMINÉ** | Contrôle d'éligibilité territoriale, réservation atomique pessimiste anti-surbooking (`create_order_with_reservation`), snapshot de prix immuable, cycle de statuts, annulation et libération de stock, vues revendeur/entreprise, suite de 8 tests validée. |
| **11** | **Tests, Sécurité RLS et Recette V1** | ⚪ *À VENIR* | Recette de bout en bout de la boucle réelle, audit RLS, tests de concurrence de réservation, validation finale V1. |

---

## 2. BILAN DÉTAILLÉ DE LA PHASE 10 — COMMANDES ET RÉSERVATION V1

* **Date de réalisation** : 2026-09-15
* **Stack appliquée** : Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, PostgreSQL 17 (PL/pgSQL), Supabase Auth SSR.
* **Résultats obtenus** :
  - [x] **Respect strict du principe fondamental de séparation (Règles d'Or 2 et 3)** :
    * $\text{Production} \neq \text{Campagne} \neq \text{Commande} \neq \text{Réservation} \neq \text{Livraison}$.
    * Une commande est un engagement contractuel ferme passé par un revendeur sur une campagne commerciale ouverte.
    * La réservation de stock est un mécanisme comptable atomique adossé à la commande bloquant le volume sur la campagne.
    * Zéro mock data : calculs de stock et affichages strictement dérivés des transactions réelles en base de données.
  - [x] **Base de Données et Procédures Atomiques RPC (`supabase/migrations/20260915000013_enhance_orders_and_reservations_rpc.sql`)** :
    * `create_order_with_reservation` : contrôle d'éligibilité territoriale (`delivery_province_id` dans `campaign_delivery_zones`), statut actif de la campagne, dates de validité commerciale, verrouillage pessimiste `FOR UPDATE` sur la campagne, calcul du stock disponible en temps réel, création atomique de `orders`, `order_items` et `stock_reservations` avec snapshot contractuel du prix unitaire.
    * `cancel_order_and_release_reservation` : passage du statut de commande à `cancelled` et de la réservation à `released`, restituant immédiatement le volume disponible.
    * `get_campaign_stock_summary` : fonction helper calculant `marketable_quantity`, `reserved_quantity` et `available_quantity`.
  - [x] **Couche de Données & Server Actions (`src/lib/`)** :
    * `src/lib/queries/orders.ts` : `getResellerOrders`, `getResellerOrderById`, `getCompanyOrders`, `getCompanyOrderById`, `getCampaignAvailableStock`.
    * `src/lib/actions/orders.ts` : `createOrderAction`, `cancelOrderAction`, `updateOrderStatusAction`.
    * `src/lib/queries/campaigns.ts` : enrichissement avec calcul en direct de `reserved_quantity` et `available_quantity` via jointure sur `stock_reservations`.
  - [x] **Composants d'Interface Dédiés (`src/components/orders/` & `src/components/campaigns/`)** :
    * `OrderStatusBadge.tsx` : badges visuels distincts par statut (`pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`).
    * `OrderFormModal.tsx` : modal ergonomique de passation de commande avec récapitulatif de campagne, contrôle de stock disponible en temps réel, calcul du montant total, sélection de province de livraison filtrée par éligibilité, adresse et notes.
    * `ResellerOrderCard.tsx` : carte de commande revendeur avec détails du produit, exploitation venderesse, volume, prix figé, date et statut.
    * `ResellerOrdersView.tsx` : vue de suivi revendeur avec compteurs dynamiques réels, filtres par statut et état vide élégant.
    * `ResellerOrderDetailView.tsx` : fiche unitaire de commande revendeur avec progression du cycle de vie et bouton d'annulation si éligible.
    * `CompanyOrdersView.tsx` : espace de gestion des commandes reçues pour l'entreprise avec statistiques de chiffre d'affaires et de volume, filtres et recherche.
    * `CompanyOrderDetailView.tsx` : fiche de traitement des commandes reçues avec sélecteur de transition de statut et coordonnées de livraison du revendeur.
    * `ResellerCampaignCard.tsx` : affichage du stock restant réel et bouton contextuel "Commander" déclenchant la modal.
  - [x] **Pages et Navigation** :
    * `src/app/dashboard/reseller/orders/page.tsx` & `[id]/page.tsx` : espace complet des commandes revendeur.
    * `src/app/dashboard/company/orders/page.tsx` & `[id]/page.tsx` : espace complet des commandes reçues par l'entreprise.
    * `src/components/dashboard/AppSidebar.tsx` : retrait des badges Phase 10 sur les liens Commandes.
    * `src/app/dashboard/company/page.tsx` : activation de la carte module "Commandes Reçues".
  - [x] **Validation SQL & Tests Transactionnels (`supabase/tests/phase10_orders_and_reservations_test.sql`)** :
    * 8 suites de tests automatisés validées à 100% sur Supabase : commande normale + snapshot du prix, anti-surbooking sous concurrence, rejet territoire non desservi, rejet quantités invalides, rejet campagne non active/expirée, immuabilité du prix contractuel, annulation et libération instantanée du stock, isolation RLS multi-tenant.

---

## 3. PROCHAINE ÉTAPE

### PHASE 11 — TESTS, SÉCURITÉ RLS ET RECETTE V1
* **Déclencheur** : En attente de l'instruction utilisateur explicite (**Prompt 11**).
* **Objectifs de la Phase 11** :
  - Audit complet de sécurité et d'étanchéité des politiques Row Level Security (RLS) sur les 17 tables du schéma ;
  - Recette de bout en bout de la boucle de valeur V1 (Inscription $\rightarrow$ Produit $\rightarrow$ Production $\rightarrow$ Demande $\rightarrow$ Campagne $\rightarrow$ Commande & Réservation) ;
  - Validation des flux nominaux et des cas limites d'erreur ;
  - Préparation du rapport d'homologation technique de la V1 Expérimentale.réservation ;
  - Gestion du cycle de vie des commandes (`pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`) ;
  - Tableau de bord des commandes côté entreprise et côté revendeur.
