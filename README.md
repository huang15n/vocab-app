# Vocabulaire FR — Application MERN de vocabulaire

Application full-stack pour apprendre et gérer du vocabulaire français, avec support spécial des **conjugaisons** pour les verbes.

## Stack

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend** : Node.js + Express (JSON file store pour simplicité de démarrage ; structure prête pour MongoDB/Mongoose)
- **Données** : Fichier JSON persistant (`server/data/words.json`)

> Note : L'architecture et les modèles suivent une logique MERN. Le stockage JSON permet de démarrer immédiatement sans MongoDB. Pour basculer sur MongoDB, remplacez le store fichier par Mongoose (modèles déjà pensés pour ça).

## Fonctionnalités

- Fiches de vocabulaire : mot, IPA, catégorie, traductions (EN/ES), définition, exemples, collocations, synonymes, antonymes, étiquettes, niveau CECR, statut d'apprentissage
- **Conjugaisons** (verbes uniquement) :
  - Modes : indicatif, subjonctif, conditionnel, impératif, infinitif, participe, gérondif
  - Temps : présent, imparfait, futur simple, passé composé, plus-que-parfait, passé simple, etc.
  - Personnes : je, tu, il/elle/on, nous, vous, ils/elles
  - Interface à onglets + copie des formes
- Filtres et recherche
- Tableau de bord avec statistiques
- Données d'exemple incluant le verbe **poser** avec conjugaisons complètes

## Installation & démarrage

### Prérequis
- Node.js 18+
- npm

### 1. Backend

```bash
cd server
npm install
npm run dev
# → http://localhost:5000
```

### 2. Frontend (autre terminal)

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

Le proxy Vite redirige `/api` vers le backend.

### 3. Charger les exemples

Sur le tableau de bord, cliquez sur **« Charger exemples »** (ou `POST /api/seed`).

Cela ajoute notamment le verbe **poser** avec ses conjugaisons, plus d'autres mots.

## Structure des données (verbe)

```json
{
  "word": "poser",
  "category": "verbe",
  "ipa": "/po.ze/",
  "translations": { "en": "to ask; to put", "es": "..." },
  "examples": [{ "sentence": "...", "translation": "..." }],
  "collocations": ["poser une question", ...],
  "synonyms": ["interroger", ...],
  "tags": ["communication", "travail"],
  "cefrLevel": "A2–B1",
  "learningStatus": "en_cours",
  "conjugations": {
    "indicatif": {
      "present": {
        "je": "pose",
        "tu": "poses",
        "il/elle/on": "pose",
        "nous": "posons",
        "vous": "posez",
        "ils/elles": "posent"
      },
      "imparfait": { ... },
      "futur_simple": { ... },
      "passe_compose": { ... }
    },
    "subjonctif": { "present": { ... } },
    "conditionnel": { "present": { ... } },
    "imperatif": { "present": { "tu": "pose", ... } },
    "infinitif": { "present": "poser", "passe": "avoir posé" },
    "participe": { "present": "posant", "passe": "posé" },
    "gerondif": { "present": "en posant" }
  }
}
```

Les champs de conjugaison n'apparaissent **que** pour la catégorie `verbe`.

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/words` | Liste (query: search, category, status, tag, level) |
| GET | `/api/words/:id` | Détail |
| POST | `/api/words` | Créer |
| PUT | `/api/words/:id` | Modifier |
| DELETE | `/api/words/:id` | Supprimer |
| GET | `/api/stats` | Statistiques |
| POST | `/api/seed` | Charger exemples (`?force=true`) |

## Évolutions possibles

- Connexion MongoDB Atlas + Mongoose
- Authentification (JWT)
- Import/export CSV ou Anki
- Service de conjugaison automatique (API externe)
- Mode révision / flashcards
- Support multi-langues source (ES, DE, etc.)

---

Créé pour l'apprentissage du français avec un focus particulier sur les verbes et leurs conjugaisons.
