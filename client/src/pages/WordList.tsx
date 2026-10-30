import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen, Trash2 } from 'lucide-react'
import { api } from '../api/words'
import type { Word, Category, LearningStatus } from '../types'

const statusColors: Record<LearningStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-amber-100 text-amber-800',
  appris: 'bg-emerald-100 text-emerald-800',
  a_reviser: 'bg-red-100 text-red-800',
}

const statusLabels: Record<LearningStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  appris: 'Appris',
  a_reviser: 'À réviser',
}

const categoryLabels: Record<Category, string> = {
  verbe: 'Verbe',
  nom: 'Nom',
  adjectif: 'Adjectif',
  expression: 'Expression',
  adverbe: 'Adverbe',
  autre: 'Autre',
}

export default function WordList() {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
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
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [search, category, status])

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
    if (!confirm(`Supprimer ${selected.size} mot(s) ?`)) return
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
        <h1 className="text-2xl font-bold text-slate-900">Mes mots</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={deleting} className="btn-danger">
              <Trash2 className="w-4 h-4" />
              Supprimer ({selected.size})
            </button>
          )}
          <Link to="/words/new" className="btn-primary">
            + Ajouter un mot
          </Link>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un mot, traduction…"
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-40"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Toutes catégories</option>
          {Object.entries(categoryLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="input w-full sm:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous statuts</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement…</div>
      ) : words.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun mot trouvé.</p>
          <Link to="/words/new" className="btn-primary mt-4 inline-flex">
            Ajouter le premier mot
          </Link>
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
            <span>Tout sélectionner</span>
          </div>
          <div className="grid gap-2">
            {words.map((w) => (
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
                      <span className="font-semibold text-lg text-slate-900">{w.word}</span>
                      <span className="text-slate-400 text-sm font-mono">{w.ipa}</span>
                      <span className="badge bg-slate-100 text-slate-600">
                        {categoryLabels[w.category]}
                        {w.category === 'nom' && w.gender
                          ? ` · ${w.gender === 'feminin' ? 'f.' : w.gender === 'masculin' ? 'm.' : 'inv.'}`
                          : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 truncate">
                      {w.translations?.en}
                      {w.translations?.es ? ` · ${w.translations.es}` : ''}
                    </p>
                    {w.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {w.tags.slice(0, 4).map((t) => (
                          <span key={t} className="badge bg-primary-50 text-primary-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
