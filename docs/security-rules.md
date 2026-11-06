# RÈGLES DE SÉCURITÉ ET POLITIQUES RLS IMPLÉMENTÉES (docs/security-rules.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-09 — Phase 2 Validée et Déployée*

---

## 1. STATUT DE SÉCURITÉ DE LA BASE DE DONNÉES

Toutes les 17 tables du schéma `public` ont **Row Level Security (RLS) activé sans exception** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
Les accès anonymes directs aux données privées sont formellement interdits.

---

## 2. FONCTIONS DE SÉCURITÉ HELPER (SECURITY DEFINER)

Pour éliminer les risques de récursion infinie dans les politiques RLS et garantir une évaluation rapide :

```sql
-- Récupération du rôle sans récursion
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérification de l'appartenance à une entreprise
CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = p_company_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérification des privilèges de gestion d'une entreprise (owner ou admin)
CREATE OR REPLACE FUNCTION public.is_company_admin_or_owner(p_company_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = p_company_id 
          AND user_id = auth.uid() 
          AND role IN ('owner', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 3. MATRICE COMPLÈTE DES POLITIQUES RLS DÉPLOYÉES

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **`countries`** | `is_active = TRUE` (Public) | Admin | Admin | Admin |
| **`provinces`** | `TRUE` (Public) | Admin | Admin | Admin |
| **`cities`** | `TRUE` (Public) | Admin | Admin | Admin |
| **`profiles`** | Propriétaire (`auth.uid() = id`) ou Admin | Propriétaire (`auth.uid() = id`) | Propriétaire (`auth.uid() = id`) | Admin |
| **`companies`** | `is_active = TRUE` (Profil public) OU Membres de la compagnie OU Admin | Authentifié avec rôle `company` ou `admin` (`created_by = auth.uid()`) | Owner / Admin de l'entreprise OU Admin plateforme | Owner / Admin de l'entreprise OU Admin plateforme |
| **`company_members`** | Membres de l'entreprise OU Admin | Owner / Admin OU Créateur de l'entreprise OU Admin plateforme | Owner / Admin de l'entreprise OU Admin plateforme | Owner / Admin de l'entreprise OU Admin plateforme |
| **`resellers`** | Revendeur lui-même (`auth.uid() = id`) OU Entreprise ayant une commande avec ce revendeur OU Admin | Revendeur lui-même (`auth.uid() = id`) | Revendeur lui-même (`auth.uid() = id`) | Admin |
| **`products`** | `is_global = TRUE AND is_active = TRUE` (Public) OU Membres de l'entreprise créatrice (`is_company_member(created_by_company_id)`) OU Admin | Entreprise membre (produits privés `is_global = FALSE`) OU Admin (produits globaux) | Admin (produits globaux) OU Entreprise créatrice (produits privés `is_global = FALSE`) | Admin uniquement |
| **`company_products`** | `is_active = TRUE` (Public) OU Membres de l'exploitation liée | Membres de l'entreprise (`is_company_member(company_id)`) | Membres de l'entreprise (dénomination, photo, unité, notes) | Membres de l'entreprise |
| **`productions`** | Fiches publiques actives (`is_public = TRUE` et statut actif) OU Membres de l'entreprise | Membres de l'entreprise | Membres de l'entreprise | Membres de l'entreprise |
| **`demands`** | Revendeur auteur (`reseller_id = auth.uid()`) OU Toutes les demandes `active` (vue macro pour entreprises) OU Admin | Revendeur authentifié (`current_user_role() = 'reseller'`) | Revendeur auteur (`reseller_id = auth.uid()`) | Revendeur auteur OU Admin |
| **`campaigns`** | Offres ouvertes (`status = 'active'`) OU Membres de l'entreprise émettrice OU Admin | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice |
| **`campaign_delivery_zones`** | `TRUE` (Public pour évaluation d'éligibilité) | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice |
| **`orders`** | Revendeur acheteur (`reseller_id = auth.uid()`) OU Entreprise vendeuse (`is_company_member(company_id)`) OU Admin | Revendeur acheteur (`reseller_id = auth.uid()`) ou RPC sécurisée | Membres de l'entreprise (statuts) OU Revendeur (annulation pending) | Bloqué (Conservation d'audit) |
| **`order_items`** | Revendeur acheteur de la commande liée OU Membres de l'entreprise liée OU Admin | Lié à la commande de l'acheteur ou RPC | Bloqué | Bloqué |
| **`stock_reservations`** | Membres de l'entreprise liée à la campagne OU Revendeur acheteur lié OU Admin | Géré exclusivement par la fonction RPC `create_order_with_reservation` | Géré par la fonction RPC `cancel_order_and_release_reservation` et `confirm_order_delivery` | Bloqué |
| **`audit_logs`** | Auteur de l'action (`actor_id = auth.uid()`) OU Admin | Tout acteur authentifié réalisant une action tracée | Bloqué | Bloqué |

---

## 4. SÉCURITÉ DE LA LIVRAISON ET ISOLATION DU SCAN QR (PHASE 16)

1. **Jeton Opaque `qr_code_token`** :
   - Le token QR est généré avec 32 octets aléatoires cryptographiques (`encode(gen_random_bytes(32), 'hex')`).
   - Il n'expose aucune information temporelle ni séquentielle sur la commande.
2. **Isolation Stricte Multi-Sociétés dans `lookup_order_for_delivery`** :
   - Fonction `SECURITY DEFINER` vérifiant que l'utilisateur appelant `auth.uid()` est membre propriétaire de l'exploitation vendeuse.
   - Si une entreprise B scanne ou saisit le numéro de commande d'une entreprise A, la fonction renvoie un ensemble vide (`RETURN;`) sans générer d'erreur révélatrice ni exposer le moindre champ (zéro fuite d'information).
3. **Verrouillage Pessimiste & Anti-Double Livraison dans `confirm_order_delivery`** :
   - Verrouille la ligne de commande avec `FOR UPDATE`.
   - Lève une exception immédiate si la commande est déjà en statut `delivered`.
   - Confirme de manière synchrone la réservation de stock liée (`confirmed`).
   - Trace l'identité de l'agent effectuant la remise (`delivered_by`).

Deux buckets ont été créés et configurés dans `storage.buckets` avec politiques RLS associées :

### Bucket `public-assets`
* **Visibilité** : `public = TRUE`
* **Taille maximale par fichier** : 5 MB
* **Types MIME autorisés** : `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
* **Règles RLS** :
  - `SELECT` : Tout public (`bucket_id = 'public-assets'`)
  - `INSERT` : Utilisateurs authentifiés (`auth.role() = 'authenticated'`)
  - `UPDATE` / `DELETE` : Propriétaire du fichier (`auth.uid() = owner`) ou Administrateur

### Bucket `private-documents`
* **Visibilité** : `public = FALSE`
* **Taille maximale par fichier** : 10 MB
* **Types MIME autorisés** : `image/jpeg`, `image/png`, `application/pdf`
* **Règles RLS** :
  - `SELECT` : Propriétaire du document (`auth.uid() = owner`) ou Administrateur plateforme
  - `INSERT` : Utilisateurs authentifiés (`auth.role() = 'authenticated'`)
  - `UPDATE` / `DELETE` : Propriétaire du document (`auth.uid() = owner`) ou Administrateur

---

## 5. CONTRÔLES ANTI-ESCALADE ET INTÉGRITÉ DES RÔLES (MIGRATION 10)

1. **Interdiction de l'auto-attribution admin** :
   Le trigger `check_profile_creation_role` empêche formellement l'insertion de `role = 'admin'` par un utilisateur public lors du signup. Seul un administrateur existant ou un script avec privilège `service_role` peut attribuer ce rôle.
2. **Protection contre l'escalade de privilèges** :
   Le trigger `prevent_profile_role_escalation` lève une exception (`Action interdite : modification non autorisée du rôle utilisateur`) si un utilisateur non-admin tente un `UPDATE` modifiant la colonne `role` dans `public.profiles`.
3. **Assignation automatique du rôle Owner** :
   Le trigger `handle_new_company_created` associe immédiatement le créateur de l'entreprise comme `owner` dans `public.company_members`, éliminant tout blocage RLS d'initialisation et assurant la conformité avec BR-COMP-05.

---

## 6. CRÉATION DES COMPTES ADMINISTRATEURS ET SECRETS (2026-11-01 — ADR-043)

* **Aucun compte administrateur n'est créé par migration.** Le bloc de provisionnement de la migration 14 (mot de passe écrit en clair) est neutralisé.
* **Procédure** : (1) créer le compte dans la console Supabase (Authentication > Users) avec un mot de passe fort et unique ; (2) attribuer le rôle `admin` dans `public.profiles` par un opérateur habilité, depuis le SQL Editor, hors de tout fichier versionné ; (3) consigner l'opération (date, opérateur) hors du dépôt.
* **Secrets** : aucun identifiant (mot de passe, clé, e-mail réel) dans le code, les scripts, les migrations ou la documentation. Les scripts de `scripts/` lisent leur configuration depuis l'environnement du terminal (`scripts/_supabase-env.mjs`) ; ceux qui écrivent refusent le projet de production.
* **Retirer un secret du code ne le révoque pas** : tout secret ayant figuré dans l'historique Git doit être changé à la source.

## 7. MATRICE DES ÉCRITURES APRÈS MIGRATION 30 (ADR-043)

| Table | Écriture directe client | Canal autorisé |
| :--- | :--- | :--- |
| `orders`, `order_items`, `stock_reservations` | ❌ aucune | `create_order_with_reservation`, `create_order_from_demand_response`, `update_order_status`, `cancel_order_and_release_reservation`, `confirm_order_delivery` |
| `audit_logs` | ❌ aucune | fonctions serveur uniquement |
| `notifications` | ❌ création ; ✅ `read_at` seulement | `notify_*`, fonctions métier |
| `demand_responses` | ✅ entreprise propriétaire (`proposed`/`refused`), ❌ revendeur | trigger `guard_demand_response_write` |
| `companies` | ✅ champs de profil seulement ; ❌ création | `complete_user_onboarding`, `admin_set_company_verification` |
| Toutes tables | ❌ aucune écriture ni TRUNCATE pour `anon` | — |

## 8. RÉOUVERTURE, CLÔTURE ET OPÉRATIONS TECHNIQUES (ADR-047 — MIGRATIONS 32 ET 33, NON APPLIQUÉES)

* **Clôture** : `check_and_close_expired_campaigns` n'est exécutable ni par `anon`, ni par `authenticated`, ni par `service_role` : seuls le propriétaire et la tâche planifiée la lancent. **Tant que la 030 n'est pas appliquée en production, la fonction n'a pas de restriction de droits dans les migrations** : voir `docs/test-environment-setup.md` §9.
* **Opération technique** : session directe à la base (`session_user` = `postgres` ou `supabase_admin`) avec un motif dans `radiza.technical_reason`. PostgREST se connecte en `authenticator` : une requête API, même avec `service_role`, ne remplit jamais la condition, car elle ne peut pas changer `session_user`. Ce refus reste à vérifier par un véritable appel à l'API.
* **Journal** : `audit_logs.actor_id` référence `profiles` ; une opération système a donc un acteur vide et son identité dans `details` (`actor_type`, `system_actor`, `reason`, `application_name`).
* **Risque ouvert — droits de l'administrateur (BR-ADM-02)** : la supervision est prévue en lecture seule, mais `campaigns_manage`, `campaign_delivery_zones_manage`, `campaign_destinations_all_owner` et `campaign_depots_all_owner` autorisent l'administrateur en écriture. Avec sa session, il peut, par appel direct à l'API, modifier titre, prix, quantité, dates et statut d'une campagne, ainsi que ses zones, destinations et dépôts. Aucun écran ne l'offre, les triggers métier s'appliquent, les prix des commandes restent figés et la réouverture lui est interdite. **Risque non corrigé, hors périmètre de la décision ADR-047.**
* **Mot de passe administrateur** : le mot de passe exposé dans l'historique Git a été changé, testé et confirmé, et la clé temporaire a été révoquée (2026-11-06). L'ancienne valeur reste dans l'historique : ne pas publier cet historique.
