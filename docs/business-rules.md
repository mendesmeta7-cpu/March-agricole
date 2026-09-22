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
  - `completed` (Terminée) : Stock entièrement réservé ou date de clôture atteinte ;
  - `cancelled` (Annulée) : Campagne retirée par l'entreprise (les commandes déjà confirmées doivent être traitées ou résolues).

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

### 9.3 QR Code, Recherche Rapide et Confirmation de Livraison (Phase 16)
* **BR-ORD-06 (Génération de Jeton Opaque)** : À la création de toute commande, un jeton aléatoire unique (`qr_code_token`) est automatiquement généré via trigger Postgres. Il est strictement distinct de l'identifiant technique UUID pour éviter toute prévisibilité.
* **BR-ORD-07 (Présentation du QR Code Revendeur)** : Le revendeur peut afficher à tout moment son QR code et son numéro de commande lisible depuis son interface pour présentation à l'exploitation agricole lors du retrait physique.
* **BR-ORD-08 (Isolation Multi-Sociétés & Anti-Fuite)** : La recherche d'une commande via scan ou saisie manuelle (`lookup_order_for_delivery`) vérifie obligatoirement que l'utilisateur appartient à l'entreprise vendeuse. La tentative de consultation d'une commande d'une autre société renvoie un résultat vide neutre sans dévoiler aucune métadonnée.
* **BR-ORD-09 (Procédure Transactionnelle de Confirmation)** : La confirmation de livraison s'exécute via la procédure RPC `confirm_order_delivery` avec verrouillage pessimiste `FOR UPDATE`. Elle fige `orders.status = 'delivered'`, `delivered_at`, `delivered_quantity`, `delivered_by`, `delivery_notes`, confirme la réservation de stock (`stock_reservations.status = 'confirmed'`), trace l'événement dans `audit_logs` (`ORDER_DELIVERED`) et notifie le revendeur (`COMMANDE_LIVREE`).
* **BR-ORD-10 (Règle Anti-Double Livraison)** : Toute commande déjà en statut `delivered` ne peut faire l'objet d'une seconde confirmation. La procédure RPC lève une exception bloquante explicite.

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
