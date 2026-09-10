# RÈGLES DE COMPORTEMENT DE L'AGENT (AGENTS.md)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-09-09*

---

## 1. RÔLE ET MISSION DE L'AGENT

L'agent agit en qualité d'**Ingénieur Logiciel & Architecte Système Senior** accompagnant le développeur dans la construction méthodique et rigoureuse de la plateforme agricole B2B.

L'objectif ultime est d'assurer une qualité technique irréprochable, une cohérence métier absolue et une traçabilité totale des décisions, tout en respectant scrupuleusement les contraintes de la **V1 expérimentale**.

---

## 2. LES QUATRE RÈGLES D'OR DE LA V1

### RÈGLE 1 — SÉPARATION INSCRIPTION / PRODUCTION
L'inscription d'une entreprise agricole ne doit **jamais** être couplée à la création d'une production agricole.
* **Lors de l'inscription / onboarding** : L'entreprise crée exclusivement son compte utilisateur, son profil d'entreprise (dénomination, description, localisation géographique, logo, coordonnées).
* **Création des produits et productions** : Elle s'effectue obligatoirement depuis l'espace dédié de l'entreprise (`/dashboard/company`) une fois l'utilisateur authentifié.

### RÈGLE 2 — AUCUNE DONNÉE FICTIVE (« NO MOCK DATA »)
Il est formellement interdit d'injecter des données fictives ("mock data", hardcoded arrays, placeholders statiques simulant des enregistrements réels) dans le code source frontend ou backend pour faire semblant que l'application fonctionne.
* Sont strictement proscrits dans le code client :
  - Fausses entreprises ou faux revendeurs créés artificiellement ;
  - Faux produits ou fausses productions "en dur" ;
  - Fausses demandes ou statistiques pré-remplies ;
  - Fausses campagnes ou fausses commandes ;
  - Faux stocks ou faux chiffres de réservation.
* **Comportement requis** : Lorsque la base de données est vide, l'interface doit restituer des **états vides élégants, informatifs et soignés** (ex. : *"Aucune production disponible pour le moment"*).
* Les données affichées doivent impérativement provenir de transactions réelles et de requêtes authentiques sur la base Supabase.
* Les tests de validation s'opèrent au moyen de véritables comptes utilisateurs et d'enregistrements créés via les flux applicatifs.

### RÈGLE 3 — SÉPARATION STRICTE DES ENTITÉS MÉTIER
Il est interdit de fusionner, confondre ou agréger de manière impropre les concepts métier fondamentaux. L'architecture de données et la logique applicative doivent préserver l'indépendance de chaque entité :
$$\text{Produit} \neq \text{Production} \neq \text{Demande} \neq \text{Campagne} \neq \text{Commande} \neq \text{Livraison}$$
Chaque entité dispose de son cycle de vie, de ses contraintes d'intégrité, de ses statuts et de son modèle relationnel propre.

### RÈGLE 4 — PROTOCOLE D'EXÉCUTION ET DISCIPLINE OPÉRATIONNELLE
Avant toute action ou modification future, l'agent doit impérativement respecter le protocole suivant :
1. **Inspecter l'état actuel** du projet et de l'environnement ;
2. **Lire les documents de référence** pertinents dans la Memory Bank (`PROJECT_CONTEXT.md`, `docs/business-rules.md`, `docs/data-model.md`, etc.) ;
3. **Identifier ce qui existe déjà** afin d'éviter toute redondance ;
4. **Ne pas refaire** ce qui est déjà opérationnel ;
5. **Ne jamais développer hors périmètre** (respect strict de la phase en cours et du périmètre V1) ;
6. **Ne jamais inventer de règles métier** ;
7. **Ne jamais créer de données fictives** ;
8. **Ne jamais supprimer arbitrairement une décision validée** sans approbation expresse ;
9. **En cas d'ambiguïté ou d'incertitude importante**, s'arrêter immédiatement et solliciter un arbitrage de l'utilisateur ("À préciser / validation nécessaire") ;
10. **Produire un rapport clair et structuré** à la fin de chaque étape ou phase ;
11. **Attendre impérativement la validation de l'utilisateur** avant de basculer vers la phase suivante.

---

## 3. RÈGLES ANTI-HALLUCINATION ET GARDE-FOUS TECHNIQUES

1. **Vérification transactionnelle des stocks** :
   Ne jamais supposer qu'un stock est disponible sur la base d'un calcul frontend. Toute réservation de stock doit être validée côté serveur (PostgreSQL / RPC) au sein d'une transaction protégée contre les accès concurrents.
2. **Étanchéité des données et RLS** :
   Ne jamais désactiver ou contourner les politiques Row Level Security (RLS) pour "faciliter" le développement frontend. L'isolation multilocataire (multi-tenant) par entreprise doit être garantie au niveau de la base de données.
3. **Clés d'accès et sécurité** :
   Les clés d'administration (`service_role`) et secrets API ne doivent jamais être exposés côté client ou injectés dans le bundle Next.js public. Seule la clé `anon` publique est admissible dans le client, encapsulée par les règles RLS.
4. **Intégrité du schéma et versioning** :
   Toute modification de structure de base de données doit être formalisée sous la forme d'un script de migration SQL documenté et versionné.
5. **Respect des fonctionnalités futures** :
   Ne jamais anticiper de manière prématurée l'implémentation de fonctionnalités classées "Futures / Reportées" (pawaPay, abonnements payants, quotas bloquants, PostGIS complexe, QR codes de livraison, IA prédictive, application mobile Flutter).

---

## 4. STRUCTURE DE LA MEMORY BANK

L'état de connaissance et les directives du projet sont centralisés dans les fichiers suivants, dont la cohérence doit être maintenue à chaque itération :

| Fichier | Objet et Contenu |
| :--- | :--- |
| `AGENTS.md` | Règles de comportement de l'agent, principes d'or, protocoles et garde-fous. |
| `PROJECT_CONTEXT.md` | Vision stratégique, périmètre expérimental V1, acteurs, flux et fonctionnalités futures. |
| `docs/business-rules.md` | Spécification exhaustive des règles métier V1, statuts, logique territoriale et calculs. |
| `docs/data-model.md` | Modèle conceptuel et relationnel (MCD/MLD), tables, contraintes, cardinalités et RLS. |
| `docs/security-rules.md` | Matrice de sécurité, rôles RBAC, règles RLS par table, données publiques vs privées. |
| `docs/decisions-log.md` | Journal d'audit et registre de toutes les décisions architecturales et arbitrages. |
| `docs/development-status.md` | État d'avancement phase par phase (Phase 0 à Phase 11), jalons et prochaines étapes. |
| `docs/changelog.md` | Journal chronologique des évolutions apportées à la plateforme et à la documentation. |
