const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'vocab-fr-secret-change-me-in-production';
const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');

const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('DB load error:', e.message);
  }
  return {
    users: [],
    words: [],
    sets: [],
    progress: [],
    nextUserId: 1,
    nextWordId: 1,
    nextSetId: 1,
  };
}

function saveDb() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let db = loadDb();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ---------- Auth middleware ----------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      const user = db.users.find((u) => u.id === payload.userId);
      if (user) req.user = { id: user.id, email: user.email, name: user.name };
    } catch {}
  }
  next();
}

// ---------- Auth routes ----------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email et mot de passe (min. 6 caractères) requis' });
  }
  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (exists) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: db.nextUserId++,
    email: email.toLowerCase().trim(),
    passwordHash: hash,
    name: (name || email.split('@')[0]).trim(),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb();

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const user = db.users.find((u) => u.email === email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Words ----------
app.get('/api/words', auth, (req, res) => {
  let words = db.words.filter((w) => w.userId === req.user.id);
  const { category, status, tag, search, level, setId } = req.query;

  if (setId) {
    const set = db.sets.find((s) => s.id === Number(setId) && s.userId === req.user.id);
    if (set) words = words.filter((w) => set.wordIds.includes(w.id));
  }
  if (category) words = words.filter((w) => w.category === category);
  if (status) words = words.filter((w) => w.learningStatus === status);
  if (tag) words = words.filter((w) => w.tags?.includes(tag));
  if (level) words = words.filter((w) => w.cefrLevel === level);
  if (search) {
    const q = search.toLowerCase();
    words = words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        (w.translations?.en || '').toLowerCase().includes(q) ||
        (w.translations?.es || '').toLowerCase().includes(q)
    );
  }
  words.sort((a, b) => a.word.localeCompare(b.word, 'fr'));
  res.json(words);
});

app.get('/api/words/:id', auth, (req, res) => {
  const word = db.words.find((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });
  res.json(word);
});

app.post('/api/words', auth, (req, res) => {
  const body = req.body;
  if (!body.word || !body.category || !body.ipa) {
    return res.status(400).json({ error: 'Mot, catégorie et IPA sont obligatoires' });
  }
  const newWord = {
    id: db.nextWordId++,
    userId: req.user.id,
    word: body.word.trim(),
    category: body.category,
    ipa: body.ipa.trim(),
    gender: body.category === 'nom' ? (body.gender || '') : undefined,
    translations: {
      en: body.translations?.en || '',
      enExample: body.translations?.enExample || '',
      es: body.translations?.es || '',
      esExample: body.translations?.esExample || '',
    },
    definition: body.definition || '',
    examples: Array.isArray(body.examples)
      ? body.examples.map((e) => (typeof e === 'string' ? e : e?.sentence || '')).filter(Boolean)
      : [],
    collocations: body.collocations || [],
    synonyms: body.synonyms || [],
    antonyms: body.antonyms || [],
    tags: body.tags || [],
    cefrLevel: body.cefrLevel || '',
    learningStatus: body.learningStatus || 'nouveau',
    conjugations: body.category === 'verbe' ? body.conjugations || null : null,
    notes: body.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.words.push(newWord);
  saveDb();
  res.status(201).json(newWord);
});

app.put('/api/words/:id', auth, (req, res) => {
  const idx = db.words.findIndex((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  const body = req.body;
  const existing = db.words[idx];
  const cat = body.category ?? existing.category;
  let examples = body.examples ?? existing.examples;
  if (Array.isArray(examples)) {
    examples = examples.map((e) => (typeof e === 'string' ? e : e?.sentence || '')).filter(Boolean);
  }
  const updated = {
    ...existing,
    word: body.word?.trim() ?? existing.word,
    category: cat,
    ipa: body.ipa?.trim() ?? existing.ipa,
    gender: cat === 'nom' ? (body.gender ?? existing.gender ?? '') : undefined,
    translations: {
      en: body.translations?.en ?? existing.translations?.en ?? '',
      enExample: body.translations?.enExample ?? existing.translations?.enExample ?? '',
      es: body.translations?.es ?? existing.translations?.es ?? '',
      esExample: body.translations?.esExample ?? existing.translations?.esExample ?? '',
    },
    definition: body.definition ?? existing.definition,
    examples,
    collocations: body.collocations ?? existing.collocations,
    synonyms: body.synonyms ?? existing.synonyms,
    antonyms: body.antonyms ?? existing.antonyms,
    tags: body.tags ?? existing.tags,
    cefrLevel: body.cefrLevel ?? existing.cefrLevel,
    learningStatus: body.learningStatus ?? existing.learningStatus,
    conjugations: cat === 'verbe' ? (body.conjugations ?? existing.conjugations) : null,
    notes: body.notes ?? existing.notes,
    updatedAt: new Date().toISOString(),
  };
  db.words[idx] = updated;
  saveDb();
  res.json(updated);
});

app.delete('/api/words/:id', auth, (req, res) => {
  const idx = db.words.findIndex((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  const wordId = db.words[idx].id;
  db.words.splice(idx, 1);
  db.sets.forEach((s) => {
    if (s.userId === req.user.id) s.wordIds = s.wordIds.filter((id) => id !== wordId);
  });
  db.progress = db.progress.filter((p) => !(p.userId === req.user.id && p.wordId === wordId));
  saveDb();
  res.json({ message: 'Mot supprimé' });
});

// Bulk delete
app.post('/api/words/bulk-delete', auth, (req, res) => {
  const ids = (req.body.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: 'Aucun id fourni' });
  const idSet = new Set(ids);
  const before = db.words.length;
  db.words = db.words.filter((w) => !(w.userId === req.user.id && idSet.has(w.id)));
  const deleted = before - db.words.length;
  db.sets.forEach((s) => {
    if (s.userId === req.user.id) s.wordIds = s.wordIds.filter((id) => !idSet.has(id));
  });
  db.progress = db.progress.filter((p) => !(p.userId === req.user.id && idSet.has(p.wordId)));
  saveDb();
  res.json({ message: `${deleted} mot(s) supprimé(s)`, deleted });
});

// ---------- Bulk import CSV / Excel ----------
function normalizeRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k.toLowerCase());
      if (found && row[found] != null && String(row[found]).trim()) return String(row[found]).trim();
    }
    return '';
  };
  const word = get('word', 'mot', 'terme', 'term');
  if (!word) return null;
  const category = (get('category', 'catégorie', 'categorie', 'type') || 'nom').toLowerCase();
  const validCats = ['verbe', 'nom', 'adjectif', 'expression', 'adverbe', 'autre'];
  const cat = validCats.includes(category) ? category : 'nom';
  const genderRaw = get('gender', 'genre').toLowerCase();
  let gender = '';
  if (genderRaw.startsWith('m')) gender = 'masculin';
  else if (genderRaw.startsWith('f')) gender = 'feminin';
  else if (genderRaw) gender = 'invariable';
  const frEx = get('example', 'exemple', 'examples', 'exemples');
  return {
    word,
    category: cat,
    ipa: get('ipa', 'pronunciation', 'prononciation') || `/${word}/`,
    gender: cat === 'nom' ? gender : undefined,
    translations: {
      en: get('en', 'english', 'anglais', 'translation', 'traduction'),
      enExample: get('en_example', 'enexample', 'exemple_en', 'example_en'),
      es: get('es', 'spanish', 'espagnol'),
      esExample: get('es_example', 'esexample', 'exemple_es', 'example_es'),
    },
    definition: get('definition', 'définition', 'def'),
    examples: frEx ? frEx.split(/[;|]/).map((s) => s.trim()).filter(Boolean) : [],
    collocations: get('collocations')
      ? get('collocations').split(/[;|]/).map((s) => s.trim()).filter(Boolean)
      : [],
    synonyms: get('synonyms', 'synonymes')
      ? get('synonyms', 'synonymes').split(/[;|,]/).map((s) => s.trim()).filter(Boolean)
      : [],
    antonyms: get('antonyms', 'antonymes')
      ? get('antonyms', 'antonymes').split(/[;|,]/).map((s) => s.trim()).filter(Boolean)
      : [],
    tags: get('tags', 'étiquettes', 'etiquettes')
      ? get('tags', 'étiquettes', 'etiquettes').split(/[;|,]/).map((s) => s.trim()).filter(Boolean)
      : [],
    cefrLevel: get('cefr', 'level', 'niveau', 'cefrlevel'),
    learningStatus: 'nouveau',
    conjugations: null,
    notes: get('notes', 'note'),
  };
}

// ---------- Study Sets ----------
app.get('/api/sets', auth, (req, res) => {
  const sets = db.sets
    .filter((s) => s.userId === req.user.id)
    .map((s) => ({
      ...s,
      wordCount: s.wordIds.length,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(sets);
});

app.post('/api/sets', auth, (req, res) => {
  const { name, description, wordIds } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
  const set = {
    id: db.nextSetId++,
    userId: req.user.id,
    name: name.trim(),
    description: description || '',
    wordIds: Array.isArray(wordIds) ? wordIds.map(Number) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.sets.push(set);
  saveDb();
  res.status(201).json(set);
});

app.get('/api/sets/:id', auth, (req, res) => {
  const set = db.sets.find((s) => s.id === Number(req.params.id) && s.userId === req.user.id);
  if (!set) return res.status(404).json({ error: 'Ensemble non trouvé' });
  const words = db.words.filter((w) => set.wordIds.includes(w.id) && w.userId === req.user.id);
  res.json({ ...set, words });
});

app.put('/api/sets/:id', auth, (req, res) => {
  const idx = db.sets.findIndex((s) => s.id === Number(req.params.id) && s.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Ensemble non trouvé' });
  const body = req.body;
  db.sets[idx] = {
    ...db.sets[idx],
    name: body.name?.trim() ?? db.sets[idx].name,
    description: body.description ?? db.sets[idx].description,
    wordIds: body.wordIds !== undefined ? body.wordIds.map(Number) : db.sets[idx].wordIds,
    updatedAt: new Date().toISOString(),
  };
  saveDb();
  res.json(db.sets[idx]);
});

app.delete('/api/sets/:id', auth, (req, res) => {
  const idx = db.sets.findIndex((s) => s.id === Number(req.params.id) && s.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Ensemble non trouvé' });
  db.sets.splice(idx, 1);
  saveDb();
  res.json({ message: 'Ensemble supprimé' });
});

app.post('/api/sets/:id/words', auth, (req, res) => {
  const set = db.sets.find((s) => s.id === Number(req.params.id) && s.userId === req.user.id);
  if (!set) return res.status(404).json({ error: 'Ensemble non trouvé' });
  const ids = (req.body.wordIds || []).map(Number);
  ids.forEach((id) => {
    if (!set.wordIds.includes(id) && db.words.some((w) => w.id === id && w.userId === req.user.id)) {
      set.wordIds.push(id);
    }
  });
  set.updatedAt = new Date().toISOString();
  saveDb();
  res.json(set);
});

// ---------- Progress / Spaced repetition (SM-2 simplified) ----------
function getProgress(userId, wordId) {
  let p = db.progress.find((x) => x.userId === userId && x.wordId === wordId);
  if (!p) {
    p = {
      userId,
      wordId,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: new Date().toISOString(),
      correctCount: 0,
      incorrectCount: 0,
      lastReviewed: null,
      status: 'nouveau', // nouveau | learning | review | mastered
    };
    db.progress.push(p);
  }
  return p;
}

app.get('/api/progress', auth, (req, res) => {
  const list = db.progress.filter((p) => p.userId === req.user.id);
  res.json(list);
});

app.get('/api/progress/due', auth, (req, res) => {
  const now = new Date();
  const setId = req.query.setId ? Number(req.query.setId) : null;
  let wordIds = null;
  if (setId) {
    const set = db.sets.find((s) => s.id === setId && s.userId === req.user.id);
    if (set) wordIds = new Set(set.wordIds);
  }
  let words = db.words.filter((w) => w.userId === req.user.id);
  if (wordIds) words = words.filter((w) => wordIds.has(w.id));

  const due = words
    .map((w) => {
      const p = getProgress(req.user.id, w.id);
      return { word: w, progress: p };
    })
    .filter(({ progress }) => new Date(progress.nextReview) <= now)
    .sort((a, b) => new Date(a.progress.nextReview) - new Date(b.progress.nextReview));

  saveDb();
  res.json(due);
});

app.post('/api/progress/review', auth, (req, res) => {
  const { wordId, quality } = req.body; // quality 0-5 (SM-2)
  if (!wordId || quality === undefined) {
    return res.status(400).json({ error: 'wordId et quality (0-5) requis' });
  }
  const q = Math.max(0, Math.min(5, Number(quality)));
  const word = db.words.find((w) => w.id === Number(wordId) && w.userId === req.user.id);
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });

  const p = getProgress(req.user.id, word.id);
  p.lastReviewed = new Date().toISOString();

  if (q >= 3) {
    p.correctCount++;
    if (p.repetitions === 0) {
      p.interval = 1;
    } else if (p.repetitions === 1) {
      p.interval = 3;
    } else {
      p.interval = Math.round(p.interval * p.ease);
    }
    p.repetitions++;
    p.ease = Math.max(1.3, p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    if (p.repetitions >= 5 && p.ease >= 2.5) p.status = 'mastered';
    else if (p.repetitions >= 1) p.status = 'review';
    else p.status = 'learning';
  } else {
    p.incorrectCount++;
    p.repetitions = 0;
    p.interval = 0;
    p.status = 'learning';
    p.ease = Math.max(1.3, p.ease - 0.2);
  }

  const next = new Date();
  next.setDate(next.getDate() + Math.max(1, p.interval));
  p.nextReview = next.toISOString();

  // sync learningStatus on word
  if (p.status === 'mastered') word.learningStatus = 'appris';
  else if (p.status === 'learning' || p.status === 'review') word.learningStatus = 'en_cours';
  word.updatedAt = new Date().toISOString();

  saveDb();
  res.json({ progress: p, word });
});

// ---------- Study session helpers ----------
app.get('/api/study/:setId/cards', auth, (req, res) => {
  const set = db.sets.find((s) => s.id === Number(req.params.setId) && s.userId === req.user.id);
  if (!set) return res.status(404).json({ error: 'Ensemble non trouvé' });
  const words = db.words.filter((w) => set.wordIds.includes(w.id) && w.userId === req.user.id);
  const cards = words.map((w) => ({
    id: w.id,
    front: w.word,
    back: w.translations?.en || w.definition || '',
    ipa: w.ipa,
    category: w.category,
    example: (Array.isArray(w.examples) ? (typeof w.examples[0] === 'string' ? w.examples[0] : w.examples[0]?.sentence) : '') || '',
    progress: getProgress(req.user.id, w.id),
  }));
  saveDb();
  res.json(cards);
});

app.get('/api/study/:setId/quiz', auth, (req, res) => {
  const set = db.sets.find((s) => s.id === Number(req.params.setId) && s.userId === req.user.id);
  if (!set) return res.status(404).json({ error: 'Ensemble non trouvé' });
  let words = db.words.filter((w) => set.wordIds.includes(w.id) && w.userId === req.user.id);
  if (words.length < 2) {
    return res.status(400).json({ error: 'Au moins 2 mots nécessaires pour un quiz' });
  }
  // shuffle
  words = [...words].sort(() => Math.random() - 0.5);
  const limit = Math.min(words.length, Number(req.query.limit) || 20);
  words = words.slice(0, limit);

  const questions = words.map((w) => {
    const others = words
      .filter((o) => o.id !== w.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((o) => o.translations?.en || o.word);
    const correct = w.translations?.en || w.definition || w.word;
    const options = [...others, correct].sort(() => Math.random() - 0.5);
    return {
      wordId: w.id,
      prompt: w.word,
      ipa: w.ipa,
      type: 'mcq',
      options,
      // correct answer not sent — client submits and we validate
    };
  });
  res.json({ questions, setName: set.name });
});

app.post('/api/study/quiz/check', auth, (req, res) => {
  const { wordId, answer, type } = req.body;
  const word = db.words.find((w) => w.id === Number(wordId) && w.userId === req.user.id);
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });

  const correctAnswers = [
    (word.translations?.en || '').toLowerCase().trim(),
    (word.translations?.es || '').toLowerCase().trim(),
    (word.definition || '').toLowerCase().trim(),
    word.word.toLowerCase().trim(),
  ].filter(Boolean);

  const userAns = String(answer || '')
    .toLowerCase()
    .trim();
  let correct = false;
  if (type === 'mcq') {
    correct = correctAnswers.includes(userAns) || userAns === (word.translations?.en || '').toLowerCase();
  } else {
    // written — fuzzy: exact or contains main translation
    correct =
      correctAnswers.some((c) => c === userAns || (c && userAns.includes(c)) || (c && c.includes(userAns))) &&
      userAns.length > 0;
  }

  // auto record progress
  const quality = correct ? 4 : 1;
  const p = getProgress(req.user.id, word.id);
  // reuse review logic lightly
  p.lastReviewed = new Date().toISOString();
  if (correct) {
    p.correctCount++;
    p.repetitions = (p.repetitions || 0) + 1;
    p.interval = p.repetitions === 1 ? 1 : p.repetitions === 2 ? 3 : Math.round((p.interval || 1) * (p.ease || 2.5));
    p.ease = Math.max(1.3, (p.ease || 2.5) + 0.1);
    p.status = p.repetitions >= 5 ? 'mastered' : 'review';
  } else {
    p.incorrectCount++;
    p.repetitions = 0;
    p.interval = 0;
    p.status = 'learning';
  }
  const next = new Date();
  next.setDate(next.getDate() + Math.max(1, p.interval || 1));
  p.nextReview = next.toISOString();
  if (p.status === 'mastered') word.learningStatus = 'appris';
  else word.learningStatus = 'en_cours';
  saveDb();

  res.json({
    correct,
    correctAnswer: word.translations?.en || word.definition,
    word: word.word,
    progress: p,
  });
});

// ---------- Stats ----------
app.get('/api/stats', auth, (req, res) => {
  const words = db.words.filter((w) => w.userId === req.user.id);
  const progress = db.progress.filter((p) => p.userId === req.user.id);
  const sets = db.sets.filter((s) => s.userId === req.user.id);
  const byCategory = {};
  const byStatus = {};
  words.forEach((w) => {
    byCategory[w.category] = (byCategory[w.category] || 0) + 1;
    byStatus[w.learningStatus] = (byStatus[w.learningStatus] || 0) + 1;
  });
  const now = new Date();
  const dueCount = progress.filter((p) => new Date(p.nextReview) <= now).length;
  const mastered = progress.filter((p) => p.status === 'mastered').length;
  res.json({
    total: words.length,
    byCategory,
    byStatus,
    setsCount: sets.length,
    dueCount,
    mastered,
    totalReviews: progress.reduce((s, p) => s + p.correctCount + p.incorrectCount, 0),
  });
});

// ---------- Seed sample for current user ----------
app.post('/api/seed', auth, (req, res) => {
  if (db.words.some((w) => w.userId === req.user.id) && !req.query.force) {
    return res.status(400).json({ error: 'Vous avez déjà des mots. Utilisez ?force=true' });
  }
  const samples = getSampleWords(req.user.id);
  samples.forEach((s) => {
    s.id = db.nextWordId++;
    db.words.push(s);
  });
  // create a default set
  const set = {
    id: db.nextSetId++,
    userId: req.user.id,
    name: 'Exemples français',
    description: 'Mots de démonstration (dont le verbe poser)',
    wordIds: samples.map((s) => s.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.sets.push(set);
  saveDb();
  res.json({ message: `${samples.length} mots + 1 ensemble ajoutés`, count: samples.length, setId: set.id });
});

function getSampleWords(userId) {
  const now = new Date().toISOString();
  return [
    {
      userId,
      word: 'poser',
      category: 'verbe',
      ipa: '/po.ze/',
      translations: { en: 'to ask; to put', es: 'hacer una pregunta; poner', fr: '' },
      definition: 'Mettre quelque chose en un endroit ; formuler une question.',
      examples: [
        { sentence: 'Je voudrais poser une question.', translation: 'I would like to ask a question.' },
        { sentence: 'Il a posé le livre sur la table.', translation: 'He put the book on the table.' },
      ],
      collocations: ['poser une question', 'poser un problème', 'poser un diagnostic'],
      synonyms: ['interroger', 'questionner', 'mettre'],
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
            'ils/elles': 'posent',
          },
          imparfait: {
            je: 'posais',
            tu: 'posais',
            'il/elle/on': 'posait',
            nous: 'posions',
            vous: 'posiez',
            'ils/elles': 'posaient',
          },
          futur_simple: {
            je: 'poserai',
            tu: 'poseras',
            'il/elle/on': 'posera',
            nous: 'poserons',
            vous: 'poserez',
            'ils/elles': 'poseront',
          },
          passe_compose: {
            je: 'ai posé',
            tu: 'as posé',
            'il/elle/on': 'a posé',
            nous: 'avons posé',
            vous: 'avez posé',
            'ils/elles': 'ont posé',
          },
        },
        imperatif: { present: { tu: 'pose', nous: 'posons', vous: 'posez' } },
        infinitif: { present: 'poser', passe: 'avoir posé' },
        participe: { present: 'posant', passe: 'posé' },
      },
      notes: 'Verbe du 1er groupe.',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId,
      word: 'maison',
      category: 'nom',
      ipa: '/mɛ.zɔ̃/',
      translations: { en: 'house; home', es: 'casa', fr: '' },
      definition: "Bâtiment destiné à l'habitation.",
      examples: [{ sentence: "J'habite dans une grande maison.", translation: 'I live in a big house.' }],
      collocations: ['maison de campagne', 'à la maison'],
      synonyms: ['habitation', 'demeure'],
      antonyms: [],
      tags: ['quotidien'],
      cefrLevel: 'A1',
      learningStatus: 'appris',
      conjugations: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId,
      word: 'beau',
      category: 'adjectif',
      ipa: '/bo/',
      translations: { en: 'beautiful; handsome', es: 'hermoso', fr: '' },
      definition: "Qui suscite l'admiration par son apparence.",
      examples: [{ sentence: "C'est un beau paysage.", translation: 'It is a beautiful landscape.' }],
      collocations: ['beau temps', 'il fait beau'],
      synonyms: ['joli', 'magnifique'],
      antonyms: ['laid'],
      tags: ['description'],
      cefrLevel: 'A1',
      learningStatus: 'nouveau',
      conjugations: null,
      notes: 'beau / belle / beaux / belles',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId,
      word: 'mettre',
      category: 'verbe',
      ipa: '/mɛtʁ/',
      translations: { en: 'to put; to place', es: 'poner', fr: '' },
      definition: 'Placer quelque chose quelque part.',
      examples: [{ sentence: 'Mets le livre sur la table.', translation: 'Put the book on the table.' }],
      collocations: ['mettre en place', 'se mettre à'],
      synonyms: ['placer', 'poser'],
      antonyms: ['enlever'],
      tags: ['quotidien'],
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
            'ils/elles': 'mettent',
          },
          passe_compose: {
            je: 'ai mis',
            tu: 'as mis',
            'il/elle/on': 'a mis',
            nous: 'avons mis',
            vous: 'avez mis',
            'ils/elles': 'ont mis',
          },
        },
        imperatif: { present: { tu: 'mets', nous: 'mettons', vous: 'mettez' } },
        infinitif: { present: 'mettre' },
        participe: { present: 'mettant', passe: 'mis' },
      },
      notes: 'Verbe irrégulier.',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId,
      word: 'apprendre',
      category: 'verbe',
      ipa: '/a.pʁɑ̃dʁ/',
      translations: { en: 'to learn', es: 'aprender', fr: '' },
      definition: 'Acquérir une connaissance ou un savoir-faire.',
      examples: [{ sentence: "J'apprends le français.", translation: 'I am learning French.' }],
      collocations: ['apprendre par cœur', 'apprendre à faire'],
      synonyms: ['étudier', 'maîtriser'],
      antonyms: ['oublier'],
      tags: ['éducation'],
      cefrLevel: 'A2',
      learningStatus: 'nouveau',
      conjugations: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Vocab API on http://localhost:${PORT}`);
  console.log(`📚 Users: ${db.users.length} | Words: ${db.words.length} | Sets: ${db.sets.length}`);
});
