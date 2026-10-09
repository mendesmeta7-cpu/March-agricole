# RÈGLES MÉTIER OFFICIELLES V1 (docs/business-rules.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-09*

---

## 1. ENTREPRISES AGRICOLES (`Company`)

### 1.1 Inscription et Découplage Fondamental (Règle d'Or 1)
* **BR-COMP-01** : L'inscription d'une entreprise agricole crée exclusivement son compte utilisateur (`auth.users`), son profil utilisateur (`profiles`) et son entité morale (`companies`).
* **BR-COMP-02** : Aucune production agricole, aucun produit ni aucune campagne ne peuvent être créés lors du processus d'inscription ou d'onboarding.
* **BR-COMP-03** : Toute configuration agricole (produits, parcelles/exploitations, productions) s'opère impérativement depuis l'espace authentifié `/dashboard/company`.

### 1.2 Profil et Données d'Entreprise
* **BR-COMP-04** : Une entreprise agricole est caractérisée par :
  - Sa raison sociale / nom commercial (obligatoire) ;
  - Une description de son activité (optionnelle mais recommandée) ;
  - Un logo ou visuel de profil hébergé sur Supabase Storage ;
  - Son pays de rattachement et sa province/région principale d'implantation ;
  - Une adresse physique et des coordonnées de contact (téléphone, email professionnel) ;
  - Un statut de vérification administratif initialisé par défaut à `non vérifié` (`pending_verification` ou `unverified`).
* **BR-COMP-05** : Plusieurs utilisateurs peuvent être rattachés à une même entreprise via la table `company_members` avec des rôles prédéfinis (`owner`, `admin`, `member`). Le créateur initial de l'entreprise est automatiquement assigné comme `owner`.

---

## 2. REVENDEURS (`Reseller`)

### 2.1 Enregistrement et Déclaration Territoriale
* **BR-RES-01** : Lors de son inscription, le revendeur doit impérativement déclarer sa localisation opérationnelle de référence :
  - **Pays** (obligatoire) ;
  - **Province / Région** (obligatoire) ;
  - **Ville** (obligatoire si disponible pour la province, sinon champ textuel).
* **BR-RES-02** : La localisation du revendeur constitue la clé pivot permettant au système d'évaluer son éligibilité aux commandes sur les campagnes commerciales.
* **BR-RES-03** : Le profil revendeur comporte également sa dénomination commerciale ou nom complet, ses coordonnées téléphoniques et son adresse de livraison habituelle.

---

## 3. LOCALISATION ET GÉOGRAPHIE COMMERCIALE

* **BR-GEO-01** : La structure géographique de la plateforme est hiérarchique :
  $$\text{Pays} \longrightarrow \text{Province / Région} \longrightarrow \text{Ville}$$
* **BR-GEO-02** : En V1, le référentiel géographique initial cible la République Démocratique du Congo (RDC) avec ses 26 provinces officielles (Kinshasa, Kongo-Central, Kwilu, Kasaï, Haut-Katanga, etc.) tout en restant extensible à d'autres pays d'Afrique centrale.
* **BR-GEO-03** : Tout filtrage géographique V1 s'appuie sur les identifiants relationnels standardisés (`country_id`, `province_id`) afin d'éviter les fautes de saisie textuelle.

---

## 4. CATALOGUE ET PRODUITS AGRICOLES (`Product` & `CompanyProduct`)

* **BR-PROD-01 (Catalogue Global Officiel)** : Un produit du catalogue global représente une denrée agricole de base de référence (`is_global = TRUE`, `created_by_company_id = NULL`). Il est administré exclusivement par l'administrateur centralisé via `/dashboard/admin/products`.
* **BR-PROD-02 (Produits Personnalisés d'Entreprise)** : Lorsqu'une culture spécifique n'existe pas dans le catalogue officiel, une entreprise peut créer un produit personnalisé (`is_global = FALSE`, `created_by_company_id = company_id`). Ce produit est **strictement privé** à l'entreprise créatrice et n'apparaît jamais dans le catalogue global des autres exploitations.
* **BR-PROD-03 (Configuration d'Exploitation `company_products`)** : Une entreprise associe un produit (global ou privé) à son exploitation. Cette liaison porte ses spécificités locales :
  - Dénomination personnalisée / variété (`custom_name`) ;
  - Unité de mesure spécifique de l'exploitation (`unit`) ;
  - Notes et pratiques agronomiques (`notes`) ;
  - **Photo personnalisée de l'exploitation** (`image_url`).
* **BR-PROD-04 (Indépendance Stricte des Visuels)** : La photo configurée par une entreprise est enregistrée dans `company_products.image_url`. Elle n'écrase **JAMAIS** la photo officielle du catalogue (`products.image_url`) et n'affecte en aucun cas les autres exploitations. Le trigger `trg_protect_global_product_images` et les politiques RLS interdisent toute modification des images officielles par les entreprises.
* **BR-PROD-05 (Parcours d'Ajout en 2 Étapes)** :
  - **Étape 1 (Recherche)** : L'exploitant recherche dans le catalogue global officiel. Si le produit n'existe pas, un bouton dédié permet la création exceptionnelle d'un produit privé.
  - **Étape 2 (Configuration)** : L'exploitant affine la dénomination, l'unité, les notes et téléverse sa propre photo (avec prévisualisation par défaut de la photo officielle du catalogue si disponible).
* **BR-PROD-06 (Flux Revendeur comme Accueil)** : L'espace revendeur `/dashboard/reseller` affiche directement le flux des productions réelles (`FeedView`) avec recherche textuelle instantanée, sélecteur de catégories sous forme de « pills » horizontaux scrollables sur mobile, et filtres par province et statut cultural.

---

## 5. PRODUCTIONS AGRICOLES (`Production`)

### 5.1 Nature et Indépendance de la Production
* **BR-PRD-01** : Une production matérialise une récolte ou une session culturale planifiée par une entreprise pour un produit donné.
* **BR-PRD-02** : Une production n'est **en aucun cas** une campagne commerciale. Elle peut être enregistrée, suivie et clôturée sans jamais faire l'objet d'une mise en vente publique.

### 5.2 Caractéristiques d'une Fiche de Production
* **BR-PRD-03** : Toute fiche de production comprend :
  - Référence au produit du catalogue ;
  - Titre distinctif et description détaillée des conditions de culture ;
  - Une photographie principale de qualité (stockée sur Supabase Storage) ;
  - La zone ou exploitation de production ;
  - La quantité estimée ou récoltée et son unité de mesure (ex. : Tonnes, Sacs de 50 kg) ;
  - La période de récolte prévue (date de début et date de fin) ;
  - Son statut dans le cycle cultural.

### 5.3 Cycle de Vie et Statuts de la Production
* **BR-PRD-04** : Une production peut prendre exclusivement l'un des statuts suivants :
  - `draft` (Brouillon) : Fiche en cours de rédaction, visible uniquement par l'entreprise créatrice ;
  - `planned` (Planifiée) : Production programmée pour une saison future ;
  - `growing` (En cours de culture) : Culture en champ ;
  - `harvested` (Récoltée) : Récolte achevée, volume physique disponible en stock ;
  - `cancelled` (Annulée) : Production abandonnée ou détruite.
* **BR-PRD-05** : Seules les productions dont la visibilité est explicitement marquée comme publique (`is_public = true`) et ayant un statut actif (`planned`, `growing`, `harvested`) apparaissent dans le feed de découverte des revendeurs.

---

## 6. DEMANDES DU MARCHÉ (`Demand`)

### 6.1 Expression de la Demande par le Revendeur
* **BR-DEM-01** : Tout revendeur authentifié peut publier une expression de besoin (Demande).
* **BR-DEM-02** : Une demande contient :
  - Le produit recherché ;
  - La quantité souhaitée et l'unité ;
  - La zone géographique de destination (Pays, Province/Région, Ville) ;
  - La période ou date limite d'approvisionnement souhaitée ;
  - Des notes complémentaires (spécifications techniques, tolérances).
* **BR-DEM-03** : **Une demande n'est pas une commande**. Elle ne réserve aucun stock, n'engage aucun paiement et ne contraint juridiquement aucune partie.

### 6.2 Cycle de Vie de la Demande
* **BR-DEM-04** : Les statuts possibles d'une demande sont :
  - `active` (Active) : Demande ouverte et prise en compte dans les agrégations de marché ;
  - `converted` (Convertie) : Le revendeur a trouvé satisfaction et a passé une commande ferme correspondante ;
  - `cancelled` (Annulée) : Le revendeur a retiré son expression de besoin ;
  - `expired` (Expirée) : La période souhaitée est dépassée sans concrétisation.

---

## 7. ANALYSE TERRITORIALE DE LA DEMANDE

### 7.1 Décloisonnement Total pour les Entreprises
* **BR-MKT-01** : Toute entreprise agricole authentifiée a le droit d'accéder à l'agrégation statistique des demandes exprimées sur l'ensemble du territoire national.
* **BR-MKT-02** : **Aucune restriction de livraison ne s'applique à l'analyse de marché**. Si une entreprise basée dans le Kwilu livre actuellement Kinshasa, elle doit impérativement pouvoir observer les volumes demandés au Kasaï ou dans le Haut-Katanga.
* **BR-MKT-03** : La vue d'analyse agrège les volumes demandés par produit, par province et par horizon temporel afin d'éclairer les décisions agronomiques et logistiques des producteurs.

---

## 8. CAMPAGNES COMMERCIALES (`Campaign`)

### 8.1 Dérivation depuis une Production
* **BR-CMP-01** : Une campagne commerciale est obligatoirement adossée à une production existante de l'entreprise.
* **BR-CMP-02** : Une entreprise peut créer plusieurs campagnes successives ou parallèles à partir d'une même production (ex. : une campagne ciblant Kinshasa et une campagne ciblant Matadi).
* **BR-CMP-03** : La quantité commercialisable affectée à une campagne ne peut excéder la quantité disponible de la production parente.

### 8.2 Attributs d'une Campagne
* **BR-CMP-04** : Une campagne définit contractuellement :
  - La production source et le produit commercialisé ;
  - La quantité totale mise en vente (quantité commercialisable) ;
  - Le prix unitaire ferme et la devise (USD par défaut) ;
  - La date d'ouverture et la date de clôture de la campagne ;
  - La période estimée de disponibilité ou de mise à disposition de la marchandise ;
  - La liste explicite des **zones géographiques desservies** (`campaign_delivery_zones` : pays et provinces autorisées).

### 8.3 Statuts de la Campagne Commerciale
* **BR-CMP-05** : Les statuts admissibles d'une campagne sont strictement limités à :
  - `draft` (Brouillon) : Offre en cours de préparation, invisible pour les revendeurs ;
  - `active` (Active / Ouverte) : Campagne publiée, visible dans le catalogue des offres et ouverte à la commande pour les revendeurs éligibles ;
  - `paused` (Suspendue) : Prise de commande temporairement interrompue par l'entreprise ;
  - `completed` (Terminée) : Stock entièrement réservé, date de fin globale atteinte, ou toutes les destinations expirées ;
  - `cancelled` (Annulée) : Campagne retirée par l'entreprise (les commandes déjà confirmées doivent être traitées ou résolues).

### 8.4 Statut Réel, Multi-Destinations et Source Unique de Vérité (Étape 4)
* **BR-CMP-06 (Source Unique de Vérité du Statut Réel des Campagnes)** :
  - **Gestion Multi-Destinations** : Une campagne commerciale peut desservir plusieurs destinations (`campaign_destinations`), chacune possédant sa propre date limite de commande (`order_deadline_date`).
  - **Règle Fondamentale 1 (« Une destination expirée ≠ campagne terminée »)** : Lorsqu'une ou plusieurs destinations expirent mais qu'au moins une destination reste active (`order_deadline_date >= date_du_jour` ou `NULL`), la campagne globale reste **« ACTIVE »** (« Campagne en cours »). Les revendeurs situés sur les destinations encore actives peuvent continuer à commander, tandis que les destinations expirées refusent de nouvelles commandes tout en préservant leurs commandes passées.
  - **Règle Fondamentale 2 (« Toutes les destinations expirées = campagne terminée »)** : Dès que TOUTES les destinations configurées sur une campagne ont leur date limite dépassée (`order_deadline_date < date_du_jour`), la campagne globale bascule automatiquement au statut **« TERMINÉE »** (`completed`).
  - **Cas Particulier d'une Destination Unique** : Si une campagne ne possède qu'une seule destination et que sa date limite expire, la campagne globale passe immédiatement à `completed`.
  - **Fin par Date Globale** : Si la date de fin générale (`end_date`) de la campagne est dépassée (< aujourd'hui), la campagne est immédiatement considérée comme `completed`, indépendamment des destinations.
  - **Harmonisation Stricte Société / Revendeur** : Le calcul du statut s'appuie sur la source unique de vérité (`src/lib/utils/campaignStatus.ts` : `getEffectiveCampaignStatus()` et `isCampaignActive()`). Les deux espaces partagent la même réalité métier :
    - Côté Société : les campagnes terminées sont exclues de « Campagnes en cours » et basculent dans « Campagnes terminées », avec actualisation réactive des compteurs du Dashboard d'accueil (`/dashboard/company`) et de la vue Campagnes (`/dashboard/company/campaigns`).
    - Côté Revendeur : la campagne est exclue des offres actives du feed et du catalogue.
  - **Clôture Persistée & Fonction SQL** : La fonction PostgreSQL `public.check_and_close_expired_campaigns()` met à jour `status = 'completed'` en base dès que `end_date < CURRENT_DATE` ou que toutes les destinations ont `order_deadline_date < CURRENT_DATE`.
  - **Intégrité et Traçabilité Historique** : L'expiration d'une destination ou la clôture d'une campagne n'altère, n'annule et ne supprime AUCUNE commande existante, réservation, confirmation de livraison ou production associée. L'historique demeure intégralement consultable.

---

## 9. COMMANDES ET ÉLIGIBILITÉ GÉOGRAPHIQUE (`Order`)

### 9.1 Contrôle d'Éligibilité Territoriale
* **BR-ORD-01** : Un revendeur ne peut soumettre une commande sur une campagne que si sa province/région de rattachement fait partie intégrante de la liste des zones desservies (`campaign_delivery_zones`) de ladite campagne.
* **BR-ORD-02** : Si le revendeur tente de commander sur une campagne dont la zone ne couvre pas son territoire :
  - L'action de commande est bloquée avec un message explicite d'inéligibilité géographique ;
  - L'interface invite le revendeur à enregistrer une **Demande** pour notifier son besoin à l'entreprise.

### 9.2 Validation Ferme et Définition de la Commande
* **BR-ORD-03** : Une commande représente un engagement commercial ferme.
* **BR-ORD-04** : La commande fige contractuellement à l'instant de sa création :
  - L'identifiant du revendeur acquéreur ;
  - L'identifiant de la campagne et de l'entreprise venderesse ;
  - Le produit et la quantité commandée ;
  - Le prix unitaire appliqué au moment de l'enregistrement ;
  - Le montant total calculé ($\text{Quantité} \times \text{Prix Unitaire}$) et la devise.
* **BR-ORD-05** : Statuts d'une commande V1 :
  - `pending` (En attente de confirmation par l'entreprise) ;
  - `confirmed` (Confirmée par l'entreprise agricole) ;
  - `preparing` (En cours de préparation / conditionnement) ;
  - `ready` (Prête pour enlèvement ou expédition) ;
  - `delivered` (Livrée / réceptionnée par le revendeur) ;
  - `cancelled` (Annulée selon les conditions autorisées).

### 9.3 QR Code, Recherche Rapide et Confirmation de Livraison (Phase 16 & Correctif Ciblé)
* **BR-ORD-06 (Génération de Jeton Opaque)** : À la création de toute commande, un jeton aléatoire unique (`qr_code_token`) est automatiquement généré via trigger Postgres. Il est strictement distinct de l'identifiant technique UUID pour éviter toute prévisibilité.
* **BR-ORD-07 (Séparation des Rôles et Présentation du QR Code)** : 
  - **Côté Revendeur** : Le revendeur dispose du numéro de commande et du QR code associé dans son interface (`QRCodeModal`) afin de les présenter à la société agricole ou au gestionnaire de dépôt lors du retrait physique des marchandises.
  - **Côté Société** : L'interface "Commandes reçues" n'affiche **jamais** le QR code destiné au revendeur comme un élément à présenter. Le numéro de commande y figure uniquement comme une référence interne discrète (`Réf. CMD-...`) sans bouton de copie destiné à l'acheteur. La société visualise les informations utiles au traitement logistique (revendeur, produit, quantité, destination, dépôt, dates, statuts).
* **BR-ORD-08 (Validation Serveur Multi-Tenant & Anti-Fuite Inviolable)** :
  - La recherche d'une commande via scan ou saisie manuelle (`lookupOrderForDeliveryAction` / `lookup_order_for_delivery`) vérifie obligatoirement le rôle et l'identité de l'utilisateur authentifié.
  - **Pour une Société** : vérification stricte que `order.company_id === société_connectée.id`. Si la commande appartient à une autre société ou est introuvable, le serveur renvoie exclusivement : `"Ce QR code ou numéro de commande n'est pas valide pour votre société."` Aucune donnée (nom du revendeur, produit, volume, montant, statut, etc.) n'est divulguée.
  - **Pour un Revendeur** : vérification stricte que `order.reseller_id === revendeur_connecté.id`. Si la commande appartient à un autre revendeur ou est introuvable, le serveur renvoie : `"Ce QR code ou numéro de commande n'est pas valide pour votre compte."`
* **BR-ORD-09 (Procédure Transactionnelle de Confirmation)** : La confirmation de livraison s'exécute via la procédure RPC `confirm_order_delivery` avec verrouillage pessimiste `FOR UPDATE`. Elle fige `orders.status = 'delivered'`, `delivered_at`, `delivered_quantity`, `delivered_by`, `delivery_notes`, confirme la réservation de stock (`stock_reservations.status = 'confirmed'`), trace l'événement dans `audit_logs` (`ORDER_DELIVERED`) et notifie le revendeur (`COMMANDE_LIVREE`).
* **BR-ORD-10 (Règle Anti-Double Livraison)** : Toute commande déjà en statut `delivered` ne peut faire l'objet d'une seconde confirmation. La procédure RPC lève une exception bloquante explicite.
* **BR-ORD-11 (Ergonomie Mobile du Bouton Scanner Caméra)** : Un bouton scanner caméra unique est mis à disposition dans le widget de recherche. Sur appareil mobile, il se positionne de manière fixe (`fixed`) au-dessus de la barre de navigation avec prise en compte des safe areas, restant accessible en permanence sous le pouce pendant le défilement de la liste des commandes, sans duplication.
* **BR-ORD-12 (Confirmation de Livraison = Seule Source de Vérité pour les Ventes Réalisées — Prompt 3)** :
  - Une commande n'est réputée constituer une « vente réalisée » QUE si et seulement si son statut est `delivered`, scellé par l'exécution de la procédure transactionnelle `confirm_order_delivery`.
  - Toutes les commandes non livrées (`pending`, `confirmed`, `preparing`, `ready`, `cancelled`) représentent des engagements en cours ou annulés et sont STRICTEMENT EXCLUES de la comptabilisation des ventes réalisées.
  - Source unique de calcul applicative : `src/lib/utils/realizedSales.ts` (`calculateRealizedSales`, `isRealizedSale`).
  - Cloisonnement étanche des devises : les ventes réalisées en `CDF` et en `USD` sont strictement séparées et ne font l'objet d'aucune fusion ni conversion arbitraire.
* **BR-ORD-13 (Interdiction Absolue de Contournement vers 'delivered' — Prompt 3)** :
  - Il est formellement interdit de forcer le statut `delivered` via une mise à jour manuelle ordinaire de statut.
  - L'action serveur `updateOrderStatusAction` rejette toute tentative de basculer vers `delivered`.
  - Les interfaces graphiques (`CompanyOrdersView`, `CompanyOrderDetailView`) ne proposent pas `delivered` dans les sélecteurs manuels. La livraison requiert exclusivement le passage par `DeliveryConfirmationModal` (scan QR Code ou saisie du numéro de commande).
* **BR-ORD-14 (Statistiques Financières Fiables du Dashboard Société — Prompt 4)** :
  - **Distinction des trois notions financières** :
    1. *Valeur des commandes* : somme des montants contractuels enregistrés pour les commandes passées pendant la période sélectionnée selon leur date de création (`created_at`). Exclut les commandes annulées (`cancelled`).
    2. *Ventes livrées* : somme des montants contractuels enregistrés pour les commandes dont la livraison a été confirmée via `confirm_order_delivery` pendant la période sélectionnée selon leur date réelle de livraison (`delivered_at`). Exclut formellement les commandes en attente, confirmées, en cours, prêtes ou annulées.
    3. *Paiements encaissés* : aucun paiement en ligne revendeur n'existant en V1, aucun indicateur de paiement encaissé n'est simulé ni affiché comme disponible.
  - **Séparation stricte CDF / USD** : tous les calculs et affichages présentent séparément les totaux en `CDF` et en `USD`. Zéro conversion arbitraire et zéro addition inter-devises.
  - **Filtres temporels normés** :
    - *Aujourd'hui* : du jour à `00:00:00.000` au jour à `23:59:59.999`.
    - *Cette semaine* : du lundi à `00:00:00.000` au dimanche à `23:59:59.999`.
    - *Ce mois* : du 1er jour du mois à `00:00:00.000` au dernier jour du mois à `23:59:59.999`.
    - *Personnalisé* : date début à `00:00:00.000` et date fin à `23:59:59.999`.
  - **Zéro donnée fictive** : une période sans commande affiche 0 CDF, 0 USD et 0 commande au format soigné sans aucune donnée de démonstration.

---

## 10. GESTION DU STOCK ET RÉSERVATION TRANSACTIONNELLE

### 10.1 Formule de Stock et Règle d'Absence de Sur-Réservation
* **BR-STK-01** : Pour toute campagne commerciale active :
  $$\text{Stock Restant (Disponible)} = \text{Quantité Commercialisable} - \sum \text{Quantités Réservées des Commandes Valides}$$
  *(Une commande est considérée valide si son statut est `pending`, `confirmed`, `preparing` ou `ready`).*
* **BR-STK-02** : Si le revendeur saisit une quantité $Q_{\text{cmd}} > \text{Stock Restant}$, la commande doit être immédiatement rejetée avec le motif "Stock disponible insuffisant".

### 10.2 Concurrence et Atomicité de la Réservation (PostgreSQL Locking)
* **BR-STK-03** : **Aucune vérification frontend n'est réputée suffisante**. La validation finale du stock et la réservation s'effectuent au sein d'une transaction PostgreSQL (fonction RPC / `SELECT ... FOR UPDATE`).
* **BR-STK-04** : En cas de requêtes de commande simultanées par deux revendeurs sur un reliquat de stock, le moteur de base de données sérialise l'opération : le premier demandeur valide sa réservation, le second est rejeté ou invité à ajuster sa quantité.
* **BR-STK-05** : En cas d'annulation formelle d'une commande, la quantité réservée correspondante est immédiatement restituée au stock disponible de la campagne (`released`).

---

## 11. FEED DES PRODUCTIONS ET PROFILS PUBLICS

### 11.1 Feed de Découverte Revendeur
* **BR-FED-01** : Le feed revendeur affiche les productions dont la visibilité est publique et le statut actif.
* **BR-FED-02** : Chaque carte de production du feed présente impérativement :
  - La photographie principale en haute résolution ;
  - La dénomination du produit ;
  - Le nom de l'entreprise agricole et son logo ;
  - La zone géographique de culture ;
  - Le volume indicatif et la période de récolte ;
  - Un bouton d'action vers la fiche détaillée.
* **BR-FED-03** : Le clic sur l'entreprise ou son logo ouvre son **Profil Public**.

### 11.2 Profil Public de l'Entreprise Agricole
* **BR-PUB-01** : Le profil public d'une entreprise agricole expose :
  - Dénomination sociale, logo, description de l'exploitation ;
  - Province et ville d'implantation ;
  - Badge de vérification (si validé par l'administration) ;
  - Catalogue des productions publiques actives ;
  - Liste des campagnes commerciales actuellement ouvertes.
* **BR-PUB-02** : Aucune donnée privée (chiffre d'affaires, marge, documents légaux bruts, coordonnées bancaires, historique interne) ne doit être accessible sur le profil public.

---

## 12. POINTS EN SUSPENS OU À PRÉCISER (VALIDATION NÉCESSAIRE)

| Sujet | Point en suspens | Statut |
| :--- | :--- | :--- |
| **Politique d'annulation par le revendeur** | Le revendeur peut-il annuler unilatéralement une commande tant qu'elle est en statut `pending` sans accord préalable de l'entreprise ? *(Recommandé : Oui pour `pending`, Non à partir de `confirmed`).* | *À préciser / validation nécessaire* |
| **Seuil minimum de commande** | Faut-il autoriser une quantité minimale de commande (`minimum_order_quantity`) par campagne dès la V1 ? *(Recommandé : optionnel en V1, valeur par défaut = 1 unité).* | *À préciser / validation nécessaire* |
| **Date d'expiration automatique des demandes** | Quelle est la durée de validité par défaut d'une demande de revendeur si aucune date limite n'est précisée ? *(Recommandé : 30 jours par défaut).* | *À préciser / validation nécessaire* |

---

## 13. MÉCANISME FINANCIER, PRIX, DEVISES ET MONTANTS (Prompt 2 — Normalisation et Fiabilisation)

### 13.1 Formule de Calcul Universelle et Précision Monétaire
* **BR-FIN-01 (Formule Contractuelle)** : Le calcul du montant total des marchandises repose sur la multiplication directe :
  $$\text{Montant Total} = \text{Quantité Vendue} \times \text{Prix Unitaire}$$
  - Exemples validés :
    - 20 tonnes $\times$ 1 000 000 CDF/tonne = 20 000 000 CDF.
    - 100 caisses $\times$ 25 000 CDF/caisse = 2 500 000 CDF.
* **BR-FIN-02 (Précision Décimale et Arrondis)** : Le montant est calculé et arrondi avec une précision de 2 décimales conforme au type SQL `NUMERIC(14,2)` :
  $$\text{Total} = \text{Math.round}(\text{Quantité} \times \text{Prix Unitaire} \times 100) / 100$$
  L'affichage utilise impérativement le format numérique français (`fr-FR`) avec deux chiffres après la virgule (`minimumFractionDigits: 2`).

### 13.2 Cohérence Stricte entre Quantité, Prix et Unité de Vente
* **BR-FIN-03 (Unité Réelle de Vente)** : Le champ de prix unitaire indique sans ambiguïté l'unité à laquelle il s'applique :
  - `Prix unitaire (CDF/tonne)` pour une quantité en tonnes ;
  - `Prix unitaire (CDF/caisse)` pour une quantité en caisses ;
  - `Prix unitaire (USD/kg)` pour une quantité en kilogrammes.
* **BR-FIN-04 (Interdiction des Conversions Arbitraires)** : Le système ne convertit jamais silencieusement les tonnes en kilogrammes, les caisses en unités ou les sacs en kilogrammes. L'unité de vente contractuelle est celle de la production ou de la proposition adossée (`unitOfSale = selectedProduction?.unit || demand.unit`).

### 13.3 Devises Autorisées et Séparation Étanche (CDF / USD)
* **BR-FIN-05 (Devises Autorisées)** : Les seules devises admises en V1 sont `CDF` (Franc Congolais) et `USD` (Dollar Américain).
* **BR-FIN-06 (Cloisonnement Strict)** : Le prix unitaire, le sous-total de ligne et le montant total partagent obligatoirement la même devise contractuelle.
* **BR-FIN-07 (Interdiction d'Addition Directe et de Conversion Auto)** : Les montants en CDF et en USD ne doivent **jamais** être additionnés directement. Aucun taux de change arbitraire ou conversion automatique n'est appliqué. Les totaux doivent systématiquement être présentés ventilés par devise.

### 13.4 Validation et Intégrité Serveur
* **BR-FIN-08 (Validations Strictes des Entrées)** : Côté client et serveur (`createDemandProposalAction`, `createOrderAction`, `createOrderFromDemandResponseAction`) :
  - Quantité : nombre fini strictement positif ($> 0$), plafonné à $999\,999\,999$ ;
  - Prix unitaire : nombre fini strictement positif ($> 0$), plafonné à $999\,999\,999$ ;
  - Devise : strictement `'CDF'` ou `'USD'`.
  Toute valeur négative, nulle, infinie, non numérique ou hors plage est immédiatement rejetée avec un message explicite.
* **BR-FIN-09 (Immuabilité des Commandes Historiques)** : Les commandes historiques existantes constituent des engagements fermes scellés par snapshots. Aucun recalcul en masse ni réécriture rétroactive n'est autorisé.

---

## 14. STATISTIQUES FINANCIÈRES ET EXHAUSTIVITÉ TECHNIQUE (Prompts 4, 4.1 & 4.2)

### 14.1 Distinction des Définitions Métier
* **BR-FIN-10 (Engagements Enregistrés vs Ventes Livrées)** :
  - **Valeur des commandes** : Somme des montants des commandes dont la date de création (`created_at`) s'inscrit dans la période sélectionnée, avec **exclusion stricte des commandes annulées** (`status !== 'cancelled'`).
  - **Ventes livrées** : Somme des montants des commandes officiellement réceptionnées (`status === 'delivered'`) selon leur date de livraison validée (`delivered_at`) dans la période sélectionnée.
  - **Paiements encaissés** : Aucun champ de paiement encaissé n'est simulé en V1 en l'absence de passerelle en ligne. Une mention protectrice est affichée dans l'UI.

### 14.2 Garantie Technique d'Exhaustivité (Élimination du Plafond PostgREST)
* **BR-FIN-11 (Pagination Serveur par Blocs de 1 000)** :
  - La fonction `getCompanyOrdersForFinancials` pagine obligatoirement par blocs successifs de 1 000 lignes (`.range(from, to)`) afin d'outrepasser le plafond natif serveur `max_rows` de PostgREST.
  - Le tri est rendu 100% déterministe via `.order('created_at', { ascending: false }).order('id', { ascending: false })` pour interdire tout saut ou doublon entre pages.
  - Ne charge que les 5 champs financiers scalaires nécessaires (`status`, `total_amount`, `currency`, `created_at`, `delivered_at`) pour minimiser le coût mémoire et réseau.

### 14.3 Traitement des Erreurs et Anti-Faux-Zéros
* **BR-FIN-12 (Interdiction des Faux Zéros Silencieux)** :
  - En cas d'erreur réseau, timeout ou incident de pagination, le système ne doit **jamais** renvoyer un tableau vide ou un résultat partiel interprété silencieusement comme « 0 CDF / 0 USD ».
  - L'erreur doit être explicitement transmise au composant UI (`CompanyFinancialMetrics`), qui affiche un message d'alerte informant l'utilisateur que les calculs sont momentanément indisponibles afin de préserver la rigueur de ses comptes.

### 14.4 Isolation Multilocataire
* **BR-FIN-13 (Isolation Multi-Tenant Inviolable)** :
  - L'identifiant de société (`companyId`) alimentant les métriques financières provient exclusivement de la session vérifiée du serveur (`companies.created_by = user.id`).
  - Les règles PostgreSQL RLS empêchent toute fuite de données inter-entreprises.

