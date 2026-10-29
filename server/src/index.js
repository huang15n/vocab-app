const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;
const DATA_FILE = path.join(__dirname, '..', 'data', 'words.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load or initialize data
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading data:', e.message);
  }
  return { words: [], nextId: 1 };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let db = loadData();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// ========== ROUTES ==========

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', wordsCount: db.words.length });
});

// Get all words (with optional filters)
app.get('/api/words', (req, res) => {
  let words = [...db.words];
  const { category, status, tag, search, level } = req.query;

  if (category) {
    words = words.filter(w => w.category === category);
  }
  if (status) {
    words = words.filter(w => w.learningStatus === status);
  }
  if (tag) {
    words = words.filter(w => w.tags && w.tags.includes(tag));
  }
  if (level) {
    words = words.filter(w => w.cefrLevel === level);
  }
  if (search) {
    const q = search.toLowerCase();
    words = words.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.translations?.en || '').toLowerCase().includes(q) ||
      (w.translations?.es || '').toLowerCase().includes(q) ||
      (w.translations?.fr || '').toLowerCase().includes(q)
    );
  }

  // Sort by word
  words.sort((a, b) => a.word.localeCompare(b.word, 'fr'));
  res.json(words);
});

// Get single word
app.get('/api/words/:id', (req, res) => {
  const word = db.words.find(w => w.id === Number(req.params.id));
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });
  res.json(word);
});

// Create word
app.post('/api/words', (req, res) => {
  const body = req.body;
  if (!body.word || !body.category || !body.ipa) {
    return res.status(400).json({ error: 'Mot, catégorie et IPA sont obligatoires' });
  }

  const newWord = {
    id: db.nextId++,
    word: body.word.trim(),
    category: body.category, // verbe | nom | adjectif | expression | adverbe | autre
    ipa: body.ipa.trim(),
    translations: {
      en: body.translations?.en || '',
      es: body.translations?.es || '',
      fr: body.translations?.fr || ''
    },
    definition: body.definition || '',
    examples: body.examples || [], // [{ sentence, translation }]
    collocations: body.collocations || [],
    synonyms: body.synonyms || [],
    antonyms: body.antonyms || [],
    tags: body.tags || [],
    cefrLevel: body.cefrLevel || '',
    learningStatus: body.learningStatus || 'nouveau', // nouveau | en_cours | appris | a_reviser
    conjugations: body.category === 'verbe' ? (body.conjugations || null) : null,
    notes: body.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.words.push(newWord);
  saveData(db);
  res.status(201).json(newWord);
});

// Update word
app.put('/api/words/:id', (req, res) => {
  const idx = db.words.findIndex(w => w.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });

  const body = req.body;
  const existing = db.words[idx];

  const updated = {
    ...existing,
    word: body.word?.trim() ?? existing.word,
    category: body.category ?? existing.category,
    ipa: body.ipa?.trim() ?? existing.ipa,
    translations: {
      en: body.translations?.en ?? existing.translations?.en ?? '',
      es: body.translations?.es ?? existing.translations?.es ?? '',
      fr: body.translations?.fr ?? existing.translations?.fr ?? ''
    },
    definition: body.definition ?? existing.definition,
    examples: body.examples ?? existing.examples,
    collocations: body.collocations ?? existing.collocations,
    synonyms: body.synonyms ?? existing.synonyms,
    antonyms: body.antonyms ?? existing.antonyms,
    tags: body.tags ?? existing.tags,
    cefrLevel: body.cefrLevel ?? existing.cefrLevel,
    learningStatus: body.learningStatus ?? existing.learningStatus,
    conjugations: body.category === 'verbe' || existing.category === 'verbe'
      ? (body.conjugations ?? existing.conjugations)
      : null,
    notes: body.notes ?? existing.notes,
    updatedAt: new Date().toISOString()
  };

  db.words[idx] = updated;
  saveData(db);
  res.json(updated);
});

// Delete word
app.delete('/api/words/:id', (req, res) => {
  const idx = db.words.findIndex(w => w.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  db.words.splice(idx, 1);
  saveData(db);
  res.json({ message: 'Mot supprimé' });
});

// Stats
app.get('/api/stats', (req, res) => {
  const total = db.words.length;
  const byCategory = {};
  const byStatus = {};
  db.words.forEach(w => {
    byCategory[w.category] = (byCategory[w.category] || 0) + 1;
    byStatus[w.learningStatus] = (byStatus[w.learningStatus] || 0) + 1;
  });
  res.json({ total, byCategory, byStatus });
});

// Seed sample data
app.post('/api/seed', (req, res) => {
  if (db.words.length > 0 && !req.query.force) {
    return res.status(400).json({ error: 'Base déjà remplie. Utilisez ?force=true' });
  }
  db = { words: [], nextId: 1 };
  const samples = getSampleData();
  samples.forEach(s => {
    s.id = db.nextId++;
    s.createdAt = new Date().toISOString();
    s.updatedAt = s.createdAt;
    db.words.push(s);
  });
  saveData(db);
  res.json({ message: `${samples.length} mots ajoutés`, count: samples.length });
});

function getSampleData() {
  return [
    {
      word: 'poser',
      category: 'verbe',
      ipa: '/po.ze/',
      translations: { en: 'to ask; to put', es: 'hacer una pregunta; poner', fr: '' },
      definition: 'Mettre quelque chose en un endroit ; formuler une question.',
      examples: [
        { sentence: 'Je voudrais poser une question.', translation: 'I would like to ask a question.' },
        { sentence: 'Il a posé le livre sur la table.', translation: 'He put the book on the table.' }
      ],
      collocations: ['poser une question', 'poser un problème', 'poser un diagnostic', 'poser quelque chose sur'],
      synonyms: ['interroger', 'questionner', 'mettre', 'placer'],
      antonyms: [],
      tags: ['communication', 'travail'],
      cefrLevel: 'A2–B1',
      learningStatus: 'en_cours',
      conjugations: {
        indicatif: {
          present: {
            je: 'pose',
            tu: 'poses',
            'il/elle/on': 'pose',
            nous: 'posons',
            vous: 'posez',
            'ils/elles': 'posent'
          },
          imparfait: {
            je: 'posais',
            tu: 'posais',
            'il/elle/on': 'posait',
            nous: 'posions',
            vous: 'posiez',
            'ils/elles': 'posaient'
          },
          futur_simple: {
            je: 'poserai',
            tu: 'poseras',
            'il/elle/on': 'posera',
            nous: 'poserons',
            vous: 'poserez',
            'ils/elles': 'poseront'
          },
          passe_compose: {
            je: 'ai posé',
            tu: 'as posé',
            'il/elle/on': 'a posé',
            nous: 'avons posé',
            vous: 'avez posé',
            'ils/elles': 'ont posé'
          },
          plus_que_parfait: {
            je: 'avais posé',
            tu: 'avais posé',
            'il/elle/on': 'avait posé',
            nous: 'avions posé',
            vous: 'aviez posé',
            'ils/elles': 'avaient posé'
          },
          passe_simple: {
            je: 'posai',
            tu: 'posas',
            'il/elle/on': 'posa',
            nous: 'posâmes',
            vous: 'posâtes',
            'ils/elles': 'posèrent'
          }
        },
        subjonctif: {
          present: {
            que_je: 'pose',
            que_tu: 'poses',
            'qu_il/elle/on': 'pose',
            que_nous: 'posions',
            que_vous: 'posiez',
            'qu_ils/elles': 'posent'
          }
        },
        conditionnel: {
          present: {
            je: 'poserais',
            tu: 'poserais',
            'il/elle/on': 'poserait',
            nous: 'poserions',
            vous: 'poseriez',
            'ils/elles': 'poseraient'
          }
        },
        imperatif: {
          present: {
            tu: 'pose',
            nous: 'posons',
            vous: 'posez'
          }
        },
        infinitif: { present: 'poser', passe: 'avoir posé' },
        participe: { present: 'posant', passe: 'posé' },
        gerondif: { present: 'en posant' }
      },
      notes: 'Verbe du 1er groupe. Attention aux collocations.'
    },
    {
      word: 'maison',
      category: 'nom',
      ipa: '/mɛ.zɔ̃/',
      translations: { en: 'house; home', es: 'casa', fr: '' },
      definition: 'Bâtiment destiné à l\'habitation.',
      examples: [
        { sentence: 'J\'habite dans une grande maison.', translation: 'I live in a big house.' }
      ],
      collocations: ['maison de campagne', 'maison individuelle', 'à la maison'],
      synonyms: ['habitation', 'demeure', 'foyer'],
      antonyms: [],
      tags: ['quotidien', 'logement'],
      cefrLevel: 'A1',
      learningStatus: 'appris',
      conjugations: null,
      notes: ''
    },
    {
      word: 'beau',
      category: 'adjectif',
      ipa: '/bo/',
      translations: { en: 'beautiful; handsome', es: 'hermoso; bello', fr: '' },
      definition: 'Qui suscite l\'admiration par son apparence.',
      examples: [
        { sentence: 'C\'est un beau paysage.', translation: 'It is a beautiful landscape.' }
      ],
      collocations: ['beau temps', 'belle personne', 'il fait beau'],
      synonyms: ['joli', 'magnifique', 'splendide'],
      antonyms: ['laid', 'moche'],
      tags: ['description'],
      cefrLevel: 'A1',
      learningStatus: 'nouveau',
      conjugations: null,
      notes: 'Formes : beau / belle / beaux / belles. Attention au masculin devant voyelle : bel.'
    },
    {
      word: 'mettre',
      category: 'verbe',
      ipa: '/mɛtʁ/',
      translations: { en: 'to put; to place; to wear', es: 'poner; meter', fr: '' },
      definition: 'Placer quelque chose quelque part ; revêtir un vêtement.',
      examples: [
        { sentence: 'Mets le livre sur la table.', translation: 'Put the book on the table.' }
      ],
      collocations: ['mettre en place', 'mettre à jour', 'se mettre à'],
      synonyms: ['placer', 'poser', 'installer'],
      antonyms: ['enlever', 'retirer'],
      tags: ['quotidien', 'action'],
      cefrLevel: 'A2',
      learningStatus: 'en_cours',
      conjugations: {
        indicatif: {
          present: {
            je: 'mets',
            tu: 'mets',
            'il/elle/on': 'met',
            nous: 'mettons',
            vous: 'mettez',
            'ils/elles': 'mettent'
          },
          passe_compose: {
            je: 'ai mis',
            tu: 'as mis',
            'il/elle/on': 'a mis',
            nous: 'avons mis',
            vous: 'avez mis',
            'ils/elles': 'ont mis'
          }
        },
        imperatif: {
          present: { tu: 'mets', nous: 'mettons', vous: 'mettez' }
        },
        infinitif: { present: 'mettre' },
        participe: { present: 'mettant', passe: 'mis' }
      },
      notes: 'Verbe irrégulier du 3e groupe.'
    }
  ];
}

// Start
app.listen(PORT, () => {
  console.log(`🚀 Vocab API running on http://localhost:${PORT}`);
  console.log(`📚 Words loaded: ${db.words.length}`);
});
