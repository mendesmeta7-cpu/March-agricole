# REVUE R-2 — `search_path` DES FONCTIONS DES MIGRATIONS 030 ET 031
*Memory Bank — Radiza V1 — 2026-11-03 — rapport séparé, **corrections proposées, non appliquées***

Origine : revue ciblée du lot 032 (points R-1 / R-2). R-1 (`create_order_with_reservation`) est traité dans la migration 032 (non appliquée). Pour les migrations 030 et 031, la consigne est de **documenter sans appliquer** : aucun fichier 030 / 031 n'est modifié, aucune migration 033 n'est créée.

---

## 1. Constat

Toutes les fonctions créées par la 030 et la 031 déclarent `SET search_path = public, pg_temp`. Ce réglage est **sûr tant qu'aucun rôle client ne peut créer d'objet dans `public`** (`pg_temp` est placé en dernier, ce qui neutralise la substitution par objet temporaire). Il dépend cependant d'un privilège de schéma, alors que `search_path = ''` n'en dépend plus. Les fonctions de la 032 utilisent toutes `search_path = ''`.

Contrôle préalable à exécuter sur l'environnement de test (déjà prévu dans `test-environment-setup.md` §8) :
```sql
SELECT has_schema_privilege('anon','public','CREATE'), has_schema_privilege('authenticated','public','CREATE');
-- attendu : false, false
```

## 2. Vérification statique de la qualification (lecture des fichiers locaux, 2026-11-03)

Méthode : analyse des corps de fonctions (commentaires et littéraux retirés) — tables après `FROM / JOIN / UPDATE / INSERT INTO / DELETE FROM`, appels de fonctions applicatives, conversions de type, fonctions d'extension.

| Contrôle | Résultat |
| :--- | :--- |
| Tables non qualifiées | **aucune** (toutes en `public.` ou `auth.`) |
| Fonctions applicatives non qualifiées (`is_company_member_or_creator`, `current_user_role`, `get_campaign_consumed_quantity`, …) | **aucune** (toutes en `public.`) |
| Types utilisés dans les conversions | `text`, `uuid`, `numeric`, `varchar`, `character`, `date`, `jsonb` — tous dans `pg_catalog` |
| Fonctions d'extension (`uuid_generate_v4`, `digest`, `crypt`, `unaccent`, `net.*`…) | **aucune** ; `gen_random_uuid()` est native (`pg_catalog`) |
| `auth.uid()` | qualifié |

Conclusion : le passage à `search_path = ''` **ne devrait pas** changer le comportement de ces fonctions. À confirmer sous PostgreSQL (voir §4).

## 3. Fonctions concernées (état final après 032)

Redéfinies par la 032 avec `search_path = ''` (rien à faire) : `create_order_with_reservation`, `get_production_committed_quantity`, `guard_campaign_consistency`, `guard_campaign_business_rules` ; `guard_production_status` est supprimée.

Restent en `public, pg_temp` :

| Fonction | Origine (dernière définition) | Sécurité |
| :--- | :--- | :--- |
| `is_company_member_or_creator(uuid)` | 030 | DEFINER |
| `get_production_reserved_quantity(…)` | 030 | DEFINER |
| `update_destination_arrival_date(…)` | 030 | DEFINER |
| `update_destination_order_deadline(…)` | 030 | DEFINER |
| `lookup_order_for_delivery(…)` | 030 | DEFINER |
| `update_order_status(uuid, varchar)` | 030 | DEFINER |
| `notify_company_on_demand_received()` | 030 | DEFINER |
| `notify_resellers_on_campaign_opened()` | 030 | DEFINER |
| `notify_reseller_of_demand_response()` | 030 | DEFINER |
| `demand_response_target_is_valid(…)` | 030 | DEFINER |
| `guard_demand_response_write()` | 030 | INVOKER |
| `admin_set_company_verification(…)` | 030 | DEFINER |
| `get_campaign_consumed_quantity(uuid)` | 031 | DEFINER |
| `get_campaign_stock_summary(uuid)` | 031 | DEFINER |
| `create_order_from_demand_response(…)` | 031 | DEFINER |
| `confirm_order_delivery(uuid, text)` | 031 | DEFINER |
| `cancel_order_and_release_reservation(uuid, text)` | 031 | DEFINER |
| `guard_production_quantity()` | 031 | DEFINER |

Signatures exactes à relever sur l'environnement de test (`SELECT oid::regprocedure FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proconfig::text LIKE '%search_path=public%'`).

## 4. Correction proposée (NON appliquée)

Dans une **future** migration, à soumettre à validation (la création d'une 033 est hors périmètre de la mission actuelle), sans réécrire les corps de fonctions :
```sql
ALTER FUNCTION public.<fonction>(<signature>) SET search_path = '';
-- une instruction par fonction du tableau §3
```
Avantages : aucune modification de logique, réversible (`ALTER FUNCTION … SET search_path = public, pg_temp`).

Validation requise sous PostgreSQL avant toute mise en production :
1. appliquer sur l'environnement de test, après la 032 ;
2. rejouer `security_hardening_030_test.sql`, `business_rules_031_test.sql` (sur une base où la 032 n'est pas encore appliquée, voir l'ordre du guide) et `business_rules_032_test.sql` ;
3. exercer les parcours commande, livraison, annulation, demande → proposition → commande, notifications ;
4. contrôler `proconfig` de chaque fonction.

## 5. Niveau de risque actuel

Faible, à condition que `public` ne soit pas inscriptible par `anon` / `authenticated` (§1). La correction est une mesure de défense en profondeur et d'homogénéité avec la 032.
