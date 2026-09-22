# RAPPORT D'HOMOLOGATION TECHNIQUE — PHASE 14a (docs/phase14a-demands-workflow-report.md)
*Plateforme Agricole V1 Expérimentale — Marché Agricole RDC*
*Date de certification : 2026-09-22*
*Statut : 🟢 HOMOLOGUÉ & VALIDÉ*

---

## 1. CONTEXTE ET OBJECTIFS DU JALON 14a

Dans le cadre du durcissement des workflows commerciaux et relationnels de la V1 Expérimentale, le **PROMPT 14a** visait à faire évoluer le fonctionnement des demandes revendeurs, à introduire les réponses et propositions des sociétés, à déployer le centre de notifications internes et à consolider les règles d'intégrité sur les campagnes et les productions.

### Objectifs atteints :
1. **Séparation Stricte des Deux Types de Demandes** :
   - *Demandes Générales* (`demand_type = 'general'`) : Besoins globaux sans production liée. Multiples entreprises peuvent refuser ou proposer une offre ferme.
   - *Demandes sur Production* (`demand_type = 'production'`) : Intérêt ciblé sur une production spécifique en statut `growing` ou `harvested`.
2. **Propositions et Refus des Sociétés (`demand_responses`)** :
   - Capacité pour une entreprise agricole de formaliser une offre ferme (quantité, prix unitaire, devise, message) adossée à une production réelle de son exploitation, ou d'ignorer/refuser la demande.
3. **Conversion en Commande Ferme & Réservation Atomique** :
   - Procédure RPC `create_order_from_demand_response` : verrouillage transactionnel (`FOR UPDATE`), réservation de stock sur la production, création de la commande (`origin_type = 'demand_response'`), passage de la proposition à `ordered` et de la demande à `converted`.
4. **Centre de Notifications Internes** :
   - Table `notifications` avec horodatage de lecture (`read_at`).
   - Interfaces `/dashboard/reseller/notifications` et `/dashboard/company/notifications`.
   - Badges de compteur dynamique dans `AppSidebar`.
   - Événements automatiques : `DEMANDE_REPONSE`, `CAMPAGNE_OUVERTE`, `COMMANDE_CREEE`.
5. **Analyse Territoriale Régionale par Production** :
   - Cartographie de la répartition des demandes par province sur `/dashboard/company/productions/[id]`.
6. **Règles Post-Récolte pour Campagnes & Suppression Sécurisée** :
   - Campagnes strictement restreintes aux productions en statut `harvested`.
   - Suppression sécurisée de production empêchée si des engagements commerciaux actifs existent.

---

## 2. MODIFICATIONS DE LA BASE DE DONNÉES

### Migration 15 : `supabase/migrations/20260922000015_demands_responses_and_notifications.sql`
* **Table `demands`** :
  - Colonnes : `demand_type VARCHAR(20) NOT NULL DEFAULT 'general'`, `production_id UUID REFERENCES productions(id) ON DELETE SET NULL`.
  - Contraintes : `chk_demand_type_values` (`CHECK (demand_type IN ('general', 'production'))`), `chk_demand_production_link`.
* **Table `demand_responses`** :
  - Colonnes : `id`, `demand_id`, `company_id`, `production_id`, `status` (`proposed`, `refused`, `accepted`, `ordered`, `cancelled`), `proposed_quantity`, `unit`, `unit_price`, `currency`, `message`, `created_at`, `updated_at`.
  - Contrainte d'unicité : `uq_demand_company_response UNIQUE (demand_id, company_id)`.
  - Politiques RLS actives (lecture pour l'entreprise et le revendeur concerné, écriture pour l'entreprise).
* **Table `notifications`** :
  - Colonnes : `id`, `user_id`, `type` (`DEMANDE_REPONSE`, `DEMANDE_ACCEPTEE`, `DEMANDE_REFUSEE`, `CAMPAGNE_OUVERTE`, `COMMANDE_CREEE`), `title`, `message`, `related_entity_type`, `related_entity_id`, `action_url`, `read_at`, `created_at`.
  - Politiques RLS actives (isolation stricte par utilisateur).
* **Table `orders` & `stock_reservations`** :
  - Colonnes : `orders.origin_type` (`campaign`, `demand_response`), `orders.demand_response_id`, `orders.production_id`.
  - `orders.campaign_id` et `stock_reservations.campaign_id` désormais nullables si adossés à une proposition directe sur production.
  - `stock_reservations.production_id` ajouté.
* **Fonctions RPC** :
  - `create_order_from_demand_response(...)` (SECURITY DEFINER).
  - `notify_resellers_on_campaign_opened(p_campaign_id UUID)` (SECURITY DEFINER).

---

## 3. SUITE DE TESTS D'HOMOLOGATION SQL

Fichier : `supabase/tests/phase14a_workflow_demands_test.sql`

| Scénario | Intitulé du Test | Résultat |
| :---: | :--- | :---: |
| **A** | **Strict Séparation Demande Générale vs Demande Production** | 🟢 **SUCCÈS** |
| **B** | **Proposition Commerciale d'Entreprise (`demand_responses`)** | 🟢 **SUCCÈS** |
| **C** | **Transformation en Commande Ferme via RPC & Réservation de Stock** | 🟢 **SUCCÈS** |
| **D** | **Notification d'Ouverture de Campagne Post-Récolte & Diffusion** | 🟢 **SUCCÈS** |
| **E** | **Acquittement & Lecture des Notifications Internes** | 🟢 **SUCCÈS** |

*Résultat de l'exécution sur Supabase Live (`gonerlgkdnbdewjbebvq`) :*
`TOUS LES TESTS PHASE 14a ONT ÉTÉ VALIDÉS AVEC SUCCÈS !`

---

## 4. CONTRÔLE DE QUALITÉ LOGICIELLE & BUILD

* **TypeScript Compilation (`npx tsc --noEmit`)** :
  - Statut : 🟢 **0 erreur**.
* **Respect des 4 Règles d'Or** :
  - **Règle 1** (Séparation Inscription / Production) : Respectée.
  - **Règle 2** (Aucune donnée fictive) : Respectée. Tous les états vides sont informatifs et les requêtes réelles.
  - **Règle 3** (Séparation stricte des entités) : Respectée. Produit != Production != Demande != Campagne != Commande.
  - **Règle 4** (Discipline opérationnelle) : Respectée.
