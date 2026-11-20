# GUIDE DE DÉVELOPPEMENT RADIZA MOBILE (docs/mobile-development-guide.md)
*Memory Bank — Radiza Mobile (Expo, React Native, TypeScript)*
*Créé le 2026-11-19, mis à jour le 2026-11-20 — Étapes A (lecture et cartographie) et B (environnement) réalisées. Décisions D-M1 à D-M8 rendues le 2026-11-20 (ADR-067). État du socle : §7.*

Légende : ✅ vérifié dans le code ou sur le poste · 🔎 déduit · ❓ à confirmer · ⏸ en attente de décision

---

## 0. RÔLE DU DOCUMENT

* Ce document centralise progressivement les décisions, parcours, services, dépendances et étapes de Radiza Mobile.
* Il complète la mémoire existante sans la remplacer : `AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/business-rules.md`, `docs/security-rules.md`, `docs/data-model.md`, `docs/decisions-log.md`, `docs/development-status.md`, `docs/test-environment-setup.md`. Les règles métier et de sécurité restent celles de ces documents ; le mobile ne les redéfinit pas.
* Après chaque modification du projet mobile : mettre à jour ce guide, puis `docs/changelog.md`, `docs/development-status.md` et, pour une décision, `docs/decisions-log.md`. Les entrées historiques ne sont pas réécrites.
* La cartographie de l'interface web (§2) et la cartographie des API (rapport du Lot 0, 2026-11-19) servent de référence : toute fonctionnalité mobile part d'une fonctionnalité web identifiée ici.

---

## 1. CADRE ET DÉCISIONS

### 1.1 Périmètre
* Espaces **Société** (`company`) et **Revendeur** (`reseller`) uniquement. **L'administration reste exclusivement sur le Web.**
* Projet indépendant dans `mobile/`, sans modification du fonctionnement du Web.
* Première phase : interfaces, navigation et états **sans aucune donnée fictive** (Règle 2, D-M3 refusée, ADR-067). Aucune connexion à Supabase, à Vercel ni à la production avant la validation de la sécurité Supabase par le porteur du projet.
* Remplacement ultérieur des services fictifs par : Supabase Auth, requêtes et RPC Supabase autorisées (RLS), Supabase Storage, routes HTTP Vercel nécessaires (à créer, voir rapport du Lot 0). Jamais de clé `service_role` ni de secret dans l'application.

### 1.2 Contradictions relevées entre la mémoire, le code et la mission mobile
Aucune n'a été tranchée ni corrigée : elles sont signalées pour décision.

| Réf. | Constat | Sources | Effet sur le mobile |
| :--- | :--- | :--- | :--- |
| X1 | L'application mobile est classée **reportée** et prévue en **Flutter** (FUT-10) ; la mission lance une application **Expo / React Native**. | `PROJECT_CONTEXT.md` §9 (l.254) ; `docs/decisions-log.md` §19 FUT-10 ; `AGENTS.md` §3.5 (l.66) | ✅ Tranché (D-M4, ADR-067) : Expo, React Native et TypeScript ; FUT-10 conservée telle quelle. |
| X2 | **Règle 2 « aucune donnée fictive »** (interdiction formelle, y compris dans le code client) ; la mission demandait des données fictives locales pour la première phase. | `AGENTS.md` §2 Règle 2 ; `docs/business-rules.md` BR-ORD-14, BR-FIN-12 | ✅ Tranché (D-M3 refusée, ADR-067) : la Règle 2 s'applique au mobile, sans dérogation. |
| X3 | Les QR codes sont classés reportés (FUT-04, §9 « QR Codes de retrait et livraison ») alors qu'ils sont implémentés (Phase 16, BR-ORD-06 à BR-ORD-11). | `PROJECT_CONTEXT.md` l.248 ; `docs/decisions-log.md` FUT-04 ; `docs/business-rules.md` §9.3 | Écart antérieur au mobile. Le mobile suit le code (QR revendeur, scan société). |
| X4 | `docs/security-rules.md` §4 admet `image/svg+xml` dans `public-assets` ; la migration 030 restreint à JPEG, PNG et WebP. | `security-rules.md` l.91 ; `supabase/migrations/20260909000009_create_storage_buckets.sql:12` ; `20261101000030_security_hardening.sql:1459` | Le mobile n'enverra que JPEG, PNG, WebP. ❓ État réel en production (030 non appliquée selon la documentation). |
| X5 | BR-FIN-13 : la société vient de `companies.created_by = user.id` ; le code lit d'abord `company_members`, puis `companies.created_by` en repli. | `business-rules.md` BR-FIN-13 ; `src/lib/auth/currentCompany.ts:54-87` | Le mobile suivra le code (membre, puis créateur). |

### 1.3 Décisions préparatoires (rendues le 2026-11-20, ADR-067)

| Réf. | Sujet | Décision | Mise en œuvre |
| :--- | :--- | :--- | :--- |
| D-M1 | Node.js | ✅ Approuvée : Node 24 LTS portable sur D:, seulement pour le mobile ; Node du Web inchangé | §6.1 |
| D-M2 | `tsconfig.json` racine | ✅ Approuvée sous condition : exclusion minimale de `mobile/`, conséquences vérifiées, aucune autre configuration modifiée | §6.2 |
| D-M3 | Données fictives | ❌ **Refusée** : Règle 2 respectée, aucune donnée fictive dans le code client | §5.4 |
| D-M4 | Expo à la place de Flutter | ✅ Approuvée : Expo, React Native, TypeScript ; FUT-10 conservée | ADR-067 |
| D-M5 | Cache npm | ✅ Approuvée : hors de C: | §6.1 |
| D-M6 | Dépendances | ✅ Approuvée sous contrôle : nécessaires seulement, compatibles avec les versions retenues | §5.7 |
| D-M7 | Appareil de test | ✅ Approuvée : téléphone Android réel, version d'Expo Go compatible avec le SDK | §6.3 |
| D-M8 | Priorité des écrans | ✅ Approuvée : écrans prioritaires du §3, parcours du Web respectés | §7 |

Les données réelles ne seront branchées qu'après la validation de la sécurité Supabase par le porteur du projet.

---

## 2. CARTOGRAPHIE DES ESPACES SOCIÉTÉ ET REVENDEUR DU WEB (2026-11-19)

Relevé ✅ dans `src/app/dashboard/{company,reseller}`, `src/components/**` et `src/lib/{actions,queries}`. Les routes sont des pages serveur minces : elles lisent les données (fonctions `src/lib/queries/*` ou lectures `.from()` directes) puis délèguent l'affichage à un composant « View ». Les écritures passent par des Server Actions (`src/lib/actions/*`), inutilisables par le mobile (voir rapport du Lot 0).

Colonne **Voie** (classement du Lot 0) : **A** API Supabase réutilisable directement (RLS, RPC) · **B** API existante à adapter · **C** logique enfermée dans une Server Action ou une lecture serveur : service partagé + route `/api/mobile/v1` à créer · **D** fonctionnalité inexistante.

### 2.1 Navigation et gardes
| Élément | Web (fichiers) | Contenu | Mobile |
| :--- | :--- | :--- | :--- |
| Aiguillage | `app/dashboard/page.tsx`, `app/dashboard/notifications/page.tsx`, `middleware.ts` → `lib/supabase/middleware.ts:53-140` | Redirection selon `profiles.role` et `onboarding_status` ; `/onboarding` si incomplet ; `/unauthorized` si rôle étranger | Garde de navigation à l'ouverture (session, rôle, onboarding). La sécurité reste en base (RLS). |
| Menu Société | `components/company/CompanySidebar.tsx:63-108`, `CompanyBottomNav.tsx:48-114`, `CompanyHeader.tsx` | 8 entrées : Tableau de bord, Catalogue produits, Productions & récoltes, Demandes du marché, Campagnes, Commandes reçues (pastille commandes en attente), Notifications (pastille non lues), Profil de la société. Barre basse : 4 onglets + « Plus ». Déconnexion avec confirmation | Onglets : Tableau de bord, Productions, Campagnes, Commandes, Plus (Catalogue, Demandes, Notifications, Profil). Mêmes libellés (ADR-055, ADR-056). |
| Menu Revendeur | `components/reseller/ResellerSidebar.tsx:58-90`, `ResellerBottomNav.tsx:119-160`, `ResellerHeader.tsx` | 6 entrées : Tableau de bord (flux), Campagnes, Mes demandes, Mes commandes, Notifications (pastille), Mon profil. Barre basse : 4 onglets + « Plus » | Onglets : Tableau de bord, Campagnes, Demandes, Commandes, Plus (Notifications, Mon profil). |
| Gabarits | `app/dashboard/company/layout.tsx` (rôle, société, compteurs non lues et commandes en attente) ; `app/dashboard/reseller/layout.tsx` (rôle, revendeur, non lues) | Compteurs des pastilles | Compteurs lus par le service de notifications et de commandes. |

### 2.2 Authentification et onboarding (communs)
| Écran web | Fichiers | Champs et actions | Voie | Adaptation mobile |
| :--- | :--- | :--- | :--- | :--- |
| Connexion `/login` | `app/login/page.tsx`, `lib/actions/auth.ts:16`, `components/auth/GoogleSignInButton.tsx` | E-mail, mot de passe, redirection ; bouton Google | A (e-mail) / B (Google) | Session stockée sur l'appareil ; Google reporté (D-M à prendre au moment des données réelles). |
| Choix du compte `/register` | `app/register/page.tsx` | Société ou Revendeur | — | Écran de choix. |
| Inscription `/register/company`, `/register/reseller` | `app/register/*/page.tsx`, `auth.ts:95`, `auth.ts:165` | Nom complet, e-mail, téléphone, mot de passe ; Google | B | `signUp` avec `emailRedirectTo` explicite ; écran « vérifiez votre e-mail ». |
| Mot de passe oublié `/forgot-password` | `app/forgot-password/page.tsx`, `auth.ts:273` | E-mail | B | Demande depuis l'application ; la réinitialisation se termine sur le Web (preuve par cookie, `route.ts:203-216`). |
| Réinitialisation `/reset-password` | `app/reset-password/page.tsx`, `auth.ts:311` | Nouveau mot de passe, confirmation | C | Reste sur le Web en V1 mobile. |
| Onboarding `/onboarding` | `app/onboarding/page.tsx`, `components/onboarding/OnboardingForm.tsx`, `auth.ts:403` | Téléphone ; pays, province, ville ; Société : raison sociale, téléphone pro, adresse, description ; Revendeur : nom commercial, type (Grossiste, Demi-grossiste, Détaillant, Transformateur agroalimentaire), adresse de livraison. Rôle verrouillé (BR-AUTH-01 à 04) | A (RPC `complete_user_onboarding`) | Formulaire en étapes ; mêmes contrôles côté serveur. |
| Déconnexion | `auth.ts:233` (portée globale, l.236) | Confirmation | A | Déconnexion locale à l'appareil (à décider, Lot 0 §6). |

### 2.3 Espace Société

**S-01 — Tableau de bord** `/dashboard/company`
* Fichiers : `app/dashboard/company/page.tsx` (592 l.), `components/company/dashboard/*`, `loading.tsx` (squelette complet).
* Contenu (ordre ADR-063 D2) : bandeau compact (moins de 640 px), « Premiers pas » (produit, production, campagne ; « indisponible » si lecture en échec), alertes (`DashboardAlertCard`, liste statique, 3 visibles), actions à traiter (`CompanyPendingActions`), compteurs (`CompanyOverviewMetrics` : Productions — en culture, récoltées ; Demandes reçues — sans proposition, volume exprimé ; Campagnes actives — réservé, encore disponible ; Commandes reçues — à traiter, livrées), statistiques financières (`CompanyFinancialMetrics` : Aujourd'hui, Cette semaine, Ce mois, Historique complet, Personnalisé ; CDF et USD séparés, BR-FIN-10 à 12), graphiques (`CompanyDemandTrendChart` par produit, `CompanyDemandGeoChart` par province, une série par unité, BR-FIN-14), activité récente (`CompanyRecentActivity`).
* Données : 5 lectures directes dans la page (`productions`, `campaigns`, `demands` ×2, `company_products`), `getCompanyOrders`, `getCompanyOrdersForFinancials` (pagination par 1 000), `getCompanyGeneralDemands` ; calculs `sumByCurrency`, `sumByUnit`, `getEffectiveCampaignStatus`, `isConsumingReservation`, `buildProvinceBreakdownByUnit`. Chaque bloc gère sa panne (`settleRead`, `DataUnavailableNotice`).
* Voie **C/D** : agrégats calculés dans la page. Mobile : un service « tableau de bord » renvoyant les agrégats déjà calculés (route de lecture à créer). Écran vertical, graphiques simplifiés, périodes en sélecteur.

**S-02 — Catalogue produits** `/dashboard/company/products`
* Fichiers : `CompanyProductsView.tsx`, `CompanyProductCard.tsx`, `AddProductDrawer.tsx`, `EditProductDrawer.tsx`.
* Liste : « Volume total déclaré par unité », recherche (produit, variété, catégorie, unité, notes), filtre de catégorie, segment Tous / Actifs / Inactifs ; carte : modifier, archiver ou réactiver, supprimer (« Retirer ce produit de votre société ? ») ; vide : « Votre société n'a configuré aucun produit ».
* Ajout en 2 étapes (BR-PROD-05) : recherche dans le catalogue → configuration (dénomination, unité obligatoire : Tonne, Sac de 100, 50 ou 25 kg, Kilogramme, Carton, Panier ; description ; notes internes ; photo). Ou produit personnalisé privé : nom, catégorie et unité obligatoires, dénomination, description, photo.
* Actions : `associateCatalogProductAction` (`products.ts:99`), `createAndAssociateProductAction` (`:219`, RPC `create_custom_product_and_associate`), `updateCompanyProductAction` (`:314`), `toggleCompanyProductStatusAction` (`:399`), `deleteCompanyProductAction` (`:444`). Lectures `getCatalogProducts`, `getCompanyProducts`.
* Voie : **C** (photo, contrôles), **B** (archivage). Mobile : assistant en 2 écrans, photo par l'appareil photo ou la galerie, compression avant envoi.

**S-03 — Productions & récoltes** `/dashboard/company/productions`, `/new`, `/[id]`, `/[id]/edit`
* Fichiers : `CompanyProductionsView.tsx`, `ProductionCard.tsx`, `ProductionForm.tsx` (page, ADR-058/061), `ProductionDetailView.tsx`, `ProductionStatusBadge.tsx`.
* Liste : recherche (titre, produit, variété, localisation), filtres statut (Tous, En culture, Récoltée, Planifiée, Brouillon, Annulée) et produit ; carte : modifier, lancer une campagne, supprimer (si aucun historique), archiver ; vides : « Configurez d'abord votre catalogue produits », « Aucune production enregistrée pour le moment. ».
* Formulaire : produit cultivé, intitulé, site de culture, volume prévisionnel, unité (Tonne(s), Sac(s) de 50 ou 100 kg, Kilogramme(s), Cageot(s), Carton(s)), statut, visibilité publique, conditions culturales, mois de plantation et de récolte (1 à 12), photo (JPEG, PNG, WebP ; 5 Mo au plus côté serveur, compression à 900 Ko côté client).
* Détail : changement de statut, visibilité, suppression, analyse des demandes de la production (`getProductionDemandsAnalysis`).
* Actions : `createProductionAction` (`productions.ts:229`), `updateProductionAction` (`:405`), `updateProductionStatusAction` (`:570`), `toggleProductionVisibilityAction` (`:631`), `deleteProductionAction` (`:691`), `archiveProductionAction` (`:802`). Règles en base : BR-PRD-04-bis, BR-PRD-06, BR-PRD-07.
* Voie : **C** (création et modification avec photo, suppression), **B** (statut, visibilité, archivage).

**S-04 — Demandes du marché** `/dashboard/company/demands`, `/[id]`
* Fichiers : `MarketDemandsAnalysisView.tsx`, `CompanyDemandProposalModal.tsx`, `CompanyDemandDetailView.tsx`.
* Onglets « Demandes générales » et « Analyse territoriale » ; indicateurs (volume total recherché, provinces en demande, produits ciblés) ; filtres produit et province ; recherche ; refuser (confirmation) ; proposer (production, quantité, prix unitaire, devise CDF ou USD, message) ; détail avec productions compatibles et proposition existante.
* Données : `getCompanyGeneralDemands`, `getAggregatedMarketDemands` (vue `v_market_demands_aggregated`), `getCatalogProducts`, provinces, productions ; détail : `getDemandById`, `demand_responses`, `resellers`.
* Actions : `refuseDemandAction` (`demands.ts:273`), `createDemandProposalAction` (`:312`, puis notification).
* Voie : **C** (proposition avec notification), **B** (refus). Mobile : analyse en liste par province, sans tableau large.

**S-05 — Campagnes** `/dashboard/company/campaigns` (`?campagne=<id>` ouvre le détail ; `/[id]` redirige), `/new`, `/[id]/edit`
* Fichiers : `CompanyCampaignsView.tsx`, `CompanyCampaignCard.tsx`, `CompanyCampaignDetailDrawer.tsx`, `ReopenCampaignDialog.tsx`, `CampaignShareActions.tsx`, `CampaignForm.tsx` (1 347 l.).
* Liste : onglets Toutes, Actives, Brouillons, Suspendues, Clôturées, Annulées (statut effectif) ; recherche (titre, produit, production).
* Détail : stock réservé et disponible, destinations par état ; Ouvrir, Suspendre, Clôturer, Annuler (confirmation) ; reporter la date d'arrivée ; rouvrir (nouvelle date de fin, dates limites) ; partager le lien public `/campaigns/[id]` ; modifier.
* Formulaire en 5 étapes (`CampaignForm.tsx:669-673`) : production et offre (production récoltée, titre, quantité ≤ volume disponible, prix, devise, quantité minimale) ; calendrier et présentation (ouverture, clôture, période de disponibilité, description) ; destinations (provinces) ; configuration par destination (ville, date d'arrivée, date limite de commande, dépôts : nom, commune, quartier, adresse, complément) ; vérification et publication. Contrôles côté client : `CampaignForm.tsx:479-519`.
* Actions : `createCampaignAction` (`campaigns.ts:285`), `updateCampaignAction` (`:589`), `getProductionAvailabilityAction` (`:96`), `updateCampaignStatusAction` (`:888`), `reopenCampaignAction` (`:1060`), `updateDestinationArrivalDateAction` (`:1209`).
* Voie : création **C** (non atomique), modification **A** (RPC), statut **C** (notification), réouverture **A** + notification, dates **A**. Mobile : assistant plein écran, une étape par écran, brouillon conservé pendant la saisie.

**S-06 — Commandes reçues** `/dashboard/company/orders`, `/[id]`
* Fichiers : `CompanyOrdersView.tsx`, `CompanyOrderCard.tsx`, `CompanyOrderDetailDrawer.tsx`, `CompanyOrderDetailView.tsx`, `CompanyOrderLookupWidget.tsx`, `QRScannerModal.tsx` (chargé à la demande, `html5-qrcode`), `DeliveryConfirmationModal.tsx`.
* Liste : onglets En attente, Confirmées, En préparation, Prêtes, Livrées, Annulées ; filtre de campagne ; recherche ; vue cartes ou tableau ; changement de statut vers l'avant seulement (Confirmer, Préparer, Marquer prête — BR-ORD-05-bis) ; annulation (`pending`, `confirmed`) ; suivi en 5 étapes.
* Livraison : saisie du numéro ou scan du QR → fiche de la commande → confirmation (seulement `ready`). La société ne voit jamais le QR (BR-ORD-07).
* Actions : `updateOrderStatusAction` (`orders.ts:203`), `cancelOrderAction` (`:154`), `lookupOrderForDeliveryAction` (`:485`), `confirmOrderDeliveryAction` (`:750`). Lectures `getCompanyOrders`, `getCompanyOrderById`.
* Voie **A** (RPC). Mobile : scan par la caméra native, retour haptique, confirmation en bas d'écran.

**S-07 — Notifications** `/dashboard/company/notifications`
* Fichier : `CompanyNotificationsView.tsx`. Recherche ; onglets Toutes, Non lues, Demandes, Commandes, Campagnes ; groupes Aujourd'hui, Hier, Cette semaine, Plus anciennes ; marquer comme lue ; tout marquer comme lu ; lien vers l'élément (seules les adresses `/dashboard/company…` sont suivies, l.230-238).
* Types affichés 🔎 : `CAMPAGNE_OUVERTE`, `COMMANDE_CREEE`, `DATE_ARRIVEE_MODIFIEE`, `DEMANDE_ACCEPTEE`, `DEMANDE_GENERALE_RECUE`, `DEMANDE_PRODUCTION_RECUE`, `DEMANDE_REFUSEE`, `DEMANDE_REPONSE`.
* Actions : `markNotificationAsReadAction`, `markAllNotificationsAsReadAction`. Voie **A**. Mobile : correspondance adresse web → écran mobile.

**S-08 — Profil de la société** `/dashboard/company/profile`
* Fichiers : `CompanyProfileView.tsx`, `CompanyEditProfileDrawer.tsx`, `security/SecurityPasswordDrawer.tsx`.
* Onglets Identité, Coordonnées, Activité (productions, campagnes, commandes), Sécurité et session ; modifier le logo ; copier l'identifiant ; modification (raison sociale obligatoire, présentation, téléphone, e-mail, ville, adresse, logo, retrait du logo ; propriétaire ou administrateur de la société) ; mot de passe (actuel, code reçu par e-mail, nouveau et confirmation) ; déconnexion.
* Actions : `updateCompanyProfileAction` (`company.ts:19`), `changePasswordAction`, `getUserSecurityStatusAction`, `requestPasswordSetupOtpAction` (`security.ts`), `logoutAction`. Voie : **C** (logo, mot de passe).

### 2.4 Espace Revendeur

**R-01 — Tableau de bord (flux des productions)** `/dashboard/reseller` (`/feed` redirige)
* Fichiers : `FeedView.tsx`, `FeedHighlightBanner.tsx` (bannières, pause), `CategoryScroller.tsx` (pastilles), `FeedSearchBar.tsx`, `FeedFilters.tsx` (province ; cycle : en cours de culture, récoltée, planifiée), `FeedProductionCard.tsx`, `FeedSkeleton.tsx`.
* « Charger plus » : 12 productions par page (`lib/queries/feed.ts:119`) par `loadResellerFeedPageAction` (`app/dashboard/reseller/feedActions.ts:25`) ; actualiser ; panne : « Impossible de charger les productions ».
* Données : `getPublicFeedProductions`, `getActiveFeedCategories`, `getActiveFeedBanners`, provinces, campagnes actives.
* Voie **C** (lecture avec calculs serveur) ; bannières et catégories **A**. Mobile : liste continue, tirer pour actualiser, filtres en feuille basse.

**R-02 — Détail d'une production** `/dashboard/reseller/productions/[id]`
* Fichiers : page (373 l.), `ResellerProductionDetailActions.tsx`.
* Fiche (photo, statut, saisons, quantité), société, campagne active (`getActiveCampaignByProductionId`). « Commander sur cette production » si éligible ; sinon message (date limite dépassée, volume entièrement réservé, autre destination) ; « Faire une demande sur cette production » si le statut le permet.
* Voie : lecture **C**, commande **A**, demande **C**.

**R-03 — Fiche d'une société** `/dashboard/reseller/companies/[id]`
* Fichiers : `CompanyPublicProfileView.tsx`, `CompanyPublicHeader.tsx`, `CompanyPublicProductionsList.tsx` ; `getPublicCompanyProfile`, `getCompanyPublicProductions`. Voie **B** (colonnes publiques).

**R-04 — Campagnes** `/dashboard/reseller/campaigns`
* Fichiers : `ResellerCampaignsView.tsx`, `ResellerCampaignCard.tsx`, `ResellerCampaignDetailDrawer.tsx`, `ResellerCampaignSkeleton.tsx`.
* Recherche (produit, variété, société), filtre de catégorie, filtres en tiroir, réinitialisation ; carte avec éligibilité et disponible agrégé (BR-FED-04) ; détail : prix, stock restant, période, arrivages et dépôts, « Commander » ou invitation à formuler une demande hors zone ; partage.
* Données : `getResellerCampaigns` (éligibilité `lib/services/campaignEligibility.ts`, RPC `get_campaigns_available_quantity`). Voie **C** (lecture).

**R-05 — Passer une commande** (`OrderFormModal.tsx`)
* Quantité (minimum de la campagne, unité de la campagne), destination imposée par le territoire, dépôt de retrait (obligatoire s'il en existe), adresse ou entrepôt de livraison, notes. Succès : « Commande enregistrée ».
* Action `createOrderAction` (`orders.ts:27`) → RPC `create_order_with_reservation`. Voie **A**.

**R-06 — Mes demandes** `/dashboard/reseller/demands`
* Fichiers : `ResellerDemandsView.tsx`, `ResellerDemandCard.tsx`, `ResellerDemandDetailDrawer.tsx`, `DemandFormModal.tsx`, `ProductionDemandModal.tsx`, `DemandResponsesModal.tsx`.
* Compteurs ; recherche (produit, province, ville, notes) ; filtres type (générales, sur production), statut (Active, Convertie en commande, Annulée, Expirée), produit ; vide : « Vous n'avez encore exprimé aucune demande d'achat. ».
* Formulaire : produit, quantité, unité, pays, province, ville, période (début, fin), société ciblée ou « Toutes les sociétés (ouvert au marché) », notes. Demande sur production : quantité, province, ville, notes.
* Propositions reçues : « Accepter et Commander » → province, ville, adresse, notes → commande.
* Actions : `createDemandAction` (alias de `createGeneralDemandAction`, `demands.ts:149`), `updateDemandAction` (`:440`), `cancelDemandAction` (`:523`), `createProductionDemandAction` (`:154`), `createOrderFromDemandResponseAction` (`orders.ts:304`).
* Voie : création **C** (notification), modification et retrait **B**, commande depuis une proposition **A**.

**R-07 — Mes commandes** `/dashboard/reseller/orders`, `/[id]`
* Fichiers : `ResellerOrdersView.tsx`, `ResellerOrderCard.tsx`, `ResellerOrderDetailDrawer.tsx`, `ResellerOrderDetailView.tsx`, `QRCodeModal.tsx`, `ResellerOrderSkeleton.tsx`.
* Compteurs ; recherche multi-champs ; filtres de statut ; suivi Passée → Confirmée → Préparation → Prête → Livrée ; copier le numéro ; QR de retrait (jeton opaque) ; annulation si `pending` (BR-ORD-05-ter).
* Action `cancelOrderAction`. Voie **A**. Mobile : QR plein écran, luminosité, numéro lisible.

**R-08 — Notifications** `/dashboard/reseller/notifications`
* `ResellerNotificationsView.tsx` : Toutes, Non lues, Demandes, Offres, Commandes ; groupes par date ; marquer comme lue ; tout marquer ; liens limités à `/dashboard/reseller…` (l.242-250). Voie **A**.

**R-09 — Mon profil** `/dashboard/reseller/profile`
* Fichiers : `ResellerProfileView.tsx`, `ResellerEditProfileDrawer.tsx`, `ResellerEditLocationDrawer.tsx`, `SecurityPasswordDrawer.tsx`, `ResellerLogoutButton.tsx`.
* Onglets Identité, Coordonnées, Activité (commandes, demandes), Sécurité et session ; photo (changer, supprimer) ; profil (nom complet obligatoire, dénomination, typologie : Grossiste, Demi-grossiste, Détaillant, Transformateur agroalimentaire, téléphone) ; territoire (province obligatoire, ville, adresse ou dépôt habituel ; il détermine l'éligibilité aux commandes) ; mot de passe ; déconnexion.
* Actions : `updateResellerAvatarAction` (Cloudinary, `resellerProfile.ts:20`), `deleteResellerAvatarAction` (`:114`), `updateResellerGeneralProfileAction` (`:178`), `updateResellerLocationAction` (`resellers.ts:22`).
* Voie : photo **C** (secret Cloudinary, route obligatoire), profil et territoire **B**.

### 2.5 Pages publiques liées
`/campaigns/[id]` (`PublicCampaignView.tsx`, `PublicCampaignOrderAction.tsx` : lien de partage d'une campagne), `/companies/[id]`, `/privacy`, `/terms`, `/unauthorized`. Le mobile ouvrira les pages légales et les liens partagés sur le Web.

### 2.6 États transverses (à reproduire)
* Chargement : un `loading.tsx` par route (squelettes, `components/ui/Skeleton.tsx`), `NavigationProgress`.
* Pannes : `error.tsx` par espace (`RouteErrorView`) ; `DataUnavailableNotice` — une lecture en échec n'est jamais présentée comme une liste vide (ADR-049, ADR-054) ; `CompanyAccountMissing` (aucune société rattachée).
* Retours d'action : `Toast` / `useToast` (ADR-052) ; `ConfirmDialog` avant les actions destructives ; `PhotoUploadFeedback` ; `useUnsavedChangesGuard` (formulaires).
* Vides : `EmptyState` avec action proposée.

### 2.7 Éléments à ne pas transposer
* Composants non importés ✅ : `CampaignFormModal`, `EditCompanyProfileModal`, `ResellerAvatarSection`, `AddProductModal`, `EditProductModal`, `ProductionFormModal` (et `ProductionDrawer`, utilisé seulement par lui), `NotificationsView`, `ResellerProfileTerritoryCard` (et `ResellerLocationEditModal`).
* Actions sans appel depuis l'interface ✅ : `updateDestinationOrderDeadlineAction`, `setupPasswordWithOtpAction`.

---

## 3. ÉCRANS MOBILES À CONSTRUIRE

| Groupe | Écrans | Priorité proposée |
| :--- | :--- | :--- |
| Accès | Accueil, Connexion, Choix du compte, Inscription Société, Inscription Revendeur, E-mail à confirmer, Mot de passe oublié, Onboarding (2 variantes) | 1 |
| Revendeur | Flux (accueil), Détail production, Fiche société, Campagnes, Détail campagne, Passer commande, Mes commandes, Détail commande, QR de retrait | 1 |
| Revendeur | Mes demandes, Détail demande, Nouvelle / modifier une demande, Demande sur production, Propositions reçues → commander, Notifications, Mon profil, Modifier le profil, Modifier le territoire, Photo de profil | 2 |
| Société | Tableau de bord, Commandes reçues, Détail commande, Recherche et scan de livraison, Confirmation de livraison | 1 |
| Société | Productions (liste, détail, formulaire), Campagnes (liste, détail, assistant de création, modification, réouverture), Catalogue produits (liste, ajout en 2 étapes, modification), Demandes du marché (liste, analyse, détail, proposition), Notifications, Profil de la société, Modifier le profil et le logo | 2 |
| Commun | Sécurité (mot de passe : redirection vers le Web en V1 mobile ⏸), Déconnexion, Pages légales (Web) | 2 |

---

## 4. CORRESPONDANCE AVEC LES API (rappel du Lot 0)
* **A — directement réutilisable** : connexion, onboarding, géographie, bannières et catégories, notifications, commande sur campagne, annulation, commande depuis une proposition, statuts, recherche et confirmation de livraison, modification et réouverture de campagne, dates de destination, disponibilité, stock.
* **B — à adapter** : session, inscription, mot de passe oublié, Google, envoi de photos Storage, écritures simples (statut et visibilité des productions, produits, demandes, profils).
* **C — services partagés et routes `/api/mobile/v1` à créer** : création de campagne, productions et produits avec photo, demandes et propositions avec notification, profil Société avec logo, photo de profil Revendeur (Cloudinary), lectures calculées (flux, campagnes revendeur, commandes, tableau de bord, analyses).
* **D — à créer** : authentification Bearer des routes, suppression de compte, notifications push, retour OAuth vers l'application, version minimale de l'application, agrégats du tableau de bord.

---

## 5. ARCHITECTURE MOBILE PROPOSÉE (⏸ à valider)

### 5.1 Indépendance vis-à-vis du Web
* `mobile/` a son propre `package.json`, son `node_modules`, son `tsconfig.json`, son `.gitignore` et ses variables `EXPO_PUBLIC_*`. Aucun import de `src/` du Web en phase 1.
* Préalable : exclusion de `mobile` dans le `tsconfig.json` racine (D-M2). Vérification sans réécrire `tsconfig.tsbuildinfo` : `tsc --noEmit --incremental false --listFilesOnly` ne doit lister aucun fichier de `mobile/` 🔎.
* Les règles métier ne sont pas recopiées : les écrans affichent des valeurs déjà calculées par le serveur (statut effectif, disponible, éligibilité, totaux par devise).

### 5.2 Arborescence
```
mobile/
├── app/                      # Expo Router : un fichier = un écran
│   ├── _layout.tsx           # fournisseurs : thème, services, session, retours visuels
│   ├── index.tsx             # aiguillage : session, rôle, onboarding
│   ├── (auth)/               # accueil, connexion, inscriptions, mot de passe oublié, onboarding
│   ├── (company)/            # garde de rôle + onglets Société, écrans empilés
│   └── (reseller)/           # garde de rôle + onglets Revendeur, écrans empilés
├── src/
│   ├── domain/               # types métier (forme des réponses serveur), sans logique
│   ├── services/
│   │   ├── contracts/        # interfaces : AuthService, FeedService, CampaignService, OrderService…
│   │   ├── unconnected/      # implémentation actuelle : répond « non connecté », sans aucune donnée (§5.4)
│   │   ├── supabase/         # plus tard : Auth, lectures RLS, RPC, Storage
│   │   ├── http/             # plus tard : routes /api/mobile/v1
│   │   └── index.ts          # choix de l'implémentation
│   ├── hooks/                # chargement, erreurs, pagination, rafraîchissement
│   ├── components/
│   │   ├── ui/               # bouton, champ, sélecteur, feuille basse, squelette, vide, message, confirmation
│   │   └── business/         # cartes production, campagne, commande, demande ; pastilles de statut
│   ├── theme/                # couleurs, espacements, typographie, durées d'animation
│   └── lib/                  # formatage fr-FR des nombres, montants et dates
├── assets/                   # logos Radiza (copies des SVG de public/brand), icônes
├── app.config.ts, package.json, tsconfig.json
```

### 5.3 Couche de services
* Les écrans n'importent que des hooks et des types ; jamais une implémentation directement.
* Contrat commun, aligné sur le format proposé pour `/api/mobile/v1` :
```ts
export type ServiceError = { code: string; message: string };
export type Result<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export interface OrderService {
  listResellerOrders(filter: ResellerOrderFilter): Promise<Result<Page<ResellerOrder>>>;
  createOrder(input: CreateOrderInput): Promise<Result<{ orderId: string; orderNumber: string }>>;
  cancelOrder(orderId: string, reason?: string): Promise<Result<void>>;
}
```
* Services prévus : `AuthService`, `ProfileService`, `GeographyService`, `FeedService`, `CatalogService`, `ProductionService`, `CampaignService`, `DemandService`, `OrderService`, `NotificationService`, `MediaService`, `DashboardService`.
* `services/index.ts` choisit l'implémentation. Seule `unconnected` existe tant que les données réelles ne sont pas autorisées.

### 5.4 Aucune donnée fictive (D-M3 refusée, Règle 2)
1. Aucun compte, société, production, campagne, demande, commande, notification, stock ni chiffre fictif dans le code, y compris pour « remplir » un écran.
2. L'implémentation `unconnected` ne contient aucune donnée : chaque appel renvoie l'erreur `NOT_CONNECTED` (« Les données Radiza ne sont pas encore connectées à l'application mobile »). Elle ne fait aucun accès réseau.
3. Les écrans affichent alors un état « non connecté » explicite, jamais une liste vide ni un zéro (ADR-049, ADR-054).
4. Squelettes, états vides, états de panne et formulaires sont construits comme composants. Leur contenu réel viendra des services réels.
5. Les textes d'interface (libellés, titres, messages d'état vide) ne sont pas des données : ils reprennent le vocabulaire du Web (ADR-055, ADR-056).

### 5.5 Navigation et expérience
* Onglets en bas (4 + « Plus »), écrans de détail empilés, filtres en feuille basse, assistant plein écran pour les formulaires longs, bouton principal fixé en bas.
* Squelettes au premier chargement, tirer pour actualiser, listes continues, retours visuels (message bref et retour haptique) après chaque action, confirmation avant toute action destructive, protection des saisies non enregistrées (bouton retour Android compris).
* Formulaires : clavier adapté (numérique, e-mail, téléphone), champ suivant à la validation, erreurs sous le champ, saisie conservée après une erreur.

### 5.6 Identité visuelle (reprise du Web)
* Couleurs `forest` et `earth` de `tailwind.config.ts:87-112` (50 à 950) ; police système (`fontFamily.display` = police courante, décision du 2026-11-15).
* Animations : courbe `cubic-bezier(0.16, 1, 0.3, 1)`, entrées de 150 à 200 ms, fenêtres 320 ms, tiroirs 360 ms (ADR-057) ; réduction des animations respectée.
* Cibles tactiles d'au moins 44 px (ADR-063 D9), 48 dp recommandés sur Android.
* Logos `public/brand/radiza-horizontal.svg` et `radiza-compact.svg`, sans modification de couleurs ni de proportions (`PROJECT_CONTEXT.md` §10).
* Vocabulaire des menus et des écrans : ADR-055, ADR-056, ADR-064. Nombres en `fr-FR` ; CDF et USD jamais additionnés.

### 5.7 Dépendances proposées (⏸ D-M6)
* Socle (installées par `npx expo install`, versions compatibles SDK 58) : `expo`, `expo-router`, `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-constants`, `expo-status-bar`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`, `expo-image`, `expo-haptics`.
* Icônes : `lucide-react-native` (même famille que `lucide-react` du Web).
* Données : `@tanstack/react-query` (cache, états de chargement et de panne, pagination) — facultatif, recommandé.
* Plus tard, avec les données réelles : `@supabase/supabase-js`, `expo-secure-store`, `expo-image-picker`, `expo-image-manipulator`, `expo-camera`, `react-native-qrcode-svg` ❓, `expo-web-browser`, `expo-notifications`.

### 5.8 Configuration
* Variables publiques seulement (`EXPO_PUBLIC_*`) ; Expo ne lit pas les variables de Vercel. Plus tard : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`, par profil (développement, prévisualisation, production), jamais la production pendant le développement.

---

## 6. ENVIRONNEMENT DE DÉVELOPPEMENT (vérifications du 2026-11-19, lecture seule)

| Vérification | Constat | Conséquence |
| :--- | :--- | :--- |
| Node.js | v25.2.1 ✅ | ❌ hors des plages de `expo@58.0.26` et `react-native@0.88.1` (registre npm public, 2026-11-19). D-M1. |
| npm | 11.6.2 ✅ | — |
| Cache npm | sur C: ✅ | D-M5. |
| Paquets globaux | préfixe `D:\npm-global`, seul `@anthropic-ai/claude-code` ✅ | Ni `expo` ni `eas-cli` installés (normal : `npx expo`). |
| Disque C: | 2,3 Go libres sur 62 (97 %) ✅ | Risque déjà connu (fichier d'échange). |
| Disque D: | 18 Go libres ✅ | Suffisant pour `mobile/node_modules` (🔎 0,5 Go environ). |
| Disque M: | 459 Go libres ✅ | Possible pour Node portable et cache npm. |
| Mémoire | 3,9 Go ; 0,55 Go libres ; 1,6 Go de mémoire engagée libre ✅ | Metro possible mais serré 🔎 ; émulateur Android non viable 🔎. |
| SDK Android | `D:\Android\Sdk` : build-tools 35 et 36, plateformes 35 et 36, image système android-36 (Play Store, x86_64), émulateur, NDK, AVD `Medium_Phone_API_36` ; `adb` présent ✅ | Builds natifs locaux non prévus (mémoire). |
| JDK | 17.0.19, `JAVA_HOME` défini ✅ | Utile seulement pour un build natif local. |
| Chemins longs | `LongPathsEnabled = 1` ✅ | — |
| Chemin du projet | contient une espace et « é » ✅ | ❓ risque pour un build natif local (Gradle, CMake) ; sans effet attendu pour Expo Go et les builds EAS dans le nuage. |
| Dossier `mobile/` | absent ✅ | — |
| Ports 3000 et 8081 | libres ✅ | — |
| `tsconfig.json` racine | `include` `**/*.ts`, `**/*.tsx` ; `exclude` `node_modules` ✅ | D-M2. |
| `.gitignore` racine | `/node_modules` (racine seulement), `.env*.local` partout ✅ | Le `.gitignore` propre à `mobile/` couvrira `node_modules` et `.expo`. |
| Tailwind | `content` limité à `src/` ✅ | Aucun effet. |
| Version d'Expo | `expo@58.0.26` (latest), `expo-router@58.0.32`, `create-expo-app@5.0.0` ✅ (registre npm) | Expo Go doit correspondre au SDK 58 ❓. |
| Téléphone Android avec Expo Go | ❓ | D-M7. |
| Pare-feu Windows (port 8081) | ❓ | D-M7 ; sinon mode tunnel (service externe). |

---

## 7. ÉTAPES DE DÉVELOPPEMENT

| Étape | Contenu | État |
| :--- | :--- | :--- |
| A | Lecture de la mémoire, cartographie du Web (§2) | ✅ 2026-11-19 |
| B | Vérification de l'environnement (§6) | ✅ 2026-11-19 — bloquée par D-M1, D-M2 |
| 0 | Décisions D-M1 à D-M8 | ⏸ |
| 1 | Prérequis : Node 24 portable, cache npm hors de C:, exclusion `mobile` du `tsconfig.json` racine, contrôle que le typecheck et le build du Web sont inchangés | ⏸ |
| 2 | Socle : projet Expo TypeScript dans `mobile/`, navigation (accès, Société, Revendeur), thème, composants de base, contrats de services, services fictifs, bandeau de démonstration ; premiers écrans proposés : connexion et onboarding (fictifs), flux, détail production, passer commande, mes commandes et QR (Revendeur), tableau de bord et commandes reçues (Société) | ⏸ |
| 3 | Écrans restants Revendeur, puis Société (§3, priorité 2) | — |
| 4 | Bascule vers les données réelles, après les décisions du Lot 0 (environnement de test isolé, routes `/api/mobile/v1`, services partagés) | — |
| 5 | Builds de test (EAS), puis publication | — |

---

## 8. JOURNAL DU DOCUMENT
* **2026-11-19** — Création. Étapes A et B réalisées en lecture seule. Aucun fichier mobile, aucune installation, aucune modification du Web, de Supabase, de Vercel ni des variables d'environnement ; aucune commande Git. Seul ce document a été créé.
