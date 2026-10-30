import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api/words'
import type {
  WordFormData,
  Category,
  LearningStatus,
  Gender,
  Conjugations,
  PersonForms,
} from '../types'
import {
  CONJUGATION_TENSES_PRIORITY,
  CONJUGATION_TENSES_LATER,
} from '../types'
import { useLang } from '../context/LanguageContext'

const emptyPerson = (): PersonForms => ({
  je: '',
  tu: '',
  'il/elle/on': '',
  nous: '',
  vous: '',
  'ils/elles': '',
})

const emptyForm: WordFormData = {
  fr: '',
  en: '',
  es: '',
  category: 'nom',
  ipa: '',
  gender: '',
  exampleFr: '',
  exampleEn: '',
  exampleEs: '',
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

function emptyConjugations(): Conjugations {
  const c: Conjugations = {}
  ;[...CONJUGATION_TENSES_PRIORITY, ...CONJUGATION_TENSES_LATER].forEach(({ key }) => {
    if (key === 'imperatif_present') {
      ;(c as any)[key] = { tu: '', nous: '', vous: '' }
    } else {
      ;(c as any)[key] = emptyPerson()
    }
  })
  return c
}

export default function WordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLang()
  const isEdit = Boolean(id)
  const [form, setForm] = useState<WordFormData>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [collocInput, setCollocInput] = useState('')
  const [synInput, setSynInput] = useState('')
  const [antInput, setAntInput] = useState('')
  const [openTenses, setOpenTenses] = useState<Record<string, boolean>>({ present: true })
  const [showLater, setShowLater] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getWord(Number(id))
      .then((w) => {
        const examples = (w.examples || []).map((e: any) =>
          typeof e === 'string' ? e : e?.sentence || ''
        )
        setForm({
          fr: w.fr || w.word || '',
          en: w.en || w.translations?.en || '',
          es: w.es || w.translations?.es || '',
          category: w.category,
          ipa: w.ipa,
          gender: w.gender || '',
          exampleFr: w.exampleFr || (examples[0] || ''),
          exampleEn: w.exampleEn || w.translations?.enExample || '',
          exampleEs: w.exampleEs || w.translations?.esExample || '',
          definition: w.definition || '',
          examples,
          collocations: w.collocations || [],
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          tags: w.tags || [],
          cefrLevel: w.cefrLevel || '',
          learningStatus: w.learningStatus,
          conjugations:
            w.category === 'verbe'
              ? { ...emptyConjugations(), ...(w.conjugations || {}) }
              : null,
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
      gender: cat === 'nom' ? prev.gender || '' : undefined,
      conjugations: cat === 'verbe' ? prev.conjugations || emptyConjugations() : null,
    }))
  }

  const updateField = <K extends keyof WordFormData>(key: K, value: WordFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateTranslation = (
    key: 'en' | 'enExample' | 'es' | 'esExample',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [key]: value },
    }))
  }

  const addExample = () => {
    setForm((prev) => ({ ...prev, examples: [...prev.examples, ''] }))
  }

  const updateExample = (idx: number, value: string) => {
    setForm((prev) => {
      const examples = [...prev.examples]
      examples[idx] = value
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

  const updateConjPerson = (tense: string, person: string, value: string) => {
    setForm((prev) => {
      if (!prev.conjugations) return prev
      const conj = { ...prev.conjugations }
      const tenseData = { ...((conj as any)[tense] || {}) }
      tenseData[person] = value
      ;(conj as any)[tense] = tenseData
      return { ...prev, conjugations: conj }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.fr.trim() || !form.en.trim()) {
      setError('Mot français et anglais obligatoires.')
      return
    }
    setSaving(true)
    try {
      // strip empty conjugation cells
      let conjugations = form.conjugations
      if (form.category === 'verbe' && conjugations) {
        const cleaned: Conjugations = {}
        Object.entries(conjugations).forEach(([tense, forms]) => {
          if (!forms || typeof forms !== 'object') return
          const filled = Object.fromEntries(
            Object.entries(forms).filter(([, v]) => v && String(v).trim())
          )
          if (Object.keys(filled).length) (cleaned as any)[tense] = filled
        })
        conjugations = Object.keys(cleaned).length ? cleaned : null
      }
      const payload = {
        ...form,
        examples: form.examples.filter((e) => e.trim()),
        conjugations: form.category === 'verbe' ? conjugations : null,
        gender: form.category === 'nom' ? form.gender : undefined,
      }
      if (isEdit && id) {
        await api.updateWord(Number(id), payload)
        navigate(`/words/${id}`)
      } else {
        const created = await api.createWord(payload)
        navigate(`/words/${created.id}`)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>

  const renderTenseBlock = (key: string, label: string) => {
    const isImperatif = key === 'imperatif_present'
    const persons = isImperatif
      ? (['tu', 'nous', 'vous'] as const)
      : (['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'] as const)
    const open = openTenses[key]
    const forms = (form.conjugations as any)?.[key] || {}

    return (
      <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenTenses((o) => ({ ...o, [key]: !o[key] }))}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
        >
          <span className="font-medium text-sm text-slate-800">{label}</span>
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {open && (
          <div className="p-3 grid sm:grid-cols-2 gap-2">
            {persons.map((p) => (
              <div key={p}>
                <label className="label text-xs capitalize">{p}</label>
                <input
                  className="input"
                  value={forms[p] || ''}
                  onChange={(e) => updateConjPerson(key, p, e.target.value)}
                  placeholder={p}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/words/${id}` : '/words'} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? t('editWord') : t('newWord')}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">{t('basicInfo')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('wordFr')} *</label>
              <input
                className="input"
                value={form.fr}
                onChange={(e) => updateField('fr', e.target.value)}
                placeholder="ex. poser"
                required
              />
            </div>
            <div>
              <label className="label">IPA</label>
              <input
                className="input font-mono"
                value={form.ipa}
                onChange={(e) => updateField('ipa', e.target.value)}
                placeholder="/po.ze/"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('category')} *</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value as Category)}
              >
                <option value="verbe">{t('verb')}</option>
                <option value="nom">{t('noun')}</option>
                <option value="adjectif">{t('adjective')}</option>
                <option value="expression">{t('expression')}</option>
                <option value="adverbe">{t('adverb')}</option>
                <option value="autre">{t('other')}</option>
              </select>
            </div>
            {form.category === 'nom' && (
              <div>
                <label className="label">{t('gender')} *</label>
                <select
                  className="input"
                  value={form.gender || ''}
                  onChange={(e) => updateField('gender', e.target.value as Gender)}
                >
                  <option value="">— Choisir —</option>
                  <option value="masculin">{t('masculine')}</option>
                  <option value="feminin">{t('feminine')}</option>
                  <option value="invariable">{t('invariable')}</option>
                </select>
              </div>
            )}
            <div>
              <label className="label">{t('cefr')}</label>
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
            <div>
              <label className="label">{t('status')} *</label>
              <select
                className="input"
                value={form.learningStatus}
                onChange={(e) =>
                  updateField('learningStatus', e.target.value as LearningStatus)
                }
              >
                <option value="nouveau">{t('statusNew')}</option>
                <option value="en_cours">{t('statusLearning')}</option>
                <option value="appris">{t('statusLearned')}</option>
                <option value="a_reviser">{t('statusReview')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Three languages */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">{t('translations')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('wordEn')} *</label>
              <input
                className="input"
                value={form.en}
                onChange={(e) => updateField('en', e.target.value)}
                placeholder="to ask; to put"
                required
              />
            </div>
            <div>
              <label className="label">{t('exampleEn')}</label>
              <input
                className="input"
                value={form.exampleEn || ''}
                onChange={(e) => updateField('exampleEn', e.target.value)}
                placeholder="I would like to ask a question."
              />
            </div>
            <div>
              <label className="label">{t('wordEs')}</label>
              <input
                className="input"
                value={form.es}
                onChange={(e) => updateField('es', e.target.value)}
                placeholder="hacer una pregunta; poner"
              />
            </div>
            <div>
              <label className="label">{t('exampleEs')}</label>
              <input
                className="input"
                value={form.exampleEs || ''}
                onChange={(e) => updateField('exampleEs', e.target.value)}
                placeholder="Me gustaría hacer una pregunta."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('exampleFr')}</label>
              <input
                className="input"
                value={form.exampleFr || ''}
                onChange={(e) => updateField('exampleFr', e.target.value)}
                placeholder="Je voudrais poser une question."
              />
            </div>
          </div>
          <div>
            <label className="label">{t('definition')}</label>
            <textarea
              className="input"
              rows={2}
              value={form.definition}
              onChange={(e) => updateField('definition', e.target.value)}
            />
          </div>
        </div>

        {/* French examples only */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{t('examplesFr')}</h2>
            <button type="button" onClick={addExample} className="btn-ghost text-sm">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          {form.examples.length === 0 && (
            <p className="text-sm text-slate-400">{t('examplesFr')}</p>
          )}
          {form.examples.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Phrase en français"
                value={ex}
                onChange={(e) => updateExample(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeExample(i)}
                className="btn-ghost text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Conjugations for verbs */}
        {form.category === 'verbe' && form.conjugations && (
          <div className="card p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-slate-800">{t('conjugations')}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('conjugationsHint')}
              </p>
            </div>
            <div className="space-y-2">
              {CONJUGATION_TENSES_PRIORITY.map(({ key, label }) =>
                renderTenseBlock(key, label)
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowLater(!showLater)}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              {showLater ? 'Masquer' : 'Afficher'} les temps avancés
            </button>
            {showLater && (
              <div className="space-y-2">
                {CONJUGATION_TENSES_LATER.map(({ key, label }) =>
                  renderTenseBlock(key, label)
                )}
              </div>
            )}
          </div>
        )}

        {/* Relations */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">{t('relations')}</h2>
          {(
            [
              { label: 'Collocations', key: 'collocations' as const, input: collocInput, setInput: setCollocInput },
              { label: 'Synonymes', key: 'synonyms' as const, input: synInput, setInput: setSynInput },
              { label: 'Antonymes', key: 'antonyms' as const, input: antInput, setInput: setAntInput },
            ] as const
          ).map(({ label, key, input, setInput }) => (
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
            <label className="label">{t('tags')}</label>
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
            <label className="label">{t('notes')}</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link to={isEdit ? `/words/${id}` : '/words'} className="btn-secondary">
            Annuler
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  )
}
