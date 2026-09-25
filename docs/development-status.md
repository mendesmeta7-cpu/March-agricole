# ÉTAT DU DÉVELOPPEMENT ET FEUILLE DE ROUTE V1 (docs/development-status.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-25 — Phase 23 Validée et Homologuée (Stabilisation RLS & Catalogues)*

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
| **18** | **Stabilisation, Intégrité Historique & Cohérence Workflows** | 🟢 **TERMINÉ** | Snapshots immuables DB (`company_name_snapshot`, `campaign_title_snapshot`, `production_title_snapshot`, `product_name_snapshot`) avec triggers auto et LEFT JOINs anti-disparition, RLS revendeur étendu, blocage de suppression physique avec historique, route `/campaigns/new` opérationnelle (correction 404), bascule dynamique feed revendeur (`CAMPAGNE EN COURS` / `[ 🛒 Commander ]`), notifications d'expression de demandes et correction du broadcast, scan QR multi-format robuste (token, numéro, UUID), suite de tests validée et build 100% propre. |
| **19** | **Isolation des Comptes & Sécurité des Sessions** | 🟢 **TERMINÉ** | Élimination totale du bug de redirection inter-comptes, propagation intégrale des cookies SSR sur les redirections middleware (`redirectWithCookies`), purge atomique des cookies `sb-*` et revalidation au logout, sanitisation hermétique de `getTargetUrl` dans `NotificationsView`, passerelles universelles déterministes `/dashboard` et `/dashboard/notifications`, verrouillage `dynamic = force-dynamic`, suite de 20 tests validée à 100%. |
| **20** | **Évolution des Campagnes : Multi-Villes, Dépôts & Cycle de Vie** | 🟢 **TERMINÉ** | Destinations par ville (`campaign_destinations`), dépôts d'arrivée multiples (`campaign_depots`), report de date d'arrivée (`update_destination_arrival_date`) avec notifications ciblées `DATE_ARRIVEE_MODIFIEE`, fin automatique de campagne (`check_and_close_expired_campaigns`), snapshots d'arrivée/dépôt sur commandes, formulaires dynamiques UI et cards enrichies, suite de 8 tests SQL validée à 100%, build 36/36 routes certifié. |
| **21** | **Éligibilité Régionale Stricte des Commandes Revendeurs** | 🟢 **TERMINÉ** | Source de vérité serveur (`resellers.province_id`), contrôle inviolable dans `create_order_with_reservation`, verrouillage de la destination/dépôt sur le territoire revendeur, bouton conditionnel UI (Commander vs Non disponible dans votre région), notification ciblée régionale, suite de 10 tests SQL validée à 100%, build 36/36 certifié. |
| **22** | **Workflow Demandes, Notifications Ciblées & Consultation Détaillée** | 🟢 **TERMINÉ** | Notification ciblée par produit avec URL directe `/dashboard/company/demands/[id]`, vue détaillée `CompanyDemandDetailView` avec soumission de proposition ferme et consultation multi-propositions, décloisonnement complet de l'analyse territoriale, migration 20. |
| **23** | **Stabilisation RLS & Élimination de Récursion Infinie (42P17)** | 🟢 **TERMINÉ** | Fonctions helper `SECURITY DEFINER` (`can_company_view_demand`, `reseller_has_order_or_demand_on_production`, `reseller_has_order_on_company_product`), restauration intégrale de la visibilité des catalogues société, des productions et du flux revendeur, migration 21 appliquée via Supabase MCP, 0 régression, build 36/36 certifié. |

---

## 2. BILAN DE LA PHASE 23 (STABILISATION RLS & RESTAURATION DES FLUX)

* **Date de validation finale** : 2026-09-25
* **Statut du projet** : 🟢 **STABLE — RÉCURSION RLS ÉLIMINÉE, CATALOGUES & FLUX RESTAURÉS À 100%**
* **Réalisations clés** :
  1. **Élimination définitive de l'erreur PostgreSQL 42P17** :
     - Remplacement des sous-requêtes RLS circulaires par des fonctions `SECURITY DEFINER` étanches (`can_company_view_demand`, `reseller_has_order_or_demand_on_production`, `reseller_has_order_on_company_product`).
     - Restauration de la visibilité des 73 produits du catalogue, des 2 produits configurés de Synapta (`Maïs de Matadi`, `Pastèque de la vallée`), de sa production récoltée de pastèque et du flux revendeur public.
  2. **Persistance et Visibilité Immédiate après Configuration** :
     - Les produits configurés par une exploitation réapparaissent instantanément et persistent après actualisation.
  3. **Build & Tests 100% Validés** :
     - Compilation Next.js : 36/36 routes opérationnelles avec 0 erreur.
     - Tests d'accès société, revendeur et administrateur vérifiés avec succès sur données réelles.

---

## 3. BILAN DE LA PHASE 21 (RÈGLE MÉTIER CRITIQUE — ÉLIGIBILITÉ RÉGIONALE DES COMMANDES)

* **Date de validation finale** : 2026-09-24
* **Statut du projet** : 🟢 **STABLE — RÈGLE D'ÉLIGIBILITÉ RÉGIONALE HOMOLOGUÉE & BLINDÉE**
* **Réalisations clés** :
  1. **Source de Vérité Inviolable (`public.resellers.province_id`)** :
     - Récupération de la province du revendeur exclusivement depuis son enregistrement authentifié en base, ignorant tout paramètre client URL/localStorage/input.
  2. **Contrôle Serveur Atomique (`create_order_with_reservation`)** :
     - Suppression de l'ancienne surcharge de fonction vulnérable (7 paramètres).
     - Validation d'éligibilité : correspondance obligatoire entre la province du revendeur et les destinations (`campaign_destinations`) ou zones (`campaign_delivery_zones`). Rejet catégorique avec message : `"Cette campagne n'est pas disponible dans votre région"`.
     - Verrouillage de la destination et du dépôt sur le territoire revendeur (rejet si tentative de commander sur une autre ville/destination).
     - Alignement complet du schéma : snapshots immuables, absence de colonnes erronées.
  3. **Alignement des Notifications de Campagne (`notify_resellers_on_campaign_opened`)** :
     - Filtrage des alertes de campagne pour ne notifier que les revendeurs dont le territoire actuel est effectivement couvert par l'offre.
  4. **Adaptation Visuelle de l'Interface Sans Masquage** :
     - Le flux des productions et la liste des offres maintiennent la visibilité des campagnes pour tous les revendeurs.
     - Boutons d'action contextuels : `[ 🛒 Commander ]` en vert si éligible, `[ Non disponible dans votre région ]` si non éligible avec orientation vers l'expression de besoin.
     - `OrderFormModal` verrouillé strictement sur la destination du territoire du revendeur.
     - Confirmation explicite lors de la modification de localisation dans le profil avec préservation des commandes historiques.
  5. **Homologation Complète** :
     - Suite SQL `supabase/tests/phase21_reseller_regional_eligibility_test.sql` validée à 100% (10 scénarios réussis, dont 3 campagnes x 3 revendeurs et le test de contournement malveillant repoussé côté serveur).
     - Typecheck TypeScript (`npx tsc --noEmit`) : 0 erreur.
     - Compilation Next.js de production (`npm run build`) : 36/36 routes compilées avec succès.

---

## 3. BILAN DE LA PHASE 20 (ÉVOLUTION DES CAMPAGNES & LOGISTIQUE D'ARRIVÉE)

* **Date de validation finale** : 2026-09-23
* **Statut du projet** : 🟢 **STABLE — NOUVEAU FONCTIONNEMENT DES CAMPAGNES DÉPLOYÉ & HOMOLOGUÉ**
* **Réalisations clés** :
  1. **Destinations Multi-Villes & Dépôts d'Arrivée** :
     - Modélisation relationnelle : `campaign_destinations` (ville, date d'arrivée prévue, date précédente) et `campaign_depots` (nom, commune, quartier, adresse, complément).
     - RLS hermétique : lecture publique pour toute campagne active, insertion/mise à jour strictement réservée aux membres de l'entreprise propriétaire.
  2. **Attribution & Snapshots Logistiques Immuables** :
     - Enrichissement de `orders` avec `destination_id`, `depot_id`, `expected_arrival_date_snapshot`, `destination_city_snapshot`, `depot_name_snapshot`.
     - Intégration dans la RPC transactionnelle `create_order_with_reservation` avec vérification d'appartenance du dépôt et capture immuable du snapshot complet.
  3. **Report de Date d'Arrivée & Notifications Ciblées** :
     - Procédure RPC `update_destination_arrival_date` permettant à la société de décaler la date d'arrivée pour une ville donnée.
     - Mise à jour atomique du snapshot sur toutes les commandes actives (`pending`, `confirmed`, `preparing`, `ready`) de cette ville.
     - Émission de notification ciblée `DATE_ARRIVEE_MODIFIEE` strictement circonscrite aux revendeurs ayant commandé sur cette ville (zéro fuite inter-villes).
  4. **Fin Automatique de Campagne & Réactivation des Demandes** :
     - Procédure RPC `check_and_close_expired_campaigns()` et neutralisation automatique des campagnes dont `end_date < CURRENT_DATE`.
     - Blocage transactionnel de toute nouvelle commande dès la clôture.
     - Réactivation automatique du bouton « Faire une demande » dans le flux revendeur sur la production récoltée dès la fin de campagne.
  5. **Interfaces Utilisateur Responsive** :
     - `CampaignFormModal` : création intuitive multi-villes et multi-dépôts (accordéons dynamiques, validation de dates).
     - `OrderFormModal` : sélection guidée de la ville et du dépôt lors de la commande.
     - `CompanyCampaignCard` : consultation des villes d'arrivée et modale de report de date d'arrivée.
     - `ResellerOrderCard` & `ResellerOrderDetailView` : badge logistique et fiche détaillée d'arrivée et de retrait.
     - `CompanyOrderDetailView` : affichage complet de la ville, date et coordonnées du dépôt choisi.
     - `NotificationsView` : prise en charge complète du type `DATE_ARRIVEE_MODIFIEE` avec redirection sécurisée.
  6. **Homologation Complète** :
     - Suite SQL `supabase/tests/phase20_campaign_evolution_test.sql` exécutée et validée à 100% sur Supabase (8 étapes).
     - Typecheck TypeScript (`npx tsc --noEmit`) : 0 erreur.
     - Build de production Next.js (`npm run build`) : 36/36 routes compilées avec succès.

---

## 2. BILAN DE LA PHASE 18 (STABILISATION, INTÉGRITÉ HISTORIQUE & COHÉRENCE V1)

* **Date de validation finale** : 2026-09-22
* **Statut du projet** : 🟢 **STABLE — HISTORIQUE COMMERCIAL BLINDÉ & WORKFLOWS HARMONISÉS**
* **Réalisations clés** :
  1. **Snapshots Immuables et Résolution des Commandes Disparues** :
     - Les commandes et lignes de commandes intègrent désormais des colonnes figées garantissant la persistance intégrale des libellés et entreprises historiques même si la production, le produit ou la campagne parente est archivée ou désactivée.
     - Les requêtes SQL de commandes utilisent désormais des `LEFT JOIN` sécurisés avec repli automatique sur les snapshots.
  2. **Sécurisation RLS & Accès aux Données Historiques** :
     - Les politiques RLS sur `campaigns`, `productions` et `company_products` autorisent formellement les revendeurs à lire les entités liées à leurs commandes et demandes passées.
  3. **Suppression Sécurisée & Désactivation Douce** :
     - La suppression d'une production ou d'un produit configuré d'exploitation est strictement bloquée si un historique commercial (`orders`, `campaigns`, `demands`, `stock_reservations`) existe.
     - Le catalogue global officiel (`products`) est protégé de toute altération par une exploitation.
  4. **Résolution de l'Erreur 404 Campagne** :
     - Création de la route `/dashboard/company/campaigns/new` avec pré-remplissage et ouverture automatique de la modal adossée à la production récoltée.
  5. **Bascule Dynamique du Feed Revendeur en Campagne Active** :
     - Les productions associées à une campagne de vente active affichent un badge `CAMPAGNE EN COURS`, les informations de prix/stock disponible et un bouton prioritaire `[ 🛒 Commander ]` déclenchant la commande ferme.
  6. **Centre de Notifications & Ciblage Précis** :
     - Les demandes de revendeurs génèrent automatiquement une notification interne pour les exploitants (`notify_company_on_demand_received`).
     - Les notifications d'ouverture de campagne ciblent strictement les revendeurs ayant fait une demande sur cette production.
  7. **Robustesse du Scan QR & Recherche Commande** :
     - Sélection systématique de `qr_code_token`, prise en charge transparente des URL scannées, jetons, identifiants `CMD-...` et UUIDs par la procédure `lookup_order_for_delivery`.
  8. **Homologation Complète** :
     - Suite SQL `supabase/tests/phase18_stabilization_and_coherence_test.sql` exécutée et validée avec succès sur Supabase.
     - Typecheck TypeScript (`npx tsc --noEmit`) : 0 erreur.
     - Build Next.js de production (`npm run build`) : 34/34 routes compilées avec succès.

---

## 3. BILAN DE LA PHASE 16 (QR CODE, RECHERCHE RAPIDE & LIVRAISON V1)

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
