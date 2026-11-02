import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Upload, Download, Trash2, Image as ImageIcon } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'

type Sub = { id: number; nameFr: string; nameEn: string; nameEs: string }
type Theme = {
  id: number
  nameFr: string
  nameEn: string
  nameEs: string
  icon?: string
  subcategories: Sub[]
}
type VWord = {
  id: number
  word: string
  definition: string
  imageUrl?: string
  subcategoryId?: number | null
  glossEn?: string
  glossFr?: string
  glossEs?: string
  category?: string
  gender?: string
}

function subName(s: Sub, lang: string) {
  if (lang === 'en') return s.nameEn || s.nameFr || s.nameEs
  if (lang === 'es') return s.nameEs || s.nameFr || s.nameEn
  return s.nameFr || s.nameEn || s.nameEs
}

function themeTitle(t: Theme, lang: string) {
  if (lang === 'en') return t.nameEn || t.nameFr
  if (lang === 'es') return t.nameEs || t.nameFr
  return t.nameFr || t.nameEn
}

export default function ThemeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLang()
  const [theme, setTheme] = useState<Theme | null>(null)
  const [words, setWords] = useState<VWord[]>([])
  const [subFilter, setSubFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    word: '',
    definition: '',
    ipa: '',
    category: 'nom',
    gender: '',
    glossEn: '',
    glossFr: '',
    glossEs: '',
    exampleEn: '',
    exampleEs: '',
    exampleFr: '',
    examples: '',
    notes: '',
    subcategoryId: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const th = await api.getTheme(Number(id))
      setTheme(th)
      const params: Record<string, string> = { themeId: String(id) }
      if (subFilter) params.subcategoryId = subFilter
      const list = await api.getVisual(lang, params)
      setWords(list)
    } catch {
      navigate('/themes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id, lang, subFilter])

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setImporting(true)
    setImportMsg('')
    try {
      const res = await api.importVisual(lang, Number(id), file)
      setImportMsg(
        `${res.message}` +
          (res.duplicates?.length ? ` · ⚠ ${res.duplicates.length} répétés: ${res.duplicates.slice(0, 8).join(', ')}` : '')
      )
      const th = await api.getTheme(Number(id))
      setTheme(th)
      load()
    } catch (err: any) {
      setImportMsg(err.message)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const onExport = async (format: 'csv' | 'xlsx') => {
    if (!id) return
    try {
      await api.exportVisual(lang, Number(id), format)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const submitWord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('themeId', String(id))
      fd.append('word', form.word)
      fd.append('definition', form.definition)
      fd.append('ipa', form.ipa)
      fd.append('category', form.category)
      fd.append('gender', form.gender)
      fd.append('glossEn', form.glossEn)
      fd.append('glossFr', form.glossFr)
      fd.append('glossEs', form.glossEs)
      fd.append('exampleEn', form.exampleEn)
      fd.append('exampleEs', form.exampleEs)
      fd.append('exampleFr', form.exampleFr)
      fd.append('examples', form.examples)
      fd.append('notes', form.notes)
      if (form.subcategoryId) fd.append('subcategoryId', form.subcategoryId)
      if (imageFile) fd.append('image', imageFile)
      await api.createVisual(lang, fd)
      setShowAdd(false)
      setForm({
        word: '',
        definition: '',
        ipa: '',
        category: 'nom',
        gender: '',
        glossEn: '',
        glossFr: '',
        glossEs: '',
        exampleEn: '',
        exampleEs: '',
        exampleFr: '',
        examples: '',
        notes: '',
        subcategoryId: '',
      })
      setImageFile(null)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const delWord = async (w: VWord) => {
    if (!confirm(`${t('confirmDelete')} « ${w.word} » ?`)) return
    await api.deleteVisual(lang, w.id)
    load()
  }

  if (loading && !theme) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>
  if (!theme) return null

  const title = themeTitle(theme, lang)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 flex-wrap">
        <Link to="/themes" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">{theme.icon || '📚'}</span>
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 uppercase font-semibold">{lang}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => onExport('csv')}>
            <Download className="w-4 h-4" /> CSV
          </button>
          <button type="button" className="btn-secondary text-sm" onClick={() => onExport('xlsx')}>
            <Download className="w-4 h-4" /> Excel
          </button>
          <label className="btn-secondary text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            {importing ? '…' : t('importBtn')}
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onImport} />
          </label>
          <button type="button" className="btn-primary text-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4" /> {t('addVisualWord')}
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
          {importMsg}
        </div>
      )}

      {/* Subcategory cards */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubFilter('')}
          className={`badge px-3 py-1.5 cursor-pointer ${!subFilter ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}
        >
          {lang === 'en' ? 'All' : lang === 'es' ? 'Todos' : 'Tous'} ({words.length})
        </button>
        {(theme.subcategories || []).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSubFilter(String(s.id))}
            className={`badge px-3 py-1.5 cursor-pointer ${
              subFilter === String(s.id) ? 'bg-primary-600 text-white' : 'bg-violet-50 text-violet-800'
            }`}
          >
            {subName(s, lang)}
          </button>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={submitWord} className="card p-5 space-y-3">
          <h2 className="font-semibold">{t('addVisualWord')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t('wordFr').replace('français', lang === 'en' ? 'English' : lang === 'es' ? 'español' : 'français')} *</label>
              <input className="input" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('ipa')}</label>
              <input className="input font-mono" value={form.ipa} onChange={(e) => setForm({ ...form, ipa: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('definition')} *</label>
              <textarea className="input" rows={2} value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('category')}</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="nom">{t('noun')}</option>
                <option value="verbe">{t('verb')}</option>
                <option value="adjectif">{t('adjective')}</option>
                <option value="expression">{t('expression')}</option>
                <option value="adverbe">{t('adverb')}</option>
                <option value="autre">{t('other')}</option>
              </select>
            </div>
            {(lang === 'fr' || lang === 'es') && form.category === 'nom' && (
              <div>
                <label className="label">{t('gender')}</label>
                <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">—</option>
                  <option value="masculin">{t('masculine')}</option>
                  <option value="feminin">{t('feminine')}</option>
                  <option value="invariable">{t('invariable')}</option>
                </select>
              </div>
            )}
            <div>
              <label className="label">{t('subcategories')}</label>
              <select className="input" value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}>
                <option value="">—</option>
                {(theme.subcategories || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {subName(s, lang)}
                  </option>
                ))}
              </select>
            </div>
            {lang !== 'en' && (
              <>
                <div>
                  <label className="label">{t('wordEn')}</label>
                  <input className="input" value={form.glossEn} onChange={(e) => setForm({ ...form, glossEn: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('exampleEn')}</label>
                  <input className="input" value={form.exampleEn} onChange={(e) => setForm({ ...form, exampleEn: e.target.value })} />
                </div>
              </>
            )}
            {lang !== 'es' && (
              <>
                <div>
                  <label className="label">{t('wordEs')}</label>
                  <input className="input" value={form.glossEs} onChange={(e) => setForm({ ...form, glossEs: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('exampleEs')}</label>
                  <input className="input" value={form.exampleEs} onChange={(e) => setForm({ ...form, exampleEs: e.target.value })} />
                </div>
              </>
            )}
            {lang !== 'fr' && (
              <>
                <div>
                  <label className="label">{t('wordFr')}</label>
                  <input className="input" value={form.glossFr} onChange={(e) => setForm({ ...form, glossFr: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('exampleFr')}</label>
                  <input className="input" value={form.exampleFr} onChange={(e) => setForm({ ...form, exampleFr: e.target.value })} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="label">{t('examplesFr')}</label>
              <input
                className="input"
                placeholder="phrase 1 ; phrase 2"
                value={form.examples}
                onChange={(e) => setForm({ ...form, examples: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('image')}</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('notes')}</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      )}

      {/* Word cards with images */}
      {words.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>{t('noWords')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {words.map((w) => (
            <div key={w.id} className="card p-0 overflow-hidden group">
              <Link to={`/themes/${id}/words/${w.id}`} className="block">
                <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                  {w.imageUrl ? (
                    <img src={w.imageUrl} alt={w.word} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-slate-900 truncate">{w.word}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {lang === 'fr'
                      ? w.glossEn || w.glossEs
                      : lang === 'en'
                        ? w.glossFr || w.glossEs
                        : w.glossFr || w.glossEn}
                  </p>
                </div>
              </Link>
              <div className="px-3 pb-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" className="text-red-500 p-1" onClick={() => delWord(w)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700 mb-1">CSV import columns ({lang.toUpperCase()})</p>
        <code className="block break-all">
          {lang === 'fr'
            ? 'word,subcategory,en,es,ipa,category,gender,definition,examples,example_en,example_es,notes,image,tags'
            : lang === 'en'
              ? 'word,subcategory,fr,es,ipa,category,definition,examples,example_fr,example_es,notes,image,tags'
              : 'word,subcategory,fr,en,ipa,category,gender,definition,examples,example_fr,example_en,notes,image,tags'}
        </code>
      </div>
    </div>
  )
}
