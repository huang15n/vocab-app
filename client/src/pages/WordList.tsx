import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen, Trash2 } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { Word, Category, LearningStatus } from '../types'

const statusColors: Record<LearningStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-amber-100 text-amber-800',
  appris: 'bg-emerald-100 text-emerald-800',
  a_reviser: 'bg-red-100 text-red-800',
}

export default function WordList() {
  const { t, lang, primary, secondary } = useLang()
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const statusLabels: Record<LearningStatus, string> = {
    nouveau: t('statusNew'),
    en_cours: t('statusLearning'),
    appris: t('statusLearned'),
    a_reviser: t('statusReview'),
  }

  const categoryLabels: Record<Category, string> = {
    verbe: t('verb'),
    nom: t('noun'),
    adjectif: t('adjective'),
    expression: t('expression'),
    adverbe: t('adverb'),
    autre: t('other'),
  }

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = { studyLang: lang }
    if (search) params.search = search
    if (category) params.category = category
    if (status) params.status = status
    api
      .getWords(params)
      .then(setWords)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [search, category, status, lang])

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === words.length) setSelected(new Set())
    else setSelected(new Set(words.map((w) => w.id)))
  }

  const bulkDelete = async () => {
    if (!selected.size) return
    if (!confirm(`${t('confirmDelete')} ${selected.size} ${t('confirmBulk')}`)) return
    setDeleting(true)
    try {
      await api.bulkDelete([...selected])
      setSelected(new Set())
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('words')}</h1>
          <p className="text-xs text-violet-600 mt-0.5 uppercase font-medium">
            {lang === 'fr' ? 'Français' : lang === 'en' ? 'English' : 'Español'}
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={deleting} className="btn-danger">
              <Trash2 className="w-4 h-4" />
              {t('deleteSelected')} ({selected.size})
            </button>
          )}
          <Link to="/words/new" className="btn-primary">
            + {t('add')}
          </Link>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search')}
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-full sm:w-40" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('allCategories')}</option>
          {Object.entries(categoryLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="input w-full sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('allStatuses')}</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">{t('loading')}</div>
      ) : words.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('noWords')}</p>
          <Link to="/words/new" className="btn-primary mt-4 inline-flex">{t('addFirst')}</Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-sm text-slate-500">
            <input
              type="checkbox"
              checked={selected.size === words.length && words.length > 0}
              onChange={toggleAll}
              className="rounded border-slate-300"
            />
            <span>{t('selectAll')}</span>
          </div>
          <div className="grid gap-2">
            {words.map((w) => {
              const main = primary(w)
              const secs = secondary(w)
              return (
                <div
                  key={w.id}
                  className={`card p-4 flex items-start gap-3 hover:border-primary-300 transition-all ${
                    selected.has(w.id) ? 'border-primary-400 bg-primary-50/30' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(w.id)}
                    onChange={() => toggle(w.id)}
                    className="mt-1.5 rounded border-slate-300"
                  />
                  <Link to={`/words/${w.id}`} className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg text-slate-900">{main || '—'}</span>
                        {w.ipa && <span className="text-slate-400 text-sm font-mono">{w.ipa}</span>}
                        <span className="badge bg-slate-100 text-slate-600">
                          {categoryLabels[w.category]}
                          {w.category === 'nom' && w.gender
                            ? ` · ${w.gender === 'feminin' ? 'f.' : w.gender === 'masculin' ? 'm.' : 'inv.'}`
                            : ''}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 truncate">
                        {secs.map((s) => s.text).filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {w.cefrLevel && (
                        <span className="text-xs font-medium text-slate-500">{w.cefrLevel}</span>
                      )}
                      <span className={`badge ${statusColors[w.learningStatus]}`}>
                        {statusLabels[w.learningStatus]}
                      </span>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
