# ENVIRONNEMENT DE TEST ISOLÉ ET VALIDATION DE LA MIGRATION 30
*Memory Bank — Radiza V1 — 2026-11-01*

Objectif : valider `20261101000030_security_hardening.sql` et l'application corrigée sur une base **totalement séparée** de la production (`gonerlgkdnbdewjbebvq`), avant tout déploiement.

---

## 1. Choix de l'environnement

> **Mise à jour 2026-11-06** : l'option « projet cloud » n'est plus possible (les deux projets de l'offre gratuite sont pris et doivent être conservés). Procédure à suivre : pile Supabase locale (CLI + Docker) sur une machine distante isolée, par exemple GitHub Actions ou Codespaces dans un dépôt **privé**, sans aucun secret de production. Les étapes du §3 restent valables, avec `psql -v ON_ERROR_STOP=1` (`-1` pour toutes les migrations sauf 026 et 027).

### Option initiale : projet Supabase cloud dédié aux tests
Le poste de développement ne permet pas une base Supabase locale (constat du 2026-11-01, lecture seule) :

| Prérequis pile locale (Docker + Supabase CLI) | Recommandé | Constaté |
| :--- | :--- | :--- |
| Mémoire vive | ≥ 8 Go (pile Supabase ≈ 4–5 Go + Docker Desktop) | **3,9 Go** |
| Espace disque sur C: (Docker Desktop + image WSL) | ≥ 20 Go | **0 Go libre** (D: 18 Go, M: 464 Go) |
| WSL 2 | Installé | **Absent** (composant facultatif non activé) |
| Virtualisation matérielle | Activée | Hyperviseur présent (OK) |
| Windows | 10 build ≥ 19044 | 19045 (OK) |

→ **Projet cloud séparé** (offre gratuite : 2 projets actifs par organisation ; la production en occupe 1). Les branches Supabase (« branching ») exigent une offre payante.

### Option locale (seulement si le poste évolue)
Prérequis à réunir avant toute installation : 8 Go de RAM minimum, ≥ 20 Go libres (ou image WSL déplacée sur M:), activation de WSL 2 (`wsl --install --no-distribution`, droits administrateur, redémarrage), Docker Desktop, puis Supabase CLI (`npx supabase@<version>` ou binaire). Le dépôt n'a pas encore de `supabase/config.toml` (`supabase init` à exécuter).

---

## 2. Création du projet de test (à faire par le porteur du projet)

1. Console Supabase → **New project** dans la même organisation. Nom : `radiza-test`. Même région que la production. Mot de passe de base fort, conservé dans un gestionnaire de mots de passe (jamais dans le dépôt).
2. Noter la **référence du projet de test** : elle doit être différente de `gonerlgkdnbdewjbebvq`.
3. Authentication → URL Configuration : *Site URL* = `http://localhost:3000` ; ajouter `http://localhost:3000/auth/callback` aux URL de redirection.
4. Authentication → Providers → Email : pour la recette, la confirmation d'e-mail peut rester active (le SMTP par défaut est limité à quelques e-mails par heure) ou être désactivée **sur le projet de test uniquement**.
5. Google OAuth : non nécessaire pour la validation de la migration (à tester plus tard si besoin, avec un client OAuth de test).

---

## 3. Reconstruction du schéma (SQL Editor du projet de TEST)

Vérifier en haut de l'éditeur que le projet sélectionné est bien **radiza-test**, puis exécuter **un fichier à la fois, dans l'ordre**, chacun devant se terminer sans erreur :

1. `20260909000001` … `20260909000009` (fondations, RLS, stockage)
2. `20260909000010` … `20261008000025`
3. `20261011000026`, `20261013000027` (contiennent leurs propres `BEGIN;`/`COMMIT;` — normal dans le SQL Editor)
4. `20261015000028`, `20261030112554`
5. **`20261101000029_backfill_product_image_protection.sql`** (objet présent en production mais absent des migrations)
6. **`20261101000030_security_hardening.sql`** — résultat attendu : succès ; des `NOTICE` « Fonction absente (ignorée) » sont acceptables
7. **`20261102000031_business_rules_a3_a13.sql`** (décisions métier validées, ADR-045)
   → exécuter **immédiatement** `supabase/tests/business_rules_031_test.sql` (avant la 032 : la décision C3 assouplit le scénario R5)
7 bis. **`20261103000032_business_rules_d1_d7_stock.sql`** (ADR-046), puis `supabase/tests/business_rules_032_test.sql` — attendu : `S0 OK` … `S33 OK` puis « ✅ RÈGLES MÉTIER 032 VALIDÉES ». À exécuter avec le rôle `postgres`
8. **`supabase/tests/security_hardening_030_test.sql`** — résultat attendu : notices `T1 OK` … `T9 OK` puis **« ✅ TOUS LES TESTS DE SÉCURITÉ 030 SONT PASSÉS »** ; tout se termine par `ROLLBACK` (aucune trace)
9. **`20261106000033_schedule_campaign_closure.sql`** puis `supabase/tests/schedule_033_test.sql` — attendu : `P1 OK` … `P4 OK` puis « ✅ PLANIFICATION 033 VALIDÉE »

**Ordre impératif des tests** : le test 030 juste après la 030 puis à nouveau après la 032 ; le test 031 (`R0 OK` … `R7 OK`) uniquement **entre la 031 et la 032** : son scénario R5 échoue normalement après la 032. Le refus d'une requête API sans utilisateur (`service_role`) doit être vérifié par un véritable appel à l'API locale : il n'est pas simulable en SQL.

Écarts connus et acceptés entre ce projet et la production : fonction plateforme `rls_auto_enable` / déclencheur `ensure_rls` (option Supabase), table `_backup_profiles_pre_auth4` (sauvegarde, non nécessaire), données.

**En cas d'erreur** : noter le fichier, le message et la ligne ; ne pas « corriger » à la main dans l'éditeur ; transmettre le message pour correction de la migration dans le dépôt, puis recréer le projet de test (ou rejouer à partir d'un projet vierge).

---

## 4. Recette applicative contre le projet de test

1. Créer `.env.development.local` à la racine (prioritaire sur `.env.local` en `next dev`, et ignoré par Git) avec **uniquement** les valeurs du projet de test :
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Les variables Cloudinary peuvent pointer vers le même compte (dossier `synapta/`) ou être laissées vides si les avatars ne sont pas testés.
2. `npm run dev`, puis vérifier dans l'onglet Réseau du navigateur que les appels partent vers la référence du projet de TEST.
3. Données : créées **uniquement par les parcours de l'application** (Règle 2, pas de données fictives dans le code) : un compte Société, un compte Revendeur (province desservie) et un second Revendeur (province non desservie). Compte admin : créé dans la console du projet de test, rôle attribué par le SQL Editor du projet de test.
4. Parcours à valider :
   - inscription → confirmation → connexion → onboarding (Société et Revendeur) ; saisie conservée après une erreur ; `/login?redirect=…`
   - mot de passe oublié → lien → nouveau mot de passe ; `/reset-password` ouvert sans lien → refus
   - produit → production (photo JPG/PNG/WebP ; un `.svg` ou un faux `.jpg` doit être refusé) → campagne multi-destinations
   - commande revendeur → statuts **vers l'avant uniquement** → livraison par QR / numéro → compteurs mis à jour
   - demande → proposition → commande ; modification du prix par la société avant commande → commande refusée avec message
   - annulation (pending / confirmed) et refus au-delà ; survente au-delà de la quantité de la production → refus
   - notifications (création, lecture, liens) ; profils et logo ; flux revendeur > 12 productions (« Charger plus », recherche)
   - pages 404 / erreur ; navigation clavier dans les tiroirs et modales
5. Scripts réseau (`scripts/`) : définir `RADIZA_SCRIPT_SUPABASE_URL` / `RADIZA_SCRIPT_SUPABASE_ANON_KEY` du projet de **test** dans le terminal (voir `.env.example`). Attendu après la migration 30 : `test_rpc.mjs` et l'appel à `check_and_close_expired_campaigns` de `test-campaign-evolution.mjs` échouent avec la clé anon (fonction réservée au rôle service — comportement voulu).

---

## 5. Contrôles de données en production (lecture seule, avant mise en production)

À exécuter dans le SQL Editor de la **production**, en lecture seule, avant d'appliquer la migration 30 : requêtes V3 à V6 du rapport d'audit (`02-cybersecurite.md` §5) — commandes incohérentes avec leur réservation, survente existante, devises présentes, badges « vérifié ». Les contraintes de devise sont créées `NOT VALID` : elles ne bloquent pas la migration ; `VALIDATE CONSTRAINT` ne sera lancé qu'après nettoyage éventuel.

---

## 6. Mise en production (après validation complète — hors périmètre actuel)

1. Fenêtre coordonnée : appliquer `20261101000029`, `20261101000030` puis `20261102000031` dans le SQL Editor de production → exécuter `security_hardening_030_test.sql` (contrôles du catalogue uniquement ; **ne jamais lancer `business_rules_031_test.sql` en production** : il crée des comptes et des données de test, même s'ils sont annulés) → **ensuite seulement** déployer l'application (le code appelle des fonctions créées par la migration 30 : ne jamais déployer le code seul).
2. Enregistrer les versions dans le registre des migrations (`supabase migration repair --status applied <version>`), relancer les advisors Supabase, contrôler les parcours principaux.
3. Retour arrière applicatif : redéployer la version précédente de Vercel ; la migration ne supprime aucune donnée.

---

## 7. Fin des tests

Mettre le projet `radiza-test` en pause (ou le supprimer) dans la console, et supprimer `.env.development.local`.

---

## 8. Points spécifiques à vérifier sur l'environnement de test (2026-11-03)

* **E-mails sur l'offre gratuite** : le service d'e-mail intégré de Supabase n'envoie qu'aux adresses des membres de l'équipe du projet. Pour la recette des inscriptions, désactiver la confirmation d'e-mail **sur le projet de test uniquement**, ou utiliser des adresses de l'équipe.
* **Comptes de test des suites 031/032** : elles insèrent des comptes dans `auth.users` depuis le SQL Editor (rôle propriétaire). Si Supabase le refuse, créer les comptes dans la console (Authentication > Users) et adapter les blocs R0/S0.
* **Schéma public** : vérifier qu'aucun rôle client ne peut créer d'objets dans `public` — `SELECT has_schema_privilege('anon','public','CREATE'), has_schema_privilege('authenticated','public','CREATE');` (attendu : `false`, `false`). Toutes les fonctions de la 032 (y compris `create_order_with_reservation`, R-1) utilisent `search_path = ''` ; celles de la 030 / 031 restent en `public, pg_temp` (revue R-2 : `docs/security-search-path-review.md`, corrections proposées non appliquées).
* **Données de production à régulariser avant mise en production** (constat en lecture seule du 2026-11-02 : 2 productions dont le volume engagé dépassait la quantité selon la formule A3 de la 031, 3 campagnes `active` à date de fin dépassée). Requête d'identification, en lecture seule, à exécuter le moment venu :
  ```sql
  SELECT c.id, c.status, c.end_date, c.production_id, c.marketable_quantity
  FROM public.campaigns c
  WHERE c.status IN ('active','paused') AND c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE;
  ```
  Après application de la 032, `check_and_close_expired_campaigns()` les clôt et C2 libère leur volume ; recompter ensuite les productions dont `get_production_committed_quantity(id) > expected_quantity`.

---

## 9. Déploiement et exploitation de la clôture (ADR-047)

Chaque étape en production demande une autorisation explicite.

1. **Correctif immédiat, indépendant** : retirer l'exécution de la clôture aux rôles API, sans attendre la 030 :
   ```sql
   REVOKE ALL ON FUNCTION public.check_and_close_expired_campaigns() FROM PUBLIC, anon, authenticated, service_role;
   SELECT r, has_function_privilege(r, 'public.check_and_close_expired_campaigns()', 'EXECUTE')
   FROM unnest(ARRAY['anon','authenticated','service_role','postgres']) AS r;
   ```
   Attendu : `false`, `false`, `false`, `true`. Un `REVOKE` lancé par un autre rôle que le propriétaire n'affiche qu'un avertissement : en cas d'écart, arrêt.
2. Validation complète sur l'environnement isolé (§3, §4).
3. Migrations 029, 030, 031, 032, dans cet ordre, puis déploiement de l'application. La 032 n'écrit sur aucune ligne existante, mais une campagne expirée n'engage plus que ses réservations dès son application.
4. Migration 033 : la tâche est créée **inactive**.
5. Contrôle : `SELECT jobid, schedule, active, username, database FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns';`
6. Première clôture, sur **autorisation distincte** : `SELECT cron.alter_job(jobid, active := true) FROM cron.job WHERE jobname = 'radiza_close_expired_campaigns';`

Suivi : `SELECT status, return_message, start_time FROM cron.job_run_details WHERE jobid = <jobid> ORDER BY start_time DESC LIMIT 20;`
Désactivation : même appel qu'à l'étape 6 avec `active := false`. Suppression : `SELECT cron.unschedule('radiza_close_expired_campaigns');`. Ne pas supprimer l'extension : cela efface toutes les tâches.

Clôture manuelle de secours (session directe) :
```sql
BEGIN;
SET LOCAL radiza.technical_reason = 'cloture-manuelle';
SELECT public.check_and_close_expired_campaigns();
COMMIT;
```

---

## 10. Environnement local PostgreSQL (2026-11-06)

Faute de Docker et de projet de test, les migrations ont été validées sur PostgreSQL 17.11 pour Windows, dans `M:\radiza-pg` (hors dépôt, port 54329, 127.0.0.1 uniquement).

* **Paquet** : `postgresql-17.11-5-windows-x64-binaries.zip` (EDB, source indiquée par postgresql.org), 381 531 864 octets, SHA-256 calculé `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. EDB ne publie pas d'empreinte et les exécutables du zip ne sont pas signés : cette valeur identifie le fichier, elle ne l'authentifie pas.
* **Imitation de Supabase** : rôles `anon`, `authenticated`, `service_role`, `authenticator` ; `postgres` non superutilisateur ; droits par défaut sur `public` ; schémas `auth`, `storage` et `extensions` minimaux.
* **Commandes** : `bash run.sh start`, `bash run.sh base`, `bash run.sh suite`, `bash run.sh stop` ; journaux dans `reports/`.
* **Écart de rejeu** : la migration 014 échoue sur une base vierge (politique `products_admin_manage` déjà créée par la 008). Le pré-script `shim/pre_20260921000014.sql` la supprime avant. Toute reconstruction depuis le dépôt doit faire de même.

**Ce que cet environnement ne prouve pas** : le comportement de PostgREST (dont `Prefer: timezone`), d'Auth et de Storage réels, les droits réels de `postgres` sur le projet hébergé, le vrai `pg_cron` (indisponible sur Windows : imitation locale sans ordonnanceur), et les écarts entre la production et les migrations.
