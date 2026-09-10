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
| **`products`** | `is_active = TRUE` (Catalogue public) | Admin plateforme | Admin plateforme | Admin plateforme |
| **`company_products`** | `is_active = TRUE` (Public) OU Membres de l'entreprise | Membres de l'entreprise (`is_company_member(company_id)`) | Membres de l'entreprise | Membres de l'entreprise |
| **`productions`** | Fiches publiques actives (`is_public = TRUE` et statut actif) OU Membres de l'entreprise | Membres de l'entreprise | Membres de l'entreprise | Membres de l'entreprise |
| **`demands`** | Revendeur auteur (`reseller_id = auth.uid()`) OU Toutes les demandes `active` (vue macro pour entreprises) OU Admin | Revendeur authentifié (`current_user_role() = 'reseller'`) | Revendeur auteur (`reseller_id = auth.uid()`) | Revendeur auteur OU Admin |
| **`campaigns`** | Offres ouvertes (`status = 'active'`) OU Membres de l'entreprise émettrice OU Admin | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice |
| **`campaign_delivery_zones`** | `TRUE` (Public pour évaluation d'éligibilité) | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice | Membres de l'entreprise émettrice |
| **`orders`** | Revendeur acheteur (`reseller_id = auth.uid()`) OU Entreprise vendeuse (`is_company_member(company_id)`) OU Admin | Revendeur acheteur (`reseller_id = auth.uid()`) ou RPC sécurisée | Membres de l'entreprise (statuts) OU Revendeur (annulation pending) | Bloqué (Conservation d'audit) |
| **`order_items`** | Revendeur acheteur de la commande liée OU Membres de l'entreprise liée OU Admin | Lié à la commande de l'acheteur ou RPC | Bloqué | Bloqué |
| **`stock_reservations`** | Membres de l'entreprise liée à la campagne OU Revendeur acheteur lié OU Admin | Géré exclusivement par la fonction RPC `create_order_with_reservation` | Géré par la fonction RPC `cancel_order_and_release_reservation` | Bloqué |
| **`audit_logs`** | Auteur de l'action (`actor_id = auth.uid()`) OU Admin | Tout acteur authentifié réalisant une action tracée | Bloqué | Bloqué |

---

## 4. SÉCURITÉ DU STOCKAGE SUPABASE STORAGE

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
