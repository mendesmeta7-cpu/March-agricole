# GUIDE OFFICIEL DE MIGRATION VERS UN DOMAINE PERSONNALISÉ (RADIZA V1)
*Memory Bank — Plateforme Agricole V1 Expérimentale*
*Dernière mise à jour : 2026-10-18*

---

## 1. ARCHITECTURE ET INDÉPENDANCE TECHNIQUE DU DOMAINE

La plateforme Radiza a été conçue pour être **strictement agnostique de son nom de domaine**. Aucune URL de production (ni `march-agricole.vercel.app`, ni localhost) n'est injectée en dur dans les composants frontend ou les pages d'application.

### Mécanismes de résolution dynamique actifs :
1. **Résolution centralisée via `getAppUrl()` (`src/lib/utils/url.ts`)** :
   - En production, la fonction lit en priorité absolue la variable d'environnement `NEXT_PUBLIC_APP_URL` (ou `NEXT_PUBLIC_SITE_URL`).
   - Si la variable n'est pas renseignée, elle bascule automatiquement sur les en-têtes de déploiement Vercel (`NEXT_PUBLIC_VERCEL_URL` ou `VERCEL_URL`).
2. **Métadonnées dynamiques via `metadataBase` (`src/app/layout.tsx`)** :
   - Le composant `RootLayout` initialise `metadataBase` avec le retour de `getAppUrl()`.
   - Toutes les balises canoniques relatives (`alternates: { canonical: "/privacy" }` et `alternates: { canonical: "/terms" }`) sont automatiquement résolues en URLs absolues parfaites sur le domaine actif.
3. **Chemins d'accès stables et pérennes** :
   - Les pages légales officielles conservent des chemins d'accès immuables :
     - Politique de confidentialité : `/privacy`
     - Conditions générales d'utilisation : `/terms`
   - Tous les liens internes utilisent des routes relatives Next.js (`<Link href="/privacy">`, `<Link href="/terms">`), garantissant un fonctionnement identique sans aucune modification de code lors du basculement de domaine.

---

## 2. CHECKLIST DE MIGRATION LORS DE L'ACHAT DU DOMAINE

> [!IMPORTANT]
> Ne réaliser ces actions qu'une fois le nom de domaine personnalisé formellement réservé et acquis (ex. `radiza.cd` ou `radiza.com`). Aucune configuration actuelle de production ne doit être modifiée prématurément.

### Étape 1 — Configuration DNS et Domaine sur Vercel
1. Rendez-vous sur le tableau de bord Vercel du projet Radiza : **Settings > Domains**.
2. Saisissez votre domaine personnalisé (ex. `radiza.cd` et `www.radiza.cd`).
3. Chez votre registrar DNS (ex. Gandi, Cloudflare, Namecheap, etc.), ajoutez les enregistrements DNS recommandés par Vercel :
   - Pour la racine : Enregistrement **A** pointant vers `76.76.21.21` (ou CNAME aplati).
   - Pour le sous-domaine `www` : Enregistrement **CNAME** pointant vers `cname.vercel-dns.com`.
4. Vercel provisionnera automatiquement et gratuitement le certificat SSL TLS (Let's Encrypt). Patientez jusqu'à l'état **Valid Configuration**.

### Étape 2 — Mise à Jour des Variables d'Environnement Vercel
1. Dans le tableau de bord Vercel : **Settings > Environment Variables**.
2. Modifiez la variable `NEXT_PUBLIC_APP_URL` :
   - Valeur : `https://radiza.cd` (ou votre domaine personnalisé officiel, sans slash terminal).
3. Redéployez la dernière version de production (ou déclenchez un nouveau déploiement) pour injecter la nouvelle variable dans le bundle applicatif.

### Étape 3 — Configuration Supabase Auth (Authentification & Redirections)
1. Accédez à votre console Supabase : **Project Settings > Authentication > URL Configuration**.
2. **Site URL** : Remplacez l'URL par `https://radiza.cd`.
3. **Redirect URLs (Liste blanche des redirections autorisées)** :
   - Ajoutez : `https://radiza.cd/**`
   - Ajoutez : `https://radiza.cd/auth/callback`
   - *Recommandation de sécurité* : Conservez temporairement l'ancien domaine `https://march-agricole.vercel.app/**` dans la liste pendant 7 à 14 jours afin de ne pas bloquer les liens de confirmation déjà expédiés aux utilisateurs par email.

### Étape 4 — Configuration Google Cloud Console (Google OAuth)
1. Ouvrez [Google Cloud Console](https://console.cloud.google.com/) et sélectionnez le projet OAuth Radiza.
2. **Écran de consentement OAuth (OAuth Consent Screen)** :
   - **Domaines autorisés (Authorized domains)** : Ajoutez le domaine racine (ex. `radiza.cd`).
   - **Page d'accueil de l'application (Application home page)** : `https://radiza.cd`
   - **Lien vers les règles de confidentialité (Application privacy policy link)** : `https://radiza.cd/privacy`
   - **Lien vers les conditions d'utilisation (Application terms of service link)** : `https://radiza.cd/terms`
   - Enregistrez les modifications.
3. **Identifiants OAuth 2.0 (Credentials > OAuth 2.0 Client IDs)** :
   - Ouvrez votre identifiant client Web.
   - **Origines JavaScript autorisées** :
     - Ajoutez `https://radiza.cd` (et `https://www.radiza.cd` le cas échéant).
     - Conservez `https://march-agricole.vercel.app` pour la continuité.
   - **URI de redirection autorisés** :
     - Vérifiez que l'URI de redirection du callback Supabase est bien présent :
       `https://gonerlgkdnbdewjbebvq.supabase.co/auth/v1/callback`
     - *Rappel d'architecture* : L'échange de jeton Google OAuth s'opère via Supabase Auth GoTrue. Cet URI ne change que si vous activez un domaine personnalisé au niveau de Supabase lui-même.

---

## 3. PROTOCOLE DE RECETTE ET VALIDATION POST-MIGRATION

Dès la propagation DNS effective, exécuter les vérifications suivantes :
1. **Accès direct aux pages légales** :
   - Ouvrir `https://<nouveau-domaine>/privacy` : la page doit s'afficher immédiatement sans redirection vers `/login`.
   - Ouvrir `https://<nouveau-domaine>/terms` : la page doit s'afficher immédiatement sans redirection vers `/login`.
   - Inspecter le code source HTML : la balise `<link rel="canonical" href="https://<nouveau-domaine>/privacy">` doit refléter le nouveau domaine.
2. **Liens internes de navigation** :
   - Clic sur le logo Radiza ou « Retour à l'accueil » : redirection fluide vers `https://<nouveau-domaine>/`.
   - Clic sur les liens du footer : alternance immédiate entre `/privacy` et `/terms`.
3. **Flux d'inscription & Email de confirmation (AUTH-2)** :
   - Créer un compte de test : l'email reçu doit contenir un lien de confirmation pointant vers `https://<nouveau-domaine>/auth/callback?...`.
   - Le clic sur le lien doit rediriger vers `https://<nouveau-domaine>/login?verified=true`.
4. **Flux Mot de passe oublié (AUTH-3)** :
   - Demander une réinitialisation depuis `/forgot-password` : le lien d'email doit pointer vers `https://<nouveau-domaine>/auth/callback?flow=recovery...`.
5. **Connexion Google OAuth (AUTH-5)** :
   - Cliquer sur « Se connecter avec Google » : l'écran de consentement Google doit afficher le nom de marque Radiza et les liens vers `https://<nouveau-domaine>/privacy` et `/terms`.
   - La validation du compte Google doit rediriger vers l'espace de destination sur `https://<nouveau-domaine>/...`.
