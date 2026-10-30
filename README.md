# Vocabulaire FR — Dictionnaire + Flashcards + Quiz

Application d'apprentissage du vocabulaire français inspirée de Quizlet, avec fiches détaillées (IPA, conjugaisons, collocations…).

## Fonctionnalités

### Compte utilisateur
- Inscription / connexion (JWT)
- Données isolées par utilisateur

### Dictionnaire personnel
- Fiches complètes : mot, IPA, catégorie, traductions EN/ES, exemples, collocations, synonymes, antonymes, tags, CECR
- **Conjugaisons** (verbes uniquement) : modes × temps × personnes
- Import **CSV / Excel** en masse

### Ensembles d'étude (Study Sets)
- Créer des listes thématiques
- Lier des mots à un ensemble

### Modes d'apprentissage (style Quizlet)
| Mode | Description |
|------|-------------|
| **Flashcards** | Recto/verso, marquer « Je sais » / « À revoir » |
| **Quiz QCM** | Choix multiples |
| **Quiz écrit** | Taper la traduction |
| **Répétition espacée** | Algorithme SM-2 simplifié |

### Suivi
- Mots maîtrisés / à réviser
- Statistiques par catégorie et statut

## Démarrage

### Backend (port 5001)
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```
→ http://localhost:5173

1. Créez un compte (S'inscrire)
2. Cliquez « Exemples » sur le tableau de bord (verbe *poser* + autres)
3. Allez dans **Ensembles** → **Étudier** (flashcards) ou **Quiz**

## Import CSV / Excel

Colonnes reconnues (en-têtes flexibles) :
`word` / `mot`, `en` / `english`, `es`, `ipa`, `category`, `tags`, `cefr`, `synonyms`, `notes`…

Exemple CSV :
```csv
word,en,es,ipa,category,tags,cefr
poser,to ask; to put,poner,/po.ze/,verbe,communication,A2
maison,house,casa,/mɛ.zɔ̃/,nom,quotidien,A1
```

## Stack

- **Frontend** : React 18 + TypeScript + Vite + Tailwind + React Router
- **Backend** : Node.js + Express + JWT + bcrypt + multer + xlsx + csv-parse
- **Stockage** : fichier JSON multi-utilisateurs (prêt à migrer vers MongoDB)

## Structure API (principale)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| GET | `/api/words` | Liste (auth) |
| POST | `/api/import` | Import fichier |
| GET/POST | `/api/sets` | Ensembles |
| GET | `/api/study/:setId/cards` | Flashcards |
| GET | `/api/study/:setId/quiz` | Questions quiz |
| POST | `/api/progress/review` | Enregistrer une révision |
