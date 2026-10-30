import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
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
  IELTS_LEVELS,
  CEFR_LEVELS,
} from '../types'

const emptyPerson = (): PersonForms => ({
  je: '',
  tu: '',
  'il/elle/on': '',
  nous: '',
  vous: '',
  'ils/elles': '',
})

function emptyConjugations(): Conjugations {
  const c: Conjugations = {}
  ;[...CONJUGATION_TENSES_PRIORITY, ...CONJUGATION_TENSES_LATER].forEach(({ key }) => {
    if (key === 'imperatif_present') (c as any)[key] = { tu: '', nous: '', vous: '' }
    else (c as any)[key] = emptyPerson()
  })
  return c
}

const emptyForm = (): WordFormData => ({
  word: '',
  ipa: '',
  category: 'nom',
  gender: '',
  level: '',
  learningStatus: 'nouveau',
  definition: '',
  examples: [],
  collocations: [],
  synonyms: [],
  antonyms: [],
  tags: [],
  glossFr: '',
  glossEn: '',
  glossEs: '',
  exampleFr: '',
  exampleEn: '',
  exampleEs: '',
  conjugations: null,
  notes: '',
})

export default function WordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang, t } = useLang()
  const isEdit = Boolean(id)
  const [form, setForm] = useState<WordFormData>(emptyForm())
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [collocInput, setCollocInput] = useState('')
  const [synInput, setSynInput] = useState('')
  const [antInput, setAntInput] = useState('')
  const [openTenses, setOpenTenses] = useState<Record<string, boolean>>({ present: true })
  const [showLater, setShowLater] = useState(false)

  const hasGender = lang === 'fr' || lang === 'es'
  const hasConjugation = (lang === 'fr' || lang === 'es') && form.category === 'verbe'
  const levels = lang === 'en' ? IELTS_LEVELS : CEFR_LEVELS
  const levelLabel = lang === 'en' ? 'IELTS' : t('cefr')

  useEffect(() => {
    if (!id) {
      setForm(emptyForm())
      return
    }
    setLoading(true)
    api
      .getWord(lang, Number(id))
      .then((w) => {
        setForm({
          word: w.word || '',
          ipa: w.ipa || '',
          category: w.category,
          gender: w.gender || '',
          level: w.level || '',
          learningStatus: w.learningStatus,
          definition: w.definition || '',
          examples: (w.examples || []).map((e: any) => (typeof e === 'string' ? e : e?.sentence || '')),
          collocations: w.collocations || [],
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          tags: w.tags || [],
          glossFr: w.glossFr || '',
          glossEn: w.glossEn || '',
          glossEs: w.glossEs || '',
          exampleFr: w.exampleFr || '',
          exampleEn: w.exampleEn || '',
          exampleEs: w.exampleEs || '',
          conjugations:
            hasGender && w.category === 'verbe'
              ? { ...emptyConjugations(), ...(w.conjugations || {}) }
              : null,
          notes: w.notes || '',
        })
      })
      .catch(() => navigate('/words'))
      .finally(() => setLoading(false))
  }, [id, lang])

  const update = <K extends keyof WordFormData>(key: K, value: WordFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCategory = (cat: Category) => {
    setForm((prev) => ({
      ...prev,
      category: cat,
      gender: cat === 'nom' && hasGender ? prev.gender || '' : undefined,
      conjugations:
        cat === 'verbe' && (lang === 'fr' || lang === 'es')
          ? prev.conjugations || emptyConjugations()
          : null,
    }))
  }

  const updateConj = (tense: string, person: string, value: string) => {
    setForm((prev) => {
      if (!prev.conjugations) return prev
      const conj = { ...prev.conjugations }
      const td = { ...((conj as any)[tense] || {}) }
      td[person] = value
      ;(conj as any)[tense] = td
      return { ...prev, conjugations: conj }
    })
  }

  const addList = (key: 'collocations' | 'synonyms' | 'antonyms' | 'tags' | 'examples', value: string) => {
    const v = value.trim()
    if (!v) return
    setForm((prev) => ({
      ...prev,
      [key]: [...(prev[key] as string[]), v],
    }))
  }

  const removeList = (key: 'collocations' | 'synonyms' | 'antonyms' | 'tags' | 'examples', idx: number) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] as string[]).filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.word.trim()) {
      setError(t('required'))
      return
    }
    setSaving(true)
    try {
      let conjugations = form.conjugations
      if (hasConjugation && conjugations) {
        const cleaned: Conjugations = {}
        Object.entries(conjugations).forEach(([tense, forms]) => {
          if (!forms || typeof forms !== 'object') return
          const filled = Object.fromEntries(
            Object.entries(forms).filter(([, v]) => v && String(v).trim())
          )
          if (Object.keys(filled).length) (cleaned as any)[tense] = filled
        })
        conjugations = Object.keys(cleaned).length ? cleaned : null
      } else {
        conjugations = null
      }
      const payload: WordFormData = {
        ...form,
        conjugations,
        gender: hasGender && form.category === 'nom' ? form.gender : undefined,
      }
      if (isEdit && id) {
        await api.updateWord(lang, Number(id), payload)
        navigate(`/words/${id}`)
      } else {
        const created = await api.createWord(lang, payload)
        navigate(`/words/${created.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>

  const wordLabel =
    lang === 'en' ? t('wordEn') : lang === 'es' ? t('wordEs') : t('wordFr')

  const renderTense = (key: string, label: string) => {
    const isImp = key === 'imperatif_present'
    const persons = isImp
      ? (['tu', 'nous', 'vous'] as const)
      : (['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'] as const)
    const open = openTenses[key]
    const forms = (form.conjugations as any)?.[key] || {}
    return (
      <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenTenses((o) => ({ ...o, [key]: !o[key] }))}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 text-left"
        >
          <span className="font-medium text-sm">{label}</span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {open && (
          <div className="p-3 grid sm:grid-cols-2 gap-2">
            {persons.map((p) => (
              <div key={p}>
                <label className="label text-xs capitalize">{p}</label>
                <input
                  className="input"
                  value={forms[p] || ''}
                  onChange={(e) => updateConj(key, p, e.target.value)}
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
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? t('editWord') : t('newWord')}</h1>
          <p className="text-xs text-violet-600 uppercase font-semibold">{lang}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">{t('basicInfo')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{wordLabel} *</label>
              <input
                className="input"
                value={form.word}
                onChange={(e) => update('word', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">{t('ipa')}</label>
              <input
                className="input font-mono"
                value={form.ipa}
                onChange={(e) => update('ipa', e.target.value)}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('category')} *</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => handleCategory(e.target.value as Category)}
              >
                <option value="verbe">{t('verb')}</option>
                <option value="nom">{t('noun')}</option>
                <option value="adjectif">{t('adjective')}</option>
                <option value="expression">{t('expression')}</option>
                <option value="adverbe">{t('adverb')}</option>
                <option value="autre">{t('other')}</option>
              </select>
            </div>
            {hasGender && form.category === 'nom' && (
              <div>
                <label className="label">{t('gender')}</label>
                <select
                  className="input"
                  value={form.gender || ''}
                  onChange={(e) => update('gender', e.target.value as Gender)}
                >
                  <option value="">—</option>
                  <option value="masculin">{t('masculine')}</option>
                  <option value="feminin">{t('feminine')}</option>
                  <option value="invariable">{t('invariable')}</option>
                </select>
              </div>
            )}
            <div>
              <label className="label">{levelLabel}</label>
              <select
                className="input"
                value={form.level || ''}
                onChange={(e) => update('level', e.target.value)}
              >
                <option value="">—</option>
                {levels.map((lv) => (
                  <option key={lv} value={lv}>
                    {lang === 'en' ? `IELTS ${lv}` : lv}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('status')} *</label>
              <select
                className="input"
                value={form.learningStatus}
                onChange={(e) => update('learningStatus', e.target.value as LearningStatus)}
              >
                <option value="nouveau">{t('statusNew')}</option>
                <option value="en_cours">{t('statusLearning')}</option>
                <option value="appris">{t('statusLearned')}</option>
                <option value="a_reviser">{t('statusReview')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Translations / glosses depending on current lang */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">{t('translations')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {lang !== 'en' && (
              <>
                <div>
                  <label className="label">{t('wordEn')}</label>
                  <input
                    className="input"
                    value={form.glossEn || ''}
                    onChange={(e) => update('glossEn', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t('exampleEn')}</label>
                  <input
                    className="input"
                    value={form.exampleEn || ''}
                    onChange={(e) => update('exampleEn', e.target.value)}
                  />
                </div>
              </>
            )}
            {lang !== 'es' && (
              <>
                <div>
                  <label className="label">{t('wordEs')}</label>
                  <input
                    className="input"
                    value={form.glossEs || ''}
                    onChange={(e) => update('glossEs', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t('exampleEs')}</label>
                  <input
                    className="input"
                    value={form.exampleEs || ''}
                    onChange={(e) => update('exampleEs', e.target.value)}
                  />
                </div>
              </>
            )}
            {lang !== 'fr' && (
              <>
                <div>
                  <label className="label">{t('wordFr')}</label>
                  <input
                    className="input"
                    value={form.glossFr || ''}
                    onChange={(e) => update('glossFr', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t('exampleFr')}</label>
                  <input
                    className="input"
                    value={form.exampleFr || ''}
                    onChange={(e) => update('exampleFr', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div>
            <label className="label">{t('definition')}</label>
            <textarea
              className="input"
              rows={2}
              value={form.definition}
              onChange={(e) => update('definition', e.target.value)}
            />
          </div>
        </div>

        {/* Examples in current language */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {lang === 'en' ? t('exampleEn') : lang === 'es' ? t('exampleEs') : t('examplesFr')}
            </h2>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => update('examples', [...form.examples, ''])}
            >
              <Plus className="w-4 h-4" /> {t('add')}
            </button>
          </div>
          {form.examples.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                value={ex}
                onChange={(e) => {
                  const next = [...form.examples]
                  next[i] = e.target.value
                  update('examples', next)
                }}
              />
              <button type="button" className="btn-ghost text-red-500" onClick={() => removeList('examples', i)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Conjugations FR / ES verbs only */}
        {hasConjugation && form.conjugations && (
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold">{t('conjugations')}</h2>
            <p className="text-sm text-slate-500">{t('conjugationsHint')}</p>
            <div className="space-y-2">
              {CONJUGATION_TENSES_PRIORITY.map(({ key, label }) => renderTense(key, label))}
            </div>
            <button
              type="button"
              className="text-sm text-primary-600 font-medium"
              onClick={() => setShowLater(!showLater)}
            >
              {showLater ? t('hideAdvanced') : t('showAdvanced')}
            </button>
            {showLater && (
              <div className="space-y-2">
                {CONJUGATION_TENSES_LATER.map(({ key, label }) => renderTense(key, label))}
              </div>
            )}
          </div>
        )}

        {/* Relations */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">{t('relations')}</h2>
          {(
            [
              { key: 'collocations' as const, label: t('collocations'), input: collocInput, set: setCollocInput },
              { key: 'synonyms' as const, label: t('synonyms'), input: synInput, set: setSynInput },
              { key: 'antonyms' as const, label: t('antonyms'), input: antInput, set: setAntInput },
            ] as const
          ).map(({ key, label, input, set }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={input}
                  onChange={(e) => set(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addList(key, input)
                      set('')
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    addList(key, input)
                    set('')
                  }}
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form[key].map((item, i) => (
                  <span
                    key={item + i}
                    className="badge bg-slate-100 cursor-pointer"
                    onClick={() => removeList(key, i)}
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
                    addList('tags', tagInput)
                    setTagInput('')
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  addList('tags', tagInput)
                  setTagInput('')
                }}
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {form.tags.map((item, i) => (
                <span
                  key={item + i}
                  className="badge bg-primary-50 text-primary-700 cursor-pointer"
                  onClick={() => removeList('tags', i)}
                >
                  {item} ×
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
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to={isEdit ? `/words/${id}` : '/words'} className="btn-secondary">
            {t('cancel')}
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
