import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Layers, Trash2, Play } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { StudySet } from '../types'

export default function Sets() {
  const { t } = useLang()
  const [sets, setSets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = () => {
    setLoading(true)
    api
      .getSets()
      .then(setSets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.createSet({ name, description })
    setName('')
    setDescription('')
    setShowNew(false)
    load()
  }

  const remove = async (id: number, n: string) => {
    if (!confirm(`${t('confirmDelete')} « ${n} » ?`)) return
    await api.deleteSet(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('studySets')}</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> {t('createSet')}
        </button>
      </div>

      {showNew && (
        <form onSubmit={create} className="card p-4 space-y-3">
          <input
            className="input"
            placeholder={t('setName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <input
            className="input"
            placeholder={t('description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              {t('create')}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-400 text-center py-12">{t('loading')}</p>
      ) : sets.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('noSets')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sets.map((s) => (
            <div key={s.id} className="card p-5 flex flex-col">
              <div className="flex-1">
                <p className="font-semibold text-lg text-slate-900">{s.name}</p>
                {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
                <p className="text-sm text-slate-400 mt-2">
                  {s.wordCount ?? s.wordIds?.length ?? 0} {t('wordsCount')}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <Link to={`/study/${s.id}/flashcards`} className="btn-primary flex-1 text-sm">
                  <Play className="w-4 h-4" /> {t('flashcards')}
                </Link>
                <Link to={`/study/${s.id}/quiz`} className="btn-secondary text-sm">
                  {t('quiz')}
                </Link>
                <button onClick={() => remove(s.id, s.name)} className="btn-ghost text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
