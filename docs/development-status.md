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
| **14a** | **Workflow Demandes, Notifications & Campagnes** | 🟢 **TERMINÉ** | Séparation formelle Demandes Générales / Demandes sur Production, propositions fermes & refus société (`demand_responses`), conversion en commande ferme via RPC atomique avec réservation de stock, centre de notifications internes (/notifications), analyse territoriale régionale par production, règle post-récolte stricte pour campagnes, suppression sécurisée des productions, suite de 5 tests SQL d'homologation validée. |
| **16** | **QR Code, Recherche Rapide & Confirmation de Livraison** | 🟢 **TERMINÉ** | Token QR opaque immuable généré par commande (`qr_code_token`), affichage modal QR côté revendeur (`/dashboard/reseller/orders/[id]`), widget de recherche rapide société (scan caméra `html5-qrcode` & saisie n°), contrôle d'accès strict anti-fuite multilocataire, RPC `lookup_order_for_delivery` & `confirm_order_delivery` avec verrouillage pessimiste et règle anti-double livraison, suite de 7 tests SQL validée. |

---

## 2. BILAN DE LA PHASE 16 (QR CODE, RECHERCHE RAPIDE & LIVRAISON V1)

* **Date de validation finale** : 2026-09-22
* **Statut du projet** : 🟢 **STABLE — LIVRAISON ET SCAN QR HOMOLOGUÉS**
* **Réalisations clés** :
  1. **Token QR Opaque & Immuable** :
     - Colonne `qr_code_token` générée automatiquement par trigger à chaque nouvelle commande.
  2. **Présentation Côté Revendeur** :
     - Modale vectorielle `QRCodeModal` affichant le QR code et le numéro lisible sur le détail et les cartes de commande revendeur.
  3. **Widget Recherche Rapide Société** :
     - `CompanyOrderLookupWidget` sur `/dashboard/company/orders` avec scanner caméra (`QRScannerModal`) et saisie manuelle.
  4. **Isolation Multi-Sociétés Stricte** :
     - La procédure `lookup_order_for_delivery` filtre strictement par l'entreprise de l'utilisateur connecté (`auth.uid()`).
     - Réponse neutre ("Commande introuvable") sans fuite d'information si la commande appartient à un tiers.
  5. **Confirmation de Livraison Sécurisée & Anti-Double Livraison** :
     - Procédure RPC `confirm_order_delivery` avec verrou pessimiste `FOR UPDATE`.
     - Statut figeant `delivered`, confirmation de la réservation de stock (`stock_reservations.status = 'confirmed'`), journalisation dans `audit_logs` (`ORDER_DELIVERED`) et notification `COMMANDE_LIVREE` au revendeur.
     - Exception explicite en cas de tentative de confirmation ultérieure.
  6. **Homologation Complète** :
     - Suite SQL `supabase/tests/phase16_qr_and_delivery_test.sql` validée (7/7 scénarios).
     - Build Next.js et TypeScript 100% conformes.

---

## 3. FEUILLE DE ROUTE FUTURE (POST-V1 EXPÉRIMENTALE)

Les fonctionnalités suivantes sont officiellement documentées pour les versions ultérieures (V2+) :
1. **Paiement Mobile Money & pawaPay** : intégration transactionnelle des flux monétaires.
2. **Gestion des Abonnements Payants & Facturation**.
3. **Quotas Bloquants d'Utilisation**.
4. **Logistique Avancée & Livraisons Partielles / Bons de transport multi-étapes**.
5. **Algorithmes de Notation & Score de Fiabilité (0-100)**.
6. **IA Prédictive & Recommandations Agronomiques / Marché**.
7. **Application Mobile Native Flutter**.
