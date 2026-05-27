# Guide de déploiement — Kwala Dashboard

## Ce que tu vas avoir au bout de 30 min
Une app web accessible depuis ton téléphone et ton PC, connectée à tes Google Sheets, avec tes deux vues (Gestion + Performance commerciale) et tous les filtres.

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

## Étape 3 — Connecter Google Sheets (15 min)

### 3a — Créer une clé API Google

1. Va sur **console.cloud.google.com**
2. Crée un nouveau projet : "Kwala Dashboard"
3. Menu gauche → **"APIs & Services"** → **"Enable APIs"**
4. Cherche **"Google Sheets API"** → Active-la
5. Menu gauche → **"Credentials"** → **"Create Credentials"** → **"API Key"**
6. Copie la clé générée (commence par `AIza...`)

### 3b — Rendre tes Sheets accessibles en lecture

Pour chaque Google Sheet (pilotage + fichiers coachs) :
1. Ouvre le fichier Google Sheets
2. Clique **"Partager"** (en haut à droite)
3. Change en **"Toute personne ayant le lien peut consulter"**
4. Copie l'ID dans l'URL : `docs.google.com/spreadsheets/d/**ID_ICI**/edit`

### 3c — Mettre à jour le code

Dans `src/App.jsx`, ligne 8-12, remplace :

```javascript
const SHEETS_CONFIG = {
  PILOTAGE_SHEET_ID: 'TON_SHEET_ID_PILOTAGE',   // ← colle l'ID ici
  MATHILDE_SHEET_ID: 'TON_SHEET_ID_MATHILDE',   // ← colle l'ID ici
  API_KEY: 'TA_CLE_API_GOOGLE',                  // ← colle la clé ici
};
```

Puis dans le terminal :
```bash
git add .
git commit -m "connexion google sheets"
git push
```

Vercel redéploie automatiquement en 1 min. ✅

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
**Prochaine étape** : connecter l'API Google Sheets pour un rafraîchissement automatique toutes les 5 minutes.

Je te génère le code de connexion API dès que le déploiement de base tourne.

---

## Besoin d'aide ?

Envoie-moi une capture d'écran de l'étape qui bloque — je te guide pas à pas.
