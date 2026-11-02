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

const LANGS = ['fr', 'en', 'es'];

function emptyDb() {
  return {
    users: [],
    wordsFr: [],
    wordsEn: [],
    wordsEs: [],
    sets: [],
    progress: [],
    themes: [],
    visualWordsFr: [],
    visualWordsEn: [],
    visualWordsEs: [],
    nextUserId: 1,
    nextWordId: { fr: 1, en: 1, es: 1 },
    nextSetId: 1,
    nextThemeId: 1,
    nextVisualId: { fr: 1, en: 1, es: 1 },
    nextSubId: 1,
  };
}

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // migrate old single-table shape if needed
      if (raw.words && !raw.wordsFr) {
        const mig = emptyDb();
        mig.users = raw.users || [];
        mig.nextUserId = raw.nextUserId || 1;
        mig.sets = (raw.sets || []).map((s) => ({ ...s, lang: s.lang || 'fr' }));
        mig.progress = raw.progress || [];
        mig.nextSetId = raw.nextSetId || 1;
        for (const w of raw.words || []) {
          const lang = w.lang || 'fr';
          const collection = lang === 'en' ? 'wordsEn' : lang === 'es' ? 'wordsEs' : 'wordsFr';
          const item = normalizeToLang(w, lang);
          item.id = mig.nextWordId[lang]++;
          mig[collection].push(item);
        }
        return mig;
      }
      return {
        ...emptyDb(),
        ...raw,
        wordsFr: raw.wordsFr || [],
        wordsEn: raw.wordsEn || [],
        wordsEs: raw.wordsEs || [],
        themes: raw.themes || [],
        visualWordsFr: raw.visualWordsFr || [],
        visualWordsEn: raw.visualWordsEn || [],
        visualWordsEs: raw.visualWordsEs || [],
        nextWordId: raw.nextWordId || { fr: 1, en: 1, es: 1 },
        nextThemeId: raw.nextThemeId || 1,
        nextVisualId: raw.nextVisualId || { fr: 1, en: 1, es: 1 },
        nextSubId: raw.nextSubId || 1,
      };
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }
  return emptyDb();
}

function saveDb() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let db = loadDb();

function collectionKey(lang) {
  if (lang === 'en') return 'wordsEn';
  if (lang === 'es') return 'wordsEs';
  return 'wordsFr';
}

function getWords(lang) {
  return db[collectionKey(lang)] || [];
}

function setWords(lang, arr) {
  db[collectionKey(lang)] = arr;
}

/** Build canonical entry per language table */
function fixCategory(cat) {
  const map = {
    verbe: 'verbe', verb: 'verbe', verbee: 'verbe',
    nom: 'nom', noun: 'nom',
    adjectif: 'adjectif', adjective: 'adjectif',
    expression: 'expression',
    adverbe: 'adverbe', adverb: 'adverbe',
    autre: 'autre', other: 'autre',
  };
  const c = String(cat || 'nom').toLowerCase().trim();
  return map[c] || 'nom';
}

function normalizeToLang(body, lang) {
  const base = {
    userId: body.userId,
    word: (body.word || body.fr || body.en || body.es || '').trim(),
    ipa: (body.ipa || '').trim(),
    category: fixCategory(body.category),
    definition: body.definition || '',
    examples: Array.isArray(body.examples)
      ? body.examples.map((e) => (typeof e === 'string' ? e : e?.sentence || '')).filter(Boolean)
      : [],
    collocations: body.collocations || [],
    synonyms: body.synonyms || [],
    antonyms: body.antonyms || [],
    tags: body.tags || [],
    learningStatus: body.learningStatus || 'nouveau',
    notes: body.notes || '',
    // cross-language glosses
    glossFr: (body.glossFr || body.fr || '').trim(),
    glossEn: (body.glossEn || body.en || '').trim(),
    glossEs: (body.glossEs || body.es || '').trim(),
    exampleFr: body.exampleFr || '',
    exampleEn: body.exampleEn || '',
    exampleEs: body.exampleEs || '',
  };

  if (lang === 'fr') {
    return {
      ...base,
      word: (body.word || body.fr || '').trim(),
      gender: body.category === 'nom' ? body.gender || '' : undefined,
      level: body.level || body.cefrLevel || '', // CEFR
      levelSystem: 'cefr',
      conjugations: body.category === 'verbe' ? body.conjugations || null : null,
    };
  }
  if (lang === 'en') {
    return {
      ...base,
      word: (body.word || body.en || '').trim(),
      // no gender, no conjugations
      gender: undefined,
      level: body.level || body.ieltsLevel || '', // IELTS
      levelSystem: 'ielts',
      conjugations: null,
    };
  }
  // es — similar to French
  return {
    ...base,
    word: (body.word || body.es || '').trim(),
    gender: body.category === 'nom' ? body.gender || '' : undefined,
    level: body.level || body.cefrLevel || '',
    levelSystem: 'cefr',
    conjugations: body.category === 'verbe' ? body.conjugations || null : null,
  };
}

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

const UPLOADS = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
app.use('/uploads', express.static(UPLOADS));

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Image JPEG/PNG/WebP uniquement'));
  },
});

function visualKey(lang) {
  if (lang === 'en') return 'visualWordsEn';
  if (lang === 'es') return 'visualWordsEs';
  return 'visualWordsFr';
}
function getVisual(lang) {
  return db[visualKey(lang)] || [];
}
function setVisual(lang, arr) {
  db[visualKey(lang)] = arr;
}

function normalizeVisual(body, lang) {
  const base = {
    userId: body.userId,
    themeId: Number(body.themeId) || null,
    subcategoryId: body.subcategoryId != null && body.subcategoryId !== '' ? Number(body.subcategoryId) : null,
    word: (body.word || '').trim(),
    ipa: (body.ipa || '').trim(),
    ipaEn: (body.ipaEn || '').trim(),
    ipaEs: (body.ipaEs || '').trim(),
    category: fixCategory(body.category),
    gender: body.category === 'nom' || body.gender ? body.gender || '' : '',
    definition: (body.definition || '').trim(),
    examples: Array.isArray(body.examples)
      ? body.examples.map((e) => (typeof e === 'string' ? e : '')).filter(Boolean)
      : typeof body.examples === 'string' && body.examples
        ? body.examples.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
        : [],
    glossFr: (body.glossFr || body.fr || '').trim(),
    glossEn: (body.glossEn || body.en || '').trim(),
    glossEs: (body.glossEs || body.es || '').trim(),
    exampleFr: body.exampleFr || '',
    exampleEn: body.exampleEn || '',
    exampleEs: body.exampleEs || '',
    notes: body.notes || '',
    imageUrl: body.imageUrl || '',
    tags: body.tags || [],
  };
  if (lang === 'fr') base.word = (body.word || body.fr || '').trim();
  if (lang === 'en') base.word = (body.word || body.en || '').trim();
  if (lang === 'es') base.word = (body.word || body.es || '').trim();
  return base;
}


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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


function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findDuplicate(lang, userId, word, excludeId) {
  const key = normalizeKey(word);
  if (!key) return null;
  return getWords(lang).find(
    (w) =>
      w.userId === userId &&
      w.id !== excludeId &&
      normalizeKey(w.word) === key
  );
}

function parseLang(req) {
  const l = (req.params.lang || req.query.lang || 'fr').toLowerCase();
  return LANGS.includes(l) ? l : 'fr';
}

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email et mot de passe (min. 6) requis' });
  }
  if (db.users.find((u) => u.email === email.toLowerCase().trim())) {
    return res.status(400).json({ error: 'Cet email est déjà utilisé' });
  }
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
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email === (email || '').toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

// ---------- Words per language ----------
app.get('/api/:lang/words', auth, (req, res) => {
  const lang = parseLang(req);
  let words = getWords(lang).filter((w) => w.userId === req.user.id).map((w) => ({
    ...w,
    category: fixCategory(w.category),
  }));
  const { category, status, tag, search, level } = req.query;

  if (category) words = words.filter((w) => w.category === category);
  if (status) words = words.filter((w) => w.learningStatus === status);
  if (tag) words = words.filter((w) => w.tags?.includes(tag));
  if (level) words = words.filter((w) => w.level === level);
  if (search) {
    const q = search.toLowerCase();
    words = words.filter(
      (w) =>
        (w.word || '').toLowerCase().includes(q) ||
        (w.glossFr || '').toLowerCase().includes(q) ||
        (w.glossEn || '').toLowerCase().includes(q) ||
        (w.glossEs || '').toLowerCase().includes(q)
    );
  }
  words.sort((a, b) => (a.word || '').localeCompare(b.word || '', lang));
  res.json(words.map((w) => ({ ...w, lang })));
});

app.get('/api/:lang/words/:id', auth, (req, res) => {
  const lang = parseLang(req);
  const word = getWords(lang).find((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });
  res.json({ ...word, lang });
});

app.post('/api/:lang/words', auth, (req, res) => {
  const lang = parseLang(req);
  const body = { ...req.body, userId: req.user.id };
  const entry = normalizeToLang(body, lang);
  if (!entry.word) {
    return res.status(400).json({ error: 'Mot requis' });
  }
  if (!entry.category) {
    return res.status(400).json({ error: 'Catégorie requise' });
  }
  if (!(entry.definition || '').trim()) {
    return res.status(400).json({ error: 'Définition requise' });
  }
  const dup = findDuplicate(lang, req.user.id, entry.word);
  if (dup) {
    return res.status(409).json({
      error: 'duplicate',
      message: `Ce mot existe déjà : « ${dup.word} »`,
      existing: { id: dup.id, word: dup.word },
      duplicates: [dup.word],
    });
  }
  entry.id = db.nextWordId[lang]++;
  entry.userId = req.user.id;
  entry.createdAt = new Date().toISOString();
  entry.updatedAt = entry.createdAt;
  getWords(lang).push(entry);
  saveDb();
  res.status(201).json({ ...entry, lang });
});

app.put('/api/:lang/words/:id', auth, (req, res) => {
  const lang = parseLang(req);
  const list = getWords(lang);
  const idx = list.findIndex((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  const merged = normalizeToLang({ ...list[idx], ...req.body, userId: req.user.id }, lang);
  merged.id = list[idx].id;
  merged.userId = req.user.id;
  merged.createdAt = list[idx].createdAt;
  merged.updatedAt = new Date().toISOString();
  const dup = findDuplicate(lang, req.user.id, merged.word, merged.id);
  if (dup) {
    return res.status(409).json({
      error: 'duplicate',
      message: `Ce mot existe déjà : « ${dup.word} »`,
      existing: { id: dup.id, word: dup.word },
      duplicates: [dup.word],
    });
  }
  list[idx] = merged;
  saveDb();
  res.json({ ...merged, lang });
});

app.delete('/api/:lang/words/:id', auth, (req, res) => {
  const lang = parseLang(req);
  const list = getWords(lang);
  const idx = list.findIndex((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  const wordId = list[idx].id;
  list.splice(idx, 1);
  db.sets.forEach((s) => {
    if (s.userId === req.user.id && s.lang === lang) {
      s.wordIds = s.wordIds.filter((id) => id !== wordId);
    }
  });
  db.progress = db.progress.filter(
    (p) => !(p.userId === req.user.id && p.lang === lang && p.wordId === wordId)
  );
  saveDb();
  res.json({ message: 'Mot supprimé' });
});

app.post('/api/:lang/words/bulk-delete', auth, (req, res) => {
  const lang = parseLang(req);
  const ids = new Set((req.body.ids || []).map(Number).filter(Boolean));
  if (!ids.size) return res.status(400).json({ error: 'Aucun id' });
  const before = getWords(lang).length;
  setWords(
    lang,
    getWords(lang).filter((w) => !(w.userId === req.user.id && ids.has(w.id)))
  );
  const deleted = before - getWords(lang).length;
  db.sets.forEach((s) => {
    if (s.userId === req.user.id && s.lang === lang) {
      s.wordIds = s.wordIds.filter((id) => !ids.has(id));
    }
  });
  db.progress = db.progress.filter(
    (p) => !(p.userId === req.user.id && p.lang === lang && ids.has(p.wordId))
  );
  saveDb();
  res.json({ message: `${deleted} supprimé(s)`, deleted });
});

// ---------- Import per language ----------
app.post('/api/:lang/import', auth, upload.single('file'), (req, res) => {
  const lang = parseLang(req);
  if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  let rows = [];
  try {
    if (ext === '.csv' || req.file.mimetype === 'text/csv') {
      rows = parse(req.file.buffer.toString('utf8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } else {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const get = (row, ...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k.toLowerCase());
      if (found && String(row[found]).trim()) return String(row[found]).trim();
    }
    return '';
  };

  const created = [];
  const duplicates = [];
  const seenInFile = new Set();
  for (const row of rows) {
    const word =
      lang === 'en'
        ? get(row, 'word', 'en', 'english')
        : lang === 'es'
          ? get(row, 'word', 'es', 'spanish', 'español')
          : get(row, 'word', 'fr', 'mot', 'french');
    if (!word) continue;
    const catRaw = (get(row, 'category', 'categorie', 'type', 'part_of_speech') || 'nom').toLowerCase().trim();
    const catMap = {
      verbe: 'verbe', verb: 'verbe', verbee: 'verbe',
      nom: 'nom', noun: 'nom',
      adjectif: 'adjectif', adjective: 'adjectif',
      expression: 'expression',
      adverbe: 'adverbe', adverb: 'adverbe',
      autre: 'autre', other: 'autre',
    };
    const category = catMap[catRaw] || 'nom';
    const splitList = (val) =>
      val
        ? val.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
        : [];
    // tags/synonyms also allow commas when no semicolon
    const splitTags = (val) => {
      if (!val) return [];
      if (val.includes(';') || val.includes('|')) return splitList(val);
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    };
    const body = {
      userId: req.user.id,
      word,
      ipa: get(row, 'ipa'),
      category,
      gender: get(row, 'gender', 'genre', 'genero'),
      level: get(row, 'level', 'cefr', 'ielts', 'niveau', 'niveau_cecr', 'nivel_mcer'),
      definition: get(row, 'definition', 'définition', 'def', 'definicion'),
      glossFr: get(row, 'fr', 'gloss_fr', 'french', 'francais', 'français', 'mot'),
      glossEn: get(row, 'en', 'gloss_en', 'english', 'anglais'),
      glossEs: get(row, 'es', 'gloss_es', 'spanish', 'espagnol', 'español'),
      exampleFr: get(row, 'example_fr', 'exemple_fr', 'examplefr'),
      exampleEn: get(row, 'example_en', 'exemple_en', 'exampleen'),
      exampleEs: get(row, 'example_es', 'exemple_es', 'examplees'),
      examples: splitList(get(row, 'examples', 'exemple', 'example', 'exemples', 'ejemplos')),
      collocations: splitList(get(row, 'collocations', 'collocation', 'colocaciones')),
      synonyms: splitTags(get(row, 'synonyms', 'synonymes', 'sinonimos', 'sinónimos')),
      antonyms: splitTags(get(row, 'antonyms', 'antonymes', 'antonimos', 'antónimos')),
      tags: splitTags(get(row, 'tags', 'etiquettes', 'étiquettes', 'etiquetas')),
      notes: get(row, 'notes', 'note', 'notas'),
      learningStatus: get(row, 'statut', 'status', 'learning_status', 'estado') || 'nouveau',
    };
    // For FR import, word column is French — don't overwrite glossFr with mot if same
    if (lang === 'fr') {
      body.glossFr = get(row, 'fr', 'gloss_fr') || '';
    }
    if (lang === 'en') {
      body.glossEn = get(row, 'en', 'gloss_en') || '';
    }
    if (lang === 'es') {
      body.glossEs = get(row, 'es', 'gloss_es') || '';
    }
    const entry = normalizeToLang(body, lang);
    entry.id = db.nextWordId[lang]++;
    entry.userId = req.user.id;
    entry.createdAt = new Date().toISOString();
    entry.updatedAt = entry.createdAt;
    const dup = findDuplicate(lang, req.user.id, entry.word);
    if (dup) {
      duplicates.push(entry.word);
      continue;
    }
    // also skip duplicates within the same file
    if (seenInFile.has(normalizeKey(entry.word))) {
      duplicates.push(entry.word);
      continue;
    }
    seenInFile.add(normalizeKey(entry.word));
    getWords(lang).push(entry);
    created.push(entry);
  }
  saveDb();
  res.json({
    message: `${created.length} importé(s)`,
    created: created.length,
    skipped: rows.length - created.length,
    duplicates: [...new Set(duplicates)],
    duplicateCount: duplicates.length,
  });
});

// ---------- Sets (per language) ----------
app.get('/api/sets', auth, (req, res) => {
  const lang = (req.query.lang || '').toLowerCase();
  let sets = db.sets.filter((s) => s.userId === req.user.id);
  if (LANGS.includes(lang)) sets = sets.filter((s) => s.lang === lang);
  res.json(
    sets
      .map((s) => ({ ...s, wordCount: s.wordIds.length }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  );
});

app.post('/api/sets', auth, (req, res) => {
  const lang = LANGS.includes(req.body.lang) ? req.body.lang : 'fr';
  if (!req.body.name?.trim()) return res.status(400).json({ error: 'Nom requis' });
  const set = {
    id: db.nextSetId++,
    userId: req.user.id,
    lang,
    name: req.body.name.trim(),
    description: req.body.description || '',
    wordIds: Array.isArray(req.body.wordIds) ? req.body.wordIds.map(Number) : [],
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
  const words = getWords(set.lang).filter((w) => set.wordIds.includes(w.id) && w.userId === req.user.id);
  res.json({ ...set, words });
});

app.put('/api/sets/:id', auth, (req, res) => {
  const idx = db.sets.findIndex((s) => s.id === Number(req.params.id) && s.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Ensemble non trouvé' });
  db.sets[idx] = {
    ...db.sets[idx],
    name: req.body.name?.trim() ?? db.sets[idx].name,
    description: req.body.description ?? db.sets[idx].description,
    wordIds: req.body.wordIds !== undefined ? req.body.wordIds.map(Number) : db.sets[idx].wordIds,
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
  res.json({ message: 'OK' });
});

// ---------- Progress / Study ----------
function getProgress(userId, lang, wordId) {
  let p = db.progress.find((x) => x.userId === userId && x.lang === lang && x.wordId === wordId);
  if (!p) {
    p = {
      userId,
      lang,
      wordId,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: new Date().toISOString(),
      correctCount: 0,
      incorrectCount: 0,
      lastReviewed: null,
      status: 'nouveau',
    };
    db.progress.push(p);
  }
  return p;
}

app.get('/api/study/:setId/cards', auth, (req, res) => {
  const set = db.sets.find((s) => s.id === Number(req.params.setId) && s.userId === req.user.id);
  if (!set) return res.status(404).json({ error: 'Ensemble non trouvé' });
  const lang = set.lang || 'fr';
  const words = getWords(lang).filter((w) => set.wordIds.includes(w.id) && w.userId === req.user.id);
  const cards = words.map((w) => {
    const front = w.word;
    const backs = [w.glossFr, w.glossEn, w.glossEs].filter((g) => g && g !== w.word);
    return {
      id: w.id,
      front,
      back: backs[0] || '',
      back2: backs[1] || '',
      ipa: w.ipa,
      category: w.category,
      example: w.examples?.[0] || w[`example${lang[0].toUpperCase()}${lang.slice(1)}`] || '',
      progress: getProgress(req.user.id, lang, w.id),
      lang,
    };
  });
  saveDb();
  res.json(cards);
});

app.get('/api/study/:setId/quiz', auth, (req, res) => {
  const set = db.sets.find((s) => s.id === Number(req.params.setId) && s.userId === req.user.id);
  if (!set) return res.status(404).json({ error: 'Ensemble non trouvé' });
  const lang = set.lang || 'fr';
  let words = getWords(lang).filter((w) => set.wordIds.includes(w.id) && w.userId === req.user.id);
  if (words.length < 2) return res.status(400).json({ error: 'Min. 2 mots' });
  words = [...words].sort(() => Math.random() - 0.5);
  const limit = Math.min(words.length, Number(req.query.limit) || 15);
  words = words.slice(0, limit);

  const glossKey = lang === 'fr' ? 'glossEn' : 'glossFr';
  const questions = words.map((w) => {
    const correct = w[glossKey] || w.glossEn || w.glossFr || w.glossEs || '';
    const distractors = words
      .filter((o) => o.id !== w.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((o) => o[glossKey] || o.glossEn || o.word);
    return {
      wordId: w.id,
      prompt: w.word,
      ipa: w.ipa,
      type: 'mcq',
      options: [...distractors, correct].filter(Boolean).sort(() => Math.random() - 0.5),
      lang,
    };
  });
  res.json({ questions, setName: set.name, lang });
});

app.post('/api/study/quiz/check', auth, (req, res) => {
  const { wordId, answer, lang: bodyLang } = req.body;
  const lang = LANGS.includes(bodyLang) ? bodyLang : 'fr';
  const word = getWords(lang).find((w) => w.id === Number(wordId) && w.userId === req.user.id);
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });
  const answers = [word.word, word.glossFr, word.glossEn, word.glossEs, word.definition]
    .filter(Boolean)
    .map((s) => s.toLowerCase().trim());
  const userAns = String(answer || '').toLowerCase().trim();
  const correct = answers.some((a) => a === userAns || a.includes(userAns) || userAns.includes(a));

  const p = getProgress(req.user.id, lang, word.id);
  p.lastReviewed = new Date().toISOString();
  if (correct) {
    p.correctCount++;
    p.repetitions = (p.repetitions || 0) + 1;
    p.interval = p.repetitions === 1 ? 1 : p.repetitions === 2 ? 3 : Math.round((p.interval || 1) * (p.ease || 2.5));
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
    correctAnswer: word.glossEn || word.glossFr || word.glossEs || word.word,
    word: word.word,
    progress: p,
  });
});

app.post('/api/progress/review', auth, (req, res) => {
  const { wordId, quality, lang: bodyLang } = req.body;
  const lang = LANGS.includes(bodyLang) ? bodyLang : 'fr';
  const word = getWords(lang).find((w) => w.id === Number(wordId) && w.userId === req.user.id);
  if (!word) return res.status(404).json({ error: 'Mot non trouvé' });
  const q = Math.max(0, Math.min(5, Number(quality)));
  const p = getProgress(req.user.id, lang, word.id);
  p.lastReviewed = new Date().toISOString();
  if (q >= 3) {
    p.correctCount++;
    p.repetitions++;
    p.interval = p.repetitions === 1 ? 1 : p.repetitions === 2 ? 3 : Math.round(p.interval * p.ease);
    p.ease = Math.max(1.3, p.ease + 0.1);
    p.status = p.repetitions >= 5 ? 'mastered' : 'review';
  } else {
    p.incorrectCount++;
    p.repetitions = 0;
    p.interval = 0;
    p.status = 'learning';
  }
  const next = new Date();
  next.setDate(next.getDate() + Math.max(1, p.interval));
  p.nextReview = next.toISOString();
  if (p.status === 'mastered') word.learningStatus = 'appris';
  else word.learningStatus = 'en_cours';
  saveDb();
  res.json({ progress: p, word });
});

// ---------- Stats ----------
app.get('/api/stats', auth, (req, res) => {
  const lang = (req.query.lang || '').toLowerCase();
  const langs = LANGS.includes(lang) ? [lang] : LANGS;
  let total = 0;
  const byCategory = {};
  const byStatus = {};
  for (const l of langs) {
    const words = getWords(l).filter((w) => w.userId === req.user.id);
    total += words.length;
    words.forEach((w) => {
      byCategory[w.category] = (byCategory[w.category] || 0) + 1;
      byStatus[w.learningStatus] = (byStatus[w.learningStatus] || 0) + 1;
    });
  }
  const sets = db.sets.filter((s) => s.userId === req.user.id && (!LANGS.includes(lang) || s.lang === lang));
  const progress = db.progress.filter((p) => p.userId === req.user.id && (!LANGS.includes(lang) || p.lang === lang));
  const now = new Date();
  res.json({
    total,
    byCategory,
    byStatus,
    setsCount: sets.length,
    dueCount: progress.filter((p) => new Date(p.nextReview) <= now).length,
    mastered: progress.filter((p) => p.status === 'mastered').length,
    totalReviews: progress.reduce((s, p) => s + p.correctCount + p.incorrectCount, 0),
    byLang: {
      fr: getWords('fr').filter((w) => w.userId === req.user.id).length,
      en: getWords('en').filter((w) => w.userId === req.user.id).length,
      es: getWords('es').filter((w) => w.userId === req.user.id).length,
    },
  });
});

// ---------- Seed ----------
app.post('/api/seed', auth, (req, res) => {
  const lang = LANGS.includes(req.query.lang) ? req.query.lang : LANGS.includes(req.body?.lang) ? req.body.lang : 'fr';
  if (getWords(lang).some((w) => w.userId === req.user.id) && !req.query.force) {
    return res.status(400).json({ error: 'Déjà des mots. ?force=true' });
  }
  const samples = seedFor(lang, req.user.id);
  samples.forEach((s) => {
    s.id = db.nextWordId[lang]++;
    getWords(lang).push(s);
  });
  const set = {
    id: db.nextSetId++,
    userId: req.user.id,
    lang,
    name: lang === 'en' ? 'English samples' : lang === 'es' ? 'Ejemplos español' : 'Exemples français',
    description: '',
    wordIds: samples.map((s) => s.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.sets.push(set);
  saveDb();
  res.json({ message: `${samples.length} mots`, count: samples.length, setId: set.id, lang });
});

function seedFor(lang, userId) {
  const now = new Date().toISOString();
  if (lang === 'en') {
    return [
      {
        userId,
        word: 'house',
        ipa: '/haʊs/',
        category: 'nom',
        level: '5.0',
        levelSystem: 'ielts',
        learningStatus: 'nouveau',
        glossFr: 'maison',
        glossEs: 'casa',
        exampleEn: 'I live in a big house.',
        exampleFr: "J'habite dans une grande maison.",
        examples: ['I live in a big house.'],
        collocations: ['town house', 'house party'],
        synonyms: ['home', 'dwelling'],
        antonyms: [],
        tags: ['daily'],
        conjugations: null,
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
      {
        userId,
        word: 'learn',
        ipa: '/lɜːrn/',
        category: 'verbe',
        level: '4.5',
        levelSystem: 'ielts',
        learningStatus: 'en_cours',
        glossFr: 'apprendre',
        glossEs: 'aprender',
        exampleEn: 'I learn French every day.',
        examples: ['I learn French every day.'],
        collocations: ['learn by heart'],
        synonyms: ['study'],
        antonyms: ['forget'],
        tags: ['education'],
        conjugations: null,
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  if (lang === 'es') {
    return [
      {
        userId,
        word: 'casa',
        ipa: '/ˈka.sa/',
        category: 'nom',
        gender: 'feminin',
        level: 'A1',
        levelSystem: 'cefr',
        learningStatus: 'nouveau',
        glossFr: 'maison',
        glossEn: 'house',
        exampleEs: 'Vivo en una casa grande.',
        examples: ['Vivo en una casa grande.'],
        collocations: ['casa de campo'],
        synonyms: ['hogar'],
        antonyms: [],
        tags: ['cotidiano'],
        conjugations: null,
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
      {
        userId,
        word: 'aprender',
        ipa: '/a.pɾenˈdeɾ/',
        category: 'verbe',
        level: 'A2',
        levelSystem: 'cefr',
        learningStatus: 'en_cours',
        glossFr: 'apprendre',
        glossEn: 'to learn',
        exampleEs: 'Aprendo francés todos los días.',
        examples: ['Aprendo francés todos los días.'],
        collocations: ['aprender de memoria'],
        synonyms: ['estudiar'],
        antonyms: ['olvidar'],
        tags: ['educación'],
        conjugations: {
          present: {
            je: 'aprendo',
            tu: 'aprendes',
            'il/elle/on': 'aprende',
            nous: 'aprendemos',
            vous: 'aprendéis',
            'ils/elles': 'aprenden',
          },
        },
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  // fr
  return [
    {
      userId,
      word: 'poser',
      ipa: '/po.ze/',
      category: 'verbe',
      level: 'A2–B1',
      levelSystem: 'cefr',
      learningStatus: 'en_cours',
      glossEn: 'to ask; to put',
      glossEs: 'hacer una pregunta; poner',
      exampleFr: 'Je voudrais poser une question.',
      exampleEn: 'I would like to ask a question.',
      examples: ['Je voudrais poser une question.'],
      collocations: ['poser une question', 'poser un problème'],
      synonyms: ['interroger', 'mettre'],
      antonyms: [],
      tags: ['communication'],
      conjugations: {
        present: {
          je: 'pose',
          tu: 'poses',
          'il/elle/on': 'pose',
          nous: 'posons',
          vous: 'posez',
          'ils/elles': 'posent',
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
      notes: '1er groupe',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId,
      word: 'maison',
      ipa: '/mɛ.zɔ̃/',
      category: 'nom',
      gender: 'feminin',
      level: 'A1',
      levelSystem: 'cefr',
      learningStatus: 'appris',
      glossEn: 'house; home',
      glossEs: 'casa',
      exampleFr: "J'habite dans une grande maison.",
      examples: ["J'habite dans une grande maison."],
      collocations: ['maison de campagne'],
      synonyms: ['habitation'],
      antonyms: [],
      tags: ['quotidien'],
      conjugations: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
  ];
}


// ---------- Export CSV / Excel ----------
function exportRows(lang, userId) {
  const words = getWords(lang).filter((w) => w.userId === userId);
  if (lang === 'en') {
    return words.map((w) => ({
      word: w.word || '',
      french: w.glossFr || '',
      spanish: w.glossEs || '',
      ipa: w.ipa || '',
      part_of_speech: w.category || '',
      ielts_level: w.level || '',
      definition: w.definition || '',
      examples: (w.examples || []).join('; '),
      collocations: (w.collocations || []).join('; '),
      synonyms: (w.synonyms || []).join('; '),
      antonyms: (w.antonyms || []).join('; '),
      tags: (w.tags || []).join('; '),
      learning_status: w.learningStatus || '',
      notes: w.notes || '',
    }));
  }
  if (lang === 'es') {
    return words.map((w) => ({
      palabra: w.word || '',
      frances: w.glossFr || '',
      ingles: w.glossEn || '',
      ipa: w.ipa || '',
      categoria: w.category || '',
      genero: w.gender || '',
      nivel_mcer: w.level || '',
      definicion: w.definition || '',
      ejemplos: (w.examples || []).join('; '),
      colocaciones: (w.collocations || []).join('; '),
      sinonimos: (w.synonyms || []).join('; '),
      antonimos: (w.antonyms || []).join('; '),
      etiquetas: (w.tags || []).join('; '),
      estado: w.learningStatus || '',
      notas: w.notes || '',
    }));
  }
  // fr
  return words.map((w) => ({
    mot: w.word || '',
    anglais: w.glossEn || '',
    espagnol: w.glossEs || '',
    ipa: w.ipa || '',
    categorie: w.category || '',
    genre: w.gender || '',
    niveau_cecr: w.level || '',
    definition: w.definition || '',
    exemples: (w.examples || []).join('; '),
    collocations: (w.collocations || []).join('; '),
    synonymes: (w.synonyms || []).join('; '),
    antonymes: (w.antonyms || []).join('; '),
    etiquettes: (w.tags || []).join('; '),
    statut: w.learningStatus || '',
    notes: w.notes || '',
  }));
}

function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => esc(row[k])).join(','));
  }
  return lines.join('\n');
}

app.get('/api/:lang/export', auth, (req, res) => {
  const lang = parseLang(req);
  const format = (req.query.format || 'csv').toLowerCase();
  const rows = exportRows(lang, req.user.id);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `vocab-${lang}-${stamp}`;

  if (format === 'xlsx' || format === 'excel') {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lang.toUpperCase());
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
    return res.send(Buffer.from(buf));
  }

  const csv = toCsv(rows);
  // BOM for Excel UTF-8
  const bom = '\uFEFF';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
  res.send(bom + csv);
});



// ---------- Visual dictionary: Themes ----------
app.get('/api/themes', auth, (req, res) => {
  const themes = db.themes
    .filter((t) => t.userId === req.user.id)
    .map((t) => {
      const counts = { fr: 0, en: 0, es: 0 };
      for (const l of LANGS) {
        counts[l] = getVisual(l).filter(
          (w) => w.userId === req.user.id && w.themeId === t.id
        ).length;
      }
      return { ...t, wordCounts: counts };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id);
  res.json(themes);
});

app.post('/api/themes', auth, (req, res) => {
  const { nameFr, nameEn, nameEs, icon, subcategories } = req.body;
  if (!(nameFr || nameEn || nameEs)?.toString().trim()) {
    return res.status(400).json({ error: 'Nom du thème requis' });
  }
  const subs = Array.isArray(subcategories)
    ? subcategories.map((s, i) => ({
        id: db.nextSubId++,
        nameFr: (s.nameFr || s.name || '').trim(),
        nameEn: (s.nameEn || '').trim(),
        nameEs: (s.nameEs || '').trim(),
        order: i,
      }))
    : [];
  const theme = {
    id: db.nextThemeId++,
    userId: req.user.id,
    nameFr: (nameFr || '').trim(),
    nameEn: (nameEn || '').trim(),
    nameEs: (nameEs || '').trim(),
    icon: icon || '📚',
    order: db.themes.filter((t) => t.userId === req.user.id).length,
    subcategories: subs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.themes.push(theme);
  saveDb();
  res.status(201).json(theme);
});

app.get('/api/themes/:id', auth, (req, res) => {
  const theme = db.themes.find((t) => t.id === Number(req.params.id) && t.userId === req.user.id);
  if (!theme) return res.status(404).json({ error: 'Thème non trouvé' });
  res.json(theme);
});

app.put('/api/themes/:id', auth, (req, res) => {
  const idx = db.themes.findIndex((t) => t.id === Number(req.params.id) && t.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Thème non trouvé' });
  const prev = db.themes[idx];
  let subs = prev.subcategories || [];
  if (Array.isArray(req.body.subcategories)) {
    subs = req.body.subcategories.map((s, i) => ({
      id: s.id || db.nextSubId++,
      nameFr: (s.nameFr || s.name || '').trim(),
      nameEn: (s.nameEn || '').trim(),
      nameEs: (s.nameEs || '').trim(),
      order: i,
    }));
  }
  db.themes[idx] = {
    ...prev,
    nameFr: req.body.nameFr !== undefined ? String(req.body.nameFr).trim() : prev.nameFr,
    nameEn: req.body.nameEn !== undefined ? String(req.body.nameEn).trim() : prev.nameEn,
    nameEs: req.body.nameEs !== undefined ? String(req.body.nameEs).trim() : prev.nameEs,
    icon: req.body.icon !== undefined ? req.body.icon : prev.icon,
    subcategories: subs,
    updatedAt: new Date().toISOString(),
  };
  saveDb();
  res.json(db.themes[idx]);
});

app.delete('/api/themes/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  const idx = db.themes.findIndex((t) => t.id === id && t.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Thème non trouvé' });
  db.themes.splice(idx, 1);
  for (const l of LANGS) {
    setVisual(
      l,
      getVisual(l).filter((w) => !(w.userId === req.user.id && w.themeId === id))
    );
  }
  saveDb();
  res.json({ message: 'Thème supprimé' });
});

// ---------- Visual words ----------
app.get('/api/:lang/visual', auth, (req, res) => {
  const lang = parseLang(req);
  let list = getVisual(lang).filter((w) => w.userId === req.user.id);
  const { themeId, subcategoryId, search } = req.query;
  if (themeId) list = list.filter((w) => w.themeId === Number(themeId));
  if (subcategoryId === 'null' || subcategoryId === 'none') {
    list = list.filter((w) => !w.subcategoryId);
  } else if (subcategoryId) {
    list = list.filter((w) => w.subcategoryId === Number(subcategoryId));
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (w) =>
        (w.word || '').toLowerCase().includes(q) ||
        (w.glossEn || '').toLowerCase().includes(q) ||
        (w.glossFr || '').toLowerCase().includes(q) ||
        (w.glossEs || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => (a.word || '').localeCompare(b.word || '', lang));
  res.json(list.map((w) => ({ ...w, lang })));
});

app.get('/api/:lang/visual/:id', auth, (req, res) => {
  const lang = parseLang(req);
  const w = getVisual(lang).find((x) => x.id === Number(req.params.id) && x.userId === req.user.id);
  if (!w) return res.status(404).json({ error: 'Mot non trouvé' });
  res.json({ ...w, lang });
});

app.post('/api/:lang/visual', auth, imageUpload.single('image'), (req, res) => {
  const lang = parseLang(req);
  let body = req.body;
  // multipart fields are strings
  if (typeof body.examples === 'string') {
    try {
      body.examples = JSON.parse(body.examples);
    } catch {
      body.examples = body.examples.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  if (typeof body.tags === 'string') {
    try {
      body.tags = JSON.parse(body.tags);
    } catch {
      body.tags = body.tags.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  body.userId = req.user.id;
  if (req.file) body.imageUrl = `/uploads/${req.file.filename}`;
  const entry = normalizeVisual(body, lang);
  if (!entry.word) return res.status(400).json({ error: 'Mot requis' });
  if (!entry.definition) return res.status(400).json({ error: 'Définition requise' });
  if (!entry.themeId) return res.status(400).json({ error: 'Thème requis' });
  const dup = getVisual(lang).find(
    (w) =>
      w.userId === req.user.id &&
      w.themeId === entry.themeId &&
      normalizeKey(w.word) === normalizeKey(entry.word)
  );
  if (dup) {
    return res.status(409).json({
      error: 'duplicate',
      message: `Mot répété dans ce thème : « ${dup.word} »`,
      existing: { id: dup.id, word: dup.word },
    });
  }
  entry.id = db.nextVisualId[lang]++;
  entry.userId = req.user.id;
  entry.createdAt = new Date().toISOString();
  entry.updatedAt = entry.createdAt;
  getVisual(lang).push(entry);
  saveDb();
  res.status(201).json({ ...entry, lang });
});

app.put('/api/:lang/visual/:id', auth, imageUpload.single('image'), (req, res) => {
  const lang = parseLang(req);
  const list = getVisual(lang);
  const idx = list.findIndex((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  let body = { ...list[idx], ...req.body };
  if (typeof body.examples === 'string') {
    try {
      body.examples = JSON.parse(body.examples);
    } catch {
      body.examples = body.examples.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  if (req.file) body.imageUrl = `/uploads/${req.file.filename}`;
  body.userId = req.user.id;
  const entry = normalizeVisual(body, lang);
  entry.id = list[idx].id;
  entry.userId = req.user.id;
  entry.createdAt = list[idx].createdAt;
  entry.updatedAt = new Date().toISOString();
  if (!entry.imageUrl) entry.imageUrl = list[idx].imageUrl;
  const dup = getVisual(lang).find(
    (w) =>
      w.userId === req.user.id &&
      w.id !== entry.id &&
      w.themeId === entry.themeId &&
      normalizeKey(w.word) === normalizeKey(entry.word)
  );
  if (dup) {
    return res.status(409).json({
      error: 'duplicate',
      message: `Mot répété dans ce thème : « ${dup.word} »`,
      existing: { id: dup.id, word: dup.word },
    });
  }
  list[idx] = entry;
  saveDb();
  res.json({ ...entry, lang });
});

app.delete('/api/:lang/visual/:id', auth, (req, res) => {
  const lang = parseLang(req);
  const list = getVisual(lang);
  const idx = list.findIndex((w) => w.id === Number(req.params.id) && w.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Mot non trouvé' });
  list.splice(idx, 1);
  saveDb();
  res.json({ message: 'OK' });
});

app.post('/api/:lang/visual/bulk-delete', auth, (req, res) => {
  const lang = parseLang(req);
  const ids = new Set((req.body.ids || []).map(Number).filter(Boolean));
  const before = getVisual(lang).length;
  setVisual(
    lang,
    getVisual(lang).filter((w) => !(w.userId === req.user.id && ids.has(w.id)))
  );
  saveDb();
  res.json({ deleted: before - getVisual(lang).length });
});

// Import visual words for a theme
app.post('/api/:lang/visual-import', auth, upload.single('file'), (req, res) => {
  const lang = parseLang(req);
  const themeId = Number(req.body.themeId);
  if (!themeId) return res.status(400).json({ error: 'themeId requis' });
  const theme = db.themes.find((t) => t.id === themeId && t.userId === req.user.id);
  if (!theme) return res.status(404).json({ error: 'Thème non trouvé' });
  if (!req.file) return res.status(400).json({ error: 'Fichier requis' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  let rows = [];
  try {
    if (ext === '.csv' || req.file.mimetype === 'text/csv') {
      rows = parse(req.file.buffer.toString('utf8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
    } else {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const get = (row, ...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k.toLowerCase());
      if (found && String(row[found]).trim()) return String(row[found]).trim();
    }
    return '';
  };

  const splitList = (val) =>
    val ? val.split(/[;|]/).map((s) => s.trim()).filter(Boolean) : [];

  const created = [];
  const duplicates = [];
  const seen = new Set();

  for (const row of rows) {
    const word =
      lang === 'en'
        ? get(row, 'word', 'en', 'english')
        : lang === 'es'
          ? get(row, 'word', 'es', 'spanish')
          : get(row, 'word', 'fr', 'mot', 'french');
    if (!word) continue;

    const subName = get(row, 'subcategory', 'sous_categorie', 'sub', 'subcategory_fr', 'nameFr');
    let subcategoryId = null;
    if (subName) {
      const key = subName.toLowerCase();
      let sub = (theme.subcategories || []).find(
        (s) =>
          (s.nameFr || '').toLowerCase() === key ||
          (s.nameEn || '').toLowerCase() === key ||
          (s.nameEs || '').toLowerCase() === key
      );
      if (!sub) {
        sub = {
          id: db.nextSubId++,
          nameFr: lang === 'fr' ? subName : get(row, 'subcategory_fr') || subName,
          nameEn: lang === 'en' ? subName : get(row, 'subcategory_en') || '',
          nameEs: lang === 'es' ? subName : get(row, 'subcategory_es') || '',
          order: (theme.subcategories || []).length,
        };
        theme.subcategories = theme.subcategories || [];
        theme.subcategories.push(sub);
      }
      subcategoryId = sub.id;
    }

    const body = {
      userId: req.user.id,
      themeId,
      subcategoryId,
      word,
      ipa: get(row, 'ipa'),
      ipaEn: get(row, 'ipa_en', 'ipaEn'),
      ipaEs: get(row, 'ipa_es', 'ipaEs'),
      category: get(row, 'category', 'categorie') || 'nom',
      gender: get(row, 'gender', 'genre'),
      definition: get(row, 'definition', 'définition', 'definicion'),
      glossFr: get(row, 'fr', 'gloss_fr', 'french'),
      glossEn: get(row, 'en', 'gloss_en', 'english'),
      glossEs: get(row, 'es', 'gloss_es', 'spanish'),
      exampleFr: get(row, 'example_fr', 'exemple_fr'),
      exampleEn: get(row, 'example_en', 'exemple_en'),
      exampleEs: get(row, 'example_es', 'exemple_es'),
      examples: splitList(get(row, 'examples', 'exemple', 'exemples')),
      notes: get(row, 'notes'),
      imageUrl: get(row, 'image', 'image_url', 'photo', 'imageUrl'),
      tags: splitList(get(row, 'tags')),
    };
    if (lang === 'fr') body.glossFr = '';
    if (lang === 'en') body.glossEn = '';
    if (lang === 'es') body.glossEs = '';

    const entry = normalizeVisual(body, lang);
    if (!entry.definition) entry.definition = entry.word; // soft fallback
    if (seen.has(normalizeKey(entry.word)) ||
        getVisual(lang).find(
          (w) =>
            w.userId === req.user.id &&
            w.themeId === themeId &&
            normalizeKey(w.word) === normalizeKey(entry.word)
        )) {
      duplicates.push(entry.word);
      continue;
    }
    seen.add(normalizeKey(entry.word));
    entry.id = db.nextVisualId[lang]++;
    entry.userId = req.user.id;
    entry.createdAt = new Date().toISOString();
    entry.updatedAt = entry.createdAt;
    getVisual(lang).push(entry);
    created.push(entry);
  }
  theme.updatedAt = new Date().toISOString();
  saveDb();
  res.json({
    message: `${created.length} importé(s)`,
    created: created.length,
    duplicates: [...new Set(duplicates)],
    duplicateCount: duplicates.length,
  });
});

// Export visual words for a theme
app.get('/api/:lang/visual-export', auth, (req, res) => {
  const lang = parseLang(req);
  const themeId = Number(req.query.themeId);
  if (!themeId) return res.status(400).json({ error: 'themeId requis' });
  const theme = db.themes.find((t) => t.id === themeId && t.userId === req.user.id);
  if (!theme) return res.status(404).json({ error: 'Thème non trouvé' });
  const list = getVisual(lang).filter((w) => w.userId === req.user.id && w.themeId === themeId);
  const subMap = {};
  (theme.subcategories || []).forEach((s) => {
    subMap[s.id] = s.nameFr || s.nameEn || s.nameEs || '';
  });

  const rows = list.map((w) => {
    if (lang === 'en') {
      return {
        word: w.word,
        subcategory: subMap[w.subcategoryId] || '',
        fr: w.glossFr || '',
        es: w.glossEs || '',
        ipa: w.ipa || '',
        category: w.category || '',
        definition: w.definition || '',
        examples: (w.examples || []).join(' ; '),
        example_fr: w.exampleFr || '',
        example_es: w.exampleEs || '',
        notes: w.notes || '',
        image: w.imageUrl || '',
        tags: (w.tags || []).join(' ; '),
      };
    }
    if (lang === 'es') {
      return {
        word: w.word,
        subcategory: subMap[w.subcategoryId] || '',
        fr: w.glossFr || '',
        en: w.glossEn || '',
        ipa: w.ipa || '',
        category: w.category || '',
        gender: w.gender || '',
        definition: w.definition || '',
        examples: (w.examples || []).join(' ; '),
        example_fr: w.exampleFr || '',
        example_en: w.exampleEn || '',
        notes: w.notes || '',
        image: w.imageUrl || '',
        tags: (w.tags || []).join(' ; '),
      };
    }
    return {
      word: w.word,
      subcategory: subMap[w.subcategoryId] || '',
      en: w.glossEn || '',
      es: w.glossEs || '',
      ipa: w.ipa || '',
      category: w.category || '',
      gender: w.gender || '',
      definition: w.definition || '',
      examples: (w.examples || []).join(' ; '),
      example_en: w.exampleEn || '',
      example_es: w.exampleEs || '',
      notes: w.notes || '',
      image: w.imageUrl || '',
      tags: (w.tags || []).join(' ; '),
    };
  });

  const format = (req.query.format || 'csv').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `visual-${lang}-theme${themeId}-${stamp}`;

  if (format === 'xlsx' || format === 'excel') {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'visual');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
    return res.send(Buffer.from(buf));
  }
  const keys = rows.length ? Object.keys(rows[0]) : ['word'];
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const csv = [keys.join(',')].concat(rows.map((r) => keys.map((k) => esc(r[k])).join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
  res.send('\uFEFF' + csv);
});


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    counts: {
      fr: db.wordsFr.length,
      en: db.wordsEn.length,
      es: db.wordsEs.length,
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API http://localhost:${PORT}`);
  console.log(`📚 FR:${db.wordsFr.length} EN:${db.wordsEn.length} ES:${db.wordsEs.length}`);
});
