import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Database,
  Layers,
  Upload,
  Play,
} from 'lucide-react'
import { api } from '../api/words'
import { useAuth } from '../context/AuthContext'
import type { Stats, StudySet } from '../types'

const statusLabels: Record<string, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  appris: 'Appris',
  a_reviser: 'À réviser',
}

const categoryLabels: Record<string, string> = {
  verbe: 'Verbes',
  nom: 'Noms',
  adjectif: 'Adjectifs',
  expression: 'Expressions',
  adverbe: 'Adverbes',
  autre: 'Autres',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => {
    Promise.all([api.getStats(), api.getSets()])
      .then(([s, se]) => {
        setStats(s)
        setSets(se)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSeed = async (force = false) => {
    setSeeding(true)
    setMessage('')
    try {
      const res = await api.seed(force)
      setMessage(res.message)
      load()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Chargement…</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonjour, {user?.name} 👋</h1>
          <p className="text-slate-500 mt-1">Votre espace vocabulaire français</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleSeed(false)} disabled={seeding} className="btn-secondary text-sm">
            <Database className="w-4 h-4" />
            Exemples
          </button>
          <Link to="/import" className="btn-secondary text-sm">
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link to="/words/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Nouveau mot
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-primary-50 border border-primary-200 text-primary-800 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Mots</p>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">À réviser</p>
              <p className="text-2xl font-bold">{stats?.dueCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Maîtrisés</p>
              <p className="text-2xl font-bold">{stats?.mastered ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ensembles</p>
              <p className="text-2xl font-bold">{stats?.setsCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick study */}
      {sets.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Étudier maintenant</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {sets.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-300"
              >
                <div>
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.wordCount ?? 0} mots</p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/study/${s.id}/flashcards`} className="btn-primary text-xs py-1.5">
                    <Play className="w-3.5 h-3.5" /> Cartes
                  </Link>
                  <Link to={`/study/${s.id}/quiz`} className="btn-secondary text-xs py-1.5">
                    Quiz
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Link to="/sets" className="text-sm text-primary-600 mt-3 inline-block hover:underline">
            Voir tous les ensembles →
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Par catégorie</h2>
          {stats && Object.keys(stats.byCategory || {}).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <li key={cat} className="flex items-center justify-between">
                    <span className="text-slate-700">{categoryLabels[cat] || cat}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${(count / (stats.total || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{count}</span>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">Aucun mot encore.</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Par statut</h2>
          {stats && Object.keys(stats.byStatus || {}).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between">
                    <span className="text-slate-700">{statusLabels[status] || status}</span>
                    <span className="badge bg-slate-100 text-slate-700">{count}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">Aucun mot encore.</p>
          )}
        </div>
      </div>

      {(stats?.total ?? 0) === 0 && (
        <div className="card p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">Commencez votre vocabulaire</h3>
          <p className="text-slate-500 mt-1 mb-4">
            Chargez les exemples, importez un CSV/Excel, ou ajoutez un mot manuellement.
          </p>
          <div className="flex justify-center flex-wrap gap-3">
            <button onClick={() => handleSeed(true)} className="btn-secondary" disabled={seeding}>
              Charger exemples
            </button>
            <Link to="/import" className="btn-secondary">
              Importer CSV/Excel
            </Link>
            <Link to="/words/new" className="btn-primary">
              Ajouter un mot
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
