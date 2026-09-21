# ÉTAT DU DÉVELOPPEMENT ET FEUILLE DE ROUTE V1 (docs/development-status.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-21 — Phase 14 Terminée*

---

## 1. VUE SYNTHÉTIQUE DE L'AVANCEMENT

| Phase | Intitulé du Jalon | Statut | Livrables Principaux |
| :---: | :--- | :---: | :--- |
| **0** | **Initialisation de la Memory Bank** | 🟢 **TERMINÉ** | Cadre documentaire, règles d'or, modèle relationnel, matrice de sécurité, feuille de route. |
| **1** | **Base de Données (Database)** | 🟢 **TERMINÉ** | 9 migrations appliquées, 17 tables, RLS active, RPC de réservation atomique, buckets Storage, suite de 14 tests validée. |
| **2** | **Authentification et Rôles** | 🟢 **TERMINÉ** | Supabase Auth SSR, profils `company` / `reseller` / `admin`, migration 10 (triggers anti-escalade & auto-owner), middleware RBAC, suite de 17 tests validée. |
| **3** | **Interfaces et Espaces Applicatifs** | 🟢 **TERMINÉ** | Layouts responsive, navigation contextuelle, architecture modulaire `/dashboard/company`, `/dashboard/reseller`, `/dashboard/admin`. |
| **4** | **Gestion des Produits** | 🟢 **TERMINÉ** | Distinction `products` vs `company_products`, sélection catalogue, contribution décentralisée, archivage doux (`is_active`). |
| **5** | **Gestion des Productions** | 🟢 **TERMINÉ** | Cycle cultural complet, distinction stricte Produit != Production != Stock != Campagne, liaison obligatoire `company_products`, upload Storage `public-assets/productions`, RLS, page détail. |
| **6** | **Gestion des Demandes** | 🟢 **TERMINÉ** | Expression de besoins revendeurs, décloisonnement territorial, vue d'agrégation `v_market_demands_aggregated`, tableau de bord macro pour producteurs, anonymat RLS. |
| **7** | **Feed Revendeur** | 🟢 **TERMINÉ** | Flux de découverte des productions publiques réelles (`/dashboard/reseller/feed`), photos dominantes, filtres réactifs produit/province, pagination, états vides sans mock data. |
| **8** | **Détail Production & Profil Public** | 🟢 **TERMINÉ** | Page détaillée de production enrichie, profil public d'entreprise agricole, liste des productions actives, badges de confiance. |
| **9** | **Campagnes Commerciales** | 🟢 **TERMINÉ** | Création de campagne adossée à une production, fixation quantité/prix/dates, territoires desservis (`campaign_delivery_zones`), exploration revendeur avec badges d'éligibilité, suite de 7 tests validée. |
| **10** | **Commandes et Réservation de Stock** | 🟢 **TERMINÉ** | Contrôle d'éligibilité territoriale, réservation atomique pessimiste anti-surbooking (`create_order_with_reservation`), snapshot de prix immuable, cycle de statuts, annulation et libération de stock. |
| **11** | **Tests, Sécurité RLS et Recette V1** | 🟢 **TERMINÉ** | Recette globale automatisée (11 scénarios SQL validés), audit sécurité RLS et secrets, build Next.js certifié (30 routes), homologation intégrale de la V1 Expérimentale. |
| **12** | **Stabilisation Post-Validation V1** | 🟢 **TERMINÉ** | Harmonisation multi-tenant Server Actions (`getCompanyIdForUser`), fiabilisation messages d'erreur RPC, tests de non-régression, classification Classe A (Stable). |
| **13** | **Correction Admin, UX & Réactivité** | 🟢 **TERMINÉ** | Espace Admin MVP, skeleton screens pour navigations rapides, suppression lenteurs et fiabilisation auth. |
| **14** | **Catalogue Global, Produits Société & Flux Revendeur** | 🟢 **TERMINÉ** | Découplage strict Catalogue Global (`is_global=TRUE`) / Configurations Société (`company_products`) / Produits Privés (`is_global=FALSE`), indépendance totale des photos officielles et personnalisées, 73 produits semés, compte admin dédié `admin@marcheagricole.cd`, flux direct `/dashboard/reseller` avec pills scrollables, suite de 7 tests SQL validée. |

---

## 2. BILAN DE LA PHASE 14 (CATALOGUE GLOBAL & FLUX REVENDEUR)

* **Date de validation finale** : 2026-09-21
* **Statut du projet** : 🟢 **STABLE — CATALOGUE ET FLUX V1 CERTIFIÉS**
* **Réalisations clés** :
  1. **Catalogue Global de Référence** : 73 produits de référence semés (céréales, tubercules, légumes, fruits, légumineuses, oléagineux, cultures de rente).
  2. **Indépendance des Photos** : La photo d'une société ne contamine jamais le catalogue global ou les autres sociétés (`company_products.image_url`). Trigger de protection `trg_protect_global_product_images` actif.
  3. **Parcours Société en 2 Étapes** : Étape 1 recherche catalogue officiel ou création produit privé hors catalogue ; Étape 2 personnalisation dénomination, unité, notes et photo de l'exploitation.
  4. **Espace Admin Dédié** : Route `/dashboard/admin/products` pour gestion complète du catalogue global officiel. Compte sécurisé `admin@marcheagricole.cd`.
  5. **Flux Revendeur Direct** : `/dashboard/reseller` affiche directement le flux des productions avec filtres réactifs (recherche textuelle, pills de catégories scrollables sur mobile, statut cultural, province).

---

## 3. FEUILLE DE ROUTE FUTURE (POST-V1 EXPÉRIMENTALE)

Les fonctionnalités suivantes sont officiellement documentées pour les versions ultérieures (V2+) :
1. **Paiement Mobile Money & pawaPay** : intégration transactionnelle des flux monétaires.
2. **Gestion des Abonnements Payants & Facturation**.
3. **Quotas Bloquants d'Utilisation**.
4. **QR Codes de Sécurisation des Retraits & Livraisons**.
5. **Logistique Avancée & Livraisons Partielles**.
6. **Algorithmes de Notation & Score de Fiabilité (0-100)**.
7. **IA Prédictive & Recommandations Agronomiques / Marché**.
8. **Application Mobile Native Flutter**.
