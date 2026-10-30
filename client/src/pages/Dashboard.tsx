import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle,
  Clock,
  Plus,
  Database,
  Layers,
  Upload,
  Play,
} from 'lucide-react'
import { api } from '../api/words'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import type { Stats, StudySet, Category, LearningStatus } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [stats, setStats] = useState<Stats | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState('')

  const statusLabels: Record<string, string> = {
    nouveau: t('statusNew'),
    en_cours: t('statusLearning'),
    appris: t('statusLearned'),
    a_reviser: t('statusReview'),
  }

  const categoryLabels: Record<string, string> = {
    verbe: t('verb'),
    nom: t('noun'),
    adjectif: t('adjective'),
    expression: t('expression'),
    adverbe: t('adverb'),
    autre: t('other'),
  }

  const load = () => {
    Promise.all([api.getStats(lang), api.getSets(lang)])
      .then(([s, se]) => {
        setStats(s)
        setSets(se)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [lang])

  const handleSeed = async (force = false) => {
    setSeeding(true)
    setMessage('')
    try {
      const res = await api.seed(lang, force)
      setMessage(res.message)
      load()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-500">{t('loading')}</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('hello')}, {user?.name} 👋
          </h1>
          <p className="text-slate-500 mt-1">{t('yourSpace')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleSeed(false)} disabled={seeding} className="btn-secondary text-sm">
            <Database className="w-4 h-4" />
            {t('loadExamples')}
          </button>
          <Link to="/import" className="btn-secondary text-sm">
            <Upload className="w-4 h-4" />
            {t('import')}
          </Link>
          <Link to="/words/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            {t('newWord')}
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
              <p className="text-sm text-slate-500">{t('totalWords')}</p>
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
              <p className="text-sm text-slate-500">{t('due')}</p>
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
              <p className="text-sm text-slate-500">{t('mastered')}</p>
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
              <p className="text-sm text-slate-500">{t('sets')}</p>
              <p className="text-2xl font-bold">{stats?.setsCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {sets.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3">{t('studyNow')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {sets.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-300"
              >
                <div>
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">
                    {s.wordCount ?? 0} {t('wordsCount')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/study/${s.id}/flashcards`} className="btn-primary text-xs py-1.5">
                    <Play className="w-3.5 h-3.5" /> {t('cards')}
                  </Link>
                  <Link to={`/study/${s.id}/quiz`} className="btn-secondary text-xs py-1.5">
                    {t('quiz')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Link to="/sets" className="text-sm text-primary-600 mt-3 inline-block hover:underline">
            {t('sets')} →
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">{t('byCategory')}</h2>
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
            <p className="text-slate-400 text-sm">{t('noWords')}</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">{t('byStatus')}</h2>
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
            <p className="text-slate-400 text-sm">{t('noWords')}</p>
          )}
        </div>
      </div>

      {(stats?.total ?? 0) === 0 && (
        <div className="card p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">{t('addFirst')}</h3>
          <div className="flex justify-center flex-wrap gap-3 mt-4">
            <button onClick={() => handleSeed(true)} className="btn-secondary" disabled={seeding}>
              {t('loadExamples')}
            </button>
            <Link to="/import" className="btn-secondary">
              {t('import')}
            </Link>
            <Link to="/words/new" className="btn-primary">
              {t('newWord')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
