# Guide de déploiement — Kwala Dashboard

## Ce que tu vas avoir au bout de 30 min
Une app web accessible depuis ton téléphone et ton PC, connectée à ta base Airtable, avec tes deux vues (Gestion + Performance commerciale) et tous les filtres.

---

## Étape 1 — Préparer GitHub (5 min)

1. Va sur **github.com** et crée un compte si tu n'en as pas
2. Clique **"New repository"**
3. Nomme-le `kwala-dashboard`
4. Laisse tout par défaut → clique **"Create repository"**
5. Sur ton ordinateur, ouvre le terminal (Mac : `Cmd+Espace` → "Terminal")
6. Tape ces commandes une par une :

```bash
cd kwala-dashboard
git init
git add .
git commit -m "premier commit"
git remote add origin https://github.com/TON_USERNAME/kwala-dashboard.git
git push -u origin main
```

---

## Étape 2 — Déployer sur Vercel (5 min)

1. Va sur **vercel.com** → "Sign up with GitHub"
2. Clique **"New Project"**
3. Sélectionne `kwala-dashboard` dans la liste
4. Vercel détecte automatiquement que c'est un projet React
5. Clique **"Deploy"** → attends 2 min
6. Tu reçois une URL du type `kwala-dashboard.vercel.app` ✅

---

## Étape 3 — Connecter Airtable (10 min)

### 3a — Créer un token Airtable

1. Va sur **airtable.com/create/tokens** → **"Create new token"**
2. Nom : `kwala-dashboard`
3. **Scopes** : coche `data.records:read` **et rien d'autre**
4. **Access** : sélectionne uniquement la base **Kwala CRM** (`appAb5Ivl3iph8OjL`)
5. Clique **"Create token"** et copie-le (il ne sera plus jamais réaffiché)

⚠️ Ce token ne doit jamais être collé dans le code ni dans une variable
`REACT_APP_*` : tout ce qui commence par `REACT_APP_` se retrouve en clair dans
le navigateur de n'importe quel visiteur. Il est lu uniquement côté serveur par
la fonction `api/opportunites.js`.

### 3b — Le déclarer dans Vercel

1. Vercel → ton projet → **"Settings"** → **"Environment Variables"**
2. Ajoute :
   - Name : `AIRTABLE_TOKEN`
   - Value : le token copié à l'étape 3a
   - Environments : Production, Preview et Development
3. Ajoute aussi `REACT_APP_GOOGLE_API_KEY` (clé Google Sheets en lecture seule) —
   elle ne sert plus qu'à la barre de progression Trustfolio.
4. Onglet **"Deployments"** → sur le dernier déploiement, **"Redeploy"**
   (les variables d'environnement ne sont prises en compte qu'au build suivant)

### 3c — Vérifier

Ouvre `https://TON-APP.vercel.app/api/opportunites` dans le navigateur : tu dois
voir un JSON commençant par `{"rows":[...`. Si tu vois `AIRTABLE_TOKEN manquant`,
la variable n'est pas déclarée ou le redéploiement n'a pas été fait.

---

## Développement local

`npm start` ne sert pas les fonctions `/api`. Pour tester en local avec la vraie
source de données :

```bash
npm i -g vercel
vercel dev
```



---

## Étape 4 — Ajouter les accès coachs (5 min)

Pour que chaque coach ait accès à sa vue :

1. Dans Vercel → ton projet → **"Settings"** → **"Environment Variables"**
2. Ajoute une variable `REACT_APP_ALLOWED_EMAILS` avec les emails séparés par des virgules :
   ```
   mathilde@kwala.fr,gautier@kwala.fr,alexis@kwala.fr
   ```

L'app affichera automatiquement la bonne vue selon qui est connecté.

---

## Résultat final

| URL | Accès | Vue |
|-----|-------|-----|
| `kwala-dashboard.vercel.app` | Toi (email dirigeant) | Tout — Gestion + Perf + Rémunération |
| `kwala-dashboard.vercel.app` | Mathilde / Gautier / Alexis | Perf commerciale + leur RH perso |

---

## Mise à jour des données

**Aujourd'hui** : les données sont statiques (copiées de tes fichiers).
Les données viennent d'Airtable (table Opportunités) via `api/opportunites.js`, avec un cache CDN de 60 s.

Je te génère le code de connexion API dès que le déploiement de base tourne.

---

## Besoin d'aide ?

Envoie-moi une capture d'écran de l'étape qui bloque — je te guide pas à pas.
