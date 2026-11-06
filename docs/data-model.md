# MODÈLE RELATIONNEL ET STRUCTURE DES DONNÉES V1 IMPLÉMENTÉ (docs/data-model.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-09 — Phase 1 Validée et Déployée*

---

## 1. VUE D'ENSEMBLE DU MODÈLE RELATIONNEL IMPLÉMENTÉ

Le schéma relationnel déployé sur le projet Supabase/PostgreSQL **"Marché agricole"** isole strictement les 5 concepts clés du métier (`Produit`, `Production`, `Demande`, `Campagne`, `Commande` & `Réservation`) tout en garantissant l'intégrité référentielle, le cloisonnement des données, l'efficacité des index et la concurrence atomique des réservations.

```mermaid
erDiagram
    COUNTRIES ||--o{ PROVINCES : "contient"
    PROVINCES ||--o{ CITIES : "contient"
    PROVINCES ||--o{ RESELLERS : "localise"
    PROVINCES ||--o{ COMPANIES : "localise"
    PROVINCES ||--o{ DEMANDS : "cible"
    PROVINCES ||--o{ CAMPAIGN_DELIVERY_ZONES : "couverte par"

    PROFILES ||--o| RESELLERS : "définit profil"
    PROFILES ||--o{ COMPANY_MEMBERS : "appartient à"
    COMPANIES ||--o{ COMPANY_MEMBERS : "gère membres"
    PROFILES ||--o{ COMPANIES : "créée par"

    PRODUCTS ||--o{ COMPANY_PRODUCTS : "configuré par"
    COMPANIES ||--o{ COMPANY_PRODUCTS : "cultive"
    PRODUCTS ||--o{ PRODUCTIONS : "catégorise"
    COMPANIES ||--o{ PRODUCTIONS : "déclare"

    PRODUCTS ||--o{ DEMANDS : "recherché"
    RESELLERS ||--o{ DEMANDS : "exprime"
    COMPANIES ||--o{ DEMANDS : "peut cibler"

    PRODUCTIONS ||--o{ CAMPAIGNS : "donne lieu à"
    COMPANIES ||--o{ CAMPAIGNS : "lance"
    CAMPAIGNS ||--o{ CAMPAIGN_DELIVERY_ZONES : "dessert"
    
    CAMPAIGNS ||--o{ ORDERS : "reçoit"
    RESELLERS ||--o{ ORDERS : "passe"
    COMPANIES ||--o{ ORDERS : "traite"
    
    ORDERS ||--o{ ORDER_ITEMS : "détaille"
    ORDERS ||--o| STOCK_RESERVATIONS : "bloque stock"
    CAMPAIGNS ||--o{ STOCK_RESERVATIONS : "débite"
```

---

## 2. DICTIONNAIRE DÉTAILLÉ DES 17 TABLES CRÉÉES

### 2.1 Référentiel Géographique

#### `countries`
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `code` : `VARCHAR(3) NOT NULL UNIQUE` (ex. : `COD`)
* `name` : `VARCHAR(100) NOT NULL`
* `currency_code` : `VARCHAR(3) NOT NULL DEFAULT 'USD'`
* `is_active` : `BOOLEAN NOT NULL DEFAULT TRUE`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `provinces`
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `country_id` : `UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT`
* `code` : `VARCHAR(10) NOT NULL` (ex. : `KIN`, `KAS`)
* `name` : `VARCHAR(100) NOT NULL`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `uq_provinces_country_name UNIQUE (country_id, name)`
* *Index* : `idx_provinces_country_id`

#### `cities`
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `province_id` : `UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE`
* `name` : `VARCHAR(100) NOT NULL`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `uq_cities_province_name UNIQUE (province_id, name)`
* *Index* : `idx_cities_province_id`

---

### 2.2 Identité et Acteurs

#### `profiles` (Extension de `auth.users`)
* `id` : `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
* `role` : `VARCHAR(20) NOT NULL DEFAULT 'unassigned' CHECK (role IN ('unassigned', 'company', 'reseller', 'admin'))`
* `full_name` : `VARCHAR(255) NOT NULL`
* `phone` : `VARCHAR(50)`
* `avatar_url` : `TEXT`
* `avatar_cloudinary_public_id` : `TEXT`
* `onboarding_status` : `VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'completed'))`
* `intended_role` : `VARCHAR(20) CHECK (intended_role IS NULL OR intended_role IN ('company', 'reseller'))` *(Verrouillage du type initial capturé au signUp via trigger SECURITY DEFINER, immuable pour le rôle authenticated — AUTH-4.38)*
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Triggers* : `trg_profiles_updated_at`, `trg_check_profile_creation_role`, `trg_prevent_profile_role_escalation`

#### `companies` (Entreprises Agricoles)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `name` : `VARCHAR(255) NOT NULL`
* `slug` : `VARCHAR(255) NOT NULL UNIQUE`
* `description` : `TEXT`
* `logo_url` : `TEXT`
* `country_id` : `UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT`
* `province_id` : `UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT`
* `city` : `VARCHAR(100)`
* `address` : `TEXT`
* `phone` : `VARCHAR(50)`
* `email` : `VARCHAR(255)`
* `verification_status` : `VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'))`
* `is_active` : `BOOLEAN NOT NULL DEFAULT TRUE`
* `created_by` : `UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Index* : `idx_companies_province_id`, `idx_companies_created_by`, `idx_companies_verification_status`
* *Trigger* : `trg_companies_updated_at`

#### `company_members` (Collaborateurs)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `company_id` : `UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
* `user_id` : `UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
* `role` : `VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member'))`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `uq_company_members UNIQUE (company_id, user_id)`
* *Index* : `idx_company_members_user_id`, `idx_company_members_company_id`

#### `resellers` (Revendeurs)
* `id` : `UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE`
* `business_name` : `VARCHAR(255)`
* `country_id` : `UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT`
* `province_id` : `UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT`
* `city` : `VARCHAR(100)`
* `delivery_address` : `TEXT`
* `reseller_type` : `VARCHAR(50) NOT NULL DEFAULT 'wholesaler' CHECK (reseller_type IN ('wholesaler', 'semi_wholesaler', 'retailer', 'processor'))`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Index* : `idx_resellers_province_id`, `idx_resellers_country_id`
* *Trigger* : `trg_resellers_updated_at`

---

### 2.3 Catalogue et Productions Agricoles

#### `products` (Catalogue Général & Produits Privés)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `name` : `VARCHAR(150) NOT NULL`
* `category` : `VARCHAR(100) NOT NULL`
* `description` : `TEXT`
* `default_unit` : `VARCHAR(30) NOT NULL DEFAULT 'tonne'`
* `image_url` : `TEXT` (Photo officielle si global, ou photo privée d'origine si créé par entreprise)
* `is_active` : `BOOLEAN NOT NULL DEFAULT TRUE`
* `is_global` : `BOOLEAN NOT NULL DEFAULT FALSE` (TRUE pour le catalogue officiel admin, FALSE pour les produits privés société)
* `created_by_company_id` : `UUID REFERENCES companies(id) ON DELETE CASCADE` (NULL pour les produits globaux officiels)
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contraintes & Index* :
  - `idx_products_global_name_unique` : `UNIQUE (LOWER(TRIM(name))) WHERE is_global = TRUE`
  - `idx_products_custom_name_unique` : `UNIQUE (created_by_company_id, LOWER(TRIM(name))) WHERE is_global = FALSE`
  - `idx_products_category`, `idx_products_is_active`, `idx_products_is_global`
* *Triggers* : `trg_products_updated_at`, `trg_protect_global_product_images` (interdit l'écrasement des images officielles)

#### `company_products` (Produits configurés par l'Entreprise)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `company_id` : `UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
* `product_id` : `UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
* `custom_name` : `VARCHAR(150)` (Dénomination d'exploitation / variété locale)
* `image_url` : `TEXT` (Photo personnalisée de l'entreprise — strictly distincte de l'image catalogue)
* `unit` : `VARCHAR(30)` (Unité propre à l'exploitation, par défaut hérite de `default_unit`)
* `notes` : `TEXT` (Notes agronomiques ou commerciales de l'exploitation)
* `description` : `TEXT`
* `is_active` : `BOOLEAN NOT NULL DEFAULT TRUE`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `uq_company_products UNIQUE (company_id, product_id)`
* *Index* : `idx_company_products_company_id`, `idx_company_products_product_id`
* *Trigger* : `trg_company_products_updated_at`

#### `productions` (Cultures et Récoltes Déclarées)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `company_id` : `UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
* `product_id` : `UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
* `company_product_id` : `UUID REFERENCES company_products(id) ON DELETE SET NULL`
* `title` : `VARCHAR(255) NOT NULL`
* `description` : `TEXT`
* `main_image_url` : `TEXT NOT NULL`
* `location_name` : `VARCHAR(255) NOT NULL`
* `expected_quantity` : `NUMERIC(12,2) NOT NULL CHECK (expected_quantity > 0)`
* `unit` : `VARCHAR(30) NOT NULL DEFAULT 'tonne'`
* `period_start` : `DATE NOT NULL`
* `period_end` : `DATE`
* `status` : `VARCHAR(30) NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'growing', 'harvested', 'cancelled'))`
* `is_public` : `BOOLEAN NOT NULL DEFAULT TRUE`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `chk_productions_period CHECK (period_end IS NULL OR period_end >= period_start)`
* *Index* : `idx_productions_company_id`, `idx_productions_product_id`, `idx_productions_status_public`, `idx_productions_period_start`
* *Trigger* : `trg_productions_updated_at`

---

### 2.4 Demandes et Analyse Territoriale

#### `demands` (Expressions de Besoin)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `reseller_id` : `UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE`
* `product_id` : `UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
* `target_company_id` : `UUID REFERENCES companies(id) ON DELETE SET NULL`
* `quantity` : `NUMERIC(12,2) NOT NULL CHECK (quantity > 0)`
* `unit` : `VARCHAR(30) NOT NULL DEFAULT 'tonne'`
* `country_id` : `UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT`
* `province_id` : `UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT`
* `city` : `VARCHAR(100)`
* `target_period_start` : `DATE`
* `target_period_end` : `DATE`
* `notes` : `TEXT`
* `status` : `VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'cancelled', 'expired'))`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `chk_demands_period CHECK (target_period_end IS NULL OR target_period_start IS NULL OR target_period_end >= target_period_start)`
* *Index* : `idx_demands_reseller_id`, `idx_demands_product_id`, `idx_demands_province_id`, `idx_demands_status`, `idx_demands_target_company`
* *Trigger* : `trg_demands_updated_at`

#### `demand_responses` (Propositions Commerciales des Sociétés)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `demand_id` : `UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE`
* `company_id` : `UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
* `production_id` : `UUID REFERENCES productions(id) ON DELETE SET NULL`
* `proposed_quantity` : `NUMERIC(12,2) NOT NULL CHECK (proposed_quantity > 0)`
* `unit` : `VARCHAR(30) NOT NULL` (Unité réelle de vente adossée à la production)
* `unit_price` : `NUMERIC(12,2) NOT NULL CHECK (unit_price > 0)`
* `currency` : `VARCHAR(3) NOT NULL DEFAULT 'CDF' CHECK (currency IN ('CDF', 'USD'))`
* `message` : `TEXT`
* `status` : `VARCHAR(30) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'ordered', 'refused', 'cancelled'))`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `UNIQUE (demand_id, company_id)`
* *Index* : `idx_demand_responses_demand_id`, `idx_demand_responses_company_id`, `idx_demand_responses_status`
* *Trigger* : `trg_demand_responses_updated_at`

#### `v_market_demands_aggregated` (Vue SQL Décloisonnée)
Vue d'analyse macro calculée dynamiquement sur les demandes actives (`status = 'active'`) agrégées par `product_id`, `country_id`, `province_id`, `unit`. Accessible à toutes les entreprises.

---

### 2.5 Campagnes Commerciales et Zones Desservies

#### `campaigns` (Offres de Commercialisation)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `company_id` : `UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
* `production_id` : `UUID NOT NULL REFERENCES productions(id) ON DELETE RESTRICT`
* `product_id` : `UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
* `title` : `VARCHAR(255) NOT NULL`
* `description` : `TEXT`
* `marketable_quantity` : `NUMERIC(12,2) NOT NULL CHECK (marketable_quantity > 0)`
* `unit` : `VARCHAR(30) NOT NULL DEFAULT 'tonne'`
* `unit_price` : `NUMERIC(12,2) NOT NULL CHECK (unit_price > 0)`
* `currency` : `VARCHAR(3) NOT NULL DEFAULT 'USD'`
* `min_order_quantity` : `NUMERIC(12,2) DEFAULT 1 CHECK (min_order_quantity > 0)`
* `start_date` : `DATE NOT NULL`
* `end_date` : `DATE`
* `availability_period` : `VARCHAR(150)`
* `status` : `VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'))`
* `status_before_completion` : `VARCHAR(30)` (migration 32, non appliquée ; statut d'origine d'une campagne `completed`, écrit uniquement par le trigger `trg_guard_campaign_business_rules`)
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `chk_campaigns_dates CHECK (end_date IS NULL OR end_date >= start_date)`
* *Contrainte* : `chk_campaigns_status_before_completion` (vide, ou campagne `completed` avec `draft`, `active` ou `paused`)
* *Index* : `idx_campaigns_company_id`, `idx_campaigns_production_id`, `idx_campaigns_product_id`, `idx_campaigns_status`, `idx_campaigns_start_date`
* *Trigger* : `trg_campaigns_updated_at`

#### `campaign_delivery_zones` (Zones Provinciales Couvertes)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `campaign_id` : `UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE`
* `country_id` : `UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT`
* `province_id` : `UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Contrainte* : `uq_campaign_delivery_zones UNIQUE (campaign_id, province_id)`
* *Index* : `idx_campaign_delivery_zones_campaign`, `idx_campaign_delivery_zones_province`

---

### 2.6 Commandes, Lignes Contractuelles, Réservations et Audit

#### `orders` (Entêtes de Commandes)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `order_number` : `VARCHAR(50) NOT NULL UNIQUE` (Format : `CMD-YYYYMMDD-XXXXXXXX`)
* `qr_code_token` : `VARCHAR(64) NOT NULL UNIQUE` (Token aléatoire cryptographique pour QR Code)
* `reseller_id` : `UUID NOT NULL REFERENCES resellers(id) ON DELETE RESTRICT`
* `company_id` : `UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT`
* `campaign_id` : `UUID REFERENCES campaigns(id) ON DELETE RESTRICT`
* `origin_type` : `VARCHAR(30) NOT NULL DEFAULT 'direct_campaign' CHECK (origin_type IN ('direct_campaign', 'demand_response'))`
* `demand_response_id` : `UUID REFERENCES demand_responses(id) ON DELETE SET NULL`
* `production_id` : `UUID REFERENCES productions(id) ON DELETE SET NULL`
* `total_amount` : `NUMERIC(14,2) NOT NULL CHECK (total_amount > 0)`
* `currency` : `VARCHAR(3) NOT NULL DEFAULT 'USD'`
* `delivery_province_id` : `UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT`
* `delivery_city` : `VARCHAR(100)`
* `delivery_address` : `TEXT`
* `status` : `VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'))`
* `delivered_at` : `TIMESTAMPTZ` (Horodatage de la remise physique)
* `delivered_quantity` : `NUMERIC(12,2)` (Quantité effectivement remise)
* `delivered_by` : `UUID REFERENCES profiles(id)` (Agent société ayant validé la livraison)
* `delivery_notes` : `TEXT` (Notes de livraison)
* `notes` : `TEXT`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Index* : `idx_orders_reseller_id`, `idx_orders_company_id`, `idx_orders_campaign_id`, `idx_orders_status`, `idx_orders_created_at`, `idx_orders_qr_code_token`
* *Trigger* : `trg_orders_updated_at`, `trg_order_qr_code_token`

#### `order_items` (Lignes de Commande)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `order_id` : `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
* `product_id` : `UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
* `quantity` : `NUMERIC(12,2) NOT NULL CHECK (quantity > 0)`
* `unit` : `VARCHAR(30) NOT NULL`
* `unit_price` : `NUMERIC(12,2) NOT NULL CHECK (unit_price > 0)`
* `subtotal` : `NUMERIC(14,2) NOT NULL CHECK (subtotal > 0)`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Index* : `idx_order_items_order_id`, `idx_order_items_product_id`

#### `stock_reservations` (Réservations Atomiques)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `campaign_id` : `UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE`
* `order_id` : `UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE`
* `quantity` : `NUMERIC(12,2) NOT NULL CHECK (quantity > 0)`
* `status` : `VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'confirmed'))`
* `created_at`, `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Index* : `idx_stock_reservations_campaign_id`, `idx_stock_reservations_status`
* *Trigger* : `trg_stock_reservations_updated_at`

#### `audit_logs` (Journal d'Audit)
* `id` : `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* `actor_id` : `UUID REFERENCES profiles(id) ON DELETE SET NULL`
* `action` : `VARCHAR(50) NOT NULL`
* `entity_type` : `VARCHAR(50) NOT NULL`
* `entity_id` : `UUID NOT NULL`
* `details` : `JSONB`
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* *Index* : `idx_audit_logs_entity`, `idx_audit_logs_actor`, `idx_audit_logs_created_at`

---

## 3. PROCÉDURES TRANSACTIONNELLES RPC IMPLÉMENTÉES

### 3.1 `create_order_with_reservation(...)`
Fonction `SECURITY DEFINER` garantissant l'atomicité et l'absence totale de sur-réservation par verrouillage pessimiste (`SELECT ... FOR UPDATE`) :
1. Valide l'identité du demandeur (`auth.uid() = p_reseller_id`);
2. Verrouille la campagne cible (`FOR UPDATE`);
3. Valide le statut `active`;
4. Contrôle le minimum de commande (`p_quantity >= min_order_quantity`);
5. Contrôle l'éligibilité territoriale (`campaign_delivery_zones`);
6. Calcule le stock disponible actuel : $\text{marketable\_quantity} - \sum \text{quantity}_{\text{active}}$;
7. Refuse et lève une exception si stock insuffisant;
8. Insère atomiquement dans `orders`, `order_items`, `stock_reservations` et `audit_logs`;
9. Retourne l'`order_id`, `order_number`, `total_amount` et `reserved_quantity`.

### 3.2 `cancel_order_and_release_reservation(...)`
Fonction `SECURITY DEFINER` assurant la libération du stock :
1. Contrôle les permissions (revendeur acheteur, membre de l'entreprise ou administrateur);
2. Vérifie que la commande est en statut annulable (`pending` ou `confirmed`);
3. Bascule le statut de la commande à `cancelled`;
4. Bascule le statut de la réservation liée à `released`, réintégrant immédiatement le volume au stock disponible;
5. Consigne l'événement dans `audit_logs`.

### 3.3 `get_campaign_stock_summary(p_campaign_id UUID)`
Retourne `marketable_quantity`, `reserved_quantity` et `available_quantity`.

### 3.4 `check_and_close_expired_campaigns()` (Migration 20261008000025 — Étape 4)
Procédure `SECURITY DEFINER` de clôture automatique des campagnes commerciales :
1. Recherche toutes les campagnes au statut `active` ;
2. Bascule `status = 'completed'` et `updated_at = NOW()` si :
   - `c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE` (date globale de fin expirée) ;
   - OU si la campagne possède des destinations (`campaign_destinations`) et que **TOUTES** ses destinations ont une date limite passée (`order_deadline_date IS NOT NULL AND order_deadline_date < CURRENT_DATE`) ;
3. Préserve intactes toutes les commandes, réservations, livraisons et productions existantes ;
4. Retourne le nombre de campagnes passées à `completed`.

### 3.5 `create_order_from_demand_response(...)` (Prompt 2 — Normalisation Financière)
Procédure transactionnelle `SECURITY DEFINER` créant une commande ferme depuis une proposition acceptée :
1. Valide l'identité du revendeur demandeur (`auth.uid() = p_reseller_id`) ;
2. Verrouille la proposition commerciale `demand_responses` (`FOR UPDATE`) ;
3. Vérifie l'état de la proposition (`status IN ('proposed', 'accepted')`) ;
4. Verrouille la production adossée (`productions`) et valide le stock physique ;
5. Calcule le montant total contractuel : `(p_quantity * v_response.unit_price)::NUMERIC(14,2)` ;
6. Insère la commande `orders` avec sa référence d'origine (`origin_type = 'demand_response'`) et sa devise contractuelle ;
7. Insère la ligne `order_items` avec l'unité réelle de vente `v_response.unit` et le prix unitaire ;
8. Enregistre la réservation de stock adossée à la production dans `stock_reservations` ;
9. Retourne `order_id`, `order_number`, `total_amount` et `reserved_quantity`.



---

## 4. FONCTIONS ET TRIGGERS AJOUTÉS PAR LES MIGRATIONS 29 À 31 (2026-11-01/02 — NON APPLIQUÉES)

| Objet | Migration | Rôle |
| :--- | :--- | :--- |
| `check_global_product_image_protection` + `trg_protect_global_product_images` | 29 | Rattrapage à l'identique de l'objet de production (BR-PROD-04) |
| `is_company_member_or_creator(uuid)` | 30 | Appartenance à une entreprise (membre ou créateur) pour RLS et RPC |
| `update_order_status(uuid, varchar)` | 30 | Seul canal de changement de statut d'une commande (A13) |
| `notify_reseller_of_demand_response(uuid)` | 30 | Notification de proposition construite côté serveur |
| `admin_set_company_verification(uuid, varchar)` | 30 | Badge de vérification, administrateur uniquement (A6) |
| `get_production_reserved_quantity(uuid)` | 30 | Réservations actives et livrées d'une production (interne) |
| `guard_demand_response_write`, `guard_campaign_consistency`, `guard_production_quantity` | 30 (31 pour les deux derniers) | Intégrité propositions / campagnes / productions |
| `get_campaign_consumed_quantity(uuid)` | 31 | Volume consommé d'une campagne : réservations actives + livrées (A11, interne) |
| `get_production_committed_quantity(uuid, uuid)` | 31 | Volume engagé d'une production (A3, interne) |
| `guard_campaign_business_rules` / `trg_guard_campaign_business_rules` | 31 | Plafond cumulé des campagnes (A3) et réouverture (A12) |
| `guard_production_status` / `trg_guard_production_status` | 31 | Production récoltée figée si campagne active ou suspendue (A4) |
| `is_campaign_effectively_open(text, date, uuid)` | 32 | Ouverture effective d'une campagne (C2), INVOKER, miroir de `campaignStatus.ts` |
| `guard_production_commitments` / `trg_guard_production_commitments` | 32 | Remplace `guard_production_status` : statut, produit, visibilité figés si production engagée (A4/D1/D3) ; unité figée par campagne non annulée, réservation active ou proposition ouverte (C-4) |
| `guard_campaign_destination_reopening` / `trg_guard_campaign_destination_reopening` | 32 | Destination jamais déplacée (C-2) ; ajout / suppression sans réouverture, report seul (C-3 / R-4) avec D2 et A3 ; cascade ignorée |
| `guard_campaign_consistency` / `trg_guard_campaign_consistency` | 32 (redéfinie) | Contrôles 031 + unité de campagne = unité de production (C-4) ; trigger étendu à `unit` |
| `reopen_campaign(uuid, date, jsonb)` | 32 | Réouverture atomique (A12, A12-bis, C3, D5), INVOKER |
| `update_campaign_with_destinations(uuid, jsonb, uuid[], jsonb)` | 32 | Modification atomique campagne + zones + destinations + dépôts, dans l'ordre du plan applicatif (C-6), INVOKER |
| `get_productions_campaign_availability(uuid[], uuid)` | 32 | Volume disponible par production pour les campagnes (D4) |
| `get_campaigns_available_quantity(uuid[])` | 32 | Disponible agrégé des campagnes actives pour les revendeurs |
| `check_and_close_expired_campaigns()` | 32 (redéfinie) | Clôture des campagnes active/paused expirées, journalisée (C1) ; opération technique identifiée, propriétaire uniquement |
| `technical_operation_identity()` | 32 | Identité d'une opération sans utilisateur : session directe avec motif, sinon NULL (interne) |
| `authorize_campaign_reopening(uuid)` | 32 | Autorise ou refuse une réouverture, renvoie l'identité à journaliser (interne) |
| `update_destination_order_deadline(uuid, date)` | 32 (redéfinie) | Fonction de la 030 avec la date du jour en UTC |
| Tâche `radiza_close_expired_campaigns` | 33 | `pg_cron`, tous les jours à 00 h 05 UTC, **créée inactive** |
