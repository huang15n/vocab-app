import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { api } from '../api/words'
import type {
  WordFormData,
  Category,
  LearningStatus,
  Example,
  Conjugations,
  PersonForms,
} from '../types'

const emptyForm: WordFormData = {
  word: '',
  category: 'nom',
  ipa: '',
  translations: { en: '', es: '' },
  definition: '',
  examples: [],
  collocations: [],
  synonyms: [],
  antonyms: [],
  tags: [],
  cefrLevel: '',
  learningStatus: 'nouveau',
  conjugations: null,
  notes: '',
}

const PERSONS = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'] as const
const SUBJ_PERSONS = [
  'que_je',
  'que_tu',
  'qu_il/elle/on',
  'que_nous',
  'que_vous',
  'qu_ils/elles',
] as const

const DEFAULT_TENSES = [
  'present',
  'imparfait',
  'futur_simple',
  'passe_compose',
  'plus_que_parfait',
  'passe_simple',
]

function emptyPersonForms(isSubj = false): PersonForms {
  const keys = isSubj ? SUBJ_PERSONS : PERSONS
  const o: PersonForms = {}
  keys.forEach((k) => {
    (o as any)[k] = ''
  })
  return o
}

function defaultConjugations(): Conjugations {
  return {
    indicatif: {
      present: emptyPersonForms(),
      imparfait: emptyPersonForms(),
      futur_simple: emptyPersonForms(),
      passe_compose: emptyPersonForms(),
      plus_que_parfait: emptyPersonForms(),
      passe_simple: emptyPersonForms(),
    },
    subjonctif: {
      present: emptyPersonForms(true),
    },
    conditionnel: {
      present: emptyPersonForms(),
    },
    imperatif: {
      present: { tu: '', nous: '', vous: '' },
    },
    infinitif: { present: '', passe: '' },
    participe: { present: '', passe: '' },
    gerondif: { present: '' },
  }
}

export default function WordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState<WordFormData>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeMode, setActiveMode] = useState('indicatif')
  const [activeTense, setActiveTense] = useState('present')
  const [tagInput, setTagInput] = useState('')
  const [collocInput, setCollocInput] = useState('')
  const [synInput, setSynInput] = useState('')
  const [antInput, setAntInput] = useState('')

  useEffect(() => {
    if (!id) return
    api
      .getWord(Number(id))
      .then((w) => {
        setForm({
          word: w.word,
          category: w.category,
          ipa: w.ipa,
          translations: { ...w.translations },
          definition: w.definition || '',
          examples: w.examples || [],
          collocations: w.collocations || [],
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          tags: w.tags || [],
          cefrLevel: w.cefrLevel || '',
          learningStatus: w.learningStatus,
          conjugations: w.conjugations || (w.category === 'verbe' ? defaultConjugations() : null),
          notes: w.notes || '',
        })
      })
      .catch(() => navigate('/words'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleCategoryChange = (cat: Category) => {
    setForm((prev) => ({
      ...prev,
      category: cat,
      conjugations: cat === 'verbe' ? prev.conjugations || defaultConjugations() : null,
    }))
  }

  const updateField = <K extends keyof WordFormData>(key: K, value: WordFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateTranslation = (lang: 'en' | 'es', value: string) => {
    setForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [lang]: value },
    }))
  }

  const addExample = () => {
    setForm((prev) => ({
      ...prev,
      examples: [...prev.examples, { sentence: '', translation: '' }],
    }))
  }

  const updateExample = (idx: number, field: keyof Example, value: string) => {
    setForm((prev) => {
      const examples = [...prev.examples]
      examples[idx] = { ...examples[idx], [field]: value }
      return { ...prev, examples }
    })
  }

  const removeExample = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== idx),
    }))
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      updateField('tags', [...form.tags, t])
      setTagInput('')
    }
  }

  const addListItem = (
    key: 'collocations' | 'synonyms' | 'antonyms',
    input: string,
    setInput: (s: string) => void
  ) => {
    const v = input.trim()
    if (v && !form[key].includes(v)) {
      updateField(key, [...form[key], v])
      setInput('')
    }
  }

  const updateConjugation = (
    mode: string,
    tense: string,
    person: string,
    value: string
  ) => {
    setForm((prev) => {
      if (!prev.conjugations) return prev
      const conj = { ...prev.conjugations }
      const modeData = { ...(conj as any)[mode] }
      const tenseData = { ...(modeData[tense] || {}) }
      tenseData[person] = value
      modeData[tense] = tenseData
      ;(conj as any)[mode] = modeData
      return { ...prev, conjugations: conj }
    })
  }

  const updateSimpleForm = (mode: string, key: string, value: string) => {
    setForm((prev) => {
      if (!prev.conjugations) return prev
      const conj = { ...prev.conjugations }
      const modeData = { ...(conj as any)[mode] }
      modeData[key] = value
      ;(conj as any)[mode] = modeData
      return { ...prev, conjugations: conj }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.word.trim() || !form.ipa.trim() || !form.translations.en.trim()) {
      setError('Mot, IPA et traduction anglaise sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      if (isEdit && id) {
        await api.updateWord(Number(id), form)
        navigate(`/words/${id}`)
      } else {
        const created = await api.createWord(form)
        navigate(`/words/${created.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">Chargement…</div>

  const modes = form.conjugations
    ? (Object.keys(form.conjugations) as string[])
    : []

  const currentMode = form.conjugations
    ? (form.conjugations as any)[activeMode]
    : null

  const isPersonTense =
    currentMode &&
    currentMode[activeTense] &&
    typeof currentMode[activeTense] === 'object'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/words/${id}` : '/words'} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? 'Modifier le mot' : 'Nouveau mot'}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Informations de base</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Mot *</label>
              <input
                className="input"
                value={form.word}
                onChange={(e) => updateField('word', e.target.value)}
                placeholder="ex. poser"
                required
              />
            </div>
            <div>
              <label className="label">IPA *</label>
              <input
                className="input font-mono"
                value={form.ipa}
                onChange={(e) => updateField('ipa', e.target.value)}
                placeholder="/po.ze/"
                required
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie grammaticale *</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value as Category)}
              >
                <option value="verbe">Verbe</option>
                <option value="nom">Nom</option>
                <option value="adjectif">Adjectif</option>
                <option value="expression">Expression</option>
                <option value="adverbe">Adverbe</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="label">Niveau CECR</label>
              <select
                className="input"
                value={form.cefrLevel}
                onChange={(e) => updateField('cefrLevel', e.target.value)}
              >
                <option value="">—</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="A2–B1">A2–B1</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Statut d'apprentissage *</label>
            <select
              className="input"
              value={form.learningStatus}
              onChange={(e) =>
                updateField('learningStatus', e.target.value as LearningStatus)
              }
            >
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="appris">Appris</option>
              <option value="a_reviser">À réviser</option>
            </select>
          </div>
        </div>

        {/* Translations */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Traductions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Anglais *</label>
              <input
                className="input"
                value={form.translations.en}
                onChange={(e) => updateTranslation('en', e.target.value)}
                placeholder="to ask; to put"
                required
              />
            </div>
            <div>
              <label className="label">Espagnol</label>
              <input
                className="input"
                value={form.translations.es}
                onChange={(e) => updateTranslation('es', e.target.value)}
                placeholder="hacer una pregunta; poner"
              />
            </div>
          </div>
          <div>
            <label className="label">Définition (optionnel)</label>
            <textarea
              className="input"
              rows={2}
              value={form.definition}
              onChange={(e) => updateField('definition', e.target.value)}
            />
          </div>
        </div>

        {/* Examples */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Exemples</h2>
            <button type="button" onClick={addExample} className="btn-ghost text-sm">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          {form.examples.map((ex, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <input
                  className="input"
                  placeholder="Phrase en français"
                  value={ex.sentence}
                  onChange={(e) => updateExample(i, 'sentence', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Traduction anglaise"
                  value={ex.translation}
                  onChange={(e) => updateExample(i, 'translation', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeExample(i)}
                className="btn-ghost text-red-500 mt-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Collocations / Syn / Ant / Tags */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Relations & étiquettes</h2>
          {[
            {
              label: 'Collocations',
              key: 'collocations' as const,
              input: collocInput,
              setInput: setCollocInput,
            },
            {
              label: 'Synonymes',
              key: 'synonyms' as const,
              input: synInput,
              setInput: setSynInput,
            },
            {
              label: 'Antonymes',
              key: 'antonyms' as const,
              input: antInput,
              setInput: setAntInput,
            },
          ].map(({ label, key, input, setInput }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addListItem(key, input, setInput)
                    }
                  }}
                  placeholder="Entrée pour ajouter"
                />
                <button
                  type="button"
                  onClick={() => addListItem(key, input, setInput)}
                  className="btn-secondary"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form[key].map((item) => (
                  <span
                    key={item}
                    className="badge bg-slate-100 text-slate-700 cursor-pointer hover:bg-red-100"
                    onClick={() =>
                      updateField(
                        key,
                        form[key].filter((x) => x !== item)
                      )
                    }
                  >
                    {item} ×
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="label">Étiquettes</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="communication, travail…"
              />
              <button type="button" onClick={addTag} className="btn-secondary">
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="badge bg-primary-50 text-primary-700 cursor-pointer"
                  onClick={() =>
                    updateField(
                      'tags',
                      form.tags.filter((x) => x !== t)
                    )
                  }
                >
                  {t} ×
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Conjugations - only for verbs */}
        {form.category === 'verbe' && form.conjugations && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Conjugaison</h2>
            <p className="text-sm text-slate-500">
              Remplissez les formes souhaitées. Les champs vides restent vides.
            </p>

            {/* Mode tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
              {modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setActiveMode(m)
                    const data = (form.conjugations as any)[m]
                    if (data) {
                      const first = Object.keys(data).find(
                        (k) => typeof data[k] === 'object'
                      )
                      if (first) setActiveTense(first)
                      else setActiveTense(Object.keys(data)[0] || '')
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                    activeMode === m
                      ? 'bg-primary-100 text-primary-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Tense selector for person-based modes */}
            {currentMode &&
              Object.keys(currentMode).some(
                (k) => typeof currentMode[k] === 'object'
              ) && (
                <div className="flex flex-wrap gap-1">
                  {Object.keys(currentMode)
                    .filter((k) => typeof currentMode[k] === 'object')
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTense(t)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          activeTense === t
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.replace(/_/g, ' ')}
                      </button>
                    ))}
                </div>
              )}

            {/* Person forms */}
            {isPersonTense && (
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(currentMode[activeTense] as PersonForms).map(
                  ([person, value]) => (
                    <div key={person}>
                      <label className="label capitalize text-xs">
                        {person.replace(/_/g, ' ')}
                      </label>
                      <input
                        className="input"
                        value={value || ''}
                        onChange={(e) =>
                          updateConjugation(
                            activeMode,
                            activeTense,
                            person,
                            e.target.value
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>
            )}

            {/* Simple string forms (infinitif, participe, gerondif) */}
            {currentMode &&
              !Object.keys(currentMode).some(
                (k) => typeof currentMode[k] === 'object'
              ) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(currentMode).map(([k, v]) =>
                    typeof v === 'string' ? (
                      <div key={k}>
                        <label className="label capitalize text-xs">
                          {k.replace(/_/g, ' ')}
                        </label>
                        <input
                          className="input"
                          value={v}
                          onChange={(e) =>
                            updateSimpleForm(activeMode, k, e.target.value)
                          }
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to={isEdit ? `/words/${id}` : '/words'}
            className="btn-secondary"
          >
            Annuler
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
