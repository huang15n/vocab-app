import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Upload, ArrowLeft, FileSpreadsheet, CheckCircle, Copy, Check } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { StudySet, Lang } from '../types'

/** Full CSV specs per target table */
const IMPORT_SPECS: Record<
  Lang,
  {
    label: { fr: string; en: string; es: string }
    table: string
    columns: string
    notes: { fr: string; en: string; es: string }
    example: string
  }
> = {
  fr: {
    label: { fr: 'Français (wordsFr)', en: 'French (wordsFr)', es: 'Francés (wordsFr)' },
    table: 'wordsFr',
    columns:
      'word,en,es,ipa,category,gender,level,definition,examples,collocations,synonyms,antonyms,tags,notes',
    notes: {
      fr: 'word = mot FR (obligatoire). category: verbe|nom|adjectif|expression|adverbe|autre. gender (noms): masculin|feminin|invariable. level = CECR (A1, A2, B1…). Listes séparées par ; ou ,',
      en: 'word = French headword (required). category: verbe|nom|adjectif|…. gender (nouns): masculin|feminin|invariable. level = CEFR. Lists separated by ; or ,',
      es: 'word = palabra FR (obligatoria). category: verbe|nom|…. gender: masculin|feminin|invariable. level = MCER. Listas separadas por ; o ,',
    },
    example: `word,en,es,ipa,category,gender,level,definition,examples,collocations,synonyms,antonyms,tags,notes
poser,to ask; to put,hacer una pregunta; poner,/po.ze/,verbe,,A2–B1,Mettre ou formuler une question,Je voudrais poser une question.,poser une question;poser un problème,interroger;questionner,,communication;travail,1er groupe
maison,house; home,casa,/mɛ.zɔ̃/,nom,feminin,A1,Bâtiment d'habitation,J'habite dans une grande maison.,maison de campagne;à la maison,habitation;demeure,,quotidien;logement,
beau,beautiful; handsome,hermoso; bello,/bo/,adjectif,,A1,Qui suscite l'admiration,C'est un beau paysage.,beau temps;il fait beau,joli;magnifique,laid,description,beau/belle/beaux/belles
mettre,to put; to place,poner,/mɛtʁ/,verbe,,A2,Placer quelque chose,Mets le livre sur la table.,mettre en place;se mettre à,placer;poser,enlever,quotidien,3e groupe irrégulier
apprendre,to learn,aprender,/a.pʁɑ̃dʁ/,verbe,,A2,Acquérir une connaissance,J'apprends le français.,apprendre par cœur,étudier;maîtriser,oublier,éducation,`,
  },
  en: {
    label: { fr: 'English (wordsEn)', en: 'English (wordsEn)', es: 'Inglés (wordsEn)' },
    table: 'wordsEn',
    columns:
      'word,fr,es,ipa,category,level,definition,examples,collocations,synonyms,antonyms,tags,notes',
    notes: {
      fr: 'word = mot EN (obligatoire). Pas de colonne gender. level = IELTS (4.0 4.5 5.0 … 9.0). category: verbe|nom|adjectif|…',
      en: 'word = English headword (required). NO gender column. level = IELTS band (4.0–9.0). category: verb/noun as verbe|nom|adjectif|…',
      es: 'word = palabra EN (obligatoria). Sin columna gender. level = IELTS (4.0–9.0). category: verbe|nom|…',
    },
    example: `word,fr,es,ipa,category,level,definition,examples,collocations,synonyms,antonyms,tags,notes
house,maison,casa,/haʊs/,nom,5.0,A building for living,I live in a big house.,town house;house party,home;dwelling,,daily;home,
learn,apprendre,aprender,/lɜːrn/,verbe,4.5,To gain knowledge or skill,I learn French every day.,learn by heart;learn from,study;master,forget,education,
beautiful,beau,hermoso,/ˈbjuː.tɪ.fəl/,adjectif,5.0,Pleasing to the senses,What a beautiful view.,beautiful day,,pretty;lovely,ugly,description,
put,mettre; poser,poner,/pʊt/,verbe,4.0,To move something to a place,Put the book on the table.,put on;put off,place;set,remove,daily,
work,travail,trabajo,/wɜːk/,nom,4.5,Activity done as a job,I go to work at 8.,work hard;work from home,job;employment,,work,`,
  },
  es: {
    label: { fr: 'Español (wordsEs)', en: 'Spanish (wordsEs)', es: 'Español (wordsEs)' },
    table: 'wordsEs',
    columns:
      'word,fr,en,ipa,category,gender,level,definition,examples,collocations,synonyms,antonyms,tags,notes',
    notes: {
      fr: 'word = mot ES (obligatoire). gender (noms): masculin|feminin|invariable. level = CECR/MCER. category: verbe|nom|…',
      en: 'word = Spanish headword (required). gender (nouns): masculin|feminin|invariable. level = CEFR. category: verbe|nom|…',
      es: 'word = palabra ES (obligatoria). gender (sustantivos): masculin|feminin|invariable. level = MCER. category: verbe|nom|…',
    },
    example: `word,fr,en,ipa,category,gender,level,definition,examples,collocations,synonyms,antonyms,tags,notes
casa,maison,house,/ˈka.sa/,nom,feminin,A1,Edificio para habitar,Vivo en una casa grande.,casa de campo;en casa,hogar;vivienda,,cotidiano,
aprender,apprendre,to learn,/a.pɾenˈdeɾ/,verbe,,A2,Adquirir conocimiento,Aprendo francés cada día.,aprender de memoria,estudiar,olvidar,educación,
hermoso,beau,beautiful,/eɾˈmo.so/,adjectif,masculin,A1,Que causa admiración,Es un paisaje hermoso.,,,bello;bonito,feo,descripción,
poner,mettre; poser,to put,/poˈneɾ/,verbe,,A2,Colocar algo en un lugar,Pon el libro en la mesa.,poner en marcha,,colocar,quitar,cotidiano,
trabajo,travail,work,/tɾaˈβa.xo/,nom,masculin,A2,Actividad profesional,Voy al trabajo a las 8.,lugar de trabajo,empleo;oficio,,trabajo,`,
  },
}

export default function ImportPage() {
  const { t, lang: uiLang } = useLang()
  /** Explicit target language for import (independent dropdown) */
  const [importLang, setImportLang] = useState<Lang>(uiLang)
  const [file, setFile] = useState<File | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [setId, setSetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; created: number; skipped: number; duplicates?: string[]; duplicateCount?: number } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [exportLang, setExportLang] = useState<Lang>(uiLang)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const spec = IMPORT_SPECS[importLang]

  useEffect(() => {
    setImportLang(uiLang)
    setExportLang(uiLang)
  }, [uiLang])

  useEffect(() => {
    setSetId('')
    setResult(null)
    setFile(null)
    api.getSets(importLang).then(setSets).catch(console.error)
  }, [importLang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.importFile(importLang, file, setId ? Number(setId) : undefined)
      setResult(res)
      setFile(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(spec.example.trim() + '\n')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setExportMsg('')
    try {
      const r = await api.exportWords(exportLang, exportFormat)
      setExportMsg(
        uiLang === 'en'
          ? `Downloaded ${r.filename}`
          : uiLang === 'es'
            ? `Descargado ${r.filename}`
            : `Téléchargé ${r.filename}`
      )
    } catch (e: any) {
      setExportMsg(e.message || 'Error')
    } finally {
      setExporting(false)
    }
  }

  const exportColHint =
    exportLang === 'en'
      ? 'word, french, spanish, ipa, part_of_speech, ielts_level, definition, examples, collocations, synonyms, antonyms, tags, learning_status, notes'
      : exportLang === 'es'
        ? 'palabra, frances, ingles, ipa, categoria, genero, nivel_mcer, definicion, ejemplos, colocaciones, sinonimos, antonimos, etiquetas, estado, notas'
        : 'mot, anglais, espagnol, ipa, categorie, genre, niveau_cecr, definition, exemples, collocations, synonymes, antonymes, etiquettes, statut, notes'

  const labelFor = (l: Lang) => spec.label[uiLang]
  const optionLabel = (l: Lang) => IMPORT_SPECS[l].label[uiLang]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/words" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">{t('importTitle')}</h1>
      </div>

      {/* Explicit language dropdown */}
      <div className="card p-5 space-y-3">
        <div>
          <label className="label">
            {uiLang === 'en'
              ? 'Import into language / table *'
              : uiLang === 'es'
                ? 'Importar en idioma / tabla *'
                : 'Importer dans la langue / table *'}
          </label>
          <select
            className="input text-base font-medium"
            value={importLang}
            onChange={(e) => setImportLang(e.target.value as Lang)}
          >
            <option value="fr">{optionLabel('fr')}</option>
            <option value="en">{optionLabel('en')}</option>
            <option value="es">{optionLabel('es')}</option>
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            → <code className="bg-slate-100 px-1 rounded">{spec.table}</code>
            {' · '}
            {uiLang === 'en'
              ? 'Words go only into this table'
              : uiLang === 'es'
                ? 'Las palabras solo van a esta tabla'
                : 'Les mots iront uniquement dans cette table'}
          </p>
        </div>
      </div>

      {/* Format for selected language */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">
          {uiLang === 'en'
            ? `CSV format — ${importLang.toUpperCase()}`
            : uiLang === 'es'
              ? `Formato CSV — ${importLang.toUpperCase()}`
              : `Format CSV — ${importLang.toUpperCase()}`}
        </h2>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            {uiLang === 'en' ? 'Columns' : uiLang === 'es' ? 'Columnas' : 'Colonnes'}
          </p>
          <code className="block text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 break-all">
            {spec.columns}
          </code>
        </div>
        <p className="text-sm text-slate-600">{spec.notes[uiLang]}</p>
        {importLang === 'en' && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {uiLang === 'fr' && 'Anglais : pas de genre, pas de conjugaison. Niveau = IELTS 4.0 → 9.0.'}
            {uiLang === 'en' && 'English: no gender, no conjugation. Level = IELTS 4.0 → 9.0.'}
            {uiLang === 'es' && 'Inglés: sin género, sin conjugación. Nivel = IELTS 4.0 → 9.0.'}
          </p>
        )}
        {(importLang === 'fr' || importLang === 'es') && (
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {uiLang === 'fr' &&
              'Noms : renseigner gender. Verbes : conjugaisons à saisir plus tard dans le formulaire (pas dans le CSV).'}
            {uiLang === 'en' &&
              'Nouns: fill gender. Verbs: conjugations are entered later in the form (not in CSV).'}
            {uiLang === 'es' &&
              'Sustantivos: indicar gender. Verbos: conjugaciones después en el formulario (no en el CSV).'}
          </p>
        )}
      </div>

      {/* Copyable example */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-800">
            {uiLang === 'en'
              ? 'Full example (copy → paste into a .csv file)'
              : uiLang === 'es'
                ? 'Ejemplo completo (copiar → pegar en un .csv)'
                : 'Exemple complet (copier → coller dans un fichier .csv)'}
          </h2>
          <button type="button" onClick={copyExample} className="btn-secondary text-xs shrink-0">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied
              ? uiLang === 'en'
                ? 'Copied'
                : uiLang === 'es'
                  ? 'Copiado'
                  : 'Copié'
              : uiLang === 'en'
                ? 'Copy'
                : uiLang === 'es'
                  ? 'Copiar'
                  : 'Copier'}
          </button>
        </div>
        <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {spec.example.trim()}
        </pre>
      </div>

      {/* Upload form */}
      <div className="card p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('chooseFile')}</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {file && <p className="mt-2 text-sm text-primary-700 font-medium">{file.name}</p>}
            </div>
          </div>

          <div>
            <label className="label">{t('addToSet')}</label>
            <select className="input" value={setId} onChange={(e) => setSetId(e.target.value)}>
              <option value="">{t('none')}</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.wordCount ?? s.wordIds?.length ?? 0})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="space-y-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 text-sm flex items-start gap-2">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{result.message}</p>
                  <p className="text-xs mt-1">
                    → {spec.table} · {result.created} created · {result.skipped} skipped
                  </p>
                </div>
              </div>
              {result.duplicates && result.duplicates.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 text-sm">
                  <p className="font-medium">
                    {uiLang === 'en'
                      ? `Duplicates skipped (${result.duplicates.length})`
                      : uiLang === 'es'
                        ? `Duplicados omitidos (${result.duplicates.length})`
                        : `Doublons ignorés (${result.duplicates.length})`}
                  </p>
                  <p className="mt-1 text-xs break-words">
                    {result.duplicates.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={!file || loading}>
            <Upload className="w-4 h-4" />
            {loading
              ? t('importing')
              : `${t('importBtn')} → ${importLang.toUpperCase()} (${spec.table})`}
          </button>
        </form>
      </div>

      {/* ========== EXPORT ========== */}
      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          {uiLang === 'en' ? 'Export' : uiLang === 'es' ? 'Exportar' : 'Exporter'}
        </h2>
        <div className="card p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                {uiLang === 'en'
                  ? 'Language to export *'
                  : uiLang === 'es'
                    ? 'Idioma a exportar *'
                    : 'Langue à exporter *'}
              </label>
              <select
                className="input"
                value={exportLang}
                onChange={(e) => setExportLang(e.target.value as Lang)}
              >
                <option value="fr">{optionLabel('fr')}</option>
                <option value="en">{optionLabel('en')}</option>
                <option value="es">{optionLabel('es')}</option>
              </select>
            </div>
            <div>
              <label className="label">
                {uiLang === 'en' ? 'Format' : uiLang === 'es' ? 'Formato' : 'Format'}
              </label>
              <select
                className="input"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx')}
              >
                <option value="csv">CSV (.csv)</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              {uiLang === 'en'
                ? 'Column names in file'
                : uiLang === 'es'
                  ? 'Nombres de columnas en el archivo'
                  : 'Noms des colonnes dans le fichier'}
            </p>
            <code className="block text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 break-all">
              {exportColHint}
            </code>
          </div>
          {exportMsg && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 text-sm">
              {exportMsg}
            </div>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary w-full"
          >
            {exporting
              ? uiLang === 'en'
                ? 'Exporting…'
                : uiLang === 'es'
                  ? 'Exportando…'
                  : 'Export…'
              : uiLang === 'en'
                ? `Download ${exportLang.toUpperCase()} (${exportFormat})`
                : uiLang === 'es'
                  ? `Descargar ${exportLang.toUpperCase()} (${exportFormat})`
                  : `Télécharger ${exportLang.toUpperCase()} (${exportFormat})`}
          </button>
        </div>
      </div>

    </div>
  )
}
